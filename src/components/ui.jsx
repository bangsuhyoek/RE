import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Camera,
  ChevronRight,
  CreditCard,
  Gift,
  Home,
  MessageCircle,
  PlusCircle,
  Loader2,
  X,
  Pin,
} from "lucide-react";
import { daysUntilCharge, formatWonText } from "../lib/dates";
import {
  PaymentIcon,
  PaymentMethodBadge,
  PAYMENT_PRESETS,
  PaymentMethodTriggerField,
  PaymentMethodPickerModal,
} from "./PaymentMethod";
import { getCachedCatalog } from "../data/catalogLoader";

export {
  PaymentIcon,
  PaymentMethodBadge,
  PAYMENT_PRESETS,
  PaymentMethodTriggerField,
  PaymentMethodPickerModal,
};

const cx = (...classes) => classes.filter(Boolean).join(" ");

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

/**
 * SEED Action Button Component
 * Supports SEED-aligned variants (Neutral Solid, Neutral Weak, Neutral Outline, Brand Solid, Critical Solid, Ghost)
 * and sizes (Large, Medium/Default, Small/Compact, XSmall, Icon) with tactile micro-press feedback.
 */
export function Button({
  children,
  className = "",
  variant = "primary",
  size = "default",
  type = "button",
  loading = false,
  disabled = false,
  fullWidth = false,
  prefixIcon = null,
  suffixIcon = null,
  ...props
}) {
  const variants = {
    // C2: 주요 버튼은 잉크색 채움, 보조는 회색 면, 아웃라인은 흰 바탕 + 얇은 선. 그림자 없음.
    primary: "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed",
    "neutral-solid": "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed",
    secondary: "bg-gray-100 text-ink-secondary hover:bg-gray-200 active:bg-gray-200",
    "neutral-weak": "bg-gray-100 text-ink-secondary hover:bg-gray-200 active:bg-gray-200",
    outline: "border border-gray-200 bg-white text-ink-secondary hover:bg-gray-50 active:bg-gray-100",
    "neutral-outline": "border border-gray-200 bg-white text-ink-secondary hover:bg-gray-50 active:bg-gray-100",
    brand: "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed",
    "brand-solid": "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed",
    danger: "bg-danger text-white hover:opacity-90 active:opacity-80",
    "critical-solid": "bg-danger text-white hover:opacity-90 active:opacity-80",
    ghost: "text-ink-muted hover:bg-gray-100 hover:text-ink active:bg-gray-200",
  };
  const sizes = {
    large: "min-h-[52px] rounded-[14px] px-5 text-[16px] font-semibold tracking-tight",
    default: "min-h-[48px] rounded-xl px-4 text-[15px] font-semibold tracking-tight",
    compact: "min-h-[36px] rounded-[10px] px-3.5 text-[13px] font-semibold tracking-tight",
    xsmall: "min-h-[28px] rounded-lg px-2.5 text-[12px] font-medium tracking-tight",
    icon: "grid h-10 w-10 place-items-center rounded-xl p-0",
  };
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cx(
        "relative inline-flex select-none items-center justify-center gap-1.5 transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900",
        isDisabled ? "cursor-not-allowed opacity-40 pointer-events-none active:scale-100" : "cursor-pointer",
        fullWidth && "w-full",
        variants[variant] || variants.primary,
        sizes[size] || sizes.default,
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 size={size === "compact" || size === "xsmall" ? 14 : 17} className="animate-spin" />
          <span>{children}</span>
        </span>
      ) : (
        <>
          {prefixIcon && <span className="inline-flex shrink-0 items-center">{prefixIcon}</span>}
          {children}
          {suffixIcon && <span className="inline-flex shrink-0 items-center">{suffixIcon}</span>}
        </>
      )}
    </button>
  );
}

/**
 * SEED Icon Button Component
 * For navigation, back, close, or action icon targets with min 36-40px touch zone.
 */
