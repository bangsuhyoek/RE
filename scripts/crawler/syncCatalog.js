/**
 * 카탈로그 동기화 모듈 (Sync Catalog Pipeline)
 * 
 * 역할: 공식 검증(Formal Verification)이 완료된 최신 요금제/안내 데이터를 
 * `src/data/subscriptionData.js`의 `serviceCatalog` 항목에 반영/동기화.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_FILE_PATH = path.resolve(__dirname, "../../src/data/subscriptionData.js");

export class CatalogSyncer {
  constructor(filePath = TARGET_FILE_PATH) {
    this.filePath = filePath;
  }

  /**
   * 검증된 파싱 결과 목록을 기반으로 subscriptionData.js 파일의 serviceCatalog 업데이트
   * @param {Array<Object>} verifiedItems - 검증된 카탈로그 항목 배열
   * @returns {Object} { success: boolean, updatedCount: number }
   */
  sync(verifiedItems, { merge = true } = {}) {
    if (!Array.isArray(verifiedItems) || verifiedItems.length === 0) {
      return { success: false, updatedCount: 0, reason: "No verified items provided" };
    }

    if (!fs.existsSync(this.filePath)) {
      throw new Error(`Target subscription file does not exist: ${this.filePath}`);
    }

    let fileContent = fs.readFileSync(this.filePath, "utf-8");

    // serviceCatalog 시작 및 종료 패턴 탐색
    const catalogStartToken = "export const serviceCatalog = [";
    const catalogStartIndex = fileContent.indexOf(catalogStartToken);

    if (catalogStartIndex === -1) {
      throw new Error("Could not find 'export const serviceCatalog = [' in subscriptionData.js");
    }

    const promotionStartToken = "export const createMockSubscriptions";
    const promotionStartIndex = fileContent.indexOf(promotionStartToken);

    // 기존 serviceCatalog 데이터 추출 및 id 기반 병합 (전체 94개 카탈로그 보존)
    let existingServices = [];
    if (promotionStartIndex !== -1) {
      try {
        const rawJson = fileContent
          .substring(catalogStartIndex + catalogStartToken.length - 1, promotionStartIndex)
          .trim()
          .replace(/;\s*$/, "");
        existingServices = JSON.parse(rawJson);
      } catch (err) {
        process.exitCode = 1;
        throw new Error(`Failed to parse existing serviceCatalog JSON in ${this.filePath}: ${err.message}`);
      }
    }

    const serviceMap = merge ? new Map(existingServices.map((s) => [s.id, s])) : new Map();
    let keptExistingCount = 0;
    for (const item of verifiedItems) {
      if (!item || !item.id) continue;
      const existing = merge ? serviceMap.get(item.id) : null;
      // 페이지를 읽지 못하거나 검증 실패로 안전한 파싱이 되지 않은 항목은
      // 이미 있는 가격과 확인 시각(lastUpdated)을 덮어쓰지 않고 unverified 상태로 유지한다.
      if (existing && item.parseStatus && item.parseStatus !== "PARSED_SUCCESS") {
        serviceMap.set(item.id, {
          ...existing,
          parseStatus: item.parseStatus,
          status: "unverified",
          lastCheckedAt: item.lastUpdated || new Date().toISOString(),
        });
        keptExistingCount += 1;
        continue;
      }
      serviceMap.set(item.id, { ...(existing || {}), ...item });
    }
    const finalServices = serviceMap.size > 0 ? Array.from(serviceMap.values()) : verifiedItems;

    // 카탈로그 항목 수가 기존 항목 수보다 20% 넘게 줄어들면(shrink) 덮어쓰지 않고 중단
    if (existingServices.length > 0) {
      const minAllowedCount = Math.floor(existingServices.length * 0.8);
      if (finalServices.length < minAllowedCount) {
        process.exitCode = 1;
        throw new Error(
          `[CatalogSyncer Guard] Catalog count shrunk by more than 20%: previous ${existingServices.length}, next ${finalServices.length} (minimum allowed: ${minAllowedCount}). Aborting sync.`
        );
      }
    }
    const itemsJson = JSON.stringify(finalServices, null, 2);

    let newCatalogSection = `export const serviceCatalog = ${itemsJson};\n\n`;

    if (promotionStartIndex !== -1) {
      const beforeSection = fileContent.substring(0, catalogStartIndex);
      const afterSection = fileContent.substring(promotionStartIndex);
      fileContent = beforeSection + newCatalogSection + afterSection;
    } else {
      // 대안 대체 패턴
      fileContent = fileContent.replace(
        /export const serviceCatalog = \[\s*[\s\S]*?\n\];/m,
        `export const serviceCatalog = ${itemsJson};`
      );
    }

    fs.writeFileSync(this.filePath, fileContent, "utf-8");

    return {
      success: true,
      updatedCount: verifiedItems.length,
      keptExistingCount,
      syncedAt: new Date().toISOString(),
    };
  }
}
