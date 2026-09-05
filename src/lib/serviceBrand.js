const toneClasses = {
  netflix: "!bg-[#17171D] !text-[#E50914]",
  youtube: "!bg-[#FF0033] !text-white",
  spotify: "!bg-[#1DB954] !text-white",
  disney: "!bg-[#244A9B] !text-white",
  tving: "!bg-[#F04B78] !text-white",
  coupang: "!bg-[#F28A52] !text-white",
  chatgpt: "!bg-[#4E9B89] !text-white",
  millie: "!bg-[#8FA45B] !text-white",
  adobe: "!bg-[#E95B52] !text-white",
  default: "!bg-[#EDF4FF] !text-[#5F72B0]",
};

const namedToneMatchers = [
  ["netflix", ["netflix", "넷플릭스"]],
  ["youtube", ["youtube", "유튜브"]],
  ["spotify", ["spotify", "스포티파이"]],
  ["disney", ["disney", "디즈니"]],
  ["tving", ["tving", "티빙"]],
  ["coupang", ["coupang", "쿠팡"]],
  ["chatgpt", ["chatgpt", "openai"]],
  ["millie", ["millie", "밀리"]],
  ["adobe", ["adobe"]],
];

/**
 * Resolve a service tone only from explicit metadata or a real service id/name/title.
 * A one-letter monogram is intentionally never used as a brand identifier: custom
 * services that happen to start with N/Y/S/D/etc. must stay on the neutral RE. tone.
 */
export function serviceMarkToneKey(item = {}) {
  const explicit = String(item.markTone || "").trim().toLowerCase();
  if (toneClasses[explicit]) return explicit;

  const searchable = [item.id, item.serviceId, item.name, item.serviceName, item.title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const [tone, aliases] of namedToneMatchers) {
    if (aliases.some((alias) => searchable.includes(alias))) return tone;
  }
  return "default";
}

export function serviceMarkToneClass(item = {}) {
  return toneClasses[serviceMarkToneKey(item)] || toneClasses.default;
}
