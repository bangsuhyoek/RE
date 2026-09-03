import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/ocr.js";

const createResponse = () => ({
  statusCode: 200,
  headers: {},
  payload: null,
  setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.payload = payload; return this; },
});

test("결제 문자는 외부 OCR 키 없이 동일한 파서로 처리한다", async () => {
  const request = { method: "POST", body: { text: "상품명 티빙\n결제금액 13,500원\n다음 결제일 10월 9일" } };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.data.name, "티빙");
  assert.equal(response.payload.data.plan, "스탠다드");
  assert.equal(response.payload.data.dueDay, 9);
});

test("이미지 OCR 키가 없으면 설정 오류를 명확히 반환한다", async () => {
  const prevVision = process.env.GOOGLE_VISION_API_KEY;
  const prevGemini = process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_VISION_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const request = { method: "POST", body: { mimeType: "image/png", imageBase64: "aGVsbG8=" } };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 503);
    assert.equal(response.payload.code, "OCR_NOT_CONFIGURED");
  } finally {
    if (prevVision) process.env.GOOGLE_VISION_API_KEY = prevVision;
    if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;
  }
});
