/**
 * 검증 환불 정책 출처 확인
 *
 * VERIFIED_REFUND_POLICIES의 각 출처 페이지를 열어 checkPhrases 문구가 아직 있는지 본다.
 * 문구가 사라졌으면 정책이 바뀌었을 수 있으니 사람이 원문을 다시 확인하고 요약·확인일을 고친다.
 * 자동으로 정책을 고치거나 지우지 않는다.
 */

import { VERIFIED_REFUND_POLICIES } from "../../src/lib/subscriptionAgent.js";
import { createPageFetcher, PageState } from "./promotions/pageFetcher.js";

const squash = (value = "") => String(value).replace(/\s+/g, " ").trim();

/** 페이지 본문에서 빠진 문구를 돌려준다. 공백·줄바꿈 차이는 무시한다. */
export function findMissingPhrases(phrases = [], pageText = "") {
  const body = squash(pageText);
  return phrases.filter((phrase) => !body.includes(squash(phrase)));
}

export async function runRefundPolicyCheck({ policies = VERIFIED_REFUND_POLICIES, fetcher } = {}) {
  const ownFetcher = fetcher ? null : await createPageFetcher({ settleMs: 8000 });
  const fetchPage = (fetcher || ownFetcher).fetchPage;
  const results = [];
  try {
    for (const [id, policy] of Object.entries(policies)) {
      const page = await fetchPage(policy.sourceUrl);
      if (page.state !== PageState.OK) {
        results.push({ id, status: "UNREACHABLE", pageState: page.state, url: policy.sourceUrl });
        continue;
      }
      const missing = findMissingPhrases(policy.checkPhrases, page.text);
      results.push({ id, status: missing.length ? "CHANGED" : "OK", missing, url: policy.sourceUrl, verifiedAt: policy.verifiedAt });
    }
  } finally {
    await ownFetcher?.close();
  }
  return results;
}

if (process.argv[1] && process.argv[1].endsWith("refundPolicyCheck.js")) {
  const results = await runRefundPolicyCheck();
  for (const result of results) {
    const detail = result.status === "CHANGED" ? " 빠진 문구: " + result.missing.join(" / ") : result.pageState ? " (" + result.pageState + ")" : "";
    console.log("[" + result.status + "] " + result.id + detail);
  }
  const needsReview = results.filter((result) => result.status !== "OK");
  console.log(needsReview.length ? needsReview.length + "개 정책의 원문을 다시 확인하세요." : "모든 정책 출처 문구가 그대로예요.");
  process.exitCode = needsReview.length ? 1 : 0;
}
