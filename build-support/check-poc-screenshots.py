#!/usr/bin/env python3
from __future__ import annotations
import json
import re
import sys
from pathlib import Path
import numpy as np
from PIL import Image

if len(sys.argv) < 5:
    raise SystemExit("usage: check-poc-screenshots.py <baseline.png> <active.log> <out.json> <candidate.png> [candidate2.png ...]")

baseline_path=Path(sys.argv[1])
log_path=Path(sys.argv[2])
out_path=Path(sys.argv[3])
candidate_paths=[Path(x) for x in sys.argv[4:]]

baseline=np.array(Image.open(baseline_path).convert("RGB"))
h,w=baseline.shape[:2]
log=log_path.read_text(encoding="utf-8",errors="ignore")
m=re.search(r"bounds=x:(\d+),y:(\d+),w:(\d+),h:(\d+) screen=(\d+)x(\d+) statusBar=(\d+)",log)
assert m, "overlay geometry missing from active log"
ox,oy,ow,oh,sw,sh,status=map(int,m.groups())
assert sw == w, (sw,w)

# WindowManager's y is measured from the app-visible display below the status bar,
# while screencap includes the status bar. Translate into full screenshot coords.
full_oy=oy+status
assert 0 <= full_oy < h and full_oy+oh <= h, (full_oy,oh,h)

diagnostics=[]
winner=None
for path in candidate_paths:
    active=np.array(Image.open(path).convert("RGB"))
    if active.shape != baseline.shape:
        diagnostics.append({"file":str(path),"reason":"shape_mismatch","shape":list(active.shape)})
        continue

    delta=np.max(np.abs(active.astype(np.int16)-baseline.astype(np.int16)),axis=2)
    diff=delta>22

    # Heads-up: substantial localized visual change between status bar and overlay.
    top_start=min(h,status+8)
    top_end=max(top_start+1,min(h,full_oy-8))
    top=diff[top_start:top_end]
    top_rows=np.sum(top,axis=1)
    row_threshold=max(35,int(w*0.05))
    ys=np.where(top_rows>=row_threshold)[0]

    roi=active[full_oy:full_oy+oh,ox:ox+ow]
    roi_diff=diff[full_oy:full_oy+oh,ox:ox+ow]
    overlay_changed_ratio=float(roi_diff.mean())
    nonwhite_ratio=float(np.any(roi<238,axis=2).mean())
    channel_std=float(roi.astype(np.float32).std())

    d={
        "file":str(path),
        "top_max_changed_pixels_per_row":int(top_rows.max(initial=0)),
        "overlay_changed_ratio":overlay_changed_ratio,
        "overlay_nonwhite_ratio":nonwhite_ratio,
        "overlay_rgb_std":channel_std,
    }
    if not len(ys):
        d["reason"]="heads_up_not_visible"
        diagnostics.append(d)
        continue

    heads_top=int(ys.min()+top_start)
    heads_bottom=int(ys.max()+top_start)
    gap=full_oy-heads_bottom-1
    d.update({"heads_top":heads_top,"heads_bottom":heads_bottom,"gap":gap})

    if heads_bottom >= full_oy-8:
        d["reason"]="heads_up_overlaps_overlay"
        diagnostics.append(d)
        continue
    if overlay_changed_ratio <= 0.015 or nonwhite_ratio <= 0.08 or channel_std <= 18.0:
        d["reason"]="concierge_not_visibly_rendered"
        diagnostics.append(d)
        continue
    if gap < 8:
        d["reason"]="insufficient_visual_gap"
        diagnostics.append(d)
        continue

    allowed=np.zeros((h,w),dtype=bool)
    allowed[max(0,heads_top-12):min(h,heads_bottom+13),:]=True
    allowed[max(0,full_oy-8):min(h,full_oy+oh+8),max(0,ox-8):min(w,ox+ow+8)]=True
    allowed[:status+8,:]=True
    outside_ratio=float((diff & ~allowed).mean())
    d["outside_expected_regions_changed_ratio"]=outside_ratio
    if outside_ratio >= 0.08:
        d["reason"]="background_not_stable"
        diagnostics.append(d)
        continue

    winner=d
    winner["reason"]="pass"
    break

assert winner is not None, {"reason":"no burst frame showed both Heads-up and concierge","diagnostics":diagnostics}

result={
    "screen":{"width":w,"height":h},
    "logged_visible_display":{"width":sw,"height":sh},
    "status_bar_height":status,
    "selected_frame":winner["file"],
    "heads_up_visual_bounds":{"top":winner["heads_top"],"bottom":winner["heads_bottom"]},
    "overlay_bounds":{"x":ox,"y":full_oy,"w":ow,"h":oh},
    "vertical_gap_px":winner["gap"],
    "overlay_changed_ratio":winner["overlay_changed_ratio"],
    "overlay_nonwhite_ratio":winner["overlay_nonwhite_ratio"],
    "overlay_rgb_std":winner["overlay_rgb_std"],
    "outside_expected_regions_changed_ratio":winner["outside_expected_regions_changed_ratio"],
    "all_frame_diagnostics":diagnostics+[winner],
}
out_path.write_text(json.dumps(result,indent=2),encoding="utf-8")
print("VISUAL_NON_OVERLAP_PASS",json.dumps(result))
