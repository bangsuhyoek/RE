#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import os
import shutil
import sys
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "poc-build-src").resolve()

def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise RuntimeError(f"{label}: target not found in {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")

def reconstruct_source() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    archive = OUT.parent / "re-poc-source.zip"
    with archive.open("wb") as target:
        for chunk in sorted((ROOT / "source-chunks").glob("*.bin")):
            target.write(chunk.read_bytes())
    with zipfile.ZipFile(archive) as zf:
        zf.extractall(OUT)
    archive.unlink(missing_ok=True)

def overlay_rich_web() -> None:
    external = os.environ.get("RE_WEB_ASSETS_ZIP", "").strip()
    if external:
        source = Path(external).resolve()
        if not source.exists():
            raise RuntimeError(f"RE_WEB_ASSETS_ZIP not found: {source}")
        with zipfile.ZipFile(source) as zf:
            files = [entry for entry in zf.infolist() if not entry.is_dir()]
            names = {entry.filename for entry in files}
            if "app.js" in names:
                prefix = ""
            elif "public/app.js" in names:
                prefix = "public/"
            else:
                raise RuntimeError("external v2.0.2 web bundle missing app.js")
            for entry in files:
                if prefix and not entry.filename.startswith(prefix):
                    continue
                raw = entry.filename[len(prefix):] if prefix else entry.filename
                rel = Path(raw)
                if not raw or rel.is_absolute() or ".." in rel.parts:
                    raise RuntimeError(f"unsafe web asset path: {entry.filename}")
                dest = OUT / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(entry) as src, dest.open("wb") as dst:
                    shutil.copyfileobj(src, dst)
        print(f"Using external WebView Source of Truth: {source}")
        return

    baseline = ROOT / "poc-baseline" / "v2.0.0.apk"
    if not baseline.exists():
        raise RuntimeError("pinned v2.0.0 rich UI baseline missing")
    prefix = "assets/public/"
    with zipfile.ZipFile(baseline) as zf:
        for entry in zf.infolist():
            if not entry.filename.startswith(prefix) or entry.is_dir():
                continue
            rel = Path(entry.filename[len(prefix):])
            dest = OUT / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(entry) as src, dest.open("wb") as dst:
                shutil.copyfileobj(src, dst)

def pin_latest_native() -> None:
    native = ROOT / "poc-native-base" / "android"
    shutil.copy2(native / "app" / "build.gradle", OUT / "android" / "app" / "build.gradle")
    shutil.copy2(native / "variables.gradle", OUT / "android" / "variables.gradle")
    shutil.copy2(
        native / "app" / "src" / "main" / "AndroidManifest.xml",
        OUT / "android" / "app" / "src" / "main" / "AndroidManifest.xml",
    )
    java_src = native / "app" / "src" / "main" / "java" / "com" / "submate" / "app"
    java_dst = OUT / "android" / "app" / "src" / "main" / "java" / "kr" / "co" / "re" / "subscription"
    java_dst.mkdir(parents=True, exist_ok=True)
    shutil.copy2(java_src / "MainActivity.java", java_dst / "MainActivity.java")
    pay_dst = java_dst / "payment"
    pay_dst.mkdir(parents=True, exist_ok=True)
    for src in (java_src / "payment").glob("*.java"):
        shutil.copy2(src, pay_dst / src.name)

def install_poc_native_templates() -> None:
    template = ROOT / "poc-src-templates" / "java"
    dst = OUT / "android" / "app" / "src" / "main" / "java" / "kr" / "co" / "re" / "subscription" / "payment"
    for src in template.glob("*.java"):
        shutil.copy2(src, dst / src.name)

    debug_java = OUT / "android" / "app" / "src" / "debug" / "java" / "kr" / "co" / "re" / "subscription" / "payment"
    debug_java.mkdir(parents=True, exist_ok=True)
    shutil.copy2(
        ROOT / "poc-src-templates" / "debug" / "PocPaymentReceiver.java",
        debug_java / "PocPaymentReceiver.java",
    )
    debug_manifest = OUT / "android" / "app" / "src" / "debug" / "AndroidManifest.xml"
    debug_manifest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "poc-src-templates" / "debug" / "AndroidManifest.xml", debug_manifest)

