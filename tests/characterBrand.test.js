import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { CHARACTER_MASTER_ASSET } from "../src/lib/characterAsset.js";

const root = process.cwd();
const masterPath = path.join(root, "public/assets/kkudok/character_master.png");
const expectedSha =
  "29BA1A6D02485293DDCA9AA00BA67D9533EFDFFACA6F3489E1CDA8885771B6CD";

const runtimeRoots = [
  path.join(root, "src"),
  path.join(root, "android/app/src/main/java"),
  path.join(root, "android/app/src/main/res"),
];

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  const out = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else out.push(full);
  }
  return out;
}

test("첨부 캐릭터 master asset은 정확한 SHA-256으로 보존된다", () => {
  assert.equal(CHARACTER_MASTER_ASSET, "/assets/kkudok/character_master.png");
  assert.ok(fs.existsSync(masterPath));
  const digest = crypto
    .createHash("sha256")
    .update(fs.readFileSync(masterPath))
    .digest("hex")
    .toUpperCase();
  assert.equal(digest, expectedSha);
});

test("active runtime source에는 legacy character variant 참조가 0개다", () => {
  const banned = [
    "character_done.png",
    "character_guide.png",
    "character_idle.png",
    "character_loading.png",
    "character_mascot.png",
    "character_sorry.png",
    "cancel_guide_character.png",
    "@drawable/kkudok_character_",
  ];

  const candidates = runtimeRoots
    .flatMap(filesUnder)
    .filter((file) => /\.(js|jsx|java|kt|xml|css)$/.test(file));

  const offenders = [];
  for (const file of candidates) {
    const text = fs.readFileSync(file, "utf8");
    for (const token of banned) {
      if (text.includes(token)) {
        offenders.push(`${path.relative(root, file)} -> ${token}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test("Web concierge와 계정 화면은 master asset만 사용한다", () => {
  const account = fs.readFileSync(
    path.join(root, "src/components/AccountModal.jsx"),
    "utf8"
  );
  const concierge = fs.readFileSync(
    path.join(root, "src/components/CancelBrowserModal.jsx"),
    "utf8"
  );
  const assetLib = fs.readFileSync(
    path.join(root, "src/lib/characterAsset.js"),
    "utf8"
  );

  assert.match(account, /CHARACTER_MASTER_ASSET/);
  assert.match(concierge, /CHARACTER_MASTER_ASSET/);
  assert.doesNotMatch(account, /pickCharacterPng|applyPendingCharacter/);
  assert.match(assetLib, /mode: "LOCKED"/);
});

test("native full/minimized/floating character는 CharacterAssetManager를 사용한다", () => {
  const manager = fs.readFileSync(
    path.join(
      root,
      "android/app/src/main/java/com/submate/app/character/CharacterAssetManager.java"
    ),
    "utf8"
  );
  const overlay = fs.readFileSync(
    path.join(root, "android/app/src/main/java/com/submate/app/webguide/GuideOverlayContainer.java"),
    "utf8"
  );
  const floating = fs.readFileSync(
    path.join(root, "android/app/src/main/java/com/submate/app/OverlayGuideService.java"),
    "utf8"
  );
  const cancelActivity = fs.readFileSync(
    path.join(root, "android/app/src/main/java/com/submate/app/CancelBrowserActivity.java"),
    "utf8"
  );

  assert.match(manager, /public\/assets\/kkudok\/character_master\.png/);
  assert.match(manager, /context\.getAssets\(\)\.open\(MASTER_ASSET_PATH\)/);
  assert.match(overlay, /CharacterAssetManager\.applyToImageView\(getContext\(\), characterView\)/);
  assert.match(overlay, /restoreButton = new ImageView/);
  assert.match(overlay, /CharacterAssetManager\.applyToImageView\(getContext\(\), restoreButton\)/);
  assert.match(floating, /CharacterAssetManager\.applyToImageView\(this, bubbleCharacter\)/);
  assert.match(cancelActivity, /CharacterAssetManager\.applyToImageView\(this, dockCharacter\)/);
});

test("브랜드 밑줄은 BrandName 공통 컴포넌트로 Home/Splash/Landing lockup에만 적용된다", () => {
  const brand = fs.readFileSync(
    path.join(root, "src/components/BrandName.jsx"),
    "utf8"
  );
  const home = fs.readFileSync(
    path.join(root, "src/components/HomeScreen.jsx"),
    "utf8"
  );
  const landing = fs.readFileSync(
    path.join(root, "src/components/LandingScreen.jsx"),
    "utf8"
  );

  assert.match(brand, /-bottom-\[3px\]/);
  assert.match(brand, /h-\[2px\]/);
  assert.match(home, /<BrandName/);
  assert.match(landing, /export function SplashScreen/);
  assert.equal((landing.match(/<BrandName/g) || []).length, 2);
});
