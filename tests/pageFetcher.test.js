import test from "node:test";
import assert from "node:assert/strict";
import {
  PageState,
  BLOCK_TEXT_PATTERNS,
  classifyPage,
  detectBlockReason,
  decodeHtmlBuffer,
  isTransientOutcome,
  calculateRetryDelay,
  pickBetterPageResult,
  createCachedQueue,
} from "../scripts/crawler/promotions/pageFetcher.js";

test("classifyPage block patterns + blockReason: WAF 및 봇 탐지 시 BLOCKED와 원인을 반환한다", () => {
  const url = "https://example.com/promo";

  // CloudFront / WAF "access to this page has been denied"
  const cfDenied = classifyPage(
    { requestedUrl: url, finalUrl: url, status: 403, text: "Access to this page has been denied! Please check your connection." },
    { withReason: true }
  );
  assert.equal(cfDenied.state, PageState.BLOCKED);
  assert.match(cfDenied.blockReason, /access to this page has been denied/i);

  // CloudFront "automation tools"
  const cfAutomation = classifyPage(
    { requestedUrl: url, finalUrl: url, status: 200, text: "Activity resembling automation tools detected." },
    { withReason: true }
  );
  assert.equal(cfAutomation.state, PageState.BLOCKED);
  assert.match(cfAutomation.blockReason, /automation tools/i);

  // DataDome
  const dataDome = classifyPage(
    { requestedUrl: url, finalUrl: url, status: 403, text: "Protected by DataDome. Please solve the puzzle." },
    { withReason: true }
  );
  assert.equal(dataDome.state, PageState.BLOCKED);
  assert.match(dataDome.blockReason, /datadome/i);

  // Akamai "Reference #"
  const akamaiRef = classifyPage(
    { requestedUrl: url, finalUrl: url, status: 403, text: "Access Denied. Reference #18.2b3c4d5e" },
    { withReason: true }
  );
  assert.equal(akamaiRef.state, PageState.BLOCKED);
  assert.ok(akamaiRef.blockReason.length > 0);

  // Akamai "pardon our interruption"
  const akamaiPardon = classifyPage(
    { requestedUrl: url, finalUrl: url, status: 403, text: "Pardon Our Interruption. As you were browsing, something about your browser made us think..." },
    { withReason: true }
  );
  assert.equal(akamaiPardon.state, PageState.BLOCKED);
  assert.match(akamaiPardon.blockReason, /pardon our interruption/i);

  // Akamai / Cloudflare "unusual traffic"
  const unusual = classifyPage(
    { requestedUrl: url, finalUrl: url, status: 200, text: "Our systems have detected unusual traffic from your computer network." },
    { withReason: true }
  );
  assert.equal(unusual.state, PageState.BLOCKED);
  assert.match(unusual.blockReason, /unusual traffic/i);

  // 패턴 매칭 없이 403 상태이고 본문이 짧은 경우
  const generic403 = classifyPage(
    { requestedUrl: url, finalUrl: url, status: 403, text: "Forbidden" },
    { withReason: true }
  );
  assert.equal(generic403.state, PageState.BLOCKED);
  assert.equal(generic403.blockReason, "HTTP_403_BLOCKED");

  // 403 상태이지만 본문이 800자 이상이고 차단 패턴이 없는 경우 (정상 페이지로 구제)
  const longLegit403 = classifyPage(
    { requestedUrl: url, finalUrl: url, status: 403, text: "정상 안내 문구입니다. ".repeat(100) },
    { withReason: true }
  );
  assert.equal(longLegit403.state, PageState.OK);
  assert.equal(longLegit403.blockReason, undefined);

  // 하위 호환성 검증: withReason 옵션 없을 때 원시 문자열 반환
  const legacyReturn = classifyPage({ requestedUrl: url, finalUrl: url, status: 403, text: "Just a moment..." });
  assert.equal(typeof legacyReturn, "string");
  assert.equal(legacyReturn, PageState.BLOCKED);
});

