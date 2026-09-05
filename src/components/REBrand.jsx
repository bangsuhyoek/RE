import { RE_ASSETS } from "../reBrand";

export function RELogo({ stacked = false, className = "", markClassName = "" }) {
  if (stacked) {
    return (
      <div className={`re-logo-stacked ${className}`} aria-label="RE.">
        <img src={RE_ASSETS.logoMark} alt="" className={markClassName || "h-[76px] w-auto"} />
        <span className="re-wordmark">RE.</span>
      </div>
    );
  }
  return (
    <div className={`re-logo-lockup ${className}`} aria-label="RE.">
      <img src={RE_ASSETS.logoMark} alt="" className={markClassName || "h-9 w-auto"} />
      <span className="re-wordmark">RE.</span>
    </div>
  );
}

const stateAsset = {
  idle: RE_ASSETS.sdIdle,
  cheer: RE_ASSETS.mCheer,
  sorry: RE_ASSETS.sdSorry,
  loading: RE_ASSETS.sdLoading,
  done: RE_ASSETS.sdDone,
  guide: RE_ASSETS.sdGuide,
  complete: RE_ASSETS.sdDoneP07,
  stand: RE_ASSETS.charStand,
};

export function RECharacter({ state = "idle", className = "", alt = "RE. 가이드 캐릭터" }) {
  const src = stateAsset[state] || stateAsset.idle;
  return <img src={src} alt={alt} className={`re-character re-character-${state} ${className}`} />;
}

export function WaterBackground({ variant = "splash", className = "" }) {
  const src = variant === "signup" ? RE_ASSETS.signupBg : RE_ASSETS.splashBg;
  return (
    <div className={`re-water-bg ${className}`} aria-hidden="true">
      <img src={src} alt="" />
      <div className="re-water-fade" />
    </div>
  );
}

export function REEyebrow({ children, className = "" }) {
  return <p className={`re-eyebrow ${className}`}>{children}</p>;
}
