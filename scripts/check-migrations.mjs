#!/usr/bin/env node
/**
 * 배포 전 Supabase 마이그레이션 적용 여부 점검 (read-only)
 * Pre-deploy check that required Supabase migrations are applied to the remote DB.
 *
 *   pnpm check:migrations
 *
 * 필요한 환경변수 (env): SUPABASE_URL 또는 VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 선택 (optional): SUPABASE_ANON_KEY 또는 VITE_SUPABASE_ANON_KEY — 있으면 anon 역할에 내부 RPC가 노출되지 않는지도 확인
 *
 * 모든 점검은 GET 요청만 사용한다. RPC를 실제로 호출하지 않으므로 할당량·데이터가 바뀌지 않는다.
 *  - 컬럼: GET /rest/v1/subscriptions?select=<col>&limit=0 (행을 읽지 않음)
 *  - RPC: PostgREST OpenAPI 스키마(GET /rest/v1/)에서 함수와 인자 이름 확인
 */

const CHECKS = [
  {
    migration: "20261021090000_quota_rpc_service_role_only.sql",
    rpcs: [
      { name: "consume_endpoint_quota", params: ["p_user_id", "p_endpoint", "p_max_10m", "p_max_daily"] },
      { name: "consume_global_gemini_quota", params: ["p_max_daily"] },
    ],
  },
  {
    migration: "20261021120000_subscription_memo_alert_fields.sql",
    columns: { table: "subscriptions", names: ["memo", "alert_dday", "alert_hour", "alert_ampm"] },
  },
  {
    migration: "20261023100000_atomic_account_deletion_and_security_hardening.sql",
    rpcs: [{ name: "delete_submate_user_data", params: ["target_user_id"] }],
  },
];

const PRIVATE_RPCS = ["consume_endpoint_quota", "consume_global_gemini_quota", "delete_submate_user_data"];

function fail(lines) {
  console.error("\n❌ Supabase 마이그레이션 점검 실패 / Supabase migration check failed");
  for (const line of lines) console.error("  - " + line);
  console.error("\n원격 DB에 위 마이그레이션을 적용한 뒤 프론트엔드/API를 배포하세요.");
  console.error("Apply the migrations above to the remote DB before deploying the frontend/API.");
  process.exit(1);
}

const baseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!baseUrl || !serviceKey) {
  fail([
    "환경변수 누락: SUPABASE_URL(또는 VITE_SUPABASE_URL)과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
    "Missing env: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.",
  ]);
}

const headersFor = (key) => ({ apikey: key, Authorization: "Bearer " + key, Accept: "application/openapi+json, application/json" });

async function getJson(path, key) {
  const res = await fetch(baseUrl + path, { method: "GET", headers: headersFor(key), signal: AbortSignal.timeout(15000) });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

function rpcParamNames(spec, name) {
  const op = spec?.paths?.["/rpc/" + name]?.post;
  if (!op) return null;
  const names = new Set();
  for (const p of op.parameters ?? []) {
    const ref = p.$ref ? spec.parameters?.[p.$ref.split("/").pop()] : p;
    for (const key of Object.keys(ref?.schema?.properties ?? {})) names.add(key);
  }
  return names;
}

async function main() {
  const missing = [];

  // 1) 컬럼 점검 (columns)
  for (const check of CHECKS.filter((c) => c.columns)) {
    const { table, names } = check.columns;
    for (const col of names) {
      const r = await getJson("/rest/v1/" + table + "?select=" + col + "&limit=0", serviceKey);
      if (!r.ok) {
        const detail = r.body?.code ? " (" + r.body.code + ")" : "";
        missing.push(check.migration + ": 컬럼 없음 / missing column " + table + "." + col + " [HTTP " + r.status + detail + "]");
      }
    }
  }

  // 2) RPC 점검 (functions) — OpenAPI 스키마 조회만 한다
  const specRes = await getJson("/rest/v1/", serviceKey);
  if (!specRes.ok || !specRes.body?.paths) {
    fail(["PostgREST OpenAPI 스키마를 읽지 못했습니다 / could not read PostgREST OpenAPI schema [HTTP " + specRes.status + "]", ...missing]);
  }
  for (const check of CHECKS.filter((c) => c.rpcs)) {
    for (const rpc of check.rpcs) {
      const params = rpcParamNames(specRes.body, rpc.name);
      if (!params) {
        missing.push(check.migration + ": 함수 없음 / missing function public." + rpc.name);
        continue;
      }
      const absent = rpc.params.filter((p) => !params.has(p));
      if (absent.length) {
        missing.push(check.migration + ": 함수 인자 불일치 / outdated signature public." + rpc.name + " (missing " + absent.join(", ") + ")");
      }
    }
  }

  // 3) 선택: anon 역할에 내부 RPC가 노출되는지 (권한 회수 확인)
  if (anonKey) {
    const anonSpec = await getJson("/rest/v1/", anonKey);
    if (anonSpec.ok && anonSpec.body?.paths) {
      for (const name of PRIVATE_RPCS) {
        if (anonSpec.body.paths["/rpc/" + name]) {
          missing.push("anon 역할이 실행 가능 / anon can execute public." + name + " (service_role 전용 권한 회수 미적용 / revoke not applied)");
        }
      }
    } else {
      console.warn("⚠️  anon 키로 OpenAPI를 읽지 못해 권한 점검을 건너뜁니다 / skipped anon privilege check [HTTP " + anonSpec.status + "]");
    }
  }

  if (missing.length) fail(missing);
  console.log("✅ 필요한 Supabase 마이그레이션이 모두 적용되어 있습니다 / all required Supabase migrations are applied:");
  for (const c of CHECKS) console.log("  - " + c.migration);
}

main().catch((error) => fail(["점검 중 오류 / check error: " + (error?.message ?? String(error))]));
