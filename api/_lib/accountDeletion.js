import crypto from "node:crypto";

/**
 * SHA-256 16진수 문자열 해시 생성
 */
export function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

/**
 * 확정된 사용자 데이터 테이블 목록 (외래키 종속성 순서대로 삭제)
 * 자식 테이블 -> 부모 테이블 순서
 */
export const CONFIRMED_USER_TABLES = [
  "evidence_items",
  "evidence_cases",
  "approval_requests",
  "agent_mandates",
  "subscriptions",
  "receipt_recognitions",
  "agent_chat_usage",
  "api_endpoint_usage",
];

/**
 * 보조/옵셔널 사용자 데이터 테이블 목록 (스키마에 존재할 경우 조건부 삭제)
 */
export const OPTIONAL_USER_TABLES = [
  "cancellation_history",
  "notifications",
  "profiles",
];


const isMissingRelationOrColumn = (error) => {
  if (!error) return false;
  const code = String(error.code || "");
  const msg = String(error.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST200" ||
    msg.includes("does not exist") ||
    msg.includes("not found") ||
    msg.includes("could not find the table") ||
    msg.includes("column")
  );
};

const isUserNotFoundError = (error) => {
  if (!error) return false;
  const status = error.status;
  const msg = String(error.message || "").toLowerCase();
  return status === 404 || msg.includes("not found");
};

/**
 * Supabase Storage에 보관된 사용자 파일 삭제 (버킷이 존재하고 사용자 폴더가 있는 경우)
 */
export async function deleteStorageObjects(supabaseAdmin, userId) {
  if (!supabaseAdmin?.storage || typeof supabaseAdmin.storage.listBuckets !== "function") {
    return { ok: true, deletedCount: 0 };
  }

  let buckets = [];
  try {
    const { data, error } = await supabaseAdmin.storage.listBuckets();
    if (!error && Array.isArray(data)) {
      buckets = data;
    }
  } catch {
    return { ok: true, deletedCount: 0 };
  }

  let deletedCount = 0;
  for (const bucket of buckets) {
    try {
      const bucketId = bucket.id || bucket.name;
      const bucketClient = supabaseAdmin.storage.from(bucketId);
      if (!bucketClient || typeof bucketClient.list !== "function") continue;

      const { data: files, error: listError } = await bucketClient.list(userId);
      if (!listError && Array.isArray(files) && files.length > 0) {
        const filePaths = files
          .map((f) => (f.name ? `${userId}/${f.name}` : null))
          .filter(Boolean);
        if (filePaths.length > 0 && typeof bucketClient.remove === "function") {
          await bucketClient.remove(filePaths);
          deletedCount += filePaths.length;
        }
      }
    } catch {
      // 버킷 접근 권한 문제 등은 무시하고 계속 진행
    }
  }

  return { ok: true, deletedCount };
}

/**
 * 사용자 관련 모든 DB 데이터 삭제 (Storage 포함)
 */
export async function deleteUserData(supabaseAdmin, userId) {
  if (!userId) {
    const err = new Error("User ID is required");
    err.code = "USER_ID_REQUIRED";
    throw err;
  }

  // 1. Storage 객체 삭제
  await deleteStorageObjects(supabaseAdmin, userId);

  // 2. 확정된 사용자 테이블 행 삭제 (정해진 외래키 종속성 순서)
  for (const table of CONFIRMED_USER_TABLES) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("user_id", userId);

    if (error) {
      const err = new Error(`Failed to delete user records from table: ${table}`);
      err.code = "TABLE_DELETION_FAILED";
      err.table = table;
      throw err;
    }
  }

  // 3. 해지 난이도 제보 삭제 (raw user_id 대신 sha256(userId) 기반 owner_hash로 본인 제보 식별 삭제)
  const ownerHash = sha256Hex(userId);
  const { error: cancelReportsError } = await supabaseAdmin
    .from("cancel_difficulty_reports")
    .delete()
    .eq("owner_hash", ownerHash);

  if (cancelReportsError) {
    const err = new Error("Failed to delete user records from table: cancel_difficulty_reports");
    err.code = "TABLE_DELETION_FAILED";
    err.table = "cancel_difficulty_reports";
    throw err;
  }

  // 4. 보조/옵셔널 테이블 행 삭제 (존재하지 않으면 건너뜀)
  for (const table of OPTIONAL_USER_TABLES) {
    try {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("user_id", userId);

      if (error && !isMissingRelationOrColumn(error)) {
        const err = new Error(`Failed to delete optional user records from table: ${table}`);
        err.code = "TABLE_DELETION_FAILED";
        err.table = table;
        throw err;
      }
    } catch (e) {
      if (!isMissingRelationOrColumn(e)) {
        throw e;
      }
    }
  }

  return { ok: true };
}


/**
 * Supabase Auth 사용자 삭제 (Service Role Key 필요, 멱등성 보장)
 */
export async function deleteAuthUser(supabaseAdmin, userId) {
  if (!supabaseAdmin?.auth?.admin?.deleteUser) {
    const err = new Error("Supabase auth admin is not configured");
    err.code = "AUTH_ADMIN_NOT_CONFIGURED";
    throw err;
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    if (isUserNotFoundError(error)) {
      return { ok: true, alreadyDeleted: true };
    }
    const err = new Error("Failed to delete auth user");
    err.code = "AUTH_USER_DELETION_FAILED";
    throw err;
  }

  return { ok: true };
}

/**
 * 계정 삭제 전체 오케스트레이션
 * 1. 확인값 검증 ('탈퇴')
 * 2. 사용자 데이터 삭제 (DB 및 Storage)
 * 3. Auth 사용자 삭제 (2번 실패 시 3번은 절대 호출되지 않음)
 */
export async function deleteAccount({ supabaseAdmin, userId, confirmation }) {
  const trimmed = String(confirmation || "").trim();
  if (trimmed !== "탈퇴" && trimmed !== "DELETE") {
    const err = new Error("Confirmation value must be '탈퇴'");
    err.code = "CONFIRMATION_REQUIRED";
    throw err;
  }

  // 1단계: 사용자 테이블 및 스토리지 데이터 삭제
  await deleteUserData(supabaseAdmin, userId);

  // 2단계: auth.users 사용자 삭제 (1단계 성공 시에만 도달)
  await deleteAuthUser(supabaseAdmin, userId);

  return { ok: true, deleted: true };
}
