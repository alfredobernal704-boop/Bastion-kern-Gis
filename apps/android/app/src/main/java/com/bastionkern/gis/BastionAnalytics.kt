package com.bastionkern.gis

import android.content.Context
import com.posthog.PersonProfiles
import com.posthog.PostHog
import com.posthog.android.PostHogAndroid
import com.posthog.android.PostHogAndroidConfig

/** Feature-only analytics. Configure only after the user grants consent. */
object BastionAnalytics {
    private var consented = false
    private val allowedEvents = setOf("map_3d_toggled", "location_tracking_started", "route_requested", "event_feed_refreshed", "geojson_imported")

    fun configure(context: Context, projectToken: String, host: String = "https://us.i.posthog.com", consentGranted: Boolean) {
        if (!consentGranted || projectToken.isBlank()) return
        val config = PostHogAndroidConfig(projectToken = projectToken, host = host).apply {
            captureApplicationLifecycleEvents = false
            captureScreenViews = false
            captureDeepLinks = false
            personProfiles = PersonProfiles.NEVER
        }
        PostHogAndroid.setup(context.applicationContext, config)
        consented = true
    }

    fun capture(event: String, properties: Map<String, Any> = emptyMap()) {
        if (consented && event in allowedEvents) PostHog.capture(event, properties)
    }
}
