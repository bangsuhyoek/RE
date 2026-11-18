import { useState } from "react";

import { cx } from "./cx";

export function LogoMark() {
  return null;
}

/**
 * SubMate x SEED Design System Category Philosophy
 * 카테고리 라벨·설명 맵. C2 시스템에서는 카테고리에 색을 입히지 않고 모두 중립 회색으로 표시한다.
 */
export const CATEGORY_PHILOSOPHY = {
  OTT: {
    label: "OTT",
    theme: "몰입과 휴식",
    desc: "지친 일상을 비우고 온전히 빠져드는 스크린의 여유",
    style: "bg-gray-100 text-ink-muted border-transparent",
    chipActive: "bg-ink text-white border-ink",
    dot: "bg-gray-400",
  },
  음악: {
    label: "음악",
    theme: "감성과 리듬",
    desc: "하루의 틈새를 채우는 나만의 감각적인 선율과 비트",
    style: "bg-gray-100 text-ink-muted border-transparent",
    chipActive: "bg-ink text-white border-ink",
    dot: "bg-gray-400",
  },
  생산성: {
    label: "생산성",
    theme: "명료함과 지적 성장",
    desc: "인지 부하를 덜고 지속 가능한 일과 성장을 돕는 도구",
    style: "bg-gray-100 text-ink-muted border-transparent",
    chipActive: "bg-ink text-white border-ink",
    dot: "bg-gray-400",
  },
  쇼핑: {
    label: "쇼핑",
    theme: "실속과 풍요",
    desc: "일상의 수고를 덜고 매월 확실한 가치와 절약을 회수하는 스마트함",
    style: "bg-gray-100 text-ink-muted border-transparent",
    chipActive: "bg-ink text-white border-ink",
    dot: "bg-gray-400",
  },
  도서: {
    label: "도서",
    theme: "사색과 지식 축적",
    desc: "소음을 걷어내고 내면의 시야를 넓히는 차분한 지식의 축적",
    style: "bg-gray-100 text-ink-muted border-transparent",
    chipActive: "bg-ink text-white border-ink",
    dot: "bg-gray-400",
  },
  클라우드: {
    label: "클라우드",
    theme: "투명한 신뢰",
    desc: "기록과 자산을 소리 없이 안전하게 지탱하는 인프라",
    style: "bg-gray-100 text-ink-muted border-transparent",
    chipActive: "bg-ink text-white border-ink",
    dot: "bg-gray-400",
  },
  게임: {
    label: "게임",
    theme: "유희와 성취",
    desc: "기분 좋은 긴장감과 상상력이 깨어나는 즐거운 도전",
    style: "bg-gray-100 text-ink-muted border-transparent",
    chipActive: "bg-ink text-white border-ink",
    dot: "bg-gray-400",
  },
  유틸리티: {
    label: "유틸리티",
    theme: "일상의 기반",
    desc: "생활의 마찰을 줄여주는 없어서는 안 될 기본 편의",
    style: "bg-gray-100 text-ink-muted border-transparent",
    chipActive: "bg-ink text-white border-ink",
    dot: "bg-gray-400",
  },
  기타: {
    label: "기타",
    theme: "취향의 발견",
    desc: "나만의 고유한 라이프스타일을 완성하는 특별한 경험",
    style: "bg-gray-100 text-ink-muted border-transparent",
    chipActive: "bg-ink text-white border-ink",
    dot: "bg-gray-400",
  },
};

export const CATEGORY_PALETTE_STYLES = Object.fromEntries(
  Object.entries(CATEGORY_PHILOSOPHY).map(([k, v]) => [k, v.style])
);

