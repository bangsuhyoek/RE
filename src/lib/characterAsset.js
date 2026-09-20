export const CHARACTER_MASTER_ASSET = "/assets/kkudok/character_master.png";
export const DEFAULT_CHARACTER_SRC = CHARACTER_MASTER_ASSET;

const lockedAsset = (status = "LOCKED") => ({
  status,
  mode: "LOCKED",
  hasCustom: false,
  src: CHARACTER_MASTER_ASSET,
  message: "꾸독 캐릭터는 공식 캐릭터 1종으로 고정되어 있어요.",
});

export async function getCharacterAsset() {
  return lockedAsset("READY");
}

export async function pickCharacterPng() {
  return lockedAsset("LOCKED");
}

export async function applyPendingCharacter() {
  return lockedAsset("LOCKED");
}

export async function discardPendingCharacter() {
  return lockedAsset("LOCKED");
}

export async function resetCharacterAsset() {
  return lockedAsset("RESET");
}
