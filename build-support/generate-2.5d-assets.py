#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

root = Path(sys.argv[1] if len(sys.argv) > 1 else "dist").resolve()
source = root / "assets" / "concierge" / "motions" / "re_motion_15_notification.webp"
out_dir = root / "assets" / "concierge" / "2_5d"
if not source.exists():
    raise SystemExit(f"existing RE character source missing: {source}")
out_dir.mkdir(parents=True, exist_ok=True)

image = Image.open(source).convert("RGBA")
arr = np.array(image)
h, w = arr.shape[:2]
alpha = arr[:, :, 3] > 8
r, g, b = [arr[:, :, i].astype(np.int16) for i in range(3)]


def polygon(points):
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return np.array(mask) > 0


def ellipse(bounds):
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).ellipse(bounds, fill=255)
    return np.array(mask) > 0

hair_color = alpha & (b > 150) & (r > 105) & (g > 95) & (b >= g)
head_zone = ellipse((205, 120, 580, 445))
eye_zone = ellipse((250, 245, 505, 365))
blue_eye = alpha & eye_zone & (b > 150) & (g > 95) & (b > r + 20)

phone = alpha & polygon([(137, 337), (226, 320), (288, 486), (202, 525), (132, 438)])
right_arm = alpha & polygon([(500, 245), (590, 250), (650, 332), (620, 505), (505, 505), (468, 370)])
left_arm = alpha & polygon([(120, 385), (205, 345), (365, 430), (350, 575), (210, 590), (120, 505)])
eyes = blue_eye

used = phone | right_arm | left_arm | eyes
hair_front = alpha & hair_color & head_zone & ~used
used |= hair_front
head_face = alpha & head_zone & ~used
used |= head_face

yy, xx = np.indices((h, w))
body_zone = (yy >= 365) & (xx >= 205) & (xx <= 600)
body = alpha & body_zone & ~hair_color & ~used
used |= body
hair_back = alpha & ~used

layers = [
    ("hair_back", hair_back),
    ("body", body),
    ("head_face", head_face),
    ("hair_front", hair_front),
    ("left_arm", left_arm),
    ("right_arm", right_arm),
    ("phone", phone),
    ("eyes", eyes),
]
counts = {}
for name, mask in layers:
    out = np.zeros_like(arr)
    out[mask] = arr[mask]
    Image.fromarray(out, "RGBA").save(out_dir / f"{name}.png", optimize=True)
    counts[name] = int((out[:, :, 3] > 0).sum())

shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
ImageDraw.Draw(shadow).ellipse((245, 555, 565, 594), fill=(58, 70, 91, 58))
shadow.save(out_dir / "shadow.png", optimize=True)
counts["shadow"] = int((np.array(shadow)[:, :, 3] > 0).sum())

if any(count < 150 for name, count in counts.items() if name != "shadow"):
    raise SystemExit(f"2.5D segmentation produced an empty layer: {counts}")

# Guard against the previous pale rectangle regression: every layer must have fully
# transparent corners and a substantial amount of alpha-zero canvas.
alpha_zero = {}
for path in sorted(out_dir.glob("*.png")):
    layer = np.array(Image.open(path).convert("RGBA"))[:, :, 3]
    corners = [int(layer[0,0]), int(layer[0,-1]), int(layer[-1,0]), int(layer[-1,-1])]
    zero_pct = float((layer == 0).mean() * 100.0)
    if any(c != 0 for c in corners) or zero_pct < 20.0:
        raise SystemExit(f"non-transparent layer background: {path.name} corners={corners} zero_pct={zero_pct}")
    alpha_zero[path.name] = zero_pct

manifest = {
    "source": str(source.relative_to(root)),
    "canvas": [w, h],
    "layers": counts,
    "alpha_zero_pct": alpha_zero,
}
(out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(manifest, ensure_ascii=False, indent=2))