def patch_android_config() -> None:
    gradle = OUT / "android" / "app" / "build.gradle"
    text = gradle.read_text(encoding="utf-8")
    text = text.replace("versionCode 202", "versionCode 203")
    text = text.replace('versionName "2.0.2"', 'versionName "2.0.3-poc1"')
    lottie = '    implementation "com.airbnb.android:lottie:6.6.7"\n'
    if "com.airbnb.android:lottie" not in text:
        marker = "dependencies {\n"
        if marker not in text:
            raise RuntimeError("dependencies block missing")
        text = text.replace(marker, marker + lottie, 1)
    gradle.write_text(text, encoding="utf-8")

    variables = OUT / "android" / "variables.gradle"
    v = variables.read_text(encoding="utf-8")
    v = v.replace("targetSdkVersion = 34", "targetSdkVersion = 36")
    v = v.replace("targetSdkVersion = 35", "targetSdkVersion = 36")
    v = v.replace("compileSdkVersion = 34", "compileSdkVersion = 36")
    v = v.replace("compileSdkVersion = 35", "compileSdkVersion = 36")
    variables.write_text(v, encoding="utf-8")

    manifest = OUT / "android" / "app" / "src" / "main" / "AndroidManifest.xml"
    m = manifest.read_text(encoding="utf-8")
    permission = '    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />'
    if "android.permission.SYSTEM_ALERT_WINDOW" not in m:
        m = m.replace("</manifest>", permission + "\n</manifest>")
    m = m.replace('    <uses-permission android:name="android.permission.CAMERA" />\n', "")
    manifest.write_text(m, encoding="utf-8")

