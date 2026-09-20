export const MAX_OCR_REQUEST_BYTES = 4_000_000;
export const MAX_OCR_BASE64_CHARS = 3_600_000;

export function estimateOcrPayloadBytes(payload = {}) {
  const json = JSON.stringify(payload);
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(json).byteLength;
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.byteLength(json, "utf8");
  }
  return json.length;
}

export function isOcrPayloadWithinLimit(payload = {}) {
  return estimateOcrPayloadBytes(payload) <= MAX_OCR_REQUEST_BYTES;
}