test("isTransientOutcome 및 calculateRetryDelay: 일시적 오류 판별 및 재시도 지연시간 계산", () => {
  // 재시도 대상 (transient): 429, 502, 503, 504, 네트워크/타임아웃 에러
  assert.equal(isTransientOutcome({ status: 429 }), true);
  assert.equal(isTransientOutcome({ status: 502 }), true);
  assert.equal(isTransientOutcome({ status: 503 }), true);
  assert.equal(isTransientOutcome({ status: 504 }), true);
  assert.equal(isTransientOutcome({ status: 0, error: "net::ERR_CONNECTION_TIMED_OUT" }), true);
  assert.equal(isTransientOutcome({ status: 0, error: "fetch failed" }), true);

  // 재시도 비대상 (non-transient): 404, 410, 401, LOGIN_REQUIRED, hard BLOCKED, OK, EMPTY
  assert.equal(isTransientOutcome({ status: 404, state: PageState.NOT_FOUND }), false);
  assert.equal(isTransientOutcome({ status: 410, state: PageState.NOT_FOUND }), false);
  assert.equal(isTransientOutcome({ status: 401, state: PageState.LOGIN_REQUIRED }), false);
  assert.equal(isTransientOutcome({ status: 200, state: PageState.LOGIN_REQUIRED }), false);
  assert.equal(isTransientOutcome({ status: 403, state: PageState.BLOCKED }), false);
  assert.equal(isTransientOutcome({ status: 200, state: PageState.BLOCKED }), false);
  assert.equal(isTransientOutcome({ status: 200, state: PageState.OK }), false);
  assert.equal(isTransientOutcome({ status: 200, state: PageState.EMPTY }), false);

  // calculateRetryDelay: Retry-After 헤더 (초 단위)
  assert.equal(calculateRetryDelay({ retryAfter: "5" }), 5000);
  assert.equal(calculateRetryDelay({ retryAfter: "2" }), 2000);
  // Retry-After 15초 상한 캡
  assert.equal(calculateRetryDelay({ retryAfter: "60" }), 15000);

  // calculateRetryDelay: 지수 백오프 (지터 제외 시 기본값 확인)
  assert.equal(calculateRetryDelay({ attempt: 0, jitter: false }), 1000);
  assert.equal(calculateRetryDelay({ attempt: 1, jitter: false }), 3000);

  // calculateRetryDelay: 지터 포함 시 범위 검증
  const d0 = calculateRetryDelay({ attempt: 0, jitter: true });
  assert.ok(d0 >= 1000 && d0 <= 1500);
  const d1 = calculateRetryDelay({ attempt: 1, jitter: true });
  assert.ok(d1 >= 3000 && d1 <= 3500);
});

test("decodeHtmlBuffer: Content-Type 및 <meta charset> 기반 EUC-KR/CP949 디코딩", () => {
  // '안녕하세요' EUC-KR 바이트: 0xbe, 0xc8, 0xb3, 0xe7, 0xc7, 0xcf, 0xbc, 0xbc, 0xbf, 0xe4
  const eucBytes = new Uint8Array([0xbe, 0xc8, 0xb3, 0xe7, 0xc7, 0xcf, 0xbc, 0xbc, 0xbf, 0xe4]);

  // 1. Content-Type 헤더가 charset=euc-kr 인 경우
  const decodedHeaderEuc = decodeHtmlBuffer(eucBytes, "text/html; charset=euc-kr");
  assert.equal(decodedHeaderEuc, "안녕하세요");

  // 2. Content-Type 헤더가 charset=cp949 인 경우
  const decodedHeaderCp = decodeHtmlBuffer(eucBytes, "text/html; charset=CP949");
  assert.equal(decodedHeaderCp, "안녕하세요");

  // 3. Content-Type 헤더가 없으나 <meta charset="euc-kr"> 태그가 있는 경우
  const metaHeader = Buffer.from('<html><head><meta charset="euc-kr"></head><body>');
  const combinedMeta = new Uint8Array([...metaHeader, ...eucBytes, ...Buffer.from("</body></html>")]);
  const decodedMeta = decodeHtmlBuffer(combinedMeta, "text/html");
  assert.ok(decodedMeta.includes("안녕하세요"));

  // 4. Content-Type 헤더가 없으나 <meta http-equiv="Content-Type" content="text/html; charset=euc-kr"> 인 경우
  const metaHttpEquiv = Buffer.from('<html><head><meta http-equiv="Content-Type" content="text/html; charset=euc-kr"></head><body>');
  const combinedHttpEquiv = new Uint8Array([...metaHttpEquiv, ...eucBytes, ...Buffer.from("</body></html>")]);
  const decodedHttpEquiv = decodeHtmlBuffer(combinedHttpEquiv, "");
  assert.ok(decodedHttpEquiv.includes("안녕하세요"));

  // 5. UTF-8 기본 디코딩
  const utf8Bytes = new TextEncoder().encode("유니코드 한글 테스트");
  const decodedUtf8 = decodeHtmlBuffer(utf8Bytes, "text/html; charset=utf-8");
  assert.equal(decodedUtf8, "유니코드 한글 테스트");
});

