import { Capacitor, registerPlugin } from "@capacitor/core";

const NativeCharacterAsset = registerPlugin("CharacterAsset");

export const DEFAULT_CHARACTER_SRC = "/assets/kkudok/cancel_guide_character.png";

function normalizeAsset(result = {}) {
  const custom = result?.mode === "CUSTOM" && result?.uri;
  const src = custom
    ? `${Capacitor.convertFileSrc(result.uri)}?v=${result.updatedAt || Date.now()}`
    : DEFAULT_CHARACTER_SRC;

  return {
    ...result,
    mode: custom ? "CUSTOM" : "DEFAULT",
    hasCustom: Boolean(custom),
    src,
  };
}

export async function getCharacterAsset() {
  if (!Capacitor.isNativePlatform()) {
    return normalizeAsset({ mode: "DEFAULT", hasCustom: false });
  }
  try {
    return normalizeAsset(await NativeCharacterAsset.getAsset());
  } catch (err) {
    console.warn("캐릭터 자산 조회 실패:", err);
    return normalizeAsset({ mode: "DEFAULT", hasCustom: false });
  }
}

export async function pickCharacterPng() {
  if (!Capacitor.isNativePlatform()) {
    return { status: "UNAVAILABLE", message: "Android 앱에서 사용할 수 있어요." };
  }
  try {
    const result = await NativeCharacterAsset.pickPng();
    if (result?.status === "READY" && result?.uri) {
      return {
        ...result,
        previewSrc: `${Capacitor.convertFileSrc(result.uri)}?v=${result.updatedAt || Date.now()}`,
      };
    }
    return result || { status: "CANCELLED" };
  } catch (err) {
    console.warn("PNG 선택 실패:", err);
    return { status: "ERROR", message: "이미지를 불러오지 못했어요. 다시 시도해주세요." };
  }
}

export async function applyPendingCharacter() {
  if (!Capacitor.isNativePlatform()) {
    return { status: "UNAVAILABLE", ...normalizeAsset({ mode: "DEFAULT" }) };
  }
  try {
    return normalizeAsset(await NativeCharacterAsset.applyPending());
  } catch (err) {
    console.warn("캐릭터 적용 실패:", err);
    return { status: "ERROR", message: "이미지를 적용하지 못했어요. 다시 시도해주세요." };
  }
}

export async function discardPendingCharacter() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await NativeCharacterAsset.discardPending();
  } catch (err) {
    console.warn("임시 캐릭터 정리 실패:", err);
  }
}

export async function resetCharacterAsset() {
  if (!Capacitor.isNativePlatform()) {
    return normalizeAsset({ status: "RESET", mode: "DEFAULT" });
  }
  try {
    return normalizeAsset(await NativeCharacterAsset.reset());
  } catch (err) {
    console.warn("기본 캐릭터 복구 실패:", err);
    return { status: "ERROR", message: "기본 캐릭터로 되돌리지 못했어요." };
  }
}