def patch_web_bridge() -> None:
    app = OUT / "app.js"
    app_text = app.read_text(encoding="utf-8")
    needle = '  try { window.localStorage.setItem(conciergeStorageKey, String(conciergeEnabled)); }\n  catch (_error) {}'
    replacement = needle + '''
  try {
    const nativeConcierge = window.Capacitor?.Plugins?.PaymentCapture;
    if (nativeConcierge?.setConciergeEnabled) {
      void nativeConcierge.setConciergeEnabled({ enabled: conciergeEnabled });
    }
  } catch (_error) {}'''
    if "nativeConcierge?.setConciergeEnabled" not in app_text:
        if needle not in app_text:
            raise RuntimeError("concierge preference sync insertion point missing")
        app_text = app_text.replace(needle, replacement, 1)

    old_toggle = '''  setConciergeEnabled(next);
  document.querySelectorAll("[data-concierge-toggle]").forEach((button) => { button.disabled = false; });'''
    new_toggle = '''  setConciergeEnabled(next);
  if (next) {
    try {
      const nativeConcierge = window.Capacitor?.Plugins?.PaymentCapture;
      const status = nativeConcierge?.checkAnimatedConciergePermission
        ? await nativeConcierge.checkAnimatedConciergePermission()
        : null;
      if (status && status.granted !== true && nativeConcierge?.requestAnimatedConciergePermission) {
        await nativeConcierge.requestAnimatedConciergePermission();
      }
    } catch (_error) {}
  }
  document.querySelectorAll("[data-concierge-toggle]").forEach((button) => { button.disabled = false; });'''
    if "checkAnimatedConciergePermission" not in app_text:
        if old_toggle not in app_text:
            raise RuntimeError("manual concierge permission insertion point missing")
        app_text = app_text.replace(old_toggle, new_toggle, 1)

    init_marker = "async function initializeApp() {\n"
    init_sync = '''async function initializeApp() {
  try {
    const nativeConcierge = window.Capacitor?.Plugins?.PaymentCapture;
    if (nativeConcierge?.setConciergeEnabled) {
      await nativeConcierge.setConciergeEnabled({ enabled: conciergeEnabled });
    }
  } catch (_error) {}
'''
    if "await nativeConcierge.setConciergeEnabled({ enabled: conciergeEnabled });" not in app_text[app_text.find(init_marker):app_text.find(init_marker)+500]:
        if init_marker not in app_text:
            raise RuntimeError("initializeApp marker missing")
        app_text = app_text.replace(init_marker, init_sync, 1)
    app.write_text(app_text, encoding="utf-8")

    integration = OUT / "src" / "re-integration.js"
    it = integration.read_text(encoding="utf-8")
    old = '''  cache = { userId: user.id, subscriptions: rows || [], loadedAt: Date.now() };
  return cache.subscriptions;'''
    new = '''  cache = { userId: user.id, subscriptions: rows || [], loadedAt: Date.now() };
  try {
    const paymentCapture = window.Capacitor?.Plugins?.PaymentCapture;
    if (paymentCapture?.syncSubscriptionSnapshot) {
      const serviceIds = (rows || [])
        .map((row) => String(row.service_id || "").trim().toLowerCase())
        .filter(Boolean);
      await paymentCapture.syncSubscriptionSnapshot({ serviceIds });
    }
  } catch (_error) {}
  return cache.subscriptions;'''
    if "syncSubscriptionSnapshot" not in it:
        if old not in it:
            raise RuntimeError("subscription snapshot insertion point missing")
        it = it.replace(old, new, 1)
    integration.write_text(it, encoding="utf-8")

    native = OUT / "src" / "native.js"
    nt = native.read_text(encoding="utf-8")
    nt = nt.replace(
        "const BILLING_REMINDER_DAYS = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 14, 30]);",
        "const BILLING_REMINDER_DAYS = Object.freeze(Array.from({ length: 31 }, (_, index) => index));",
    )
    native.write_text(nt, encoding="utf-8")

    release = OUT / "release-config.js"
    if release.exists():
        rt = release.read_text(encoding="utf-8")
        import re
        rt = re.sub(r'build:\s*"[^"]+"', 'build: "re-v2.0.3-poc-2.5d-new-subscription"', rt, count=1)
        release.write_text(rt, encoding="utf-8")

def polygon_mask(size, points):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return np.array(mask) > 0

def ellipse_mask(size, bounds):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).ellipse(bounds, fill=255)
    return np.array(mask) > 0

def save_layer(arr: np.ndarray, mask: np.ndarray, path: Path) -> int:
    out = np.zeros_like(arr)
    out[mask] = arr[mask]
    image = Image.fromarray(out, "RGBA")
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)
    return int((out[:, :, 3] > 0).sum())

