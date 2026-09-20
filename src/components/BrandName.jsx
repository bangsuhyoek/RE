export function BrandName({ className = "" }) {
  return (
    <span
      className={`relative inline-block font-black tracking-tight ${className}`}
      aria-label="꾸독"
    >
      꾸독
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[7%] right-[7%] -bottom-[3px] h-[2px] rounded-full bg-current opacity-90"
      />
    </span>
  );
}
