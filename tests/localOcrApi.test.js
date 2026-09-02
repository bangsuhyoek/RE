import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { createLocalOcrMiddleware } from "../vite/localOcrApiPlugin.js";

const runMiddleware = async ({ method = "POST", url = "/api/ocr", body = {} } = {}) => {
  const request = Readable.from([Buffer.from(JSON.stringify(body))]);
  request.method = method;
  request.url = url;

  let raw = "";
  const headers = new Map();
  const response = {
    statusCode: 200,
    headersSent: false,
    writableEnded: false,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    },
    end(value = "") {
      raw += value;
      this.headersSent = true;
      this.writableEnded = true;
    },
  };
  let nextCalled = false;
  await createLocalOcrMiddleware()(request, response, () => { nextCalled = true; });
  return { response, payload: raw ? JSON.parse(raw) : null, nextCalled };
};

test("Vite 개발 서버에서 결제 문자 OCR API를 실행한다", async () => {
  const result = await runMiddleware({
    body: { text: "상품명 티빙 / 13,500원 결제완료 / 09월 10일" },
  });
  assert.equal(result.response.statusCode, 200);
  assert.equal(result.payload.ok, true);
  assert.equal(result.payload.data.name, "티빙");
  assert.equal(result.payload.data.plan, "스탠다드");
  assert.equal(result.nextCalled, false);
});

test("이미지 OCR 키가 없으면 더미 결과 대신 설정 오류를 반환한다", async () => {
  const previousKey = process.env.GOOGLE_VISION_API_KEY;
  delete process.env.GOOGLE_VISION_API_KEY;
  try {
    const result = await runMiddleware({
      body: { imageBase64: "dGVzdA==", mimeType: "image/png" },
    });
    assert.equal(result.response.statusCode, 503);
    assert.equal(result.payload.ok, false);
    assert.equal(result.payload.code, "OCR_NOT_CONFIGURED");
  } finally {
    if (previousKey) process.env.GOOGLE_VISION_API_KEY = previousKey;
  }
});

test("OCR 이외의 경로는 다음 Vite 미들웨어로 넘긴다", async () => {
  const result = await runMiddleware({ url: "/" });
  assert.equal(result.nextCalled, true);
  assert.equal(result.payload, null);
});
