// Search only links already published on a freshly fetched official page.
// The bounded result is a set of leads, not evidence or a publication permit.
import * as cheerio from "cheerio";
import { classifySourceAuthority } from "./sourceAuthority.js";

const DETAIL = /(?:가격|요금|혜택|조건|이용안내|상세|price|details|benefit)/i;
const ACTION = /(?:결제|구매|신청하기|로그인|가입하기|checkout|sign[ -]?in|cart)/i;

export function officialConditionLinks({ snapshots = [], existingUrls = [],
  requiredPlan = "", allowedOrigins = [], authorityRegistry = [],
  targetServiceId = null, limit = 2 } = {}) {
  if (!requiredPlan || !Array.isArray(allowedOrigins) || limit < 1) return [];
  const known = new Set(existingUrls);
  const found = [];
  for (const page of snapshots) {
    if (!page?.ok || !page.html) continue;
    let base;
    try {
      base = new URL(page.finalUrl || page.url);
      if (base.protocol !== "https:" || !allowedOrigins.includes(base.origin) ||
          base.username || base.password) continue;
    } catch { continue; }
    const $ = cheerio.load(page.html);
    $("a[href]").each((_, element) => {
      if (found.length >= limit) return;
      const node = $(element);
      const label = node.text().replace(/\s+/g, " ").trim().slice(0, 160);
      const nearby = node.closest("tr, li, section, article").text()
        .replace(/\s+/g, " ").trim().slice(0, 450);
      if (!DETAIL.test(label) || ACTION.test(label) ||
          !(label.includes(requiredPlan) || nearby.includes(requiredPlan))) return;
      let target;
      try {
        target = new URL(node.attr("href"), base);
        target.hash = "";
      } catch { return; }
      if (target.protocol !== "https:" || target.username || target.password ||
          !allowedOrigins.includes(target.origin) || known.has(target.href) ||
          target.href === base.href || /\/(?:login|auth|payment|checkout)(?:\/|$)/i
            .test(target.pathname)) return;
      const authority = classifySourceAuthority(target.href,
        { registry: authorityRegistry, targetServiceId });
      if (!["OFFICIAL_SERVICE", "OFFICIAL_PARTNER"].includes(authority.type) ||
          authority.score < 500) return;
      known.add(target.href);
      found.push({ url: target.href, foundOn: base.href, label });
    });
  }
  return found;
}
