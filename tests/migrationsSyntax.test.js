import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Supabase SQL migrations syntax and dollar-quoting guards", () => {
  const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));

  assert.ok(files.length > 0, "No migration files found in supabase/migrations");

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    // 1. Guard against lone 'as' on its own line
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      assert.notEqual(
        trimmed,
        "as",
        `File ${file}:${i + 1} has a lone 'as' line without dollar quotes`
      );
    }

    // 2. Guard that dollar-quote tags like $$ or $tag$ have an even number of occurrences
    const dollarMatches = content.match(/\$[a-zA-Z0-9_]*\$/g) || [];
    assert.equal(
      dollarMatches.length % 2,
      0,
      `File ${file} has an odd number of dollar quotes (${dollarMatches.length})`
    );

    // 3. For every 'create function' or 'create or replace function', verify it contains 'as $'
    const funcRegex = /create\s+(?:or\s+replace\s+)?function\s+[\s\S]*?\bas\s+\$[a-zA-Z0-9_]*\$/gi;
    const createFuncCount = (content.match(/create\s+(?:or\s+replace\s+)?function\b/gi) || []).length;
    const validFuncWithAsDollar = (content.match(funcRegex) || []).length;

    assert.equal(
      validFuncWithAsDollar,
      createFuncCount,
      `File ${file} has functions missing 'as $...' dollar quoting: expected ${createFuncCount}, found ${validFuncWithAsDollar}`
    );

    // 4. For every DO block at the start of a statement, verify it uses 'do $$' or 'do $tag$' (ignore 'do update' in upsert)
    const bareDoMatches = content.match(/^[\t ]*do\s+(?!update\b)(?!language\s+[a-zA-Z0-9_]+\s+\$)(?!\$[a-zA-Z0-9_]*\$)[a-zA-Z0-9_]+/gim) || [];
    assert.equal(
      bareDoMatches.length,
      0,
      `File ${file} has DO block missing dollar quotes: ${JSON.stringify(bareDoMatches)}`
    );

    // 5. Guard against invalid schema qualification on SQL keyword dates/timestamps
    const invalidCatalogKeywords = content.match(/pg_catalog\.(?:current_date|current_timestamp|localtimestamp)\b|pg_catalog\.(?:least|greatest|coalesce|nullif)\(/gi) || [];
    assert.equal(
      invalidCatalogKeywords.length,
      0,
      `File ${file} qualifies SQL standard keyword with pg_catalog (${invalidCatalogKeywords.join(", ")}). Use bare keyword instead.`
    );
  }
});

test("SubMate 20261019 stream migrations contract checks", () => {
  const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

  // 1. Subscriptions constraints and indexes migration
  const subFile = path.join(migrationsDir, "20261019100000_fix_subscriptions_constraints_and_indexes.sql");
  assert.ok(fs.existsSync(subFile), "20261019100000 migration must exist");
  const subSql = fs.readFileSync(subFile, "utf8");
  assert.ok(subSql.includes("amount_krw >= 0"), "Subscriptions must allow amount_krw >= 0");
  assert.ok(subSql.includes("is_pinned boolean not null default false"), "Subscriptions must have is_pinned boolean not null default false");
  assert.ok(subSql.includes("subscriptions_set_updated_at"), "Subscriptions must guarantee updated_at UPDATE trigger");
  assert.ok(subSql.includes("drop index if exists public.subscriptions_user_service_plan_active_uidx"), "Overly restrictive unique index must be dropped");

  // 2. Benefits verified_status unification migration
  const benFile = path.join(migrationsDir, "20261019101000_unify_benefit_verified_status.sql");
  assert.ok(fs.existsSync(benFile), "20261019101000 migration must exist");
  const benSql = fs.readFileSync(benFile, "utf8");
  assert.ok(benSql.includes("set verified_status = 'confirmed'"), "Must migrate active status to confirmed");
  assert.ok(benSql.includes("check (verified_status in ('confirmed', 'unverified', 'expired'))"), "Must enforce confirmed|unverified|expired check");
  assert.ok(benSql.includes("drop function if exists public.get_user_personalized_benefits(uuid)"), "Must drop unused get_user_personalized_benefits function");

  // 3. Evidence cases server-enforced timestamp triggers
  const eviFile = path.join(migrationsDir, "20261019102000_enforce_evidence_timestamps.sql");
  assert.ok(fs.existsSync(eviFile), "20261019102000 migration must exist");
  const eviSql = fs.readFileSync(eviFile, "utf8");
  assert.ok(eviSql.includes("set_evidence_case_timestamps"), "Must define set_evidence_case_timestamps trigger function");
  assert.ok(eviSql.includes("new.created_at := now();"), "Must force created_at to now()");
  assert.ok(eviSql.includes("new.expires_at := now() + interval '1 year';"), "Must force expires_at to 1 year from now()");

  // 4. Cancel difficulty reports k-anonymity (5+ distinct users)
  const cdFile = path.join(migrationsDir, "20261019103000_k_anonymous_cancel_difficulty.sql");
  assert.ok(fs.existsSync(cdFile), "20261019103000 migration must exist");
  const cdSql = fs.readFileSync(cdFile, "utf8");
  assert.ok(cdSql.includes("user_hash text"), "Must add user_hash column");
  assert.ok(cdSql.includes("new.user_hash :="), "Must calculate user_hash in trigger");
  assert.ok(cdSql.includes("having pg_catalog.count(distinct r.user_hash) >= 5") || cdSql.includes("having count(distinct r.user_hash) >= 5"), "Must require >= 5 distinct reporters");

  // 5. Local config and pgTAP test suite
  const configPath = path.join(__dirname, "..", "supabase", "config.toml");
  assert.ok(fs.existsSync(configPath), "supabase/config.toml must exist");

  const pgTapPath = path.join(__dirname, "..", "supabase", "tests", "rls_user_isolation.test.sql");
  assert.ok(fs.existsSync(pgTapPath), "supabase/tests/rls_user_isolation.test.sql must exist");
  const pgTapSql = fs.readFileSync(pgTapPath, "utf8");
  for (const table of ["subscriptions", "receipt_recognitions", "evidence_cases", "evidence_items", "approval_requests", "agent_mandates", "agent_chat_usage"]) {
    assert.ok(pgTapSql.includes(table), `pgTAP suite must test table ${table}`);
  }
});