export function IconButton({
  children,
  className = "",
  variant = "ghost",
  size = "medium",
  type = "button",
  disabled = false,
  ...props
}) {
  const variants = {
    ghost: "text-ink-muted hover:bg-gray-100 hover:text-ink active:bg-gray-200",
    weak: "bg-gray-100 text-ink-secondary hover:bg-gray-200 active:bg-gray-200",
    outline: "border border-gray-200 bg-white text-ink-secondary hover:bg-gray-50 active:bg-gray-100",
    solid: "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed",
  };
  const sizes = {
    large: "h-11 w-11 rounded-xl",
    // 보이는 크기는 유지하고 before 가상 요소로 터치 영역만 44px 이상으로 넓힌다.
    medium: "h-9 w-9 rounded-lg before:absolute before:-inset-1 before:content-['']",
    small: "h-7 w-7 rounded-md before:absolute before:-inset-2 before:content-['']",
  };
  const positioned = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className);
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        "grid place-items-center select-none transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
        !positioned && "relative",
        disabled ? "cursor-not-allowed opacity-40 pointer-events-none" : "cursor-pointer",
        variants[variant] || variants.ghost,
        sizes[size] || sizes.medium,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * C2 필터 칩. 선택된 칩만 잉크색으로 채우고, 나머지는 흰 바탕 + 얇은 회색 선(당근 칩 방식).
 */
export function Chip({
  children,
  selected = false,
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        "inline-flex min-h-[34px] shrink-0 items-center justify-center gap-1 rounded-full border px-3.5 text-[14px] tracking-tight transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-[''] relative",
        selected
          ? "border-ink bg-ink font-semibold text-white"
          : "border-gray-200 bg-white font-medium text-ink-secondary hover:bg-gray-50 active:bg-gray-100",
        disabled && "cursor-not-allowed opacity-40 pointer-events-none",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * SEED Segmented Control Component
 * Container and tab items for 2~4 option fast switching.
 */
export function SegmentedControl({
  options = [],
  value,
  onChange,
  className = "",
}) {
  return (
    <div className={cx("flex items-center gap-1 rounded-xl bg-gray-100 p-1", className)} role="tablist">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={cx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold tracking-tight transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
              isSelected
                ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-ink-tertiary hover:text-ink-secondary",
            )}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// D-day 규칙(C2): 배지 없이 글자로만 쓴다. 3일 이내(오늘 포함)는 빨강, 그 외는 회색.
// 알림 센터는 이 톤을 그대로 가져다 쓴다(테두리는 투명).
export const DDAY_BADGE_TONE = {
  urgent: "border-transparent bg-transparent text-danger",
  normal: "border-transparent bg-transparent text-ink-tertiary",
};

export function getDDayLabel(subscription) {
  const days = daysUntilCharge(subscription);
  const isTrial = subscription.isTrial || subscription.status === "trial";
  return {
    days,
    urgent: days <= 3,
    label: (isTrial ? "무료 " : "") + (days === 0 ? "오늘" : "D-" + days),
  };
}

export function DDayText({ subscription, className = "" }) {
  const { urgent, label } = getDDayLabel(subscription);
  return (
    <span
      className={cx(
        "inline-block shrink-0 whitespace-nowrap text-[13px] leading-[18px] tabular-nums tracking-tight",
        urgent ? "font-semibold text-danger" : "font-normal text-ink-tertiary",
        className,
      )}
    >
      {label}
    </span>
  );
}

/** 예전 이름. 이제 배지가 아니라 글자로 그린다. */
export function DDayBadge({ subscription, className = "" }) {
  return <DDayText subscription={subscription} className={className} />;
}

/**
 * C2 섹션 머리말. 18px 굵은 제목 + 오른쪽 회색 텍스트 버튼(선택).
 */
export function SectionHeader({ title, actionLabel, onAction, trailing = null, className = "" }) {
  return (
    <div className={cx("flex items-center justify-between px-5 pb-1 pt-6", className)}>
      <h2 className="text-[18px] font-bold leading-[26px] tracking-[-0.025em] text-ink">{title}</h2>
      {trailing}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="relative -mr-1 inline-flex min-h-[44px] items-center gap-0.5 px-1 text-[14px] font-medium text-ink-tertiary hover:text-ink-secondary"
        >
          {actionLabel}
          <ChevronRight size={16} strokeWidth={2} className="text-ink-subtle" />
        </button>
      )}
    </div>
  );
}

/** C2 구획 띠. 큰 묶음 사이를 12px 회색 면으로 나눈다(토스·당근 방식). */
export function SectionBand({ className = "" }) {
  // 너비를 고정하지 않아서 시트 안에서 -mx-5 를 주면 좌우 끝까지 닿는다.
  return <div className={cx("block h-3 bg-gray-100", className)} aria-hidden="true" />;
}

/**
 * C2 리스트 행. 왼쪽 로고(40px), 가운데 제목 16 + 보조 13, 오른쪽 금액 16 굵게 + 보조 13.
 * onClick 이 있으면 버튼으로 그리고 withArrow 로 화살표를 붙일 수 있다.
 */
export function ListRow({
  leading = null,
  title,
  titleAccessory = null,
  subtitle = null,
  trailingTitle = null,
  trailingSubtitle = null,
  withArrow = false,
  onClick,
  className = "",
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx(
        "flex min-h-[68px] w-full items-center gap-3.5 px-5 py-3 text-left",
        onClick && "cursor-pointer transition-colors hover:bg-gray-50 active:bg-gray-100",
        className,
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {/* 큰 글씨에서도 뜻이 보이도록 제목은 두 줄까지 단어 단위로 줄바꿈한다. */}
          <span className="line-clamp-2 break-keep text-[16px] font-medium leading-[22px] tracking-tight text-ink">{title}</span>
          {titleAccessory}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-[13px] leading-[18px] tracking-tight text-ink-tertiary">{subtitle}</div>
        )}
      </div>
      {(trailingTitle || trailingSubtitle) && (
        <div className="shrink-0 text-right">
          {trailingTitle && (
            <div className="text-[16px] font-semibold leading-[22px] tabular-nums tracking-tight text-ink">{trailingTitle}</div>
          )}
          {trailingSubtitle && <div className="mt-0.5 text-[13px] leading-[18px] text-ink-tertiary">{trailingSubtitle}</div>}
        </div>
      )}
      {withArrow && <ChevronRight size={18} strokeWidth={1.8} className="shrink-0 text-ink-subtle" aria-hidden="true" />}
    </Tag>
  );
}

