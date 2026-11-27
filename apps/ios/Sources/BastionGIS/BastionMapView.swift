import SwiftUI
import MapboxMaps
import CoreLocation
import UIKit

/// Native map surface using the shared BASTION-KERN Standard style.
public struct BastionMapView: View {
    private let styleURI = StyleURI(rawValue: "mapbox://styles/alfredobernal2004/cmw5u5scy010401qpeu7n9yut")!
    private let events: [BastionGeoEvent]
    private let initialCenter: CLLocationCoordinate2D
    private let initialZoom: Double
    @Binding private var selectedEventID: String?
    @State private var is3D = true
    @State private var locationEnabled = false
    @State private var viewport: Viewport

    public init(
        events: [BastionGeoEvent] = [],
        selectedEventID: Binding<String?> = .constant(nil),
        initialCenter: CLLocationCoordinate2D = CLLocationCoordinate2D(latitude: 42.5063, longitude: 1.5218),
        initialZoom: Double = 13.2
    ) {
        self.events = events
        self.initialCenter = initialCenter
        self.initialZoom = initialZoom
        self._selectedEventID = selectedEventID
        self._viewport = State(initialValue: .camera(
            center: initialCenter,
            zoom: initialZoom,
            bearing: initialZoom < 3 ? 0 : -12.8,
            pitch: initialZoom < 3 ? 0 : 55
        ))
    }

    public var body: some View {
        Map(viewport: $viewport) {
            if locationEnabled { Puck2D(bearing: .heading) }
            CircleAnnotationGroup(events, id: \.id) { event in
                CircleAnnotation(centerCoordinate: event.coordinate)
                    .circleColor(UIColor(event.category.color))
                    .circleRadius(event.isSignificant ? 8 : 5)
                    .circleStrokeColor(.white)
                    .circleStrokeWidth(1.5)
                    .onTapGesture { selectedEventID = event.id }
            }
        }
        .mapStyle(MapStyle(uri: styleURI))
        .mapControls { ScaleBarView() }
        .ignoresSafeArea(edges: .bottom)
        .overlay(alignment: .topTrailing) {
            VStack(spacing: 10) {
                Button {
                    let nextIs3D = !is3D
                    withViewportAnimation(.default(maxDuration: BastionMotion.motion_camera)) {
                        is3D = nextIs3D
                        viewport = .camera(
                            center: initialCenter,
                            zoom: initialZoom,
                            bearing: -12.8,
                            pitch: nextIs3D ? 55 : 0
                        )
                    }
                } label: {
                    Label(is3D ? "3D" : "2D", systemImage: "cube.transparent").labelStyle(.titleAndIcon)
                }
                .accessibilityLabel(is3D ? "Switch to flat map" : "Switch to 3D map")
                .simultaneousGesture(TapGesture().onEnded { BastionAnalytics.capture("map_3d_toggled", properties: ["enabled": !is3D]) })
                Button {
                    locationEnabled = true
                    BastionAnalytics.capture("location_tracking_started")
                    withViewportAnimation(.default(maxDuration: BastionMotion.motion_camera)) {
                        viewport = .followPuck(zoom: 15, pitch: is3D ? 55 : 0)
                    }
                } label: { Image(systemName: "location.fill") }
                    .accessibilityLabel("Locate me")
            }
            .buttonStyle(BastionMapButtonStyle())
            .padding(16)
        }
    }
}

private struct BastionMapButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .semibold, design: .rounded))
            .foregroundStyle(BastionColor.color_text_strong)
            .padding(12)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(.white.opacity(0.65), lineWidth: 1))
            .shadow(color: .black.opacity(configuration.isPressed ? 0.04 : 0.12), radius: 14, y: 5)
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.spring(duration: BastionMotion.motion_quick), value: configuration.isPressed)
    }
}