def generate_layers() -> tuple[list[str], int, int]:
    source = OUT / "assets" / "concierge" / "motions" / "re_motion_15_notification.webp"
    if not source.exists():
        raise RuntimeError(f"existing RE character asset missing: {source}")
    image = Image.open(source).convert("RGBA")
    arr = np.array(image)
    h, w = arr.shape[:2]
    alpha = arr[:, :, 3] > 8
    r, g, b = [arr[:, :, i].astype(np.int16) for i in range(3)]

    hair_color = alpha & (b > 150) & (r > 105) & (g > 95) & (b >= g)
    head_zone = ellipse_mask((w, h), (205, 120, 580, 445))
    eye_zone = ellipse_mask((w, h), (250, 245, 505, 365))
    blue_eye = alpha & eye_zone & (b > 150) & (g > 95) & (b > r + 20)

    phone = alpha & polygon_mask((w, h), [(137, 337), (226, 320), (288, 486), (202, 525), (132, 438)])
    right_arm = alpha & polygon_mask((w, h), [(500, 245), (590, 250), (650, 332), (620, 505), (505, 505), (468, 370)])
    left_arm = alpha & polygon_mask((w, h), [(120, 385), (205, 345), (365, 430), (350, 575), (210, 590), (120, 505)])
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

    android_images = OUT / "android" / "app" / "src" / "main" / "assets" / "concierge" / "images"
    web_root = OUT / "assets" / "concierge" / "lottie" / "new_subscription_detected"
    web_images = web_root / "images"
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
        counts[name] = save_layer(arr, mask, android_images / f"{name}.png")
        save_layer(arr, mask, web_images / f"{name}.png")

    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.ellipse((245, 555, 565, 594), fill=(58, 70, 91, 58))
    shadow.save(android_images / "shadow.png", optimize=True)
    shadow.save(web_images / "shadow.png", optimize=True)
    counts["shadow"] = 320 * 39

    if any(count < 150 for name, count in counts.items() if name != "shadow"):
        raise RuntimeError(f"2.5D layer segmentation produced an empty layer: {counts}")
    print("2.5D layer pixel counts:", counts)
    return [name for name, _ in layers] + ["shadow"], w, h

def ease(dims: int):
    return {
        "i": {"x": [0.667] * dims, "y": [1.0] * dims},
        "o": {"x": [0.333] * dims, "y": [0.0] * dims},
    }

def animated(values, dims):
    frames = []
    for idx, (t, value) in enumerate(values):
        item = {"t": t, "s": value}
        if idx + 1 < len(values):
            item["e"] = values[idx + 1][1]
            item.update(ease(dims))
        frames.append(item)
    return {"a": 1, "k": frames}

def static(value):
    return {"a": 0, "k": value}

def layer_transform(anchor, position, position_frames, scale_frames, rotation_frames, opacity_frames):
    return {
        "o": animated(opacity_frames, 1),
        "r": animated(rotation_frames, 1),
        "p": animated(position_frames, 3),
        "a": static([anchor[0], anchor[1], 0]),
        "s": animated(scale_frames, 3),
    }

