import CoreLocation
import Foundation
import Observation
import SwiftUI

public enum BastionEventCategory: String, CaseIterable, Identifiable {
    case all
    case earthquake
    case wildfire
    case volcano
    case flood
    case storm
    case other

    public static let filters: [BastionEventCategory] = [.all, .earthquake, .wildfire, .volcano, .flood, .storm]

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .all: "All events"
        case .earthquake: "Earthquakes"
        case .wildfire: "Wildfires"
        case .volcano: "Volcanoes"
        case .flood: "Floods"
        case .storm: "Storms"
        case .other: "Other"
        }
    }

    public var symbolName: String {
        switch self {
        case .all: "square.grid.2x2.fill"
        case .earthquake: "waveform.path.ecg"
        case .wildfire: "flame.fill"
        case .volcano: "mountain.2.fill"
        case .flood: "water.waves"
        case .storm: "cloud.bolt.rain.fill"
        case .other: "mappin.and.ellipse"
        }
    }

    public var color: Color {
        switch self {
        case .all: BastionColor.color_brand_teal
        case .earthquake, .volcano: BastionColor.color_brand_copper
        case .wildfire: Color(red: 0.82, green: 0.31, blue: 0.20)
        case .flood, .storm: BastionColor.color_brand_sky
        case .other: BastionColor.color_text_muted
        }
    }
}

public struct BastionGeoEvent: Identifiable {
    public let id: String
    public let title: String
    public let category: BastionEventCategory
    public let coordinate: CLLocationCoordinate2D
    public let occurredAt: Date?
    public let sourceName: String
    public let sourceURL: URL?
    public let magnitude: Double?
    public let isSignificant: Bool

    public var magnitudeLabel: String? {
        magnitude.map { String(format: "M %.1f", $0) }
    }
}

private struct BastionEventSnapshot {
    let events: [BastionGeoEvent]
    let failedSources: [String]
}

private struct BastionEventFeedService {
    private let session = URLSession.shared

    func fetchLatest() async throws -> BastionEventSnapshot {
        async let earthquakeEvents: [BastionGeoEvent]? = try? fetchEarthquakes()
        async let disasterEvents: [BastionGeoEvent]? = try? fetchNASAEvents()
        let (earthquakes, disasters) = await (earthquakeEvents, disasterEvents)

        guard earthquakes != nil || disasters != nil else {
            throw FeedError.unavailable
        }

        var failedSources: [String] = []
        if earthquakes == nil { failedSources.append("USGS") }
        if disasters == nil { failedSources.append("NASA EONET") }

        return BastionEventSnapshot(
            events: (earthquakes ?? []) + (disasters ?? []),
            failedSources: failedSources
        )
    }

    private func fetchEarthquakes() async throws -> [BastionGeoEvent] {
        let url = URL(string: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson")!
        let response = try await load(USGSResponse.self, from: url)

        return response.features.compactMap { feature in
            guard
                let coordinates = feature.geometry?.coordinates,
                coordinates.count >= 2,
                let occurredAt = feature.properties.time.map({ Date(timeIntervalSince1970: $0 / 1000) })
            else { return nil }

            let magnitude = feature.properties.mag
            return BastionGeoEvent(
                id: "usgs-\(feature.id)",
                title: feature.properties.title ?? feature.properties.place ?? "Earthquake",
                category: .earthquake,
                coordinate: CLLocationCoordinate2D(latitude: coordinates[1], longitude: coordinates[0]),
                occurredAt: occurredAt,
                sourceName: "USGS",
                sourceURL: feature.properties.url.flatMap(URL.init(string:)),
                magnitude: magnitude,
                isSignificant: (magnitude ?? 0) >= 4.5 || feature.properties.alert != nil
            )
        }
    }

    private func fetchNASAEvents() async throws -> [BastionGeoEvent] {
        let url = URL(string: "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100")!
        let response = try await load(NASAResponse.self, from: url)

        return response.events.compactMap { event in
            guard
                let geometry = event.geometry?.last(where: { $0.type.lowercased() == "point" }),
                let coordinates = geometry.coordinates,
                coordinates.count >= 2
            else { return nil }

            let latitude = coordinates[1]
            let longitude = coordinates[0]
            guard (-90...90).contains(latitude), (-180...180).contains(longitude) else { return nil }

            let categoryTitle = event.categories?.first?.title ?? event.categories?.first?.id ?? "Other"
            return BastionGeoEvent(
                id: "nasa-\(event.id)",
                title: event.title,
                category: Self.category(for: categoryTitle),
                coordinate: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
                occurredAt: geometry.date.flatMap { ISO8601DateFormatter().date(from: $0) },
                sourceName: "NASA EONET",
                sourceURL: event.link.flatMap(URL.init(string:)),
                magnitude: nil,
                isSignificant: false
            )
        }
    }

    private func load<Response: Decodable>(_ type: Response.Type, from url: URL) async throws -> Response {
        let (data, response) = try await session.data(from: url)
        guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode) else {
            throw FeedError.invalidResponse
        }
        return try JSONDecoder().decode(type, from: data)
    }

    private static func category(for title: String) -> BastionEventCategory {
        let value = title.lowercased()
        if value.contains("earthquake") { return .earthquake }
        if value.contains("wildfire") || value.contains("fire") { return .wildfire }
        if value.contains("volcano") { return .volcano }
        if value.contains("flood") { return .flood }
        if value.contains("storm") || value.contains("cyclone") || value.contains("hurricane") { return .storm }
        return .other
    }

    private enum FeedError: Error {
        case unavailable
        case invalidResponse
    }
}

@Observable @MainActor
public final class BastionEventStore {
    public private(set) var events: [BastionGeoEvent] = []
    public private(set) var isLoading = false
    public private(set) var failedSources: [String] = []
    public private(set) var lastUpdatedAt: Date?
    public private(set) var errorMessage: String?

    private let service = BastionEventFeedService()

    public init() {}

    public func refresh() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let snapshot = try await service.fetchLatest()
            events = snapshot.events.sorted {
                ($0.occurredAt ?? .distantPast) > ($1.occurredAt ?? .distantPast)
            }
            failedSources = snapshot.failedSources
            lastUpdatedAt = .now
            errorMessage = nil
        } catch {
            failedSources = ["NASA EONET", "USGS"]
            errorMessage = "Feeds unavailable. Showing the last successful update."
        }
    }
}

private struct NASAResponse: Decodable {
    let events: [NASAEvent]
}

private struct NASAEvent: Decodable {
    let id: String
    let title: String
    let link: String?
    let categories: [Category]?
    let geometry: [Geometry]?

    struct Category: Decodable {
        let id: String?
        let title: String?
    }

    struct Geometry: Decodable {
        let type: String
        let date: String?
        let coordinates: [Double]?

        private enum CodingKeys: String, CodingKey {
            case type, date, coordinates
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            type = (try? container.decode(String.self, forKey: .type)) ?? ""
            date = try? container.decode(String.self, forKey: .date)
            coordinates = try? container.decode([Double].self, forKey: .coordinates)
        }
    }
}

private struct USGSResponse: Decodable {
    let features: [Feature]

    struct Feature: Decodable {
        let id: String
        let properties: Properties
        let geometry: Geometry?
    }

    struct Properties: Decodable {
        let title: String?
        let place: String?
        let time: Double?
        let mag: Double?
        let url: String?
        let alert: String?
    }

    struct Geometry: Decodable {
        let coordinates: [Double]?
    }
}