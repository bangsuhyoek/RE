import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const androidDir = path.join(rootDir, "android");

console.log("🚀 [1/4] 웹 정적 에셋 빌드 중 (pnpm build)...");
execSync("pnpm run build", { cwd: rootDir, stdio: "inherit" });

console.log("🔄 [2/4] Capacitor 안드로이드 동기화 중 (cap sync android)...");
execSync("npx cap sync android", { cwd: rootDir, stdio: "inherit" });

console.log("🔨 [3/4] 안드로이드 APK 컴파일 중 (gradlew assembleDebug)...");
const defaultJdk21 = "C:\\Program Files\\Microsoft\\jdk-21.0.12.101-hotspot";
const javaHome = process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)
  ? process.env.JAVA_HOME
  : (fs.existsSync(defaultJdk21) ? defaultJdk21 : process.env.JAVA_HOME);

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  PATH: javaHome ? `${path.join(javaHome, "bin")};${process.env.PATH}` : process.env.PATH,
};

const gradlewCmd = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
execSync(`${gradlewCmd} assembleDebug`, { cwd: androidDir, env, stdio: "inherit" });

console.log("📦 [4/4] APK 파일 프로젝트 루트로 복사 중...");
const srcApk = path.join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const destApk = path.join(rootDir, "SubMate-debug.apk");

if (fs.existsSync(srcApk)) {
  fs.copyFileSync(srcApk, destApk);
  const stat = fs.statSync(destApk);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ APK 빌드 완료!`);
  console.log(`📁 위치: ${destApk}`);
  console.log(`📊 크기: ${sizeMb} MB (${stat.size.toLocaleString()} bytes)\n`);
} else {
  console.error("❌ APK 파일을 찾을 수 없습니다:", srcApk);
  process.exit(1);
}