def generate_lottie(layer_names, w, h) -> None:
    rest = {
        "hair_back": ((360, 300), (360, 300)),
        "body": ((360, 480), (360, 480)),
        "head_face": ((385, 300), (385, 300)),
        "hair_front": ((385, 275), (385, 275)),
        "left_arm": ((300, 420), (300, 420)),
        "right_arm": ((515, 390), (515, 390)),
        "phone": ((215, 425), (215, 425)),
        "eyes": ((380, 305), (380, 305)),
        "shadow": ((405, 575), (405, 575)),
    }
    configs = {
        "hair_back": {
            "p":[(0,[360,332,0]),(17,[360,294,0]),(29,[360,300,0]),(55,[358,298,0]),(82,[361,301,0]),(115,[360,299,0]),(145,[360,300,0]),(165,[360,320,0])],
            "s":[(0,[94,94,100]),(17,[102,99,100]),(29,[100,100,100]),(82,[101,100,100]),(145,[100,100,100]),(165,[96,96,100])],
            "r":[(0,[0]),(17,[-1.5]),(29,[0.8]),(55,[-1.8]),(82,[1.2]),(115,[-0.6]),(145,[0]),(165,[1.4])]},
        "body": {
            "p":[(0,[360,520,0]),(14,[360,474,0]),(22,[360,482,0]),(32,[360,480,0]),(118,[360,480,0]),(136,[360,478,0]),(145,[360,480,0]),(165,[360,503,0])],
            "s":[(0,[91,91,100]),(14,[104,97,100]),(22,[98,103,100]),(32,[100,100,100]),(118,[100,100,100]),(136,[100.7,99.4,100]),(145,[100,100,100]),(165,[96,96,100])],
            "r":[(0,[0]),(36,[0]),(73,[-1.2]),(108,[0.7]),(145,[0]),(165,[0])]},
        "head_face": {
            "p":[(0,[385,338,0]),(16,[385,291,0]),(28,[385,300,0]),(52,[380,294,0]),(80,[377,292,0]),(108,[390,299,0]),(126,[387,297,0]),(145,[385,300,0]),(165,[385,321,0])],
            "s":[(0,[92,92,100]),(16,[103,103,100]),(28,[100,100,100]),(52,[101.5,101.5,100]),(108,[101,101,100]),(145,[100,100,100]),(165,[96,96,100])],
            "r":[(0,[0]),(28,[0]),(52,[-2.0]),(80,[-4.0]),(108,[2.0]),(126,[0.8]),(145,[0]),(165,[1.0])]},
        "hair_front": {
            "p":[(0,[385,316,0]),(19,[385,266,0]),(31,[385,275,0]),(55,[379,269,0]),(84,[376,271,0]),(112,[390,276,0]),(130,[388,274,0]),(145,[385,275,0]),(165,[385,297,0])],
            "s":[(0,[93,93,100]),(19,[103,102,100]),(31,[100,100,100]),(55,[101.8,101.8,100]),(112,[101.2,101.2,100]),(145,[100,100,100]),(165,[96,96,100])],
            "r":[(0,[0]),(31,[1.0]),(58,[-3.2]),(86,[-5.0]),(114,[3.0]),(132,[1.0]),(145,[0]),(165,[1.4])]},
        "left_arm": {
            "p":[(0,[300,448,0]),(15,[300,414,0]),(28,[300,420,0]),(50,[296,414,0]),(79,[294,410,0]),(108,[300,421,0]),(145,[300,420,0]),(165,[300,440,0])],
            "s":[(0,[94,94,100]),(15,[102,100,100]),(28,[100,100,100]),(145,[100,100,100]),(165,[97,97,100])],
            "r":[(0,[0]),(28,[0]),(50,[-4]),(79,[-7]),(108,[2]),(145,[0]),(165,[0])]},
        "right_arm": {
            "p":[(0,[515,420,0]),(18,[515,383,0]),(31,[515,390,0]),(56,[518,383,0]),(82,[521,379,0]),(111,[516,391,0]),(145,[515,390,0]),(165,[515,411,0])],
            "s":[(0,[94,94,100]),(18,[102,100,100]),(31,[100,100,100]),(145,[100,100,100]),(165,[97,97,100])],
            "r":[(0,[0]),(31,[0]),(56,[4]),(82,[7]),(111,[-2]),(145,[0]),(165,[0])]},
        "phone": {
            "p":[(0,[215,454,0]),(16,[215,419,0]),(29,[215,425,0]),(49,[208,415,0]),(78,[205,409,0]),(108,[216,425,0]),(145,[215,425,0]),(165,[215,446,0])],
            "s":[(0,[93,93,100]),(16,[103,103,100]),(29,[100,100,100]),(78,[103,103,100]),(108,[100,100,100]),(145,[100,100,100]),(165,[96,96,100])],
            "r":[(0,[0]),(29,[0]),(49,[-4]),(78,[-7]),(108,[2]),(145,[0]),(165,[0])]},
        "eyes": {
            "p":[(0,[380,342,0]),(18,[380,298,0]),(30,[380,305,0]),(56,[376,299,0]),(80,[374,297,0]),(108,[385,305,0]),(145,[380,305,0]),(165,[380,327,0])],
            "s":[(0,[92,92,100]),(18,[103,103,100]),(30,[100,100,100]),(88,[100,100,100]),(91,[100,12,100]),(94,[100,100,100]),(128,[100,100,100]),(131,[100,12,100]),(134,[100,100,100]),(145,[100,100,100]),(165,[96,96,100])],
            "r":[(0,[0]),(58,[-2]),(82,[-4]),(108,[2]),(145,[0]),(165,[0])]},
        "shadow": {
            "p":[(0,[405,575,0]),(14,[405,575,0]),(22,[405,575,0]),(32,[405,575,0]),(145,[405,575,0]),(165,[405,575,0])],
            "s":[(0,[68,55,100]),(14,[86,68,100]),(22,[112,82,100]),(32,[100,76,100]),(136,[102,77,100]),(145,[100,76,100]),(165,[72,56,100])],
            "r":[(0,[0]),(165,[0])]},
    }
    common_opacity = [(0,[0]),(8,[100]),(148,[100]),(165,[0])]
    assets = []
    layers = []
    order = ["shadow","hair_back","body","head_face","hair_front","left_arm","right_arm","phone","eyes"]
    for index, name in enumerate(order, start=1):
        assets.append({"id": f"img_{name}", "w": w, "h": h, "u": "", "p": f"{name}.png", "e": 0})
        anchor, position = rest[name]
        cfg = configs[name]
        opacity = [(0,[0]),(10,[38]),(148,[38]),(165,[0])] if name == "shadow" else common_opacity
        layers.append({
            "ddd":0,"ind":index,"ty":2,"nm":name,"refId":f"img_{name}","sr":1,
            "ks":layer_transform(
                anchor, position, cfg["p"], cfg["s"], cfg["r"], opacity
            ),
            "ao":0,"ip":0,"op":165,"st":0,"bm":0
        })
    document = {
        "v":"5.12.2","fr":30,"ip":0,"op":165,"w":w,"h":h,
        "nm":"NEW_SUBSCRIPTION_DETECTED_2_5D_POC","ddd":0,
        "assets":assets,"layers":layers,
        "markers":[
            {"tm":0,"cm":"appear","dr":15},
            {"tm":35,"cm":"surprise","dr":25},
            {"tm":60,"cm":"look_to_heads_up","dr":30},
            {"tm":95,"cm":"look_to_user","dr":30},
            {"tm":125,"cm":"idle","dr":20},
            {"tm":145,"cm":"exit","dr":20}
        ]
    }
    android_json = OUT / "android" / "app" / "src" / "main" / "assets" / "concierge" / "new_subscription_detected.json"
    android_json.parent.mkdir(parents=True, exist_ok=True)
    android_json.write_text(json.dumps(document, ensure_ascii=False, separators=(",",":")), encoding="utf-8")
    web_json = OUT / "assets" / "concierge" / "lottie" / "new_subscription_detected" / "new_subscription_detected.json"
    web_json.parent.mkdir(parents=True, exist_ok=True)
    web_json.write_text(json.dumps(document, ensure_ascii=False, separators=(",",":")), encoding="utf-8")

