/**
 * 카탈로그 원격 동기화 및 캐싱 서비스 (Client Catalog Service)
 * 
 * 역할:
 * 1. 앱 번들 기본 카탈로그(serviceCatalog)를 안전한 오프라인 Fallback으로 보장.
 * 2. 원격(CDN, GitHub Pages, Mock API, Supabase Storage 등)의 최신 카탈로그 JSON을 비동기 fetch.
 * 3. Stale-While-Revalidate 패턴: 앱 실행 시 즉시 로컬 캐시/번들을 반환하고 백그라운드에서 원격 업데이트 확인.
 * 4. 조건부 ETag / Version 체크로 모바일 네트워크 데이터 절약.
 */

import { useState, useEffect } from "react";
import { serviceCatalog as defaultBundleCatalog } from "../data/subscriptionData.js";

// 로컬 스토리지 키 상수
const STORAGE_KEYS = {
  CATALOG_DATA: "submate_catalog_cache_data",
  CATALOG_META: "submate_catalog_cache_meta",
};

// 기본 캐시 유효 시간 (12시간)
const DEFAULT_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

// 기본 원격 엔드포인트 경로 (환경변수 또는 상대 정적 경로)
const DEFAULT_CONFIG = {
  // Vite 환경변수가 있으면 우선 사용, 없으면 배포된 정적 경로 /catalog 사용
  remoteBaseUrl: (typeof import.meta !== "undefined" && import.meta.env?.VITE_CATALOG_BASE_URL) || "/catalog",
  versionEndpoint: "/version.json",
  servicesEndpoint: "/services.json",
  ttlMs: DEFAULT_CACHE_TTL_MS,
};

class CatalogService {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memoryCatalog = null;
    this.metadata = null;
    this.listeners = new Set();
    this.isFetching = false;

