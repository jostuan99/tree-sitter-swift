// swift-tools-version:5.6

import Foundation
import PackageDescription

let dir = Context.packageDirectory
var sources = ["src/parser.c"]
if FileManager.default.fileExists(atPath: "\(dir)/src/scanner.c") {
    sources.append("src/scanner.c")
}

let package = Package(
    name: "TreeSitterSwift",
    products: [
        .library(name: "TreeSitterSwift", targets: ["TreeSitterSwift"]),
    ],
    dependencies: [
        .package(url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.10.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterSwift",
            dependencies: [],
            path: ".",
            // `test/repos` holds cloned Swift projects for the smoke test.
            exclude: ["test", "node_modules", "examples", "scripts", "docs", "build", "target"]
                .filter { FileManager.default.fileExists(atPath: "\(dir)/\($0)") },
            sources: sources,
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterSwiftTests",
            dependencies: [
                .product(name: "SwiftTreeSitter", package: "swift-tree-sitter"),
                "TreeSitterSwift",
            ],
            path: "bindings/swift/TreeSitterSwiftTests"
        )
    ],
    cLanguageStandard: .c11
)
