import fs from "node:fs";

const envPath = "C:/Users/user/Downloads/KKUDOK_web_flow_upgrade/.env.local";
if (!fs.existsSync(envPath)) {
  console.log(JSON.stringify({ ok: false, reason: "ENV_FILE_NOT_FOUND" }));
  process.exit(0);
}
const pairs = Object.fromEntries(
  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")])
);
const url = pairs.VITE_SUPABASE_URL;
const key = pairs.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log(JSON.stringify({ ok: false, reason: "SUPABASE_CLIENT_ENV_NOT_FOUND" }));
  process.exit(0);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const tables = ["benefit_pipeline_flags", "benefit_v2_public_offers"];
const results = [];
for (const table of tables) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
  results.push({ table, status: response.status, ok: response.ok });
}
console.log(JSON.stringify({ ok: true, host: new URL(url).hostname, results }));
