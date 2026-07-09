import AppKit
import Foundation

func loadBitmap(from path: String) -> (NSBitmapImageRep, Int, Int)? {
    guard let image = NSImage(contentsOfFile: path),
          let tiff = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiff) else { return nil }
    return (bitmap, bitmap.pixelsWide, bitmap.pixelsHigh)
}

func isOrange(r: CGFloat, g: CGFloat, b: CGFloat) -> Bool {
    // Keep vibrant orange; drop white / grey JPEG artifacts
    return r > 0.62 && g > 0.38 && b < 0.42 && r > g && g > b * 1.1
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

func cropLayer(from bitmap: NSBitmapImageRep, width: Int, height: Int, yStart: Int, yEnd: Int) -> NSBitmapImageRep {
    let layerHeight = yEnd - yStart
    let out = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: layerHeight,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!

    for y in 0..<layerHeight {
        for x in 0..<width {
            guard let color = bitmap.colorAt(x: x, y: yStart + y) else { continue }
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

let partsDir = "\(root)/assets/parts"
try? FileManager.default.createDirectory(atPath: partsDir, withIntermediateDirectories: true)

let clean = processBitmap(bitmap, width: width, height: height)
savePNG(clean, to: "\(root)/assets/logo.png")

// Layer bands tuned to the logo layout (1024×984)
let layers: [(String, Int, Int)] = [
    ("dot",   895, 984),
    ("arc",   800, 910),
    ("sim",   480, 820),
    ("yalla",  60, 500),
]

for (name, y0, y1) in layers {
    let layer = cropLayer(from: clean, width: width, height: height, yStart: y0, yEnd: y1)
    savePNG(layer, to: "\(partsDir)/\(name).png")
}

print("Processed logo + \(layers.count) parts")
