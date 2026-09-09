import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const services = {
  "netflix.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#141414"/><path d="M16 10h4.5l8.5 24.5V10h4.5v28H29L20.5 13.5V38H16V10z" fill="#E50914"/></svg>',
  "youtube.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#FF0000"/><path d="M20 16l12 8-12 8V16z" fill="#FFFFFF"/></svg>',
  "coupang.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#FFFFFF" stroke="#E5E8EB" stroke-width="1.5"/><circle cx="16" cy="24" r="6" fill="#A83232"/><circle cx="28" cy="24" r="6" fill="#F05A28"/><path d="M20 20c2 4 6 4 8 0" stroke="#00A2D3" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
  "spotify.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#121212"/><circle cx="24" cy="24" r="16" fill="#1ED760"/><path d="M17 19.5c5-1.5 11-1 15 1.5M18 24c4-1 9-.5 12.5 1.5M19.5 28c3-.8 6.5-.5 9 1" stroke="#121212" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>',
  "chatgpt.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#10A37F"/><g fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 15a5 5 0 0 1 4.5 2.8l3.9-2.3a9 9 0 0 0-14 1.5l3.8 2.2A5 5 0 0 1 24 15z"/><path d="M32.8 20.3a5 5 0 0 1 0 5.4l3.9 2.3a9 9 0 0 0 1.5-14l-3.8 2.2a5 5 0 0 1-1.6 4.1z"/><path d="M31.2 27.9A5 5 0 0 1 27 30.6v4.5a9 9 0 0 0 12.5-6.5l-3.9-2.3a5 5 0 0 1-4.4 1.6z"/><path d="M24 33a5 5 0 0 1-4.5-2.8l-3.9 2.3a9 9 0 0 0 14-1.5l-3.8-2.2A5 5 0 0 1 24 33z"/><path d="M15.2 27.7a5 5 0 0 1 0-5.4l-3.9-2.3a9 9 0 0 0-1.5 14l3.8-2.2a5 5 0 0 1 1.6-4.1z"/><path d="M16.8 20.1A5 5 0 0 1 21 17.4v-4.5a9 9 0 0 0-12.5 6.5l3.9 2.3a5 5 0 0 1 4.4-1.6z"/></g></svg>',
  "tving.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#000000"/><circle cx="18" cy="24" r="8" fill="#FF153C"/><path d="M26 16h6v16h-6z" fill="#FFFFFF"/><path d="M22 16h14v5H22z" fill="#FFFFFF"/></svg>',
  "disney.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#04092E"/><path d="M14 26c4-6 12-8 20-3" stroke="#48C1FF" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M16 29c6-2 12-2 16 0" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="34" cy="23" r="1.5" fill="#48C1FF"/><text x="24" y="25" fill="#FFFFFF" font-size="13" font-weight="900" text-anchor="middle" font-family="sans-serif">D+</text></svg>',
  "millie.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#FFEB00"/><path d="M16 15h6v18h-6zM26 15h6v18h-6z" fill="#242424"/><path d="M16 30h16v3H16z" fill="#242424"/></svg>',
  "adobe.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#FA0F00"/><path d="M19 14h-5l7 20h3.5l-5.5-20zm10 0h5l-7 20h-3.5l5.5-20zm-7.5 12h5l-2.5-7.5-2.5 7.5z" fill="#FFFFFF"/></svg>',
  "watcha.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#FF0558"/><path d="M16 18l6 12 4-8 4 8 6-12" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  "flo.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#3821C8"/><circle cx="24" cy="24" r="11" fill="none" stroke="#6854F5" stroke-width="4"/><circle cx="24" cy="24" r="5" fill="#FFFFFF"/></svg>',
  "naver.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#03C75A"/><path d="M16 14h5.2l6.8 10V14h5v20h-5.2L21 24v10h-5V14z" fill="#FFFFFF"/></svg>',
};

const dir = path.join(__dirname, "../public/assets/services");
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

for (const [file, svg] of Object.entries(services)) {
  fs.writeFileSync(path.join(dir, file), svg, "utf8");
}
console.log("Successfully created " + Object.keys(services).length + " service SVGs in public/assets/services");
