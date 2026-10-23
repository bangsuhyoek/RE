/**
 * 해지 증빙 (IndexedDB 기반 기기 내 단독 보관)
 * - 해지 완료 화면 캡처(선택)와 해지 일시, 금액, 서비스 정보를 기기에만 저장한다.
 * - 서버 업로드 절대 없음.
 * - IndexedDB를 지원하지 않는 환경(node.js 테스트 등)에서는 in-memory Map으로 graceful fallback.
 */

const DB_NAME = "submate";
const STORE_NAME = "cancelProofs";
const DB_VERSION = 1;

// Node/non-browser in-memory fallback
const memoryStore = new Map();

function hasIndexedDB() {
  return typeof indexedDB !== "undefined" && indexedDB !== null;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      return reject(new Error("IndexedDB is not available"));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("recordId", "recordId", { unique: false });
        store.createIndex("subscriptionId", "subscriptionId", { unique: false });
        store.createIndex("serviceId", "serviceId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

function generateId(recordId) {
  return "proof:" + (recordId || Date.now() + "_" + Math.random().toString(36).slice(2, 8));
}

/**
 * 해지 증빙 저장
 * @param {Object} params
 * @param {string} [params.recordId]
 * @param {string} [params.subscriptionId]
 * @param {string} [params.serviceId]
 * @param {string} params.serviceName
 * @param {number} [params.amount]
 * @param {string|Date} [params.cancelledAt]
 * @param {string|null} [params.imageDataUrl]
 * @param {string|null} [params.note]
 * @returns {Promise<Object>}
 */
export async function saveCancelProof({
  recordId = null,
  subscriptionId = null,
  serviceId = null,
  serviceName = "",
  amount = 0,
  cancelledAt = new Date().toISOString(),
  imageDataUrl = null,
  note = null,
}) {
  const proof = {
    id: generateId(recordId),
    recordId: recordId || null,
    subscriptionId: subscriptionId || null,
    serviceId: serviceId || null,
    serviceName: String(serviceName || ""),
    amount: Math.max(0, Math.round(Number(amount) || 0)),
    cancelledAt: typeof cancelledAt === "string" ? cancelledAt : new Date(cancelledAt).toISOString(),
    imageDataUrl: imageDataUrl || null,
    note: note || null,
    createdAt: new Date().toISOString(),
  };

  if (!hasIndexedDB()) {
    memoryStore.set(proof.id, proof);
    return proof;
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(proof);
      req.onsuccess = () => resolve(proof);
      req.onerror = () => reject(req.error || new Error("Failed to save cancel proof"));
      tx.oncomplete = () => db.close();
    });
  } catch {
    // If IndexedDB transaction fails, fall back to memoryStore
    memoryStore.set(proof.id, proof);
    return proof;
  }
}

/**
 * 해지 기록 ID 또는 구독 ID로 단일 증빙 조회
 * @param {string} recordId
 * @returns {Promise<Object|null>}
 */
export async function getCancelProof(recordId) {
  if (!recordId) return null;

  if (!hasIndexedDB()) {
    for (const proof of memoryStore.values()) {
      if (proof.recordId === recordId || proof.subscriptionId === recordId || proof.id === recordId) {
        return proof;
      }
    }
    return null;
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        const match = all.find((p) => p.recordId === recordId || p.subscriptionId === recordId || p.id === recordId) || null;
        resolve(match);
      };
      req.onerror = () => reject(req.error || new Error("Failed to get cancel proof"));
      tx.oncomplete = () => db.close();
    });
  } catch {
    for (const proof of memoryStore.values()) {
      if (proof.recordId === recordId || proof.subscriptionId === recordId || proof.id === recordId) {
        return proof;
      }
    }
    return null;
  }
}

/**
 * 저장된 모든 해지 증빙 목록 조회 (최신순)
 * @returns {Promise<Array>}
 */
function normalizeServiceName(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * 조건에 부합하는 해지 증빙 중 가장 최근 항목을 찾는다.
 * 매칭 순서:
 * 1. subscriptionId / recordId 일치
 * 2. serviceId 일치
 * 3. 정규화된 serviceName (trim, lowercase, 공백 제거) 일치
 *
 * @param {Object} query
 * @param {string} [query.subscriptionId]
 * @param {string} [query.recordId]
 * @param {string} [query.serviceId]
 * @param {string} [query.serviceName]
 * @returns {Promise<Object|null>}
 */
export async function findCancelProof({ subscriptionId = null, recordId = null, serviceId = null, serviceName = null } = {}) {
  const all = await listCancelProofs();
  if (!all.length) return null;

  const targetSubId = subscriptionId || recordId;
  if (targetSubId) {
    const match = all.find((p) => p.subscriptionId === targetSubId || p.recordId === targetSubId || p.id === targetSubId);
    if (match) return match;
  }

  if (serviceId) {
    const match = all.find((p) => p.serviceId === serviceId);
    if (match) return match;
  }

  if (serviceName) {
    const targetNorm = normalizeServiceName(serviceName);
    if (targetNorm) {
      const match = all.find((p) => normalizeServiceName(p.serviceName) === targetNorm);
      if (match) return match;
    }
  }

  return null;
}

export async function listCancelProofs() {
  if (!hasIndexedDB()) {
    return Array.from(memoryStore.values()).sort(
      (a, b) => new Date(b.createdAt || b.cancelledAt) - new Date(a.createdAt || a.cancelledAt)
    );
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []).sort(
          (a, b) => new Date(b.createdAt || b.cancelledAt) - new Date(a.createdAt || a.cancelledAt)
        );
        resolve(list);
      };
      req.onerror = () => reject(req.error || new Error("Failed to list cancel proofs"));
      tx.oncomplete = () => db.close();
    });
  } catch {
    return Array.from(memoryStore.values()).sort(
      (a, b) => new Date(b.createdAt || b.cancelledAt) - new Date(a.createdAt || a.cancelledAt)
    );
  }
}

/**
 * 해지 증빙 삭제
 * @param {string} id proof.id
 * @returns {Promise<boolean>}
 */
export async function deleteCancelProof(id) {
  if (!id) return false;

  if (!hasIndexedDB()) {
    const existed = memoryStore.has(id);
    memoryStore.delete(id);
    return existed;
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error || new Error("Failed to delete cancel proof"));
      tx.oncomplete = () => db.close();
    });
  } catch {
    const existed = memoryStore.has(id);
    memoryStore.delete(id);
    return existed;
  }
}

/**
 * 브라우저 전용 이미지 리사이즈 헬퍼
 * - 최대 해상도 1600px, JPEG 압축 (기본 0.85)
 * - dataUrl 반환
 * @param {File|Blob} file
 * @param {Object} [options]
 * @param {number} [options.maxSize=1600]
 * @param {number} [options.quality=0.85]
 * @returns {Promise<string>} dataUrl (e.g. data:image/jpeg;base64,...)
 */
export function resizeImageFile(file, { maxSize = 1600, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No file provided"));
    }

    const fallbackReader = () => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("FileReader error"));
      reader.readAsDataURL(file);
    };

    if (
      typeof window === "undefined" ||
      !window.URL?.createObjectURL ||
      typeof document === "undefined"
    ) {
      fallbackReader();
      return;
    }

    try {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          fallbackReader();
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        fallbackReader();
      };

      img.src = url;
    } catch {
      fallbackReader();
    }
  });
}
