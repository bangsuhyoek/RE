import { createClient } from "@supabase/supabase-js";
import { verifySupabaseAuth } from "./_lib/auth.js";
import { deleteAccount } from "./_lib/accountDeletion.js";
import { consumeRateLimit } from "./_lib/rateLimit.js";

let adminClientOverride = null;
export const _setSupabaseAdmin = (client) => {
  adminClientOverride = client;
};

const send = (response, status, payload) => {
  if (typeof response.status === "function") {
    response.status(status).json(payload);
  } else {
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(payload));
  }
};

const readBody = (request) => {
  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }
  return request.body || {};
};

export default async function handler(request, response) {
  // Support Cross-Origin Requests from mobile Capacitor apps
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    if (typeof response.status === "function") return response.status(204).end();
    response.statusCode = 204;
    return response.end();
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    return send(response, 405, {
      ok: false,
      code: "METHOD_NOT_ALLOWED",
      message: "POST 요청만 지원합니다.",
    });
  }

  // 1. Supabase 인증 토큰 검증 (토큰/개인정보 로깅 금지)
  const authHeader = request.headers?.authorization || request.headers?.Authorization;
  let userId;
  try {
    userId = await verifySupabaseAuth(authHeader);
  } catch (err) {
    if (err?.code === "AGENT_AUTH_NOT_CONFIGURED") {
      return send(response, 503, {
        ok: false,
        code: "AGENT_AUTH_NOT_CONFIGURED",
        message: "인증 서버 환경변수가 설정되지 않았습니다.",
      });
    }
    return send(response, 401, {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "인증이 필요합니다.",
    });
  }

  if (!userId) {
    return send(response, 401, {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "인증이 필요합니다.",
    });
  }

  // 2. 요청 본문 파싱 및 명시적 확인값 검증
  let body;
  try {
    body = readBody(request);
  } catch {
    return send(response, 400, {
      ok: false,
      code: "INVALID_JSON",
      message: "요청 본문 형식이 올바르지 않습니다.",
    });
  }

  const confirmation = String(body?.confirmation || "").trim();
  if (!confirmation || (confirmation !== "탈퇴" && confirmation !== "DELETE")) {
    return send(response, 400, {
      ok: false,
      code: "CONFIRMATION_REQUIRED",
      message: "탈퇴 확인 입력이 올바르지 않습니다. '탈퇴'를 입력해 주세요.",
    });
  }

  // 3. 서버 측 Supabase Service Role Key 확인 (서버 전용, 클라이언트 유출 절대 금지)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Account deletion failed: SUPABASE_SERVICE_ROLE_KEY not configured on server");
    return send(response, 503, {
      ok: false,
      code: "SERVICE_NOT_CONFIGURED",
      message: "서버 관리자 설정이 완료되지 않았습니다.",
    });
  }

  // 4. Rate Limiting: 사용자 할당량 확인 (fail-closed, 10분당 3회 / 일일 5회)
  const rateLimitResult = await consumeRateLimit({
    userId,
    bearerToken: authHeader,
    endpoint: "account_delete",
    checkGlobal: false,
  });

  if (rateLimitResult.failClosed) {
    response.setHeader("Retry-After", String(rateLimitResult.retryAfterSeconds || 60));
    return send(response, 503, {
      ok: false,
      code: "RATE_LIMIT_UNAVAILABLE",
      message: "일시적으로 사용량 확인이 불가능합니다. 잠시 후 다시 시도해 주세요.",
    });
  }

  if (!rateLimitResult.allowed) {
    response.setHeader("Retry-After", String(rateLimitResult.retryAfterSeconds || 60));
    return send(response, 429, {
      ok: false,
      code: "RATE_LIMITED",
      message: `요청 한도를 초과했습니다. ${rateLimitResult.retryAfterSeconds || 60}초 후에 다시 시도해 주세요.`,
    });
  }

  // 5. Supabase Admin 클라이언트 생성 및 계정 삭제 실행
  try {
    const supabaseAdmin =
      adminClientOverride ||
      createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

    await deleteAccount({ supabaseAdmin, userId, confirmation });

    return send(response, 200, {
      ok: true,
      code: "ACCOUNT_DELETED",
      message: "회원 탈퇴 및 모든 계정 데이터 삭제가 완료되었습니다.",
    });
  } catch (err) {
    // 개인정보나 토큰을 절대 로그에 출력하지 않음
    console.error("Account deletion failed with code:", err?.code || "UNKNOWN");

    if (err?.code === "CONFIRMATION_REQUIRED") {
      return send(response, 400, {
        ok: false,
        code: "CONFIRMATION_REQUIRED",
        message: "탈퇴 확인 입력이 올바르지 않습니다. '탈퇴'를 입력해 주세요.",
      });
    }

    return send(response, 500, {
      ok: false,
      code: "DELETION_FAILED",
      message: "계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    });
  }
}