/** C2 에이전트 진입점. 헤더 오른쪽의 작은 회색 알약 버튼. */
export function AgentEntryPill({ onClick, label = "꾸독에게 맡기기" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex h-8 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-[14px] font-semibold tracking-tight text-ink-muted transition-colors hover:bg-gray-200 active:bg-gray-200 before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']"
    >
      <MessageCircle size={16} strokeWidth={1.8} aria-hidden="true" />
      {label}
    </button>
  );
}

/** C2 알림 버튼. 읽지 않은 알림이 있으면 작은 빨간 점. */
export function NotificationBellButton({ onClick, unreadCount = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative grid h-10 w-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink before:absolute before:-inset-0.5 before:content-['']"
      aria-label={unreadCount > 0 ? `알림 센터 열기, 읽지 않은 알림 ${unreadCount}개` : "알림 센터 열기"}
    >
      <Bell size={22} strokeWidth={1.8} />
      {unreadCount > 0 && <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" />}
    </button>
  );
}

/** C2 홈 헤더: 왼쪽 "꾸독", 오른쪽 에이전트 알약 + 알림. 홈 화면 재구성 때 쓴다. */
export function MainHeader({ onOpenAgent, onOpenNotifications, unreadCount = 0 }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white pt-safe">
      <div className="flex h-[52px] items-center justify-between pl-5 pr-3">
        <span className="text-[20px] font-bold tracking-[-0.04em] text-ink">꾸독</span>
        <div className="flex items-center gap-1">
          {onOpenAgent && <AgentEntryPill onClick={onOpenAgent} />}
          {onOpenNotifications && <NotificationBellButton onClick={onOpenNotifications} unreadCount={unreadCount} />}
        </div>
      </div>
    </header>
  );
}

export function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer select-none rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus active:scale-[0.97] before:absolute before:-inset-x-2 before:-inset-y-2.5 before:content-['']",
        checked ? "bg-brand" : "bg-gray-300",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

export function AppHeader({ title, onBack, rightSlot = null, large = false }) {
  return (
    <header className="sticky top-0 z-30 flex flex-col w-full bg-white pt-safe">
      <div className="flex h-14 w-full items-center justify-between pl-4 pr-3 sm:pl-5">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <IconButton onClick={onBack} aria-label="뒤로가기" size="medium">
              <ArrowLeft size={22} className="text-ink" />
            </IconButton>
          )}
          <span className={cx("font-bold tracking-[-0.03em] text-ink truncate", large ? "text-[24px]" : "text-[20px]")}>{title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {rightSlot}
        </div>
      </div>
    </header>
  );
}

