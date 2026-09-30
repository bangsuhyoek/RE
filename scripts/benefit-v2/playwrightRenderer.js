import fs from "node:fs";

function executableCandidates(env = process.env) {
  return [
    env.BENEFIT_BROWSER_EXECUTABLE_PATH,
    env.CHROME_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
}

export async function createPlaywrightRenderer(env = process.env) {
  if (String(env.BENEFIT_RENDERER_ENABLED || "").toLowerCase() !== "true") {
    return { configured: false, reason: "RENDERER_DISABLED", render: null };
  }

  let playwright;
  try {
    playwright = await import("playwright-core");
  } catch {
    return { configured: false, reason: "PLAYWRIGHT_CORE_NOT_INSTALLED", render: null };
  }

  const executablePath = executableCandidates(env).find((value) => fs.existsSync(value));
  if (!executablePath) {
    return { configured: false, reason: "BROWSER_EXECUTABLE_NOT_FOUND", render: null };
  }

  return {
    configured: true,
    reason: null,
    async render(url) {
      const browser = await playwright.chromium.launch({
        headless: true,
        executablePath,
      });
      try {
        const page = await browser.newPage({ locale: "ko-KR" });
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
        await page.waitForTimeout(800);

        const actionPattern = /(혜택\s*받기|신청|가입|구독(?:하기)?|무료\s*체험|무료로\s*시작|시작|활성화|선택|쿠폰|할인\s*적용|요금제\s*변경|마이\s*멤버십|콘텐츠\s*혜택|subscribe|start\s*free|free\s*trial|claim|activate|apply|join|get\s*offer)/i;
        const actionCandidates = await page.locator("a[href],button,[role=button]").evaluateAll(
          (nodes, patternSource) => {
            const pattern = new RegExp(patternSource, "i");
            const base = window.location.href;
            return nodes.slice(0, 500).map((node) => {
              const label = [
                node.textContent,
                node.getAttribute("aria-label"),
                node.getAttribute("title"),
              ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
              if (!pattern.test(label)) return null;
              const style = window.getComputedStyle(node);
              const rect = node.getBoundingClientRect();
              const visible =
                style.visibility !== "hidden" &&
                style.display !== "none" &&
                Number(style.opacity || 1) > 0 &&
                rect.width > 0 &&
                rect.height > 0;
              const disabled = Boolean(node.disabled || node.getAttribute("aria-disabled") === "true");
              if (!visible || disabled) return null;
              const href = node.getAttribute("href");
              // A JavaScript button is only an invitation to interact. The
              // current page URL cannot prove where that interaction goes.
              let resolved = null;
              if (href) {
                try {
                  const link = new URL(href, base);
                  if (link.protocol === "https:") resolved = link.href;
                } catch { /* An invalid link is not a verified action. */ }
              }
              const resolvedUrl = resolved ? new URL(resolved) : null;
              const infoLike = resolvedUrl && (
                /^(?:help|support|faq|customer|customerservice)\./i.test(resolvedUrl.hostname) ||
                /\/(?:help|support|faq|news|article|blog|press|notice|guide)(?:\/|$)/i.test(resolvedUrl.pathname));
              return {
                label,
                url: resolved,
                interactionRequired: !resolved,
                visible: true,
                enabled: true,
                requiresLogin:
                  (resolvedUrl && /\/(?:login|signin|sign-in|auth|account|nidlogin(?:\.login)?)(?:\/|$|\.)/i.test(resolvedUrl.pathname)) ||
                  /(마이\s*멤버십|내\s*계정|계정\s*연결|로그인)/i.test(label),
                infoLike: Boolean(infoLike),
              };
            }).filter(Boolean);
          },
          actionPattern.source
        );

        return {
          html: await page.content(),
          finalUrl: page.url(),
          actionCandidates,
        };
      } finally {
        await browser.close();
      }
    },
  };
}
