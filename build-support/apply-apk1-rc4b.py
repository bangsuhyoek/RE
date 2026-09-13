#!/usr/bin/env python3
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "app")

def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"{label} target not found in {path}")
    path.write_text(text.replace(old, new, 1))

# Keep implementation details out of user-facing auth errors.
app = root / "app.js"
text = app.read_text()
text = text.replace(
    'return "현재 메일 발송 설정에서 이 주소로 확인 이메일을 보낼 수 없어요. SMTP 설정을 확인해 주세요.";',
    'return "현재 이 이메일 주소로 확인 이메일을 보낼 수 없어요. 다른 이메일을 사용하거나 잠시 후 다시 시도해 주세요.";',
)
text = text.replace(
    'return "Google 인증 후 앱으로 돌아오지 못했어요. Supabase Redirect URL에 reapp://auth/callback을 등록해야 해요.";',
    'return "Google 인증 후 앱으로 돌아오는 연결을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.";',
)

# Make reminder permission outcome explicit after subscription save.
old = '    closeGenericSheet(false);\\n    showToast(payload.id ? "구독 정보를 수정했어요." : "구독을 추가했어요.", "success");'
new = '    closeGenericSheet(false);\\n    if (result?.remindersScheduled === false) showToast(payload.id ? "구독은 수정했어요. 알림을 받으려면 기기 알림 권한을 허용해 주세요." : "구독은 추가했어요. 알림을 받으려면 기기 알림 권한을 허용해 주세요.", "warning");\\n    else showToast(payload.id ? "구독 정보를 수정했어요." : "구독을 추가했어요.", "success");'
if new not in text:
    if old not in text:
        raise SystemExit("subscription save toast target missing")
    text = text.replace(old, new, 1)

# Each of the two refresh screens stays exactly two seconds longer than RC3.
text = text.replace('    await waitFor(650);', '    await waitFor(2650);', 1)
text = text.replace('    await Promise.all([sessionCheck, waitFor(850)]);', '    await Promise.all([sessionCheck, waitFor(2850)]);', 1)
app.write_text(text)

integration = root / "src/re-integration.js"
text = integration.read_text()
old = '''  invalidate();
  await scheduleBillingReminders(mapSubscription(data));
  return { saved: true, id: data.id };
'''
new = '''  invalidate();
  let remindersScheduled = true;
  if (Capacitor.isNativePlatform()) {
    const notificationPermission = await requestLocalNotificationPermission();
    remindersScheduled = notificationPermission.permission === "granted" && notificationPermission.channelReady === true
      ? await scheduleBillingReminders(mapSubscription(data))
      : false;
  }
  return { saved: true, id: data.id, remindersScheduled };
'''
if new not in text:
    if old not in text:
        raise SystemExit("subscription reminder scheduling target missing")
    text = text.replace(old, new, 1)
integration.write_text(text)

# Contract test: resend confirmation is a real handled button boundary.
contract = root / "tests/release-contract.test.mjs"
text = contract.read_text()
old = '    "data-clear-notification-search",\\n    "data-enable-payment-capture",'
new = '    "data-clear-notification-search", "data-resend-confirmation",\\n    "data-enable-payment-capture",'
if new not in text:
    if old not in text:
        raise SystemExit("button hook contract target missing")
    text = text.replace(old, new, 1)
contract.write_text(text)

# Native system navigation separation: actual bottom system inset + 8dp visual gap.
activity = root / "android/app/src/main/java/kr/co/re/subscription/MainActivity.java"
text = activity.read_text()
old = '''                int bottomPadding = Math.max(systemBars.bottom, ime.bottom);
                v.setPadding(systemBars.left, systemBars.top, systemBars.right, bottomPadding);
                return WindowInsetsCompat.CONSUMED;
            });
'''
new = '''                int navGap = Math.round(8 * getResources().getDisplayMetrics().density);
                int bottomPadding = Math.max(systemBars.bottom, ime.bottom);
                if (ime.bottom <= systemBars.bottom) bottomPadding += navGap;
                v.setPadding(systemBars.left, systemBars.top, systemBars.right, bottomPadding);
                return WindowInsetsCompat.CONSUMED;
            });
            ViewCompat.requestApplyInsets(contentView);
'''
if new not in text:
    if old not in text:
        raise SystemExit("Android WindowInsets target missing")
    text = text.replace(old, new, 1)
activity.write_text(text)

