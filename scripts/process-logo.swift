import AppKit
import Foundation

func loadBitmap(from path: String) -> (NSBitmapImageRep, Int, Int)? {
    guard let image = NSImage(contentsOfFile: path),
          let tiff = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiff) else { return nil }
    return (bitmap, bitmap.pixelsWide, bitmap.pixelsHigh)
}

func isOrange(r: CGFloat, g: CGFloat, b: CGFloat) -> Bool {
    // Keep logo orange; drop black / cream JPEG background
    return r > 0.47 && g > 0.16 && b < 0.59 && r > g && (r - b) > 0.16
}

func processBitmap(_ source: NSBitmapImageRep, width: Int, height: Int) -> NSBitmapImageRep {
    let out = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!

    for y in 0..<height {
        for x in 0..<width {
            guard let color = source.colorAt(x: x, y: y) else { continue }
            var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
            color.getRed(&r, green: &g, blue: &b, alpha: &a)

            if isOrange(r: r, g: g, b: b) {
                out.setColor(NSColor(red: r, green: g, blue: b, alpha: 1), atX: x, y: y)
            } else {
                out.setColor(.clear, atX: x, y: y)
            }
        }
    }
    return out
}

/// Full-canvas layer: same size as logo, only yStart..<yEnd band kept opaque.
func extractLayer(from bitmap: NSBitmapImageRep, width: Int, height: Int, yStart: Int, yEnd: Int) -> NSBitmapImageRep {
    let out = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!

    let start = max(0, yStart)
    let end = min(height, yEnd)

    for y in 0..<height {
        for x in 0..<width {
            if y < start || y >= end {
                out.setColor(.clear, atX: x, y: y)
                continue
            }
            guard let color = bitmap.colorAt(x: x, y: y) else {
                out.setColor(.clear, atX: x, y: y)
                continue
            }
            var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
            color.getRed(&r, green: &g, blue: &b, alpha: &a)
            if a > 0.05 && isOrange(r: r, g: g, b: b) {
                out.setColor(NSColor(red: r, green: g, blue: b, alpha: 1), atX: x, y: y)
            } else {
                out.setColor(.clear, atX: x, y: y)
            }
        }
    }
    return out
}

func savePNG(_ bitmap: NSBitmapImageRep, to path: String) {
    guard let data = bitmap.representation(using: .png, properties: [:]) else { return }
    try? data.write(to: URL(fileURLWithPath: path))
}

let root = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : FileManager.default.currentDirectoryPath

let input = "\(root)/assets/logo-source.jpg"
let fallback = "\(root)/assets/logo.png"
let sourcePath = FileManager.default.fileExists(atPath: input) ? input : fallback

guard let (bitmap, width, height) = loadBitmap(from: sourcePath) else {
    fputs("Failed to load logo\n", stderr)
    exit(1)
}

print("Source: \(sourcePath) (\(width)x\(height))")

let partsDir = "\(root)/assets/parts"
try? FileManager.default.createDirectory(atPath: partsDir, withIntermediateDirectories: true)

let clean = processBitmap(bitmap, width: width, height: height)
savePNG(clean, to: "\(root)/assets/logo.png")

// Layer bands tuned to logo-source.jpg content (~y 290–640 on 1024×984)
let layers: [(String, Int, Int)] = [
    ("dot",   608, 645),
    ("arc",   555, 612),
    ("sim",   485, 560),
    ("yalla", 290, 495),
]

for (name, y0, y1) in layers {
    let layer = extractLayer(from: clean, width: width, height: height, yStart: y0, yEnd: y1)
    savePNG(layer, to: "\(partsDir)/\(name).png")
    print("  wrote \(name).png  band \(y0)-\(y1)")
}

print("Processed logo + \(layers.count) full-canvas parts")