def write_poc_metadata(layer_names):
    report = {
        "event":"NEW_SUBSCRIPTION_DETECTED",
        "duration_ms":5500,
        "fps":30,
        "frames":165,
        "layers":layer_names,
        "source_character":"assets/concierge/motions/re_motion_15_notification.webp",
        "renderers":{"android":"LottieAnimationView","web_future":"same JSON/assets staged under assets/concierge/lottie"},
        "phases":[
            [0,500,"appear and light landing"],
            [500,1150,"settle with squash/stretch and hair follow-through"],
            [1150,3000,"surprise then look toward heads-up"],
            [3000,4150,"look toward user and prompt"],
            [4150,4830,"short idle/breath/blink"],
            [4830,5500,"natural exit"]
        ]
    }
    (OUT / "POC_2_5D_METADATA.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

def main():
    reconstruct_source()
    overlay_rich_web()
    pin_latest_native()
    install_poc_native_templates()
    patch_android_config()
    patch_web_bridge()
    layer_names, w, h = generate_layers()
    generate_lottie(layer_names, w, h)
    write_poc_metadata(layer_names)
    print("Prepared clean source:", OUT)
    print("PoC event: NEW_SUBSCRIPTION_DETECTED")
    print("Lottie: 165 frames @ 30fps = 5.5 seconds")

if __name__ == "__main__":
    main()