styles = root / "styles.css"
css = styles.read_text()
marker = "/* APK1 RC4B: final-design splash proportions and Android-safe app navigation. */"
if marker not in css:
    css += r'''

/* APK1 RC4B: final-design splash proportions and Android-safe app navigation. */
:root {
  --app-bottom-gap: env(safe-area-inset-bottom);
}

.splash-screen,
.splash-character-screen {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: #f8f7fb !important;
}

/* Match the new final references' pale watercolor / lavender-white tonality. */
.splash-screen::before,
.splash-character-screen::before {
  content: "";
  display: block !important;
  position: absolute;
  z-index: 0;
  inset: -2%;
  background: url("./assets/raster/bg-waterlily-splash.webp") center 45% / cover no-repeat;
  filter: saturate(.52) brightness(1.18) contrast(.84) hue-rotate(-4deg);
  opacity: .83;
  transform: scale(1.02);
  pointer-events: none;
}
.splash-screen::after,
.splash-character-screen::after {
  content: "";
  display: block !important;
  position: absolute;
  z-index: 1;
  inset: 0;
  background:
    radial-gradient(circle at 51% 37%, rgba(255,253,249,.72) 0 19%, rgba(255,253,249,.28) 38%, transparent 60%),
    linear-gradient(180deg, rgba(246,247,255,.32), rgba(255,249,253,.20) 50%, rgba(245,251,255,.22));
  pointer-events: none;
}

/* Refresh 1: the final reference has only the logo artwork, deliberately smaller
   relative to the full frame than the previous APK. */
.splash-screen {
  display: block;
}
.splash-screen .splash-logo-art {
  position: absolute;
  z-index: 3;
  top: 44%;
  left: 50%;
  width: min(52vw, 222px);
  height: auto;
  margin: 0;
  aspect-ratio: 1045 / 1505;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 8px 18px rgba(88,103,153,.07));
}
.splash-screen .splash-tagline {
  display: none !important;
}

/* Refresh 2: preserve separate logo / copy / character bands from the new final design,
   preventing the previous logo-copy overlap and oversized artwork. */
.splash-character-screen {
  display: block;
  padding: 0;
  text-align: center;
}
.splash-character-logo {
  position: absolute;
  z-index: 3;
  top: 1.8%;
  left: 50%;
  width: min(30vw, 128px);
  height: auto;
  margin: 0;
  aspect-ratio: 1045 / 1505;
  transform: translateX(-50%);
}
.splash-character-screen h1 {
  position: absolute;
  z-index: 4;
  top: 21.8%;
  left: 50%;
  width: 84%;
  margin: 0;
  padding: 0;
  transform: translateX(-50%);
  color: #5c65ae;
  font-family: Georgia, "Noto Serif KR", serif;
  font-size: clamp(16px, 4.65vw, 20px);
  font-weight: 700;
  line-height: 1.28;
  letter-spacing: -.025em;
  white-space: nowrap;
  text-shadow: 0 1px 12px rgba(255,255,255,.92);
}
.splash-character-screen h1 span {
  display: inline-block;
  margin-left: .25em;
  color: #6173bd;
}
.splash-character {
  position: absolute;
  z-index: 3;
  top: 28.5%;
  left: 50%;
  bottom: auto;
  width: min(86vw, 370px);
  max-width: none;
  transform: translateX(-50%);
  filter: drop-shadow(0 13px 16px rgba(83,66,120,.10));
}

/* The WebView itself is padded above Android's navigation bar by MainActivity.
   Keep CSS safe-area support for gesture insets without creating a browser-only gap. */
.with-bottom-nav .screen-content {
  height: calc(100% - 74px - var(--app-bottom-gap));
  padding-bottom: calc(20px + var(--app-bottom-gap));
}
.with-bottom-nav .bottom-nav {
  bottom: var(--app-bottom-gap);
}
.app-toast {
  bottom: calc(78px + var(--app-bottom-gap));
}

@media (max-width: 340px) {
  .splash-screen .splash-logo-art { width: 50vw; }
  .splash-character-logo { width: 29vw; }
  .splash-character-screen h1 { top: 21.5%; font-size: 15px; }
  .splash-character { top: 29%; width: 84vw; }
}

@media (min-width: 412px) {
  .splash-screen .splash-logo-art { width: min(50vw, 220px); }
  .splash-character-logo { width: min(29vw, 126px); }
  .splash-character { width: min(83vw, 365px); }
}
'''
styles.write_text(css)

print("APK1 RC4B final-design/safe-area/timing patch applied")
