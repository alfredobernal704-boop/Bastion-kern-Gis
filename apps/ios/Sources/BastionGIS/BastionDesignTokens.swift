import SwiftUI

/// Values mirror the BASTION · Color, Dimensions and Motion collections in Figma.
public enum BastionColor {
    public static let color_canvas = Color(red: 246/255, green: 244/255, blue: 239/255)
    public static let color_surface = Color.white
    public static let color_text_strong = Color(red: 35/255, green: 54/255, blue: 77/255)
    public static let color_text_muted = Color(red: 86/255, green: 102/255, blue: 118/255)
    public static let color_text_on_brand = Color.white
    public static let color_brand_teal = Color(red: 62/255, green: 124/255, blue: 120/255)
    public static let color_brand_sky = Color(red: 157/255, green: 200/255, blue: 223/255)
    public static let color_brand_meadow = Color(red: 209/255, green: 227/255, blue: 213/255)
    public static let color_brand_copper = Color(red: 196/255, green: 123/255, blue: 76/255)
    public static let color_map_building = Color(red: 214/255, green: 224/255, blue: 232/255)
    public static let color_stroke_subtle = Color(red: 214/255, green: 224/255, blue: 232/255)
}

public enum BastionDimension {
    public static let space_1: CGFloat = 4; public static let space_2: CGFloat = 8; public static let space_3: CGFloat = 12
    public static let space_4: CGFloat = 16; public static let space_5: CGFloat = 20; public static let space_6: CGFloat = 24; public static let space_8: CGFloat = 32
    public static let radius_control: CGFloat = 12; public static let radius_card: CGFloat = 18; public static let radius_pill: CGFloat = 999
}

public enum BastionMotion {
    public static let motion_quick: Double = 0.16
    public static let motion_control: Double = 0.24
    public static let motion_camera: Double = 0.35
}

