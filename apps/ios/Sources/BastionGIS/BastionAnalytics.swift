import Foundation
import PostHog

/// Feature-only analytics. Call `configure` only after the user grants consent.
public enum BastionAnalytics {
    private static var consented = false
    private static let allowedEvents: Set<String> = [
        "map_3d_toggled", "location_tracking_started", "route_requested",
        "event_feed_refreshed", "geojson_imported"
    ]

    public static func configure(projectToken: String, host: String = "https://us.i.posthog.com", consentGranted: Bool) {
        guard consentGranted, !projectToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let config = PostHogConfig(projectToken: projectToken, host: host)
        config.captureApplicationLifecycleEvents = false
        config.captureScreenViews = false
        config.enableSwizzling = false
        PostHogSDK.shared.setup(config)
        consented = true
    }

    public static func capture(_ event: String, properties: [String: Any] = [:]) {
        guard consented, allowedEvents.contains(event) else { return }
        PostHogSDK.shared.capture(event, properties: properties)
    }
}
