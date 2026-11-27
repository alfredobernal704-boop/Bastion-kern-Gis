package com.bastionkern.gis

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/** Values mirror the BASTION · Color, Dimensions and Motion collections in Figma. */
internal object BastionColors {
    val color_canvas = Color(0xFFF6F4EF)
    val color_surface = Color(0xFFFFFFFF)
    val color_text_strong = Color(0xFF23364D)
    val color_text_muted = Color(0xFF566676)
    val color_text_on_brand = Color(0xFFFFFFFF)
    val color_brand_teal = Color(0xFF3E7C78)
    val color_brand_sky = Color(0xFF9DC8DF)
    val color_brand_meadow = Color(0xFFD1E3D5)
    val color_brand_copper = Color(0xFFC47B4C)
    val color_map_building = Color(0xFFD6E0E8)
    val color_stroke_subtle = Color(0xFFD6E0E8)
}

internal object BastionDimensions {
    val space_1 = 4.dp; val space_2 = 8.dp; val space_3 = 12.dp
    val space_4 = 16.dp; val space_5 = 20.dp; val space_6 = 24.dp; val space_8 = 32.dp
    val radius_control = 12.dp; val radius_card = 18.dp; val radius_pill = 999.dp
}

internal object BastionMotion {
    const val motion_quick = 160
    const val motion_control = 240
    const val motion_camera = 350
}

