plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android { namespace = "com.bastionkern.gis"; compileSdk = 35
    defaultConfig {
        applicationId = "com.bastionkern.gis"; minSdk = 26; targetSdk = 35; versionCode = 1; versionName = "0.1.0"
        val localProps = java.util.Properties().apply { rootProject.file("local.properties").takeIf { it.exists() }?.inputStream()?.use(::load) }
        val token = localProps.getProperty("MAPBOX_ACCESS_TOKEN", "")
        buildConfigField("String", "MAPBOX_ACCESS_TOKEN", "\"$token\"")
    }
    buildFeatures { compose = true; buildConfig = true }
}
dependencies {
    implementation("com.mapbox.maps:android:11.34.2")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.compose.material3:material3:1.3.2")
    implementation("androidx.compose.ui:ui:1.8.2")
    implementation("androidx.compose.ui:ui-tooling-preview:1.8.2")
    implementation("com.posthog:posthog-android:3.75.0")
}
