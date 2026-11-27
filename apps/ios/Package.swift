// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "BastionGIS",
    platforms: [.iOS(.v17)],
    products: [.library(name: "BastionGIS", targets: ["BastionGIS"])],
    dependencies: [
        .package(url: "https://github.com/mapbox/mapbox-maps-ios.git", from: "11.34.2"),
        .package(url: "https://github.com/PostHog/posthog-ios.git", from: "3.93.1")
    ],
    targets: [.target(name: "BastionGIS", dependencies: [
        .product(name: "MapboxMaps", package: "mapbox-maps-ios"),
        .product(name: "PostHog", package: "posthog-ios")
    ])]
)
