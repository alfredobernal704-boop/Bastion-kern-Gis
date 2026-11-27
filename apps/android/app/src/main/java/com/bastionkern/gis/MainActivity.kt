package com.bastionkern.gis

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.Lifecycle
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.mapbox.maps.MapView
import com.mapbox.maps.MapboxOptions
import com.mapbox.maps.plugin.locationcomponent.location

private val Ink = BastionColors.color_text_strong
private val Teal = BastionColors.color_brand_teal
private val Canvas = BastionColors.color_canvas
private const val STYLE_URI = "mapbox://styles/alfredobernal2004/cmw5u5scy010401qpeu7n9yut"

class MainActivity : ComponentActivity() {
    private var mapView: MapView? = null
    private var mapViewStarted = false

    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState)
        check(BuildConfig.MAPBOX_ACCESS_TOKEN.isNotBlank()) { "Set MAPBOX_ACCESS_TOKEN in apps/android/local.properties" }
        MapboxOptions.accessToken = BuildConfig.MAPBOX_ACCESS_TOKEN
        window.statusBarColor = android.graphics.Color.rgb(246,244,239)
        setContent { MaterialTheme(colorScheme = lightColorScheme(primary = Teal, background = Canvas)) { MapScreen(onMapViewCreated = ::attachMapView) } }
    }

    private fun attachMapView(view: MapView) {
        mapView = view
        if (lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED) && !mapViewStarted) {
            view.onStart()
            mapViewStarted = true
        }
    }

    override fun onStart() {
        super.onStart()
        mapView?.let { if (!mapViewStarted) { it.onStart(); mapViewStarted = true } }
    }

    override fun onStop() {
        if (mapViewStarted) { mapView?.onStop(); mapViewStarted = false }
        super.onStop()
    }

    override fun onDestroy() {
        mapView?.onDestroy()
        mapView = null
        mapViewStarted = false
        super.onDestroy()
    }
}

@Composable private fun MapScreen(onMapViewCreated: (MapView) -> Unit) {
    val context = LocalContext.current
    var is3D by remember { mutableStateOf(true) }
    var locate by remember { mutableStateOf(false) }
    val pitch by animateFloatAsState(if (is3D) 55f else 0f, animationSpec = tween(durationMillis = BastionMotion.motion_camera), label = "camera pitch")
    val locationPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
        val granted = grants.values.any { it }
        if (granted) {
            locate = true
            BastionAnalytics.capture("location_tracking_started")
        } else Toast.makeText(context, "Location permission was not granted.", Toast.LENGTH_SHORT).show()
    }
    Box(Modifier.fillMaxSize()) {
        AndroidViewMap(locate = locate, pitch = pitch, onMapViewCreated = onMapViewCreated, modifier = Modifier.fillMaxSize())
        Column(Modifier.align(Alignment.TopEnd).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Surface(shape = RoundedCornerShape(16.dp), shadowElevation = 8.dp, color = Color.White.copy(alpha = .92f)) {
                Column {
            TextButton(onClick = { is3D = !is3D; BastionAnalytics.capture("map_3d_toggled", mapOf("enabled" to is3D)) }, contentPadding = PaddingValues(14.dp), modifier = Modifier.semantics { contentDescription = if (is3D) "Switch to flat map" else "Switch to 3D map" }) { Text(if (is3D) "◇  3D" else "▱  2D", color = Ink) }
            TextButton(onClick = {
                if (hasLocationPermission(context)) {
                    locate = true
                    BastionAnalytics.capture("location_tracking_started")
                } else locationPermission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
            }, contentPadding = PaddingValues(14.dp), modifier = Modifier.semantics { contentDescription = "Locate me" }) { Text("◎", color = Teal) }
                }
            }
        }
        Surface(Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(14.dp), shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = .94f), shadowElevation = 12.dp) {
            Column(Modifier.padding(18.dp)) {
                Text("BASTION-KERN", style = MaterialTheme.typography.labelLarge, color = Teal)
                Text("Geospatial intelligence", style = MaterialTheme.typography.titleLarge, color = Ink)
                Text("Official event feeds appear here when connected", color = Ink.copy(alpha = .68f))
            }
        }
    }
}

private fun hasLocationPermission(context: Context): Boolean =
    context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

@Composable private fun AndroidViewMap(locate: Boolean, pitch: Float, onMapViewCreated: (MapView) -> Unit, modifier: Modifier = Modifier) {
    androidx.compose.ui.viewinterop.AndroidView(modifier = modifier, factory = { context ->
        MapView(context).also { mapView -> onMapViewCreated(mapView); mapView.mapboxMap.loadStyleUri(STYLE_URI) { if (locate) mapView.location.updateSettings { enabled = true } }
            mapView.mapboxMap.setCamera(com.mapbox.maps.CameraOptions.Builder().center(com.mapbox.geojson.Point.fromLngLat(1.5218,42.5063)).zoom(13.2).pitch(pitch.toDouble()).bearing(-12.8).build())
        }
    }, update = { mapView -> mapView.mapboxMap.setCamera(com.mapbox.maps.CameraOptions.Builder().pitch(pitch.toDouble()).build()); if (locate) mapView.location.updateSettings { enabled = true } })
}

