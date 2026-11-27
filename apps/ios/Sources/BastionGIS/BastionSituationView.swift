import SwiftUI

/// Native event-monitoring experience that combines the official NASA EONET and USGS feeds.
public struct BastionSituationView: View {
    @State private var store = BastionEventStore()
    @State private var selectedCategory: BastionEventCategory = .all
    @State private var selectedEventID: String?

    private var visibleEvents: [BastionGeoEvent] {
        guard selectedCategory != .all else { return store.events }
        return store.events.filter { $0.category == selectedCategory }
    }

    private var selectedEvent: BastionGeoEvent? {
        store.events.first { $0.id == selectedEventID }
    }

    public init() {}

    public var body: some View {
        ZStack {
            BastionMapView(
                events: visibleEvents,
                selectedEventID: $selectedEventID,
                initialCenter: CLLocationCoordinate2D(latitude: 20, longitude: 0),
                initialZoom: 1.8
            )
            .ignoresSafeArea()

            VStack(spacing: BastionDimension.space_3) {
                header
                categoryFilters
                Spacer(minLength: BastionDimension.space_3)
                eventPanel
            }
            .padding(.horizontal, BastionDimension.space_4)
            .padding(.top, BastionDimension.space_2)
            .padding(.bottom, BastionDimension.space_2)
        }
        .task {
            await store.refresh()
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 60_000_000_000)
                guard !Task.isCancelled else { return }
                await store.refresh()
            }
        }
        .preferredColorScheme(.light)
    }

    private var header: some View {
        HStack(spacing: BastionDimension.space_3) {
            Image(systemName: "globe.americas.fill")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(BastionColor.color_brand_teal)

            VStack(alignment: .leading, spacing: 2) {
                Text("BASTION")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .tracking(1.1)
                    .foregroundStyle(BastionColor.color_text_muted)
                Text("Situation map")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(BastionColor.color_text_strong)
            }

            Spacer(minLength: BastionDimension.space_2)

            VStack(alignment: .trailing, spacing: 3) {
                HStack(spacing: 5) {
                    Circle()
                        .fill(store.failedSources.isEmpty ? BastionColor.color_brand_teal : BastionColor.color_brand_copper)
                        .frame(width: 6, height: 6)
                    Text(store.failedSources.isEmpty ? "LIVE" : "DELAYED")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .tracking(0.6)
                }
                .foregroundStyle(BastionColor.color_text_strong)

                Text("\(visibleEvents.count) events")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(BastionColor.color_text_muted)
            }
        }
        .padding(.horizontal, BastionDimension.space_4)
        .padding(.vertical, BastionDimension.space_3)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: BastionDimension.radius_card, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: BastionDimension.radius_card, style: .continuous)
                .stroke(BastionColor.color_stroke_subtle.opacity(0.8), lineWidth: 1)
        }
    }

    private var categoryFilters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: BastionDimension.space_2) {
                ForEach(BastionEventCategory.filters) { category in
                    Button {
                        withAnimation(.easeInOut(duration: BastionMotion.motion_quick)) {
                            selectedCategory = category
                            selectedEventID = nil
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: category.symbolName)
                                .font(.system(size: 11, weight: .semibold))
                            Text(category.title)
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                        }
                        .foregroundStyle(selectedCategory == category ? .white : BastionColor.color_text_strong)
                        .padding(.horizontal, BastionDimension.space_3)
                        .frame(height: 34)
                        .background {
                            Capsule().fill(selectedCategory == category ? BastionColor.color_brand_teal : Color.white.opacity(0.94))
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(selectedCategory == category ? .isSelected : [])
                }
            }
            .padding(.vertical, 1)
        }
    }

    private var eventPanel: some View {
        VStack(alignment: .leading, spacing: BastionDimension.space_3) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(selectedEvent == nil ? "LATEST EVENTS" : "EVENT DETAILS")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .tracking(0.9)
                        .foregroundStyle(BastionColor.color_text_muted)
                    Text(panelSubtitle)
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(BastionColor.color_text_strong)
                }

                Spacer()

                if let updatedAt = store.lastUpdatedAt {
                    Text(store.failedSources.isEmpty ? updatedAt.formatted(date: .omitted, time: .shortened) : "Stale")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(BastionColor.color_text_muted)
                } else if store.isLoading {
                    ProgressView().tint(BastionColor.color_brand_teal)
                } else {
                    Button {
                        Task { await store.refresh() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(BastionColor.color_text_strong)
                            .frame(width: 32, height: 32)
                            .background(BastionColor.color_canvas, in: Circle())
                    }
                    .accessibilityLabel("Refresh event feeds")
                }
            }

            if let selectedEvent {
                selectedEventDetails(selectedEvent)
            } else if visibleEvents.isEmpty {
                emptyState
            } else {
                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(spacing: 0) {
                        ForEach(visibleEvents.prefix(5)) { event in
                            eventRow(event)
                            if event.id != visibleEvents.prefix(5).last?.id {
                                Rectangle()
                                    .fill(BastionColor.color_stroke_subtle.opacity(0.65))
                                    .frame(height: 1)
                                    .padding(.leading, 38)
                            }
                        }
                    }
                }
                .frame(maxHeight: 220)
            }
        }
        .padding(BastionDimension.space_4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: BastionDimension.radius_card, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: BastionDimension.radius_card, style: .continuous)
                .stroke(BastionColor.color_stroke_subtle.opacity(0.8), lineWidth: 1)
        }
    }

    private var panelSubtitle: String {
        if let selectedEvent { return selectedEvent.category.title }
        if !store.failedSources.isEmpty { return "Some feeds are unavailable" }
        if store.isLoading && store.events.isEmpty { return "Connecting to official feeds" }
        return "NASA EONET · USGS"
    }

    private var emptyState: some View {
        HStack(spacing: BastionDimension.space_3) {
            Image(systemName: store.errorMessage == nil ? "checkmark.circle" : "antenna.radiowaves.left.and.right")
                .foregroundStyle(BastionColor.color_brand_teal)
            Text(store.errorMessage ?? (store.isLoading ? "Loading verified event feeds…" : "No events match this filter."))
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundStyle(BastionColor.color_text_muted)
            Spacer(minLength: 0)
        }
        .padding(.vertical, BastionDimension.space_2)
    }

    private func eventRow(_ event: BastionGeoEvent) -> some View {
        Button {
            withAnimation(.easeInOut(duration: BastionMotion.motion_quick)) {
                selectedEventID = event.id
            }
        } label: {
            HStack(spacing: BastionDimension.space_3) {
                Image(systemName: event.category.symbolName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(event.category.color)
                    .frame(width: 28, height: 28)
                    .background(event.category.color.opacity(0.14), in: Circle())

                VStack(alignment: .leading, spacing: 3) {
                    Text(event.title)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(BastionColor.color_text_strong)
                        .lineLimit(1)
                    Text(eventSubtitle(event))
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(BastionColor.color_text_muted)
                        .lineLimit(1)
                }

                Spacer(minLength: BastionDimension.space_2)

                if let magnitude = event.magnitudeLabel {
                    Text(magnitude)
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(event.isSignificant ? BastionColor.color_brand_copper : BastionColor.color_text_strong)
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(BastionColor.color_text_muted.opacity(0.7))
            }
            .padding(.vertical, BastionDimension.space_2)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(event.title), \(event.category.title)")
    }

    private func selectedEventDetails(_ event: BastionGeoEvent) -> some View {
        VStack(alignment: .leading, spacing: BastionDimension.space_3) {
            HStack(alignment: .top, spacing: BastionDimension.space_2) {
                Image(systemName: event.category.symbolName)
                    .foregroundStyle(event.category.color)
                    .frame(width: 28, height: 28)
                VStack(alignment: .leading, spacing: 5) {
                    Text(event.title)
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(BastionColor.color_text_strong)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(eventSubtitle(event))
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundStyle(BastionColor.color_text_muted)
                }
                Spacer(minLength: 0)
                Button {
                    selectedEventID = nil
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(BastionColor.color_text_muted)
                        .frame(width: 28, height: 28)
                        .background(BastionColor.color_canvas, in: Circle())
                }
                .accessibilityLabel("Close event details")
            }

            HStack(spacing: BastionDimension.space_3) {
                Text(String(format: "%.4f, %.4f", event.coordinate.latitude, event.coordinate.longitude))
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundStyle(BastionColor.color_text_muted)
                Spacer()
                if let sourceURL = event.sourceURL {
                    Link(destination: sourceURL) {
                        Label("Official source", systemImage: "arrow.up.right")
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(BastionColor.color_brand_teal)
                    }
                }
            }
        }
        .padding(.vertical, BastionDimension.space_2)
    }

    private func eventSubtitle(_ event: BastionGeoEvent) -> String {
        let time = event.occurredAt?.formatted(.relative(presentation: .named)) ?? "Time unavailable"
        return "\(event.sourceName) · \(time)"
    }
}