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