export const SERVICE_IMAGES = {
  netflix: "/assets/services/netflix.svg",
  youtube: "/assets/services/youtube.svg",
  coupang: "/assets/services/coupang.svg",
  spotify: "/assets/services/spotify.svg",
  chatgpt: "/assets/services/chatgpt.svg",
  "claude-pro": "/assets/services/claude-pro.svg",
  claude: "/assets/services/claude-pro.svg",
  "perplexity-pro": "/assets/services/perplexity-pro.svg",
  perplexity: "/assets/services/perplexity-pro.svg",
  midjourney: "/assets/services/midjourney.svg",
  "runway-gen": "/assets/services/runway-gen.svg",
  runway: "/assets/services/runway-gen.svg",
  "v0-vercel": "/assets/services/v0-vercel.svg",
  v0: "/assets/services/v0-vercel.svg",
  figma: "/assets/services/figma.svg",
  canva: "/assets/services/canva.svg",
  framer: "/assets/services/framer.svg",
  webflow: "/assets/services/webflow.svg",
  "cursor-ai": "/assets/services/cursor-ai.svg",
  cursor: "/assets/services/cursor-ai.svg",
  "github-copilot": "/assets/services/github-copilot.svg",
  copilot: "/assets/services/github-copilot.svg",
  "jetbrains-all": "/assets/services/jetbrains-all.svg",
  jetbrains: "/assets/services/jetbrains-all.svg",
  "deepl-pro": "/assets/services/deepl-pro.svg",
  deepl: "/assets/services/deepl-pro.svg",
  grammarly: "/assets/services/grammarly.svg",
  "slack-pro": "/assets/services/slack-pro.svg",
  slack: "/assets/services/slack-pro.svg",
  "zoom-pro": "/assets/services/zoom-pro.svg",
  zoom: "/assets/services/zoom-pro.svg",
  ms365: "/assets/services/ms365.svg",
  microsoft: "/assets/services/ms365.svg",
  "google-one": "/assets/services/google-one.svg",
  google: "/assets/services/google-one.svg",
  dropbox: "/assets/services/dropbox.svg",
  evernote: "/assets/services/evernote.svg",
  todoist: "/assets/services/todoist.svg",
  "1password": "/assets/services/1password.svg",
  nordvpn: "/assets/services/nordvpn.svg",
  notion: "/assets/services/notion.svg",
  "adobe-lightroom": "/assets/services/adobe-lightroom.svg",
  lightroom: "/assets/services/adobe-lightroom.svg",
  wavve: "/assets/services/wavve.svg",
  coupangplay: "/assets/services/coupangplay.svg",
  laftel: "/assets/services/laftel.svg",
  appletv: "/assets/services/appletv.svg",
  primevideo: "/assets/services/primevideo.svg",
  spotvnow: "/assets/services/spotvnow.svg",
  spotv: "/assets/services/spotvnow.svg",
  weverse: "/assets/services/weverse.svg",
  crunchyroll: "/assets/services/crunchyroll.svg",
  mubi: "/assets/services/mubi.svg",
  dazn: "/assets/services/dazn.svg",
  melon: "/assets/services/melon.svg",
  genie: "/assets/services/genie.svg",
  bugs: "/assets/services/bugs.svg",
  vibe: "/assets/services/vibe.svg",
  applemusic: "/assets/services/applemusic.svg",
  ytmusic: "/assets/services/ytmusic.svg",
  tidal: "/assets/services/tidal.svg",
  "bubble-sm": "/assets/services/bubble-sm.svg",
  bubble: "/assets/services/bubble-sm.svg",
  fromm: "/assets/services/fromm.svg",
  podbbang: "/assets/services/podbbang.svg",
  welaaa: "/assets/services/welaaa.svg",
  storytel: "/assets/services/storytel.svg",
  ridiselect: "/assets/services/ridiselect.svg",
  ridi: "/assets/services/ridiselect.svg",
  longblack: "/assets/services/longblack.svg",
  "the-joongang-plus": "/assets/services/the-joongang-plus.svg",
  joongang: "/assets/services/the-joongang-plus.svg",
  "nyt-digital": "/assets/services/nyt-digital.svg",
  nyt: "/assets/services/nyt-digital.svg",
  "wsj-digital": "/assets/services/wsj-digital.svg",
  wsj: "/assets/services/wsj-digital.svg",
  "ft-digital": "/assets/services/ft-digital.svg",
  ft: "/assets/services/ft-digital.svg",
  "the-economist": "/assets/services/the-economist.svg",
  economist: "/assets/services/the-economist.svg",
  audible: "/assets/services/audible.svg",
  scribd: "/assets/services/scribd.svg",
  speak: "/assets/services/speak.svg",
  duolingo: "/assets/services/duolingo.svg",
  ringle: "/assets/services/ringle.svg",
  cambly: "/assets/services/cambly.svg",
  santatoeic: "/assets/services/santatoeic.svg",
  malhaeboca: "/assets/services/malhaeboca.svg",
  class101: "/assets/services/class101.svg",
  fastcampus: "/assets/services/fastcampus.svg",
  inflearn: "/assets/services/inflearn.svg",
  coursera: "/assets/services/coursera.svg",
  naverplus: "/assets/services/naverplus.svg",
  "baemin-club": "/assets/services/baemin-club.svg",
  baemin: "/assets/services/baemin-club.svg",
  yogipass: "/assets/services/yogipass.svg",
  yogiyo: "/assets/services/yogipass.svg",
  "kurly-pass": "/assets/services/kurly-pass.svg",
  kurly: "/assets/services/kurly-pass.svg",
  "nintendo-online": "/assets/services/nintendo-online.svg",
  nintendo: "/assets/services/nintendo-online.svg",
  "ps-plus": "/assets/services/ps-plus.svg",
  playstation: "/assets/services/ps-plus.svg",
  "xbox-gamepass": "/assets/services/xbox-gamepass.svg",
  xbox: "/assets/services/xbox-gamepass.svg",
  "apple-arcade": "/assets/services/apple-arcade.svg",
  arcade: "/assets/services/apple-arcade.svg",
  "google-play-pass": "/assets/services/google-play-pass.svg",
  "ea-play": "/assets/services/ea-play.svg",
  ea: "/assets/services/ea-play.svg",
  "wow-subscription": "/assets/services/wow-subscription.svg",
  wow: "/assets/services/wow-subscription.svg",
  "kakaotalk-drive": "/assets/services/kakaotalk-drive.svg",
  "kakaotalk-emoticon": "/assets/services/kakaotalk-emoticon.svg",
  "naver-mybox": "/assets/services/naver-mybox.svg",
  mybox: "/assets/services/naver-mybox.svg",
  "strava-sub": "/assets/services/strava-sub.svg",
  strava: "/assets/services/strava-sub.svg",
  "burnfit-pro": "/assets/services/burnfit-pro.svg",
  burnfit: "/assets/services/burnfit-pro.svg",
  tving: "/assets/services/tving.svg",
  disney: "/assets/services/disney.svg",
  millie: "/assets/services/millie.svg",
  adobe: "/assets/services/adobe.svg",
  watcha: "/assets/services/watcha.svg",
  flo: "/assets/services/flo.svg",
  naver: "/assets/services/naver.svg",
  icloud: "/assets/services/icloud.svg",
  apple: "/assets/services/icloud.svg",
  uplus: "/assets/services/uplus.svg",
};

