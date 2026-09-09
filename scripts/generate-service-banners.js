import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/assets/banners");
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const banners = {
  "netflix.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#000000"/>
  <!-- Netflix Red N Ribbon matching reference image -->
  <g transform="translate(330, 45) scale(2.0)">
    <!-- Left vertical bar with shadow -->
    <path d="M0,0 L20,0 L20,180 L0,180 Z" fill="#B81D24"/>
    <!-- Right vertical bar -->
    <path d="M50,0 L70,0 L70,180 L50,180 Z" fill="#B81D24"/>
    <!-- Diagonal ribbon with vibrant red and shadow gradient -->
    <path d="M0,0 L24,0 L70,180 L46,180 Z" fill="#E50914"/>
  </g>
</svg>`,

  "youtube.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0F0F0F"/>
  <g transform="translate(240, 150)">
    <rect x="0" y="0" width="180" height="126" rx="36" fill="#FF0000"/>
    <polygon points="72,36 126,63 72,90" fill="#FFFFFF"/>
    <text x="210" y="86" fill="#FFFFFF" font-size="44" font-weight="800" font-family="Pretendard, system-ui, sans-serif" letter-spacing="-1">Premium</text>
  </g>
</svg>`,

  "coupang.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#081426"/>
  <g transform="translate(260, 160)">
    <text x="0" y="70" fill="#FFFFFF" font-size="56" font-weight="900" font-family="Pretendard, system-ui, sans-serif" letter-spacing="-1.5">coupang</text>
    <rect x="235" y="18" width="84" height="40" rx="10" fill="#FF2E4C"/>
    <text x="277" y="46" fill="#FFFFFF" font-size="20" font-weight="900" text-anchor="middle" font-family="Pretendard, system-ui, sans-serif">WOW</text>
  </g>
</svg>`,

  "spotify.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#121212"/>
  <g transform="translate(280, 135)">
    <circle cx="90" cy="90" r="75" fill="#1ED760"/>
    <path d="M55,70 c32,-8 70,-4 95,12 M62,94 c26,-6 58,-3 80,10 M70,116 c20,-5 42,-2 60,8" stroke="#121212" stroke-width="12" stroke-linecap="round" fill="none"/>
  </g>
</svg>`,

  "chatgpt.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0A1C16"/>
  <g transform="translate(310, 110)">
    <rect width="180" height="180" rx="45" fill="#10A37F"/>
    <g fill="none" stroke="#FFFFFF" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(90, 90) scale(0.7) translate(-90, -90)">
      <path d="M90 56a20 20 0 0 1 18 11l16-9a36 36 0 0 0-56 6l15 9a20 20 0 0 1 7-17z"/>
      <path d="M125 77a20 20 0 0 1 0 22l16 9a36 36 0 0 0 6-56l-15 9a20 20 0 0 1-7 16z"/>
      <path d="M119 108a20 20 0 0 1-17 11v18a36 36 0 0 0 50-26l-16-9a20 20 0 0 1-17 6z"/>
      <path d="M90 124a20 20 0 0 1-18-11l-16 9a36 36 0 0 0 56-6l-15-9a20 20 0 0 1-7 17z"/>
      <path d="M55 103a20 20 0 0 1 0-22l-16-9a36 36 0 0 0-6 56l15-9a20 20 0 0 1 7-16z"/>
      <path d="M61 72a20 20 0 0 1 17-11v-18a36 36 0 0 0-50 26l16 9a20 20 0 0 1 17-6z"/>
    </g>
  </g>
</svg>`,

  "tving.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0A0A0A"/>
  <g transform="translate(250, 160)">
    <circle cx="60" cy="65" r="42" fill="#FF153C"/>
    <path d="M130 25h32v80h-32zM110 25h72v24h-72z" fill="#FFFFFF"/>
    <text x="210" y="88" fill="#FFFFFF" font-size="56" font-weight="900" font-family="Pretendard, system-ui, sans-serif" letter-spacing="-1">TVING</text>
  </g>
</svg>`,

  "disney.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#030B2E"/>
  <g transform="translate(260, 140)">
    <path d="M20,100 c30,-60 140,-80 240,-10" stroke="#48C1FF" stroke-width="12" stroke-linecap="round" fill="none"/>
    <text x="140" y="110" fill="#FFFFFF" font-size="68" font-weight="900" font-family="Pretendard, system-ui, sans-serif" letter-spacing="-2">Disney+</text>
    <circle cx="270" cy="85" r="8" fill="#48C1FF"/>
  </g>
</svg>`,

  "millie.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#18181C"/>
  <g transform="translate(250, 150)">
    <rect x="0" y="0" width="110" height="130" rx="20" fill="#FFEB00"/>
    <path d="M30 30h18v70h-18zM62 30h18v70h-18z" fill="#18181C"/>
    <text x="140" y="85" fill="#FFFFFF" font-size="44" font-weight="800" font-family="Pretendard, system-ui, sans-serif">밀리의 서재</text>
  </g>
</svg>`,

  "adobe.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#1F0404"/>
  <g transform="translate(240, 145)">
    <rect width="140" height="140" rx="24" fill="#FA0F00"/>
    <path d="M50 30h-15l22 70h12l-19-70zm35 0h15l-22 70h-12l19-70zm-27 42h18l-9-26-9 26z" fill="#FFFFFF"/>
    <text x="170" y="85" fill="#FFFFFF" font-size="46" font-weight="800" font-family="Pretendard, system-ui, sans-serif">Adobe CC</text>
  </g>
</svg>`,

  "watcha.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#14061A"/>
  <g transform="translate(270, 150)">
    <path d="M40 30l28 65 18-35 18 35 28-65" stroke="#FF0558" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <text x="170" y="85" fill="#FFFFFF" font-size="52" font-weight="900" font-family="Pretendard, system-ui, sans-serif" letter-spacing="-1">WATCHA</text>
  </g>
</svg>`,

  "flo.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0C0824"/>
  <g transform="translate(290, 140)">
    <circle cx="70" cy="70" r="56" fill="none" stroke="#6854F5" stroke-width="18"/>
    <circle cx="70" cy="70" r="24" fill="#FFFFFF"/>
    <text x="170" y="90" fill="#FFFFFF" font-size="64" font-weight="900" font-family="Pretendard, system-ui, sans-serif" letter-spacing="2">FLO</text>
  </g>
</svg>`,

  "naver.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#07190F"/>
  <g transform="translate(250, 150)">
    <rect x="0" y="0" width="130" height="130" rx="28" fill="#03C75A"/>
    <path d="M35 30h22l28 40V30h20v70h-22L55 60v40H35V30z" fill="#FFFFFF"/>
    <text x="160" y="85" fill="#FFFFFF" font-size="44" font-weight="900" font-family="Pretendard, system-ui, sans-serif">PLUS</text>
  </g>
</svg>`,
};

for (const [file, svg] of Object.entries(banners)) {
  fs.writeFileSync(path.join(dir, file), svg.trim(), "utf8");
}
console.log("Successfully created " + Object.keys(banners).length + " 16:9 service banner SVGs in public/assets/banners");
