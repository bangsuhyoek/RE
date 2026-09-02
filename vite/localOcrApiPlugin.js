import ocrHandler from "../api/ocr.js";

const MAX_BODY_BYTES = 12 * 1024 * 1024;

const readJsonBody = (request) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;

  request.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      reject(Object.assign(new Error("요청 본문이 너무 큽니다."), { statusCode: 413 }));
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });

  request.on("end", () => {
    try {
      const raw = Buffer.concat(chunks).toString("utf8");
      resolve(raw ? JSON.parse(raw) : {});
    } catch {
      reject(Object.assign(new Error("요청 형식이 올바르지 않습니다."), { statusCode: 400 }));
    }
  });
  request.on("error", reject);
});

const createResponseAdapter = (response) => ({
  status(code) {
    response.statusCode = code;
    return this;
  },
  setHeader(name, value) {
    response.setHeader(name, value);
  },
  json(payload) {
    if (!response.headersSent) response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify(payload));
  },
});

export const createLocalOcrMiddleware = () => async (request, response, next) => {
  const requestUrl = new URL(request.url || "/", "http://localhost");
  if (requestUrl.pathname !== "/api/ocr") {
    next();
    return;
  }

  try {
    request.body = await readJsonBody(request);
    await ocrHandler(request, createResponseAdapter(response));
  } catch (error) {
    if (response.writableEnded) return;
    response.statusCode = error?.statusCode || 500;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({
      ok: false,
      code: error?.statusCode === 413 ? "BODY_TOO_LARGE" : "LOCAL_OCR_ERROR",
      message: error?.message || "로컬 OCR API를 실행하지 못했습니다.",
    }));
  }
};

export const localOcrApiPlugin = () => ({
  name: "submate-local-ocr-api",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use(createLocalOcrMiddleware());
  },
});