/**
 * 서비스 이미지 경로를 찾는다. 서비스 id → 이름 일치 → 이름 키워드 순서.
 */
export function resolveServiceImage({ serviceId, name, image = null } = {}) {
  const cleanName = (name || "").toLowerCase().trim();
  const cleanId = (serviceId || "").toLowerCase().trim();
  const resolvedImage =
    image ||
    (cleanId && SERVICE_IMAGES[cleanId]) ||
    (cleanName && (
      SERVICE_IMAGES[cleanName] ||
      (cleanName.includes("netflix") || cleanName.includes("넷플") ? SERVICE_IMAGES.netflix : null) ||
      (cleanName.includes("youtube") || cleanName.includes("유튜브") ? SERVICE_IMAGES.youtube : null) ||
      (cleanName.includes("coupang") || cleanName.includes("쿠팡") ? SERVICE_IMAGES.coupang : null) ||
      (cleanName.includes("spotify") || cleanName.includes("스포티") ? SERVICE_IMAGES.spotify : null) ||
      (cleanName.includes("claude") || cleanName.includes("클로드") ? SERVICE_IMAGES["claude-pro"] : null) ||
      (cleanName.includes("perplexity") || cleanName.includes("퍼플렉") ? SERVICE_IMAGES["perplexity-pro"] : null) ||
      (cleanName.includes("midjourney") || cleanName.includes("미드저니") ? SERVICE_IMAGES.midjourney : null) ||
      (cleanName.includes("runway") || cleanName.includes("런웨이") ? SERVICE_IMAGES["runway-gen"] : null) ||
      (cleanName.includes("v0") || cleanName.includes("브이제로") ? SERVICE_IMAGES["v0-vercel"] : null) ||
      (cleanName.includes("figma") || cleanName.includes("피그마") ? SERVICE_IMAGES.figma : null) ||
      (cleanName.includes("canva") || cleanName.includes("캔바") ? SERVICE_IMAGES.canva : null) ||
      (cleanName.includes("framer") || cleanName.includes("프레이머") ? SERVICE_IMAGES.framer : null) ||
      (cleanName.includes("webflow") || cleanName.includes("웹플로우") ? SERVICE_IMAGES.webflow : null) ||
      (cleanName.includes("cursor") || cleanName.includes("커서") ? SERVICE_IMAGES["cursor-ai"] : null) ||
      (cleanName.includes("copilot") || cleanName.includes("코파일럿") ? SERVICE_IMAGES["github-copilot"] : null) ||
      (cleanName.includes("jetbrains") || cleanName.includes("젯브레인") ? SERVICE_IMAGES["jetbrains-all"] : null) ||
      (cleanName.includes("deepl") || cleanName.includes("딥엘") ? SERVICE_IMAGES["deepl-pro"] : null) ||
      (cleanName.includes("grammarly") || cleanName.includes("그래머리") ? SERVICE_IMAGES.grammarly : null) ||
      (cleanName.includes("slack") || cleanName.includes("슬랙") ? SERVICE_IMAGES["slack-pro"] : null) ||
      (cleanName.includes("zoom") || cleanName.includes("줌") ? SERVICE_IMAGES["zoom-pro"] : null) ||
      (cleanName.includes("ms365") || cleanName.includes("오피스") || cleanName.includes("마이크로소프트") ? SERVICE_IMAGES.ms365 : null) ||
      (cleanName.includes("google-one") || cleanName.includes("구글원") || cleanName.includes("google one") ? SERVICE_IMAGES["google-one"] : null) ||
      (cleanName.includes("dropbox") || cleanName.includes("드롭박스") ? SERVICE_IMAGES.dropbox : null) ||
      (cleanName.includes("evernote") || cleanName.includes("에버노트") ? SERVICE_IMAGES.evernote : null) ||
      (cleanName.includes("todoist") || cleanName.includes("투두이스트") ? SERVICE_IMAGES.todoist : null) ||
      (cleanName.includes("1password") || cleanName.includes("원패스워드") ? SERVICE_IMAGES["1password"] : null) ||
      (cleanName.includes("nordvpn") || cleanName.includes("노드vpn") ? SERVICE_IMAGES.nordvpn : null) ||
      (cleanName.includes("notion") || cleanName.includes("노션") ? SERVICE_IMAGES.notion : null) ||
      (cleanName.includes("lightroom") || cleanName.includes("라이트룸") ? SERVICE_IMAGES["adobe-lightroom"] : null) ||
      (cleanName.includes("wavve") || cleanName.includes("웨이브") ? SERVICE_IMAGES.wavve : null) ||
      (cleanName.includes("coupangplay") || cleanName.includes("쿠팡플레이") ? SERVICE_IMAGES.coupangplay : null) ||
      (cleanName.includes("laftel") || cleanName.includes("라프텔") ? SERVICE_IMAGES.laftel : null) ||
      (cleanName.includes("appletv") || cleanName.includes("애플tv") ? SERVICE_IMAGES.appletv : null) ||
      (cleanName.includes("prime") || cleanName.includes("프라임비디오") ? SERVICE_IMAGES.primevideo : null) ||
      (cleanName.includes("spotv") || cleanName.includes("스포티비") ? SERVICE_IMAGES.spotvnow : null) ||
      (cleanName.includes("weverse") || cleanName.includes("위버스") ? SERVICE_IMAGES.weverse : null) ||
      (cleanName.includes("crunchyroll") || cleanName.includes("크런치롤") ? SERVICE_IMAGES.crunchyroll : null) ||
      (cleanName.includes("mubi") || cleanName.includes("무비") ? SERVICE_IMAGES.mubi : null) ||
      (cleanName.includes("dazn") || cleanName.includes("다존") ? SERVICE_IMAGES.dazn : null) ||
      (cleanName.includes("melon") || cleanName.includes("멜론") ? SERVICE_IMAGES.melon : null) ||
      (cleanName.includes("genie") || cleanName.includes("지니") ? SERVICE_IMAGES.genie : null) ||
      (cleanName.includes("bugs") || cleanName.includes("벅스") ? SERVICE_IMAGES.bugs : null) ||
      (cleanName.includes("vibe") || cleanName.includes("바이브") ? SERVICE_IMAGES.vibe : null) ||
      (cleanName.includes("applemusic") || cleanName.includes("애플뮤직") ? SERVICE_IMAGES.applemusic : null) ||
      (cleanName.includes("ytmusic") || cleanName.includes("유튜브뮤직") ? SERVICE_IMAGES.ytmusic : null) ||
      (cleanName.includes("tidal") || cleanName.includes("타이달") ? SERVICE_IMAGES.tidal : null) ||
      (cleanName.includes("bubble") || cleanName.includes("버블") ? SERVICE_IMAGES["bubble-sm"] : null) ||
      (cleanName.includes("fromm") || cleanName.includes("프롬") ? SERVICE_IMAGES.fromm : null) ||
      (cleanName.includes("podbbang") || cleanName.includes("팟빵") ? SERVICE_IMAGES.podbbang : null) ||
      (cleanName.includes("welaaa") || cleanName.includes("윌라") ? SERVICE_IMAGES.welaaa : null) ||
      (cleanName.includes("storytel") || cleanName.includes("스토리텔") ? SERVICE_IMAGES.storytel : null) ||
      (cleanName.includes("ridi") || cleanName.includes("리디") ? SERVICE_IMAGES.ridiselect : null) ||
      (cleanName.includes("longblack") || cleanName.includes("롱블랙") ? SERVICE_IMAGES.longblack : null) ||
      (cleanName.includes("joongang") || cleanName.includes("중앙일보") || cleanName.includes("더중앙") ? SERVICE_IMAGES["the-joongang-plus"] : null) ||
      (cleanName.includes("nyt") || cleanName.includes("뉴욕타임스") ? SERVICE_IMAGES["nyt-digital"] : null) ||
      (cleanName.includes("wsj") || cleanName.includes("월스트리트") ? SERVICE_IMAGES["wsj-digital"] : null) ||
      (cleanName.includes("ft") || cleanName.includes("파이낸셜타임스") ? SERVICE_IMAGES["ft-digital"] : null) ||
      (cleanName.includes("economist") || cleanName.includes("이코노미스트") ? SERVICE_IMAGES["the-economist"] : null) ||
      (cleanName.includes("audible") || cleanName.includes("오디블") ? SERVICE_IMAGES.audible : null) ||
      (cleanName.includes("scribd") || cleanName.includes("스크립드") ? SERVICE_IMAGES.scribd : null) ||
      (cleanName.includes("speak") || cleanName.includes("스픽") ? SERVICE_IMAGES.speak : null) ||
      (cleanName.includes("duolingo") || cleanName.includes("듀오링고") ? SERVICE_IMAGES.duolingo : null) ||
      (cleanName.includes("ringle") || cleanName.includes("링글") ? SERVICE_IMAGES.ringle : null) ||
      (cleanName.includes("cambly") || cleanName.includes("캠블리") ? SERVICE_IMAGES.cambly : null) ||
      (cleanName.includes("산타") || cleanName.includes("santatoeic") ? SERVICE_IMAGES.santatoeic : null) ||
      (cleanName.includes("말해보카") || cleanName.includes("malhaeboca") ? SERVICE_IMAGES.malhaeboca : null) ||
      (cleanName.includes("클래스101") || cleanName.includes("class101") ? SERVICE_IMAGES.class101 : null) ||
      (cleanName.includes("패스트캠퍼스") || cleanName.includes("패캠") ? SERVICE_IMAGES.fastcampus : null) ||
      (cleanName.includes("인프런") || cleanName.includes("inflearn") ? SERVICE_IMAGES.inflearn : null) ||
      (cleanName.includes("coursera") || cleanName.includes("코세라") ? SERVICE_IMAGES.coursera : null) ||
      (cleanName.includes("네이버플러스") || cleanName.includes("네이버멤버십") ? SERVICE_IMAGES.naverplus : null) ||
      (cleanName.includes("배민") || cleanName.includes("배달의민족") ? SERVICE_IMAGES["baemin-club"] : null) ||
      (cleanName.includes("요기패스") || cleanName.includes("요기요") ? SERVICE_IMAGES.yogipass : null) ||
      (cleanName.includes("컬리") || cleanName.includes("마켓컬리") ? SERVICE_IMAGES["kurly-pass"] : null) ||
      (cleanName.includes("닌텐도") || cleanName.includes("nintendo") ? SERVICE_IMAGES["nintendo-online"] : null) ||
      (cleanName.includes("플스") || cleanName.includes("playstation") || cleanName.includes("ps-plus") ? SERVICE_IMAGES["ps-plus"] : null) ||
      (cleanName.includes("게임패스") || cleanName.includes("xbox") ? SERVICE_IMAGES["xbox-gamepass"] : null) ||
      (cleanName.includes("아케이드") || cleanName.includes("arcade") ? SERVICE_IMAGES["apple-arcade"] : null) ||
      (cleanName.includes("플레이패스") || cleanName.includes("play-pass") ? SERVICE_IMAGES["google-play-pass"] : null) ||
      (cleanName.includes("ea") || cleanName.includes("ea-play") ? SERVICE_IMAGES["ea-play"] : null) ||
      (cleanName.includes("와우") || cleanName.includes("warcraft") ? SERVICE_IMAGES["wow-subscription"] : null) ||
      (cleanName.includes("톡서랍") ? SERVICE_IMAGES["kakaotalk-drive"] : null) ||
      (cleanName.includes("이모티콘") ? SERVICE_IMAGES["kakaotalk-emoticon"] : null) ||
      (cleanName.includes("mybox") || cleanName.includes("마이박스") ? SERVICE_IMAGES["naver-mybox"] : null) ||
      (cleanName.includes("strava") || cleanName.includes("스트라바") ? SERVICE_IMAGES["strava-sub"] : null) ||
      (cleanName.includes("번핏") || cleanName.includes("burnfit") ? SERVICE_IMAGES["burnfit-pro"] : null) ||
      (cleanName.includes("chatgpt") || cleanName.includes("gpt") ? SERVICE_IMAGES.chatgpt : null) ||
      (cleanName.includes("tving") || cleanName.includes("티빙") ? SERVICE_IMAGES.tving : null) ||
      (cleanName.includes("disney") || cleanName.includes("디즈니") ? SERVICE_IMAGES.disney : null) ||
      (cleanName.includes("millie") || cleanName.includes("밀리") ? SERVICE_IMAGES.millie : null) ||
      (cleanName.includes("adobe") || cleanName.includes("어도비") ? SERVICE_IMAGES.adobe : null) ||
      (cleanName.includes("watcha") || cleanName.includes("왓챠") ? SERVICE_IMAGES.watcha : null) ||
      (cleanName.includes("flo") || cleanName.includes("플로") ? SERVICE_IMAGES.flo : null) ||
      (cleanName.includes("naver") || cleanName.includes("네이버") ? SERVICE_IMAGES.naver : null) ||
      (cleanName.includes("icloud") || cleanName.includes("apple") || cleanName.includes("아이클라우드") || cleanName.includes("애플") ? SERVICE_IMAGES.icloud : null)
    ));
  return resolvedImage || null;
}