    // 초기화: 스토리지에서 캐시 데이터 로드
    this.loadFromStorage();
  }

  /**
   * 환경(브라우저/Capacitor vs Node.js)에 맞는 안전한 스토리지 접근자
   */
  getStorage() {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    // Node.js 환경용 인메모리 폴백
    if (!this._nodeStorage) {
      this._nodeStorage = new Map();
    }
    return {
      getItem: (key) => this._nodeStorage.get(key) || null,
      setItem: (key, val) => this._nodeStorage.set(key, String(val)),
      removeItem: (key) => this._nodeStorage.delete(key),
      clear: () => this._nodeStorage.clear(),
    };
  }

  /**
   * 로컬 스토리지에서 캐시 로드
   */
  loadFromStorage() {
    try {
      const storage = this.getStorage();
      const rawData = storage.getItem(STORAGE_KEYS.CATALOG_DATA);
      const rawMeta = storage.getItem(STORAGE_KEYS.CATALOG_META);

      if (rawData) {
        this.memoryCatalog = JSON.parse(rawData);
      }
      if (rawMeta) {
        this.metadata = JSON.parse(rawMeta);
      }
    } catch (e) {
      console.warn("[CatalogService] Failed to load local cache from storage:", e);
      this.memoryCatalog = null;
      this.metadata = null;
    }
  }

  /**
   * 로컬 스토리지에 캐시 저장
   */
  saveToStorage(catalog, meta) {
    try {
      const storage = this.getStorage();
      storage.setItem(STORAGE_KEYS.CATALOG_DATA, JSON.stringify(catalog));
      storage.setItem(STORAGE_KEYS.CATALOG_META, JSON.stringify(meta));
      this.memoryCatalog = catalog;
      this.metadata = meta;
      this.notifyListeners();
    } catch (e) {
      console.warn("[CatalogService] Failed to save catalog cache to storage:", e);
    }
  }

  /**
   * 상태 변경 리스너 등록
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.getCatalog(), this.metadata);
      } catch (err) {
        console.error("[CatalogService] Listener error:", err);
      }
    }
  }

  /**
   * 현재 사용 가능한 카탈로그 동기 반환 (우선순위: 메모리 캐시 > 번들 기본값)
   * UI가 딜레이 없이 즉시 렌더링될 수 있도록 보장.
   * @returns {Array<Object>}
   */
  getCatalog() {
    if (Array.isArray(this.memoryCatalog) && this.memoryCatalog.length > 0) {
      return this.memoryCatalog;
    }
    return defaultBundleCatalog;
  }

  /**
   * 서비스 ID로 단일 카탈로그 조회
   * @param {string} id
   * @returns {Object|null}
   */
  getServiceById(id) {
    if (!id) return null;
    const catalog = this.getCatalog();
    const query = String(id).toLowerCase().trim();
    return catalog.find((s) => s.id?.toLowerCase() === query || s.name?.toLowerCase() === query) || null;
  }

  /**
   * 현재 캐시 메타데이터 반환
   */
  getMetadata() {
    return this.metadata;
  }

  /**
   * 원격 카탈로그 최신 버전 확인 및 스마트 패치 (Stale-While-Revalidate)
   * 1. version.json을 먼저 체크하여 checksum/version 비교
   * 2. 변경된 경우에만 services.json을 다운로드
   * 3. 네트워크 오류 시 기존 캐시/번들 유지
   * @param {Object} [options]
   * @param {boolean} [options.force=false] - 캐시 TTL 무시하고 강제 갱신
   * @returns {Promise<{ updated: boolean, catalog: Array<Object>, source: string }>}
   */
  async refreshRemoteCatalog(options = {}) {
    const { force = false } = options;

    if (this.isFetching) {
      return { updated: false, catalog: this.getCatalog(), source: "in-flight" };
    }

    // TTL 검사
    if (!force && this.metadata?.cachedAt) {
      const elapsed = Date.now() - new Date(this.metadata.cachedAt).getTime();
      if (elapsed < (this.config.ttlMs || DEFAULT_CACHE_TTL_MS)) {
        return { updated: false, catalog: this.getCatalog(), source: "cache-valid" };
      }
    }

    this.isFetching = true;
    const baseUrl = this.config.remoteBaseUrl.replace(/\/+$/, "");
    const versionUrl = `${baseUrl}${this.config.versionEndpoint}`;
    const servicesUrl = `${baseUrl}${this.config.servicesEndpoint}`;

    try {
      // 1. 가벼운 version.json으로 변경 여부 선확인
      let remoteVersionMeta = null;
      try {
        const vRes = await fetch(versionUrl, {
          headers: { "Cache-Control": "no-cache" },
        });
        if (vRes.ok) {
          remoteVersionMeta = await vRes.json();
        }
      } catch (e) {
        // version.json 접근 실패 시 직접 services.json 요청 시도
      }

      // 2. 버전/체크섬이 기존 캐시와 동일한지 확인
      if (
        !force &&
        remoteVersionMeta?.checksum &&
        this.metadata?.checksum === remoteVersionMeta.checksum
      ) {
        // 데이터는 동일하므로 캐시 갱신 타임스탬프만 업데이트
        const updatedMeta = { ...this.metadata, cachedAt: new Date().toISOString() };
        this.saveToStorage(this.memoryCatalog, updatedMeta);
        this.isFetching = false;
        return { updated: false, catalog: this.getCatalog(), source: "cache-revalidated" };
      }

      // 3. 최신 services.json 다운로드
      const sHeaders = {};
      if (this.metadata?.checksum) {
        sHeaders["If-None-Match"] = `"${this.metadata.checksum}"`;
      }

      const sRes = await fetch(servicesUrl, { headers: sHeaders });

      if (sRes.status === 304) {
        // 304 Not Modified
        const updatedMeta = { ...this.metadata, cachedAt: new Date().toISOString() };
        this.saveToStorage(this.memoryCatalog, updatedMeta);
        this.isFetching = false;
        return { updated: false, catalog: this.getCatalog(), source: "http-304" };
      }

      if (!sRes.ok) {
        throw new Error(`Failed to fetch catalog: ${sRes.status} ${sRes.statusText}`);
      }

      const freshServices = await sRes.json();

      if (!Array.isArray(freshServices) || freshServices.length === 0) {
        throw new Error("Invalid remote catalog format: expected non-empty array");
      }

      // 4. 로컬 스토리지에 캐시 반영
      const newMeta = {
        version: remoteVersionMeta?.version || new Date().toISOString().slice(0, 10),
        checksum: remoteVersionMeta?.checksum || null,
        updatedAt: remoteVersionMeta?.updatedAt || new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        itemCount: freshServices.length,
      };

      this.saveToStorage(freshServices, newMeta);
      this.isFetching = false;

      return { updated: true, catalog: freshServices, source: "remote-fresh" };
    } catch (err) {
      this.isFetching = false;
      console.warn("[CatalogService] Remote fetch failed, falling back to local/cached catalog:", err.message);
      return { updated: false, catalog: this.getCatalog(), source: "fallback-error", error: err.message };
    }
  }

  /**
   * 로컬 캐시 초기화
   */
  clearCache() {
    const storage = this.getStorage();
    storage.removeItem(STORAGE_KEYS.CATALOG_DATA);
    storage.removeItem(STORAGE_KEYS.CATALOG_META);
    this.memoryCatalog = null;
    this.metadata = null;
    this.notifyListeners();
  }
}

// 싱글톤 인스턴스 생성
export const catalogService = new CatalogService();

/**
 * React 전용 커스텀 훅 (useCatalog)
 * 컴포넌트에서 실시간 최신 카탈로그 및 갱신 상태를 쉽게 구독.
 */
export function useCatalog() {
  const [catalog, setCatalog] = useState(() => catalogService.getCatalog());
  const [metadata, setMetadata] = useState(() => catalogService.getMetadata());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 1. 카탈로그 변경 구독
    const unsubscribe = catalogService.subscribe((updatedCatalog, updatedMeta) => {
      setCatalog(updatedCatalog);
      setMetadata(updatedMeta);
    });

    // 2. 앱 마운트 시 백그라운드 원격 확인 (Stale-While-Revalidate)
    setIsLoading(true);
    catalogService
      .refreshRemoteCatalog()
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });

    return () => unsubscribe();
  }, []);

  const refresh = async (force = true) => {
    setIsLoading(true);
    try {
      return await catalogService.refreshRemoteCatalog({ force });
    } finally {
      setIsLoading(false);
    }
  };

  const getService = (id) => catalogService.getServiceById(id);

  return {
    catalog,
    metadata,
    isLoading,
    isRemote: !!metadata?.cachedAt,
    lastUpdated: metadata?.updatedAt || null,
    refresh,
    getService,
  };
}

export { CatalogService };
export default catalogService;

