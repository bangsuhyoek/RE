import ocrHandler from "../api/ocr.js";
import agentHandler from "../api/agent.js";
import chatHandler from "../api/chat.js";

const LOCAL_API_ROUTES = {
  "/api/ocr": ocrHandler,
  "/api/agent": agentHandler,
  "/api/chat": chatHandler,
};

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
  write(chunk) {
    const ok = response.write(chunk);
    if (typeof response.flush === "function") response.flush();
    return ok;
  },
  flushHeaders() {
    if (typeof response.flushHeaders === "function") response.flushHeaders();
  },
  end(data = "") {
    response.end(data);
    return this;
  },
});

export const createLocalOcrMiddleware = () => async (request, response, next) => {
  const requestUrl = new URL(request.url || "/", "http://localhost");
  const routeHandler = LOCAL_API_ROUTES[requestUrl.pathname];
  if (!routeHandler) {
    next();
    return;
  }

  if (process.env.SUBMATE_DEV_CHAT_BYPASS === "1") {
    if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
      process.env.SUPABASE_URL = "http://127.0.0.1:54321";
    }
    if (!process.env.SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
      process.env.SUPABASE_ANON_KEY = "dev-anon-key";
    }
    if (!globalThis.__submateAuthBypassInstalled) {
      globalThis.__submateAuthBypassInstalled = true;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async function (url) {
        const urlStr = typeof url === "string" ? url : url?.url || "";
        if (urlStr.includes("/auth/v1/user")) {
          return new Response(JSON.stringify({ id: "dev-chat-e2e-user" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch.apply(this, arguments);
      };
    }
    if (requestUrl.pathname === "/api/chat") {
      if (!request.headers.authorization && !request.headers.Authorization) {
        request.headers.authorization = "Bearer dev-chat-bypass-token";
      }
    }
  }

  try {
    request.body = await readJsonBody(request);
    request.__isLocalDev = true;
    await routeHandler(request, createResponseAdapter(response));
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
