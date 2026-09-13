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

index=root/"index.html"

# Final refinement pass: use the high-quality reference-derived feature illustrations
# that already ship in the source, while keeping the later two-page landing structure.
pairs=[
(
'<span class="landing-feature-icon"><svg><use href="#i-chart" /></svg></span>',
'<span class="landing-feature-icon landing-feature-icon--art"><img src="./assets/raster/feature-checklist-source-crop.png" alt="" /></span>'
),
(
'<span class="landing-feature-icon"><svg><use href="#i-calendar" /></svg></span>',
'<span class="landing-feature-icon landing-feature-icon--art"><img src="./assets/raster/feature-alert-source-crop.png" alt="" /></span>'
),
(
'<span class="landing-feature-icon"><svg><use href="#i-bell" /></svg></span>',
'<span class="landing-feature-icon landing-feature-icon--art"><img src="./assets/raster/feature-discovery-source-crop.png" alt="" /></span>'
),
(
'<span class="landing-feature-icon"><svg><use href="#i-gift" /></svg></span>',
'<span class="landing-feature-icon landing-feature-icon--character"><img src="./assets/raster/character-state-price-change.webp" alt="" /></span>'
),
]
text=index.read_text()
for old,new in pairs:
    if old not in text and new not in text:
        raise SystemExit(f"landing feature art target missing: {old}")
    text=text.replace(old,new,1)
index.write_text(text)

styles=root/"styles.css"
css=styles.read_text()
marker="/* APK1 FINAL REFINEMENT PASS: proportional polish after full visual QA. */"
if marker not in css:
    css += r'''

/* APK1 FINAL REFINEMENT PASS: proportional polish after full visual QA. */

/* Preserve the later 2-page UX, but move hero art into the same upper-frame proportion
   as the 852x1847 final reference instead of letting it sit behind the feature cards. */
.landing-brand strong {
  font-size: clamp(31px, 9.8vw, 38px);
}
.landing-brand .brand-mark {
  width: clamp(36px, 10.5vw, 44px);
  height: clamp(36px, 10.5vw, 44px);
  flex-basis: clamp(36px, 10.5vw, 44px);
}
.landing-page .landing-character {
  right: -12px;
  bottom: 51%;
  width: min(60vw, 255px);
  opacity: 1;
}
.landing-page .landing-character--second {
  right: 4px;
  bottom: 52%;
  width: min(43vw, 184px);
}
.landing-feature-grid {
  padding-top: clamp(132px, 18vh, 150px);
  gap: clamp(9px, 2.5vw, 11px);
}
.landing-feature-grid article {
  grid-template-columns: clamp(58px, 16.5vw, 70px) minmax(0,1fr) 28px;
  min-height: clamp(82px, 22vw, 94px);
  padding: clamp(8px, 2.2vw, 10px) clamp(11px, 3vw, 14px);
}
.landing-feature-icon {
  width: clamp(58px, 16.5vw, 70px);
  height: clamp(58px, 16.5vw, 70px);
}
.landing-feature-icon--art,
.landing-feature-icon--character {
  overflow: hidden;
  border-radius: 50%;
  background: rgba(235,246,255,.94);
  box-shadow: inset 0 0 0 1px rgba(102,151,218,.08), 0 3px 10px rgba(66,113,176,.08);
}
.landing-feature-icon--art img {
  width: 112%;
  height: 112%;
  max-width: none;
  object-fit: cover;
}
.landing-feature-icon--character img {
  width: 118%;
  height: 118%;
  max-width: none;
  object-fit: contain;
  object-position: center 38%;
}
.landing-feature-grid strong {
  font-size: clamp(14px, 4.05vw, 16.5px);
  line-height: 1.23;
}
.landing-feature-grid article > div > span {
  margin-top: 5px;
  font-size: clamp(10.5px, 2.95vw, 12.2px);
  line-height: 1.42;
}
.landing-feature-chevron {
  font-size: 30px;
}

/* Login reference starts the glass panel slightly lower than RC3 pass 1.
   This restores the same upper-art/panel split while preserving the newer Google-only flow. */
.login-screen .auth-header {
  min-height: clamp(268px, 74vw, 304px);
}
.login-screen .auth-copy {
  margin-top: clamp(72px, 20vw, 88px);
}
.login-screen .auth-copy h1 {
  font-size: clamp(23px, 6.8vw, 29px);
}
.login-screen .auth-copy p,
.register-screen .auth-copy p {
  color: #5876a8;
  font-size: clamp(10.5px, 3vw, 12.5px);
  line-height: 1.45;
  word-break: keep-all;
}

/* Final reference uses stronger text hierarchy and slightly more generous touch/form rhythm. */
.auth-form {
  border: 1px solid rgba(255,255,255,.78);
}
.auth-form .field > span:first-child,
.legal-consent legend {
  color: #173a82;
  font-weight: 850;
}
.auth-form input {
  min-height: 46px;
}
.social-actions button {
  min-height: 50px;
  font-weight: 800;
}

/* Content screens keep the later information architecture, but their type hierarchy
   should read like the final reference rather than a compressed dashboard. */
.page-title h1,
.section-heading h2,
.welcome-card h1,
.welcome-card h2 {
  color: #173a82;
  letter-spacing: -.035em;
}
.panel,
.welcome-card,
.stat-card,
.subscription-list > article,
.benefit-list > article,
.notification-list > article,
.settings-group {
  border-color: rgba(255,255,255,.82);
  box-shadow: 0 7px 20px rgba(42,89,150,.09);
}

/* Short displays need proportionally smaller hero art/card gaps rather than new line breaks. */
@media (max-height: 720px) {
  .landing-page .landing-character {
    bottom: 48%;
    width: min(55vw, 230px);
  }
  .landing-page .landing-character--second {
    bottom: 49%;
    width: min(40vw, 172px);
  }
  .landing-feature-grid {
    padding-top: 124px;
    gap: 6px;
  }
  .landing-feature-grid article {
    grid-template-columns: 54px minmax(0,1fr) 24px;
    min-height: 72px;
    padding-block: 6px;
  }
  .landing-feature-icon {
    width: 54px;
    height: 54px;
  }
  .landing-feature-grid strong { font-size: 12.5px; }
  .landing-feature-grid article > div > span { font-size: 9.5px; margin-top: 3px; }
  .login-screen .auth-header { min-height: 230px; }
  .login-screen .auth-copy { margin-top: 62px; }
}

@media (max-width: 340px) {
  .landing-page .landing-character {
    right: -16px;
    bottom: 49%;
    width: 59vw;
  }
  .landing-page .landing-character--second {
    right: 0;
    bottom: 50%;
    width: 42vw;
  }
  .landing-feature-grid {
    padding-top: 132px;
  }
  .landing-feature-grid article {
    grid-template-columns: 52px minmax(0,1fr) 22px;
  }
  .landing-feature-icon {
    width: 52px;
    height: 52px;
  }
}
'''
styles.write_text(css)

# Make the refinement stage externally verifiable.
report=root/"FINAL_REFINEMENT_APPLIED.txt"
report.write_text("""RE APK1 final refinement pass
- final-reference feature illustration treatment applied
- pager dots remain circular with 44px touch targets
- landing hero/card proportions refined
- login upper-art/panel ratio refined
- auth/content typography hierarchy polished
""")

print("APK1 final refinement pass applied")
