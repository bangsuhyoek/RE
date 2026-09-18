#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else "dist").resolve()
app = root / "app.js"
integration = root / "src" / "re-integration.js"

EXPECTED = {
    app: "3a5f981364c7d61a84198d292c6b229ca324167a517bced7cd09447e0086489d",
    integration: "1a816cf1b916165df4903f04806976e24153ad55c5b7dbb092a66911b23b41f1",
}

for path, expected in EXPECTED.items():
    if not path.exists():
        raise SystemExit(f"missing Golden web file: {path}")
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != expected:
        raise SystemExit(f"unexpected Golden web bytes for {path}: {actual} != {expected}")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"patch insertion point missing: {label}")
    if text.count(old) != 1:
        raise SystemExit(f"patch insertion point not unique: {label} count={text.count(old)}")
    return text.replace(old, new, 1)

app_text = app.read_text(encoding="utf-8")

old = '''function setConciergeEnabled(next) {
  conciergeEnabled = Boolean(next);
  try { window.localStorage.setItem(conciergeStorageKey, String(conciergeEnabled)); }
  catch (_error) {}
  if (!conciergeEnabled) {'''
new = '''function setConciergeEnabled(next) {
  conciergeEnabled = Boolean(next);
  try { window.localStorage.setItem(conciergeStorageKey, String(conciergeEnabled)); }
  catch (_error) {}
  try {
    const nativeConcierge = window.Capacitor?.Plugins?.PaymentCapture;
    if (nativeConcierge?.setConciergeEnabled) {
      void nativeConcierge.setConciergeEnabled({ enabled: conciergeEnabled });
    }
  } catch (_error) {}
  if (!conciergeEnabled) {'''
app_text = replace_once(app_text, old, new, "native concierge state mirror")

old = '''  setConciergeEnabled(next);
  document.querySelectorAll("[data-concierge-toggle]").forEach((button) => { button.disabled = false; });'''
new = '''  setConciergeEnabled(next);
  if (next) {
    try {
      const nativeConcierge = window.Capacitor?.Plugins?.PaymentCapture;
      const permission = nativeConcierge?.checkAnimatedConciergePermission
        ? await nativeConcierge.checkAnimatedConciergePermission()
        : null;
      if (permission && permission.granted !== true && nativeConcierge?.requestAnimatedConciergePermission) {
        await nativeConcierge.requestAnimatedConciergePermission();
      }
    } catch (_error) {}
  }
  document.querySelectorAll("[data-concierge-toggle]").forEach((button) => { button.disabled = false; });'''
app_text = replace_once(app_text, old, new, "overlay permission request on manual concierge enable")

old = '''async function initializeApp() {
  buildCalendar();'''
new = '''async function initializeApp() {
  try {
    const nativeConcierge = window.Capacitor?.Plugins?.PaymentCapture;
    if (nativeConcierge?.setConciergeEnabled) {
      await nativeConcierge.setConciergeEnabled({ enabled: conciergeEnabled });
    }
  } catch (_error) {}
  buildCalendar();'''
app_text = replace_once(app_text, old, new, "startup concierge sync")
app.write_text(app_text, encoding="utf-8")

integration_text = integration.read_text(encoding="utf-8")
old = '''  const rows = checked(await supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }));
  cache = { userId: user.id, subscriptions: rows || [], loadedAt: Date.now() };
  return cache.subscriptions;'''
new = '''  const rows = checked(await supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }));
  cache = { userId: user.id, subscriptions: rows || [], loadedAt: Date.now() };
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
integration_text = replace_once(integration_text, old, new, "registered subscription snapshot sync")
integration.write_text(integration_text, encoding="utf-8")

print("2.5D Golden web bridge patch applied")
print("app.js", hashlib.sha256(app.read_bytes()).hexdigest())
print("src/re-integration.js", hashlib.sha256(integration.read_bytes()).hexdigest())
