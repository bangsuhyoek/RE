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
  sync(verifiedItems) {
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

    // 기존 serviceCatalog 데이터 추출 및 병합
    // 템플릿화된 JSON 주입 방식으로 serviceCatalog 섹션을 안전하게 최신 데이터로 대체
    const itemsJson = JSON.stringify(verifiedItems, null, 2);

    // serviceCatalog 분서 위치 찾기: export const serviceCatalog = [...] 까지
    const promotionStartToken = "export const createMockSubscriptions";
    const promotionStartIndex = fileContent.indexOf(promotionStartToken);

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
      syncedAt: new Date().toISOString(),
    };
  }
}
