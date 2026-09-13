#!/usr/bin/env python3
from pathlib import Path
import runpy, sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "app")
index = root / "index.html"
html = index.read_text()
actual_toast = '    <div class="app-toast" id="app-toast" role="status" aria-live="polite" hidden></div>'
expected_toast = '      <div class="app-toast" role="status" aria-live="polite" hidden></div>'
if 'data-payment-onboarding' not in html:
    if actual_toast not in html:
        raise SystemExit("RC5 onboarding insertion anchor missing")
    index.write_text(html.replace(actual_toast, expected_toast, 1))

# Execute the main RC5 transformation with the same app root.
sys.argv = [str(Path(__file__).with_name('apply-apk1-rc5.py')), str(root)]
runpy.run_path(str(Path(__file__).with_name('apply-apk1-rc5.py')), run_name='__main__')

# Restore the stable app-toast id after the main transform inserted onboarding.
html = index.read_text()
if actual_toast not in html:
    if expected_toast not in html:
        raise SystemExit("RC5 app-toast restoration target missing")
    index.write_text(html.replace(expected_toast, actual_toast, 1))

# Register newly handled button hooks with the existing release contract.
contract = root / "tests/release-contract.test.mjs"
text = contract.read_text()
needle = '    "data-clear-notification-search", "data-resend-confirmation",\n'
replacement = '    "data-clear-notification-search", "data-resend-confirmation", "data-payment-onboarding-enable", "data-payment-onboarding-later",\n'
if 'data-payment-onboarding-enable' not in text:
    if needle not in text:
        raise SystemExit("RC5 contract hook anchor missing")
    contract.write_text(text.replace(needle, replacement, 1))

# Fail closed on the required runtime wiring.
checks = {
    root / "index.html": ['data-payment-onboarding', 'assets/brand/logo-service-primary.svg'],
    root / "app.js": ['paymentOnboardingKey', 'data-payment-onboarding-enable', 'refreshPaymentOnboardingAfterSettings'],
    root / "src/re-integration.js": ['paymentOnboarding=1'],
    root / "styles.css": ['APK1 RC5: approved six-screen proportional design system'],
}
for path, needles in checks.items():
    content = path.read_text()
    for needle in needles:
        if needle not in content:
            raise SystemExit(f"RC5 required marker missing: {needle} in {path}")

print("APK1 RC5B baseline compatibility and contract wiring: PASS")
