export function RELogo({ className = "", markClassName = "h-9 w-auto", stacked = false }) {
  if (stacked) {
    return (
      <div className={`flex flex-col items-center ${className}`.trim()}>
        <img src="/re-assets/logo_mark.png" alt="RE." className={`${markClassName} object-contain`} />
        <img src="/re-assets/logo_lockup.png" alt="" aria-hidden="true" className="mt-2 h-8 w-auto object-contain" />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${className}`.trim()}>
      <img src="/re-assets/logo_mark.png" alt="RE." className={`${markClassName} object-contain`} />
    </div>
  );
}

export function WaterBackground({ variant = "default" }) {
  const asset = variant === "signup"
    ? "/re-assets/signup_bg.jpg"
    : variant === "splash"
      ? "/re-assets/splash_bg.jpg"
      : "/re-assets/bg_plate.jpg";

  return (
    <>
      <img src={asset} alt="" aria-hidden="true" className="re-water-background" />
      <div className="re-water-wash" aria-hidden="true" />
    </>
  );
}
