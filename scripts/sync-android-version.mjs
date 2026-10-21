import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const gradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const pkgVersion = pkg.version;

if (!pkgVersion) {
  console.error('[sync-android-version] package.json does not contain a "version" field.');
  process.exit(1);
}

if (!fs.existsSync(gradlePath)) {
  console.error(`[sync-android-version] build.gradle not found at: ${gradlePath}`);
  process.exit(1);
}

const gradleContent = fs.readFileSync(gradlePath, 'utf8');

const vcMatch = gradleContent.match(/versionCode\s+(\d+)/);
const vnMatch = gradleContent.match(/versionName\s+["']([^"']+)["']/);

if (!vcMatch || !vnMatch) {
  console.error('[sync-android-version] Could not parse versionCode or versionName from android/app/build.gradle');
  process.exit(1);
}

const currentGradleCode = parseInt(vcMatch[1], 10);
const currentGradleName = vnMatch[1];

const isCheck = process.argv.includes('--check');

if (isCheck) {
  if (currentGradleName !== pkgVersion) {
    console.error('[sync-android-version] Android versionName is out of sync with package.json:');
    console.error(`   package.json version: ${pkgVersion}`);
    console.error(`   build.gradle versionName: ${currentGradleName} (expected: ${pkgVersion})`);
    console.error('\nRun "pnpm run version:android" to synchronize.');
    process.exit(1);
  }

  console.log(`✅ [sync-android-version] Android version is in sync: versionName="${currentGradleName}", versionCode=${currentGradleCode}`);
  process.exit(0);
}

// In write mode: if versionName changes, increment versionCode by 1; otherwise keep unchanged.
const targetVersionName = pkgVersion;
let targetVersionCode = currentGradleCode;

if (currentGradleName !== targetVersionName) {
  targetVersionCode = currentGradleCode + 1;
}

let updatedGradle = gradleContent.replace(
  /versionCode\s+\d+/,
  `versionCode ${targetVersionCode}`
);
updatedGradle = updatedGradle.replace(
  /versionName\s+["'][^"']+["']/,
  `versionName "${targetVersionName}"`
);

fs.writeFileSync(gradlePath, updatedGradle, 'utf8');
console.log(`✅ [sync-android-version] Synchronized android/app/build.gradle with package.json (${pkgVersion}):`);
console.log(`   versionName: "${currentGradleName}" -> "${targetVersionName}"`);
console.log(`   versionCode: ${currentGradleCode} -> ${targetVersionCode}`);
