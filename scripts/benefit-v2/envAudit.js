import fs from "node:fs";

const files = process.argv.slice(2);
const wanted = new Set([
  "NAVER_SEARCH_API_KEY_ID","NAVER_SEARCH_API_KEY","NAVER_CLIENT_ID","NAVER_CLIENT_SECRET",
  "GOOGLE_SEARCH_API_KEY","GOOGLE_SEARCH_CX","GEMINI_API_KEY","SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY","VITE_SUPABASE_URL","VITE_SUPABASE_ANON_KEY","VERCEL_OIDC_TOKEN"
]);

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  const keys = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && wanted.has(match[1]) && match[2].trim()) keys.push(match[1]);
  }
  console.log(JSON.stringify({ file, keys }));
}
