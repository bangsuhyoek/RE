import test from 'node:test';
import assert from 'node:assert/strict';
import { CANCEL_POLICY_TYPES, CANCEL_POLICIES, getCancelPolicy } from '../src/data/cancelPolicies.js';
import { serviceCatalog } from '../src/data/subscriptionData.js';

test('CANCEL_POLICY_TYPES contains exact valid policy types', () => {
  assert.deepEqual(CANCEL_POLICY_TYPES, [
    'period_end',
    'immediate_prorated',
    'immediate_loss',
    'contract_penalty'
  ]);
});

test('CANCEL_POLICIES has at least 25 verified entries', () => {
  const keys = Object.keys(CANCEL_POLICIES);
  assert.ok(keys.length >= 25, `Expected at least 25 policies, found ${keys.length}`);
});

test('every key in CANCEL_POLICIES exists in serviceCatalog ids', () => {
  const validServiceIds = new Set(serviceCatalog.map((s) => s.id));
  for (const key of Object.keys(CANCEL_POLICIES)) {
    assert.ok(
      validServiceIds.has(key),
      `Policy key "${key}" does not exist in serviceCatalog ids`
    );
  }
});

test('every policy entry conforms to schema requirements', () => {
  const validTypes = new Set(CANCEL_POLICY_TYPES);
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  for (const [id, entry] of Object.entries(CANCEL_POLICIES)) {
    // cancelType is in CANCEL_POLICY_TYPES
    assert.ok(
      validTypes.has(entry.cancelType),
      `${id}: invalid cancelType "${entry.cancelType}"`
    );

    // summary non-empty and <= 60 chars
    assert.ok(typeof entry.summary === 'string', `${id}: summary must be a string`);
    assert.ok(entry.summary.trim().length > 0, `${id}: summary cannot be empty`);
    assert.ok(
      entry.summary.length <= 60,
      `${id}: summary exceeds 60 chars (${entry.summary.length})`
    );

    // sourceUrl starts with https://
    assert.ok(typeof entry.sourceUrl === 'string', `${id}: sourceUrl must be a string`);
    assert.ok(
      entry.sourceUrl.startsWith('https://'),
      `${id}: sourceUrl must start with https://, got "${entry.sourceUrl}"`
    );

    // headline, when present, is a non-empty string <= 40 chars without digits
    if (entry.headline !== undefined) {
      assert.ok(typeof entry.headline === 'string', id + ': headline must be a string');
      assert.ok(entry.headline.trim().length > 0, id + ': headline cannot be empty');
      assert.ok(entry.headline.length <= 40, id + ': headline exceeds 40 chars');
      assert.ok(!/\d/.test(entry.headline), id + ': headline must not contain digits');
    }
    // checkedAt matches YYYY-MM-DD
    assert.ok(
      dateRegex.test(entry.checkedAt),
      `${id}: checkedAt must match YYYY-MM-DD, got "${entry.checkedAt}"`
    );
  }
});

test('getCancelPolicy returns correct entry or null', () => {
  assert.strictEqual(getCancelPolicy(null), null);
  assert.strictEqual(getCancelPolicy(undefined), null);
  assert.strictEqual(getCancelPolicy(''), null);
  assert.strictEqual(getCancelPolicy('unknown-service-id'), null);
  assert.strictEqual(getCancelPolicy(123), null);

  const netflixPolicy = getCancelPolicy('netflix');
  assert.ok(netflixPolicy !== null);
  assert.strictEqual(netflixPolicy.cancelType, 'period_end');
  assert.strictEqual(netflixPolicy.checkedAt, '2026-10-16');
  assert.strictEqual(netflixPolicy, CANCEL_POLICIES['netflix']);
});

