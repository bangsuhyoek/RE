const sizeClass = {
  xs: "re-brand-logo--xs",
  sm: "re-brand-logo--sm",
  md: "re-brand-logo--md",
  lg: "re-brand-logo--lg",
  xl: "re-brand-logo--xl",
};

export function RELogo({ className = "", size = "md", stacked = false }) {
  const src = stacked
    ? "/re-assets/logo-stacked-watercolor.png"
    : "/re-assets/logo-lockup-watercolor.png";

  return (
    <img
      src={src}
      alt="RE."
      className={`re-brand-logo ${sizeClass[size] || sizeClass.md} ${stacked ? "is-stacked" : ""} ${className}`.trim()}
    />
  );
}

export function WaterBackground({ variant = "default" }) {
  const asset = variant === "signup"
    ? "/re-assets/signup_bg.jpg"
    : variant === "splash"
      ? "/re-assets/splash_bg.jpg"
      : variant === "onboarding"
        ? "/re-assets/bg_plate.jpg"
        : "/re-assets/bg_plate.jpg";

  return (
    <>
      <img src={asset} alt="" aria-hidden="true" className={`re-water-background re-water-background--${variant}`} />
      <div className={`re-water-wash re-water-wash--${variant}`} aria-hidden="true" />
    </>
  );
}
