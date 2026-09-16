import test from 'node:test';
import assert from 'node:assert/strict';

import {
  inspectCampaignHTML,
  parseKoreanCampaignPeriod,
  validatePromotion,
} from '../scripts/crawler/promotionValidator.js';

import {
  reconcileCatalog,
} from '../scripts/crawler/reconcileCatalog.js';

const NOW = Date.parse('2026-09-16T03:00:00.000Z');

const promotion = {
  id: 'example-premium-trial',
  serviceName: 'Example',
  url: 'https://example.com/offers/trial',
  brandTokens: ['Example'],
  campaignTokens: ['프리미엄 첫 3개월 무료'],
  campaignSelector: '#campaign',
  periodText: '가입 후 첫 3개월 (2026.09.23까지 신청)',
  isCampaignPage: true,
};

function htmlFetch(html) {
  return async () => new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function verifiedPrevious(overrides = {}) {
  return {
    ...promotion,
    status: 'ACTIVE',
    verification: { verified: true, method: 'multi-signal-v2' },
    lastVerifiedAt: '2026-09-15T03:00:00.000Z',
    verifiedPeriod: parseKoreanCampaignPeriod(
      promotion.periodText,
      { now: NOW },
    ),
    ...overrides,
  };
}

test('SPA shell survives using OG metadata and Next.js hydration', async () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:title" content="Example - 프리미엄 첫 3개월 무료">
        <meta property="og:description" content="Example 서비스의 프리미엄 첫 3개월 무료 체험 프로모션">
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "campaign": {
                  "name": "프리미엄 첫 3개월 무료",
                  "service": "Example"
                }
              }
            }
          }
        </script>
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
  `;

  const inspection = inspectCampaignHTML(html, promotion);
  assert.equal(inspection.containerCount, 0);
  assert.equal(inspection.isSpaShell, true);
  assert.ok(inspection.sources.some(s => s.kind === 'hydration'));

  const result = await validatePromotion(promotion, {
    now: NOW,
    fetchImpl: htmlFetch(html),
  });

  assert.equal(result.status, 'ACTIVE');
  assert.ok(result.score >= 60);
  assert.equal(result.isSoftDegraded, false);
  assert.ok(
    result.warnings.includes('DOM_CONTAINER_UNAVAILABLE_METADATA_USED'),
  );
});

test('Korean ongoing expressions are valid periods', () => {
  for (const text of [
    '상시 진행',
    '상시 혜택',
    '상시 운영',
    '별도 공지 시까지',
    '한도 소진 시까지',
    '선착순 소진 시까지',
  ]) {
    const result = parseKoreanCampaignPeriod(text, { now: NOW });
    assert.equal(result.kind, 'ongoing', text);
    assert.equal(result.endAt, null, text);
  }
});

test('embedded deadline uses KST end-of-day, not benefit duration', () => {
  const result = parseKoreanCampaignPeriod(
    '가입 후 첫 3개월 (2026.09.23까지 신청)',
    { now: NOW },
  );

  assert.equal(result.kind, 'bounded');
  assert.equal(result.startAt, null);
  assert.equal(result.endAt, '2026-09-23T14:59:59.999Z');
});

test('standard ranges, yearless deadlines, and Korean month-end', () => {
  for (const text of [
    '2026.09.01 ~ 2026.09.30',
    '2026-09-01 ~ 2026-09-30',
    '26.09.01 ~ 26.09.30',
  ]) {
    const result = parseKoreanCampaignPeriod(text, { now: NOW });
    assert.equal(result.startAt, '2026-08-31T15:00:00.000Z');
    assert.equal(result.endAt, '2026-09-30T14:59:59.999Z');
  }

  for (const text of [
    '2026년 9월 30일까지',
    '9.30까지',
    '26년 9월 말까지',
  ]) {
    assert.equal(
      parseKoreanCampaignPeriod(text, { now: NOW }).endAt,
      '2026-09-30T14:59:59.999Z',
      text,
    );
  }

  assert.equal(
    parseKoreanCampaignPeriod('2026.02.30까지', { now: NOW }).kind,
    'unknown',
  );
});

test('ongoing campaign requires campaign evidence to become ACTIVE', async () => {
  const result = await validatePromotion(
    { ...promotion, periodText: '상시 진행' },
    {
      now: NOW,
      fetchImpl: htmlFetch(`
        <div id="campaign">
          <h1>Example 프리미엄 첫 3개월 무료</h1>
          <p>상시 진행 중인 혜택</p>
        </div>
      `),
    },
  );

  assert.equal(result.status, 'ACTIVE');
  assert.equal(result.period.kind, 'ongoing');
});

test('403 preserves a fresh verified campaign with a future deadline', async () => {
  const previous = verifiedPrevious();

  const result = await validatePromotion(promotion, {
    previous,
    now: NOW,
    fetchImpl: async () => new Response('Forbidden', { status: 403 }),
  });

  assert.equal(result.status, 'ACTIVE');
  assert.equal(result.isSoftDegraded, true);
  assert.equal(result.reason, 'HTTP_403');
  assert.equal(result.lastVerifiedAt, previous.lastVerifiedAt);
  assert.deepEqual(result.verifiedPeriod, previous.verifiedPeriod);

  const next = reconcileCatalog(
    { active: [previous], archive: [], review: [] },
    [{ promotion, result }],
  );

  assert.equal(next.active.length, 1);
  assert.equal(next.review.length, 0);
});

test('403 does not activate a previously unverified campaign', async () => {
  const result = await validatePromotion(promotion, {
    now: NOW,
    fetchImpl: async () => new Response('Forbidden', { status: 403 }),
  });

  assert.equal(result.status, 'SUSPICIOUS');
  assert.equal(result.isSoftDegraded, false);
});

test('soft degradation cannot continue indefinitely', async () => {
  const result = await validatePromotion(promotion, {
    previous: verifiedPrevious({
      softDegradedSince: '2026-09-13T03:00:00.000Z',
    }),
    now: NOW,
    fetchImpl: async () => new Response('Forbidden', { status: 403 }),
  });

  assert.equal(result.status, 'SUSPICIOUS');
});

test('explicit scoped termination banner immediately expires campaign', async () => {
  const result = await validatePromotion(promotion, {
    now: NOW,
    fetchImpl: htmlFetch(`
      <div id="campaign">
        <h1>프리미엄 첫 3개월 무료</h1>
        <p>이벤트가 종료되었습니다</p>
      </div>
    `),
  });

  assert.equal(result.status, 'EXPIRED');
  assert.equal(result.reason, 'TERMINATION_BANNER');
});

test('verified past deadline overrides network availability', async () => {
  let fetched = false;

  const result = await validatePromotion(promotion, {
    previous: verifiedPrevious({
      verifiedPeriod: parseKoreanCampaignPeriod(
        '2026.09.15까지',
        { now: NOW },
      ),
    }),
    now: NOW,
    fetchImpl: async () => {
      fetched = true;
      throw new Error('Network unavailable');
    },
  });

  assert.equal(result.status, 'EXPIRED');
  assert.equal(result.reason, 'DEADLINE_PASSED');
  assert.equal(fetched, false);
});

test('expiration occurs immediately after KST end-of-day', async () => {
  const end = Date.parse('2026-09-23T14:59:59.999Z');
  const fetchImpl = htmlFetch(`
    <div id="campaign">
      <h1>Example 프리미엄 첫 3개월 무료</h1>
      <p>가입 후 첫 3개월 (2026.09.23까지 신청)</p>
    </div>
  `);

  const atEnd = await validatePromotion(promotion, {
    now: end,
    fetchImpl,
  });
  const afterEnd = await validatePromotion(promotion, {
    now: end + 1,
    fetchImpl,
  });

  assert.equal(atEnd.status, 'ACTIVE');
  assert.equal(afterEnd.status, 'EXPIRED');
});

test('branding without campaign identity does not activate an SPA', async () => {
  const result = await validatePromotion(promotion, {
    now: NOW,
    fetchImpl: htmlFetch(`
      <head>
        <meta property="og:title" content="Example">
      </head>
      <body>
        <div id="root"></div>
      </body>
    `),
  });

  assert.equal(result.status, 'SUSPICIOUS');
});
