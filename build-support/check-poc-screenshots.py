#!/usr/bin/env python3
from __future__ import annotations
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image

if len(sys.argv) != 4:
    raise SystemExit("usage: check-poc-screenshots.py <during.png> <after.png> <out.json>")

during_path, after_path, out_path = map(Path, sys.argv[1:])
during = np.array(Image.open(during_path).convert("RGB"))
after = np.array(Image.open(after_path).convert("RGB"))
assert during.shape == after.shape, (during.shape, after.shape)
h, w = during.shape[:2]

diff = np.max(np.abs(during.astype(np.int16) - after.astype(np.int16)), axis=2) > 18
rows = np.sum(diff, axis=1)
threshold = max(20, int(w * 0.015))
ys = np.where(rows > threshold)[0]

clusters = []
if len(ys):
    start = prev = int(ys[0])
    for y in ys[1:]:
        y = int(y)
        if y > prev + 3:
            clusters.append((start, prev, int(rows[start:prev+1].max())))
            start = y
        prev = y
    clusters.append((start, prev, int(rows[start:prev+1].max())))

# Ignore tiny status-bar/time changes. Heads-up is expected in the upper quarter,
# while the concierge overlay is positioned below it.
substantial = [c for c in clusters if c[1] - c[0] >= 20]
top = [c for c in substantial if c[0] < int(h * 0.25)]
lower = [c for c in substantial if c[0] >= int(h * 0.12)]

assert top, {"clusters": clusters, "reason": "heads-up visual region not detected"}
assert lower, {"clusters": clusters, "reason": "overlay visual region not detected"}

top_cluster = min(top, key=lambda c: c[0])
# Prefer a clearly lower cluster, not the same heads-up cluster.
lower_candidates = [c for c in lower if c[0] > top_cluster[1] + 10]
assert lower_candidates, {"clusters": clusters, "reason": "no separate overlay region below heads-up"}
overlay_cluster = max(lower_candidates, key=lambda c: c[1] - c[0])

gap = overlay_cluster[0] - top_cluster[1] - 1
assert gap >= 10, {"heads_up": top_cluster, "overlay": overlay_cluster, "gap": gap}

result = {
    "screen": {"width": int(w), "height": int(h)},
    "heads_up_cluster": list(top_cluster),
    "overlay_cluster": list(overlay_cluster),
    "vertical_gap_px": int(gap),
    "clusters": [list(c) for c in clusters],
}
out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
print("VISUAL_NON_OVERLAP_PASS", json.dumps(result))
