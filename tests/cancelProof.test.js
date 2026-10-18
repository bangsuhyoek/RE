import test from "node:test";
import assert from "node:assert/strict";
import {
  saveCancelProof,
  getCancelProof,
  listCancelProofs,
  deleteCancelProof,
  findCancelProof,
} from "../src/lib/cancelProof.js";

test("cancelProof in-memory fallback CRUD operations", async () => {
  // 1. Initial list empty or existing
  const initialList = await listCancelProofs();
  const initialCount = initialList.length;

  // 2. Save proof
  const saved = await saveCancelProof({
    recordId: "sub_netflix_123",
    subscriptionId: "sub_netflix_123",
    serviceName: "넷플릭스",
    amount: 17000,
    cancelledAt: "2026-10-16T09:30:00.000Z",
    imageDataUrl: "data:image/jpeg;base64,testdata123",
    note: "PC 웹 브라우저에서 해지 완료",
  });

  assert.ok(saved.id.startsWith("proof:"));
  assert.equal(saved.recordId, "sub_netflix_123");
  assert.equal(saved.serviceName, "넷플릭스");
  assert.equal(saved.amount, 17000);
  assert.equal(saved.imageDataUrl, "data:image/jpeg;base64,testdata123");
  assert.equal(saved.note, "PC 웹 브라우저에서 해지 완료");

  // 3. Get proof by recordId
  const byRecord = await getCancelProof("sub_netflix_123");
  assert.ok(byRecord);
  assert.equal(byRecord.id, saved.id);

  // 4. Get proof by proof id
  const byId = await getCancelProof(saved.id);
  assert.ok(byId);
  assert.equal(byId.serviceName, "넷플릭스");

  // 5. List proofs
  const list = await listCancelProofs();
  assert.equal(list.length, initialCount + 1);
  assert.equal(list[0].id, saved.id); // sorted newest first

  // 6. Delete proof
  const deleted = await deleteCancelProof(saved.id);
  assert.equal(deleted, true);

  // 7. Verify deletion
  const afterDelete = await getCancelProof("sub_netflix_123");
  assert.equal(afterDelete, null);
});

test("saveCancelProof defaults and sanitization", async () => {
  const minimal = await saveCancelProof({
    serviceName: "유튜브 프리미엄",
  });

  assert.ok(minimal.id);
  assert.equal(minimal.serviceName, "유튜브 프리미엄");
  assert.equal(minimal.amount, 0);
  assert.equal(minimal.imageDataUrl, null);
  assert.equal(minimal.note, null);
  assert.ok(minimal.cancelledAt);

  await deleteCancelProof(minimal.id);
});

test("findCancelProof matching order: subscriptionId/recordId > serviceId > normalized serviceName", async () => {
  // Proof 1: matched by serviceName only
  const p1 = await saveCancelProof({
    recordId: "rec_1",
    subscriptionId: "sub_1",
    serviceId: "srv_other",
    serviceName: "  NetFlix  ",
    cancelledAt: "2026-10-01T00:00:00.000Z",
  });

  // Proof 2: matched by serviceId
  const p2 = await saveCancelProof({
    recordId: "rec_2",
    subscriptionId: "sub_2",
    serviceId: "netflix",
    serviceName: "기타 이름",
    cancelledAt: "2026-10-05T00:00:00.000Z",
  });

  // Proof 3: matched by subscriptionId
  const p3 = await saveCancelProof({
    recordId: "rec_target",
    subscriptionId: "sub_target",
    serviceId: "srv_third",
    serviceName: "완전 다른 이름",
    cancelledAt: "2026-10-10T00:00:00.000Z",
  });

  // 1. When subscriptionId is provided, matches Proof 3 even if serviceId or serviceName would match others
  const matchBySub = await findCancelProof({
    subscriptionId: "sub_target",
    serviceId: "netflix",
    serviceName: "netflix",
  });
  assert.ok(matchBySub);
  assert.equal(matchBySub.id, p3.id);

  // 2. When subscriptionId does not match, matches serviceId (Proof 2) over serviceName
  const matchBySrv = await findCancelProof({
    subscriptionId: "sub_unknown",
    serviceId: "netflix",
    serviceName: "netflix",
  });
  assert.ok(matchBySrv);
  assert.equal(matchBySrv.id, p2.id);

  // 3. When neither subscriptionId nor serviceId match, matches normalized serviceName (Proof 1)
  const matchByName = await findCancelProof({
    subscriptionId: "sub_unknown",
    serviceId: "srv_unknown",
    serviceName: "NETFLIX",
  });
  assert.ok(matchByName);
  assert.equal(matchByName.id, p1.id);

  // 4. Returns null if nothing matches
  const matchNone = await findCancelProof({
    subscriptionId: "none",
    serviceId: "none",
    serviceName: "없는 서비스",
  });
  assert.equal(matchNone, null);

  // Cleanup
  await deleteCancelProof(p1.id);
  await deleteCancelProof(p2.id);
  await deleteCancelProof(p3.id);
});