// 호출부가 넘기는 모양·색 클래스(rounded, shadow, border, bg, 글자색, padding)는 무시하고
// 크기·여백·정렬 클래스만 남겨서 모든 화면의 로고 모양을 하나로 맞춘다.
const LOGO_STRIP = /^(?:rounded(?:-.*)?|shadow(?:-.*)?|border(?:-.*)?|bg-.*|p-.*|px-.*|py-.*|ring(?:-.*)?|text-(?:white|black|ink.*|gray-.*|fg-.*|brand.*|\[#.*\]))$/;
function logoLayoutClasses(className = "") {
  return className.split(/\s+/).filter((token) => token && !LOGO_STRIP.test(token.replace(/^[a-z]+:/, ""))).join(" ");
}

/**
 * C2 서비스 로고. public/assets/services 의 실제 로고를 둥근 사각형(25%)으로 꽉 채워 보여 주고,
 * 로고가 없으면 회색 바탕에 글자 하나(모노그램)를 둔다. 기본 크기는 40px.
 */
export function ServiceLogo({ serviceId, name, monogram, image = null, className = "", size }) {
  // 카탈로그의 실제 로고가 먼저다. 사용자가 붙인 사진(image)은 로고를 못 찾았을 때만 쓴다.
  const resolvedImage = resolveServiceImage({ serviceId, name }) || image || null;
  const [failed, setFailed] = useState(false);
  const layout = logoLayoutClasses(className);
  const hasSize = /(^|\s)(?:[a-z]+:)?(?:h|w|size)-/.test(layout);
  const style = { borderRadius: "25%", ...(size ? { width: size, height: size } : null) };
  const base = cx("relative inline-flex shrink-0 overflow-hidden select-none", !hasSize && !size && "h-10 w-10", layout);
  if (resolvedImage && !failed) {
    return (
      <span className={base} style={style}>
        <img
          src={resolvedImage}
          alt={name || ""}
          className="h-full w-full object-cover pointer-events-none"
          onError={() => setFailed(true)}
        />
        <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-black/[0.04]" aria-hidden="true" />
      </span>
    );
  }
  const source = (monogram && monogram.trim()) || (name && name.trim()) || "S";
  const display = Array.from(source)[0].toUpperCase();
  return (
    <span
      className={cx(base, "items-center justify-center bg-gray-100 font-semibold text-ink-muted text-[15px]")}
      style={style}
      aria-hidden="true"
    >
      {display}
    </span>
  );
}

/** 예전 이름. 모든 호출이 ServiceLogo 로 그려진다. */
export function ServiceMark({ serviceId, name, monogram, image = null, className = "" }) {
  return <ServiceLogo serviceId={serviceId} name={name} monogram={monogram} image={image} className={className} />;
}

/** 예전 이름. 이미지가 없으면 회색 모노그램. */
export function BrandServiceMark({ monogram, image = null, className = "" }) {
  return <ServiceLogo monogram={monogram} image={image} className={className} />;
}

export function CategoryBadge({ category, showPhilosophy = false, className = "" }) {
  if (!category) return null;
  const info = CATEGORY_PHILOSOPHY[category] || CATEGORY_PHILOSOPHY.기타;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-0.5 text-[10px] font-bold tracking-tight transition-colors select-none",
        info.style,
        className
      )}
      title={info.desc}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full shrink-0", info.dot)} aria-hidden="true" />
      <span>{info.label}</span>
      {showPhilosophy && <span className="opacity-75 font-medium">· {info.theme}</span>}
    </span>
  );
}