const NAV_ITEMS = [
  { key: "home", label: "홈", Icon: Home, routes: ["home"] },
  { key: "subscriptions", label: "구독", Icon: CreditCard, routes: ["subscriptions", "detail"] },
  { key: "add", label: "추가", Icon: PlusCircle, routes: [] },
  { key: "calendar", label: "캘린더", Icon: CalendarDays, routes: ["calendar"] },
  { key: "promotions", label: "혜택", Icon: Gift, routes: ["promotions"] },
];

// C2 하단 탭: 같은 모양의 선 아이콘 5개. 활성은 잉크색, 비활성은 회색. 추가도 일반 탭처럼 둔다.
export function BottomNavigation({
  route,
  onNavigate,
  onOpenAdd,
}) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 grid w-full max-w-full sm:max-w-[440px] -translate-x-1/2 grid-cols-5 border-t border-gray-100 bg-white px-1 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pt-1" aria-label="주요 탐색">
      {NAV_ITEMS.map(({ key, label, Icon, routes }) => {
        const active = routes.includes(route);
        const isAdd = key === "add";
        return (
          <button
            key={key}
            type="button"
            onClick={isAdd ? onOpenAdd : () => onNavigate(key)}
            className={cx(
              "flex min-h-[52px] flex-col items-center justify-center gap-[3px] text-[11px] tracking-tight transition-colors",
              active ? "font-semibold text-ink" : "font-medium text-ink-tertiary hover:text-ink-muted",
            )}
            aria-current={active ? "page" : undefined}
            aria-label={isAdd ? "새 구독 추가" : undefined}
          >
            <Icon size={24} strokeWidth={active ? 2.1 : 1.7} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function getSubscriptionDisplayAmount(subscription) {
  if (subscription?.amount && Number(subscription.amount) > 0) {
    return Number(subscription.amount);
  }
  if (subscription?.regularAmount) return Number(subscription.regularAmount);
  if (subscription?.expectedAmount) return Number(subscription.expectedAmount);
  if (subscription?.normalAmount) return Number(subscription.normalAmount);

  // 0원인 무료체험(프로모션) 구독인 경우 카탈로그에서 정상 결제 예정 금액 탐색
  const cleanName = (subscription?.name || "").toLowerCase().trim();
  const cleanId = (subscription?.id || "").toLowerCase().trim();
  const catalog = getCachedCatalog()?.serviceCatalog || [];
  const matched = catalog.find(
    (s) => s.id === cleanId || s.name.toLowerCase() === cleanName || cleanName.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(cleanName)
  );
  if (matched) {
    if (subscription?.plan && Array.isArray(matched.availablePlans)) {
      const planMatched = matched.availablePlans.find((p) => p.plan === subscription.plan);
      if (planMatched && planMatched.amount) return planMatched.amount;
    }
    if (matched.amount) return matched.amount;
  }
  return Number(subscription?.amount || 0);
}

export function SubscriptionCard({
  subscription,
  onOpen,
  onTogglePin,
  variant = "card",
  className = "",
}) {
  const isGrouped = variant === "grouped";
  const monogram = subscription.monogram || subscription.name?.slice(0, 1) || "S";
  const isPinned = Boolean(subscription.isPinned || subscription.pinned);
  const displayAmount = getSubscriptionDisplayAmount(subscription);
  const cycleLabel = subscription.billingCycle === "매년" ? "매년" : "매월";

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className={cx(
        "flex w-full min-h-[68px] items-center justify-between gap-3 text-left transition-colors cursor-pointer group/card focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink",
        isGrouped
          ? "py-3 bg-transparent hover:bg-gray-50 active:bg-gray-100"
          : "px-5 py-3 bg-white hover:bg-gray-50 active:bg-gray-100",
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <ServiceMark
          serviceId={subscription.serviceId || subscription.id}
          name={subscription.name}
          monogram={monogram}
          image={subscription.image || subscription.attachments?.[0]}
          className="h-10 w-10"
        />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-medium leading-[22px] tracking-tight text-ink">
            {subscription.name}
          </span>
          <p className="mt-0.5 truncate text-[13px] leading-[18px] tracking-tight text-ink-tertiary">
            {subscription.plan || "기본 플랜"} · {cycleLabel}{subscription.paymentMethod ? ` · ${subscription.paymentMethod}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <div className="text-right">
          <span className="block text-[16px] font-semibold leading-[22px] tabular-nums tracking-tight text-ink">
            {formatWonText(displayAmount)}
          </span>
          <DDayText subscription={subscription} className="mt-0.5" />
        </div>

        {onTogglePin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(subscription.subscriptionId || subscription.id);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
            className={cx(
              "relative ml-1 p-1.5 rounded-full transition-colors cursor-pointer before:absolute before:-inset-2 before:content-['']",
              isPinned
                ? "text-ink hover:bg-gray-100"
                : "text-ink-subtle hover:text-ink-muted hover:bg-gray-100"
            )}
            title={isPinned ? "상단 고정 해제" : "상단에 고정 강조"}
            aria-label={isPinned ? "상단 고정 해제" : "상단에 고정 강조"}
          >
            <Pin size={16} className={isPinned ? "fill-ink text-ink" : ""} />
          </button>
        )}
      </div>
    </div>
  );
}

export function Toast({ toast, onClose, duration = 2500 }) {
  const message = typeof toast === "object" && toast !== null ? toast.message : toast;
  const initialDuration = (typeof toast === "object" && toast?.duration) || duration;
  const toastKey = (typeof toast === "object" && toast?.id) || message;

  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(initialDuration);
  const timerRef = useRef(null);
  const hardTimeoutRef = useRef(null);
  const exitTimerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const toastRef = useRef(null);

  const handleClose = useCallback(() => {
    setIsExiting((curr) => {
      if (curr) return curr;
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => {
        onCloseRef.current?.();
      }, 180);
      return true;
    });
  }, []);

  useEffect(() => {
    if (!message) {
      setIsExiting(false);
      setIsPaused(false);
      return;
    }
    setIsExiting(false);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    remainingTimeRef.current = initialDuration;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

    timerRef.current = setTimeout(() => {
      handleClose();
    }, initialDuration);

    // Hard ceiling timeout: 2~3초 내 빠른 자동 종료 보장 (사용자 피드백)
    hardTimeoutRef.current = setTimeout(() => {
      handleClose();
    }, Math.min(initialDuration + 500, 3500));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [toastKey, initialDuration, message, handleClose]);

  // 외부 영역 터치/클릭 시 즉시 닫힘 (사용자 피드백)
  useEffect(() => {
    if (!message) return;
    const handleOutsideClick = (e) => {
      if (toastRef.current && !toastRef.current.contains(e.target)) {
        handleClose();
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", handleOutsideClick, { capture: true, once: true });
    }, 80);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", handleOutsideClick, { capture: true });
    };
  }, [message, handleClose]);

  const handleMouseEnter = (e) => {
    if (isExiting) return;
    if (e?.pointerType === "touch") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    setIsPaused(true);
  };

  const handleMouseLeave = (e) => {
    if (isExiting) return;
    if (e?.pointerType === "touch") return;
    setIsPaused(false);
    startTimeRef.current = Date.now();
    const remaining = remainingTimeRef.current > 0 ? remainingTimeRef.current : 500;
    timerRef.current = setTimeout(() => {
      handleClose();
    }, remaining);
  };

  if (!message) return null;

  return (
    <div
      ref={toastRef}
      role="status"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClose}
      className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 flex-col overflow-hidden rounded-2xl bg-[#18181B] text-white shadow-xl cursor-pointer ${
        isExiting ? "toast-exit" : "toast-enter"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <p className="text-[13px] font-medium leading-5">{message}</p>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-1 text-ink-subtle hover:text-white transition-colors"
          aria-label="알림 닫기"
        >
          <X size={16} />
        </button>
      </div>

      <div className="h-[2px] w-full bg-white/10">
        <div
          key={toastKey}
          className="h-full bg-brand/80 origin-left"
          style={{
            animation: `toast-shrink ${initialDuration}ms linear forwards`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        />
      </div>
    </div>
  );
}

let nextSheetId = 0;
const activeSheetStack = [];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function BottomSheet({ children, onClose, label }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 열리면 포커스를 시트 안으로 옮기고, 닫히면 시트를 열기 전 위치로 돌려준다.
  // 또한 시트 스택에 등록하여 여러 시트가 열려 있을 때 최상위 시트만 Escape 로 닫히도록 한다.
  useEffect(() => {
    const sheetId = ++nextSheetId;
    activeSheetStack.push({ id: sheetId, dialogRef, close: () => onCloseRef.current?.() });

    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    if (dialog && !dialog.contains(document.activeElement)) {
      dialog.focus({ preventScroll: true });
    }

    const handleGlobalKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (activeSheetStack.length === 0) return;
      const top = activeSheetStack[activeSheetStack.length - 1];
      if (top.id !== sheetId) return;

      // 시트 내부에 다른 dialog(예: 결제수단 선택 창)가 떠 있다면 그 창이 자체 Escape 처리를 하도록 양보
      const topDialog = top.dialogRef.current;
      if (topDialog && topDialog.querySelector('[role="dialog"]')) return;

      event.stopPropagation();
      top.close();
    };

    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
      const index = activeSheetStack.findIndex((item) => item.id === sheetId);
      if (index !== -1) {
        activeSheetStack.splice(index, 1);
      }
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      } else {
        const nextTop = activeSheetStack[activeSheetStack.length - 1];
        const nextDialog = nextTop?.dialogRef.current;
        if (nextDialog && !nextDialog.contains(document.activeElement)) {
          nextDialog.focus({ preventScroll: true });
        }
      }
    };
  }, []);

  // Tab 은 시트 안에서만 돈다. 시트 안에 다른 창(role="dialog", 예: 결제수단 선택 창)이 열려 있거나
  // 키가 그 창에서 왔으면 그 창이 처리하도록 손대지 않는다.
  const handleKeyDown = (event) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (event.target.closest?.('[role="dialog"]') !== dialog || dialog.querySelector('[role="dialog"]')) return;
    if (event.key !== "Tab") return;
    event.stopPropagation();
    const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (element) => element.getClientRects().length > 0
    );
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="sheet-backdrop fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="sheet-slide-up fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-full sm:max-w-[440px] max-h-[90vh] max-h-[90dvh] flex flex-col rounded-t-[20px] bg-white pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] pt-2.5 outline-none"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-gray-200" aria-hidden="true" />
        <div className="overflow-y-auto overflow-x-hidden no-scrollbar flex-1 overscroll-contain px-5 pb-2">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * SEED Attachment Input Component
 * Inspired by Daangn Seed Design (attachment-input / attachment-input-trigger / attachment-input-item)
 * Displays an 80x80px camera trigger button with count badge (e.g. 3/10) and horizontal thumbnail list.
 */
export function AttachmentInput({
  files = [],
  maxFiles = 10,
  onChange,
  onRemove,
  disabled = false,
  className = "",
}) {
  const fileInputRef = useRef(null);

  return (
    <div className={cx("flex items-center gap-2.5 overflow-x-auto py-1", className)}>
      <button
        type="button"
        disabled={disabled || files.length >= maxFiles}
        onClick={() => fileInputRef.current?.click()}
        className={cx(
          "relative flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white transition-colors",
          files.length >= maxFiles || disabled
            ? "cursor-not-allowed opacity-40"
            : "cursor-pointer hover:bg-gray-50 active:bg-gray-100"
        )}
        aria-label={`사진 첨부하기 (${files.length}/${maxFiles})`}
      >
        <Camera size={24} className="text-ink-tertiary" />
        <div className="text-[12px] leading-tight select-none">
          <strong className={cx("font-semibold", files.length > 0 ? "text-ink" : "text-ink-tertiary")}>
            {files.length}
          </strong>
          <span className="text-ink-tertiary">/{maxFiles}</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={onChange}
        />
      </button>

      {files.map((fileUrl, index) => (
        <div
          key={index}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
        >
          <img src={fileUrl} alt={`첨부 사진 ${index + 1}`} className="h-full w-full object-cover" />
          {index === 0 && (
            <span className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center text-[10px] font-medium text-white backdrop-blur-xs select-none">
              대표 사진
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(index);
            }}
            className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-ink transition-colors hover:bg-gray-100 before:absolute before:-inset-3 before:content-['']"
            aria-label={`첨부 사진 ${index + 1} 삭제`}
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * 선택형 칩. Chip 과 같은 C2 모양(선택 = 잉크 채움, 기본 = 흰 바탕 + 회색 선).
 */
export function ActionChip({
  children,
  selected = false,
  onClick,
  prefixIcon = null,
  className = "",
  disabled = false,
  size = "medium",
}) {
  const sizes = {
    small: "min-h-[28px] px-2.5 text-[12px]",
    medium: "min-h-[34px] px-3.5 text-[13px]",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-full border transition-colors select-none shrink-0 cursor-pointer",
        sizes[size] || sizes.medium,
        selected
          ? "border-ink bg-ink font-semibold text-white"
          : "border-gray-200 bg-white font-medium text-ink-secondary hover:bg-gray-50",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      {prefixIcon && <span className="inline-flex shrink-0">{prefixIcon}</span>}
      <span>{children}</span>
    </button>
  );
}
