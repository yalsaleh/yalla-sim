#!/usr/bin/env python3
"""Extract splash logo layers as whole curved shapes (no straight crops).

Connected components on the reference logo, ordered by distance from the
Wi‑Fi origin (bottom center):

  1. dot
  2. arc
  3. sim   (S + I + I-dot + M)
  4. yalla (5 letters)

Each part is a full-canvas transparent PNG so layers stack aligned in CSS.
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


def orange_mask(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.float32)
    g = rgb[:, :, 1].astype(np.float32)
    b = rgb[:, :, 2].astype(np.float32)
    mask = (r > 180) & (g > 70) & (b < 140) & (r > g + 15) & (r > b + 30)
    mask &= ~((r > 245) & (g > 245) & (b > 245))
    return mask


def connected_components(mask: np.ndarray, min_area: int = 20) -> list[np.ndarray]:
    h, w = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    comps: list[np.ndarray] = []

    for y0 in range(h):
        for x0 in range(w):
            if not mask[y0, x0] or visited[y0, x0]:
                continue
            q = deque([(y0, x0)])
            visited[y0, x0] = True
            pts: list[tuple[int, int]] = []
            while q:
                y, x = q.popleft()
                pts.append((y, x))
                for dy, dx in (
                    (-1, 0), (1, 0), (0, -1), (0, 1),
                    (-1, -1), (-1, 1), (1, -1), (1, 1),
                ):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        q.append((ny, nx))
            if len(pts) >= min_area:
                comps.append(np.array(pts))
    return comps


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[1])
    assets = root / "assets"
    parts_dir = assets / "parts"
    parts_dir.mkdir(parents=True, exist_ok=True)

    for candidate in (
        assets / "logo-reference.png",
        assets / "logo-source.jpg",
        assets / "logo.png",
    ):
        if candidate.exists():
            source = candidate
            break
    else:
        print("No logo source found", file=sys.stderr)
        return 1

    rgb = np.array(Image.open(source).convert("RGB"))
    mask = orange_mask(rgb)
    h, w = mask.shape
    ys, xs = np.where(mask)
    if len(ys) == 0:
        print("No orange pixels found", file=sys.stderr)
        return 1

    cx = float(xs[ys > int(ys.max()) - 50].mean())
    cy = float(ys.max()) + 12.0

    scored = []
    for pts in connected_components(mask):
        my, mx = float(pts[:, 0].mean()), float(pts[:, 1].mean())
        scored.append((float(np.hypot(mx - cx, my - cy)), pts))
    scored.sort(key=lambda t: t[0])

    if len(scored) < 6:
        print(f"Expected at least 6 components, found {len(scored)}", file=sys.stderr)
        return 1

    layers = {name: np.zeros((h, w), dtype=bool) for name in ("dot", "arc", "sim", "yalla")}
    for i, (radius, pts) in enumerate(scored):
        if i == 0:
            name = "dot"
        elif i == 1:
            name = "arc"
        elif i < 6:
            name = "sim"
        else:
            name = "yalla"
        layers[name][pts[:, 0], pts[:, 1]] = True
        print(f"  [{i}] r={radius:6.1f} area={len(pts):5d} → {name}")

    full = np.zeros((h, w, 4), dtype=np.uint8)
    full[mask, :3] = rgb[mask]
    full[mask, 3] = 255
    Image.fromarray(full).save(assets / "logo.png")

    for name in ("dot", "arc", "sim", "yalla"):
        m = layers[name]
        out = np.zeros((h, w, 4), dtype=np.uint8)
        out[m, :3] = rgb[m]
        out[m, 3] = 255
        Image.fromarray(out).save(parts_dir / f"{name}.png")
        print(f"wrote {name}.png ({int(m.sum())} px)")

    print(f"Done from {source.name} center=({cx:.1f},{cy:.1f})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
