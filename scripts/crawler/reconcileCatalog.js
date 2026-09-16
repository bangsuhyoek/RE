// outcomes: [{ promotion, result }]. previousState: { active, archive, review }.
// Retains missing outcomes as review; never silently republishes unchecked entries.
export function reconcileCatalog(previousState, outcomes) {
  const prior = new Map();
  for (const bucket of ['archive', 'review', 'active']) {
    for (const item of previousState[bucket] ?? []) {
      if (!item.id) throw new TypeError('Catalog entry requires id');
      prior.set(item.id, item);
    }
  }
  const next = { active: [], archive: [], review: [] };
  const seen = new Set();
  for (const { promotion, result } of outcomes) {
    if (!promotion?.id || result?.id !== promotion.id || seen.has(promotion.id)) throw new Error('Invalid or duplicate outcome');
    seen.add(promotion.id);
    const bucket = { ACTIVE: 'active', EXPIRED: 'archive', SUSPICIOUS: 'review' }[result.status];
    if (!bucket) throw new Error('Unknown result status');
    // Never allow incoming scraped fields to overwrite trusted verification history.
    const { verification, verifiedPeriod, lastVerifiedAt, softDegradedSince, status, ...scraped } = promotion;
    const record = { ...prior.get(promotion.id), ...scraped, ...result };
    if (result.isSoftDegraded) {
      const old = prior.get(promotion.id);
      if (!old?.verification?.verified) throw new Error('Degraded outcome requires trusted prior record');
      // Preserve verified terms/content, not fresh unverified offer text.
      next[bucket].push({ ...old, ...result });
    } else next[bucket].push(record);
  }
  for (const [id, item] of prior) {
    if (seen.has(id)) continue;
    if (item.status === 'EXPIRED') next.archive.push(item);
    else next.review.push({ ...item, status: 'SUSPICIOUS', reason: 'MISSING_OUTCOME', isSoftDegraded: false });
  }
  next.publication = {
    requiresApproval: next.active.length === 0 && (previousState.active?.length ?? 0) > 0,
    reason: next.active.length === 0 && (previousState.active?.length ?? 0) > 0 ? 'EMPTY_ACTIVE_CATALOG_CIRCUIT_BREAKER' : null,
  };
  return next;
}

/* Integration (package.json must contain "type": "module"):
import { validatePromotion } from './promotionValidator.js';
import { reconcileCatalog } from './reconcileCatalog.js';

const previousById = new Map(previousState.active.map(p => [p.id, p]));
const outcomes = [];
// Serial example; use a bounded queue and per-origin rate limits in production.
for (const promotion of candidates) {
  const result = await validatePromotion(promotion, {
    previous: previousById.get(promotion.id),
  });
  outcomes.push({ promotion, result });
}
const next = reconcileCatalog(previousState, outcomes);
// Always persist audit/review output to a separate versioned artifact first.
// Publish a versioned snapshot + atomic pointer swap only after your batch checks.
if (next.publication.requiresApproval) {
  throw new Error(next.publication.reason);
}
// await publishAtomically(next);
// IMPORTANT: a blocked publication is NOT permission to serve expired old records.
// Read/serve path must enforce verifiedPeriod.endAt and verification/grace TTLs.
*/
