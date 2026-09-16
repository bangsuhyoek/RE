#!/usr/bin/env python3
from __future__ import annotations
import json
import re
import sys
from pathlib import Path
import numpy as np
from PIL import Image

if len(sys.argv) != 5:
    raise SystemExit("usage: check-poc-screenshots.py <active.png> <baseline.png> <active.log> <out.json>")

active_path, baseline_path, log_path, out_path = map(Path, sys.argv[1:])
active = np.array(Image.open(active_path).convert("RGB"))
baseline = np.array(Image.open(baseline_path).convert("RGB"))
assert active.shape == baseline.shape, (active.shape, baseline.shape)
h, w = active.shape[:2]

log = log_path.read_text(encoding="utf-8", errors="ignore")
m = re.search(
    r"bounds=x:(\d+),y:(\d+),w:(\d+),h:(\d+) screen=(\d+)x(\d+) statusBar=(\d+)",
    log,
)
assert m, "overlay geometry missing from active log"
ox, oy, ow, oh, sw, sh, status = map(int, m.groups())
assert (sw, sh) == (w, h), ((sw, sh), (w, h))
assert oy >= status
assert oy + oh <= h

delta = np.max(np.abs(active.astype(np.int16) - baseline.astype(np.int16)), axis=2)
diff = delta > 22

# Heads-up must create a substantial visual change above the overlay while
# ignoring the status-bar clock/icons themselves.
top_start = min(h, status + 8)
top_end = max(top_start + 1, min(h, oy - 8))
top = diff[top_start:top_end]
top_rows = np.sum(top, axis=1)
row_threshold = max(35, int(w * 0.05))
ys = np.where(top_rows >= row_threshold)[0]
assert len(ys), {
    "reason": "no substantial heads-up visual region above overlay",
    "top_start": top_start,
    "top_end": top_end,
    "max_changed_pixels_per_row": int(top_rows.max(initial=0)),
}
heads_top = int(ys.min() + top_start)
heads_bottom = int(ys.max() + top_start)
assert heads_bottom < oy - 8, (heads_bottom, oy)

# The known overlay window must contain a visible, non-blank rendered frame.
roi = active[oy:oy+oh, ox:ox+ow]
roi_diff = diff[oy:oy+oh, ox:ox+ow]
overlay_changed_ratio = float(roi_diff.mean())
assert overlay_changed_ratio > 0.015, overlay_changed_ratio

# A blank white rectangle is not accepted as a rendered concierge.
nonwhite = np.any(roi < 238, axis=2)
nonwhite_ratio = float(nonwhite.mean())
channel_std = float(roi.astype(np.float32).std())
assert nonwhite_ratio > 0.08, nonwhite_ratio
assert channel_std > 18.0, channel_std

# With the broadcast trigger, most of the screen outside the expected heads-up
# and overlay regions should remain the same launcher frame.
allowed = np.zeros((h, w), dtype=bool)
allowed[max(0, heads_top-12):min(h, heads_bottom+13), :] = True
allowed[max(0, oy-8):min(h, oy+oh+8), max(0, ox-8):min(w, ox+ow+8)] = True
allowed[:status+8, :] = True
outside_ratio = float((diff & ~allowed).mean())
assert outside_ratio < 0.08, outside_ratio

gap = oy - heads_bottom - 1
assert gap >= 8, gap

result = {
    "screen": {"width": w, "height": h},
    "status_bar_height": status,
    "heads_up_visual_bounds": {"top": heads_top, "bottom": heads_bottom},
    "overlay_bounds": {"x": ox, "y": oy, "w": ow, "h": oh},
    "vertical_gap_px": gap,
    "overlay_changed_ratio": overlay_changed_ratio,
    "overlay_nonwhite_ratio": nonwhite_ratio,
    "overlay_rgb_std": channel_std,
    "outside_expected_regions_changed_ratio": outside_ratio,
}
out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
print("VISUAL_NON_OVERLAP_PASS", json.dumps(result))