test("pickBetterPageResult: 브라우저와 fetch 수집 결과 중 최적 결과 선택", () => {
  const okResult = { state: PageState.OK, text: "짧은 텍스트" };
  const emptyResult = { state: PageState.EMPTY, text: "" };
  const blockedResult = { state: PageState.BLOCKED, text: "차단됨" };
  const errorResult = { state: PageState.ERROR, text: "" };

  // OK 상태는 ERROR/EMPTY/BLOCKED를 이긴다
  assert.equal(pickBetterPageResult(okResult, emptyResult), okResult);
  assert.equal(pickBetterPageResult(blockedResult, okResult), okResult);
  assert.equal(pickBetterPageResult(errorResult, okResult), okResult);

  // 둘 다 OK가 아니면 텍스트가 더 긴 쪽을 선택한다
  const longerBlocked = { state: PageState.BLOCKED, text: "긴 차단 안내 문구 ".repeat(10) };
  const shorterBlocked = { state: PageState.BLOCKED, text: "짧은 차단 문구" };
  assert.equal(pickBetterPageResult(shorterBlocked, longerBlocked), longerBlocked);
});

test("createCachedQueue: 도메인별 max 1 동시성, 최소 간격(minGap), device별 캐시 키 분리 검증", async () => {
  let virtualTime = 1000;
  const mockClock = {
    now: () => virtualTime,
  };

  const sleepQueue = [];
  const mockSleep = (ms) => {
    return new Promise((resolve) => {
      sleepQueue.push({ wakeAt: virtualTime + ms, resolve });
    });
  };

  function advanceTime(ms) {
    virtualTime += ms;
    for (let i = sleepQueue.length - 1; i >= 0; i--) {
      if (sleepQueue[i].wakeAt <= virtualTime) {
        const item = sleepQueue.splice(i, 1)[0];
        item.resolve();
      }
    }
  }

  const callLog = [];
  const mockFetchPage = async (url, options) => {
    const startedAt = mockClock.now();
    callLog.push({ url, device: options?.device ?? "desktop", startedAt });
    return { url, text: "content", state: PageState.OK, startedAt };
  };

  const queue = createCachedQueue(mockFetchPage, {
    limit: 4,
    minGapMs: 800,
    jitterMs: 0,
    clock: mockClock,
    sleep: mockSleep,
    random: () => 0,
  });

  // 1. 캐시 검증: 같은 URL과 같은 device는 동일 프로미스 반환 (한 번만 호출)
  const p1 = queue("https://example.com/item1", { device: "desktop" });
  const p2 = queue("https://example.com/item1", { device: "desktop" });
  assert.equal(p1, p2);
  await p1;
  assert.equal(callLog.length, 1);

  // 2. device가 다르면 캐시 키 분리
  advanceTime(800);
  const pMobile = queue("https://example.com/item1", { device: "mobile" });
  assert.notEqual(p1, pMobile);
  await pMobile;
  assert.equal(callLog.filter((c) => c.url === "https://example.com/item1").length, 2);

  // 3. 같은 호스트에 대해 연속 요청 시 minGap(800ms) 유지 검증
  const baseStart = mockClock.now();
  const seqLog = [];
  const mockHostFetch = async (url, options) => {
    const start = mockClock.now();
    seqLog.push({ url, start });
    return { url, start };
  };

  const hostQueue = createCachedQueue(mockHostFetch, {
    limit: 4,
    minGapMs: 800,
    jitterMs: 0,
    clock: mockClock,
    sleep: mockSleep,
    random: () => 0,
  });

  // 호스트 A로 2개, 호스트 B로 1개 동시 요청
  const reqA1 = hostQueue("https://host-a.com/page1");
  const reqA2 = hostQueue("https://host-a.com/page2");
  const reqB1 = hostQueue("https://host-b.com/page1");

  // 첫 번째 턴: A1과 B1은 즉시 실행되고, A2는 대기해야 함
  await Promise.all([reqA1, reqB1]);
  assert.equal(seqLog.length, 2);
  const a1Log = seqLog.find((l) => l.url === "https://host-a.com/page1");
  const b1Log = seqLog.find((l) => l.url === "https://host-b.com/page1");
  assert.equal(a1Log.start, baseStart);
  assert.equal(b1Log.start, baseStart);

  // 시간을 400ms만 진행했을 때 (minGap 800ms 미도달): A2는 아직 시작하지 않음
  advanceTime(400);
  assert.equal(seqLog.length, 2);

  // 시간을 추가 400ms 진행 (총 800ms 경과): A2가 실행됨
  advanceTime(400);
  await new Promise((r) => setTimeout(r, 10));
  await reqA2;
  assert.equal(seqLog.length, 3);
  const a2Log = seqLog.find((l) => l.url === "https://host-a.com/page2");
  assert.equal(a2Log.start, baseStart + 800);
  assert.ok(a2Log.start - a1Log.start >= 800, "동일 호스트 간 800ms 간격 보장");
});
