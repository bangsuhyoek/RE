import { useEffect, useMemo, useRef, useState } from "react";

const MODE_BY_STATE = {
  idle: 0,
  loading: 1,
  sorry: 2,
  guide: 3,
  done: 4,
};

const TIMELINE_BY_STATE = {
  idle: "Idle",
  loading: "Loading",
  sorry: "Sorry",
  guide: "Guide",
  done: "Done",
};

export const RIVE_CHARACTER_ASSET = "/re-assets/re-character.riv";
export const RIVE_CHARACTER_STATE_MACHINE = "Character";
export const RIVE_CHARACTER_MODE_INPUT = "Mode";

export function RiveCharacter({
  state = "idle",
  className = "",
  src = RIVE_CHARACTER_ASSET,
  stateMachine = RIVE_CHARACTER_STATE_MACHINE,
  modeInputName = RIVE_CHARACTER_MODE_INPUT,
}) {
  const canvasRef = useRef(null);
  const riveRef = useRef(null);
  const modeInputRef = useRef(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const normalizedState = useMemo(() => MODE_BY_STATE[state] === undefined ? "idle" : state, [state]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(Boolean(media?.matches));
    sync();
    media?.addEventListener?.("change", sync);
    return () => media?.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion || !canvasRef.current) return undefined;

    let disposed = false;
    let attempts = 0;
    let retryTimer;
    let resizeHandler;

    const boot = () => {
      if (disposed) return;
      if (!window.rive?.Rive) {
        attempts += 1;
        if (attempts >= 100) {
          setLoadFailed(true);
          return;
        }
        retryTimer = window.setTimeout(boot, 50);
        return;
      }

      try {
        const instance = new window.rive.Rive({
          src,
          canvas: canvasRef.current,
          autoplay: false,
          onLoad: () => {
            if (disposed) return;
            setLoadFailed(false);
            instance.resizeDrawingSurfaceToCanvas?.();
            const inputs = instance.stateMachineInputs?.(stateMachine) || [];
            modeInputRef.current = inputs.find((input) => input.name === modeInputName) || null;
            if (modeInputRef.current) {
              modeInputRef.current.value = MODE_BY_STATE[normalizedState];
              instance.play?.(stateMachine);
            } else {
              instance.play?.(TIMELINE_BY_STATE[normalizedState]);
            }
          },
          onLoadError: () => {
            if (!disposed) setLoadFailed(true);
          },
        });
        riveRef.current = instance;
        resizeHandler = () => instance.resizeDrawingSurfaceToCanvas?.();
        window.addEventListener("resize", resizeHandler);
      } catch {
        setLoadFailed(true);
      }
    };

    boot();

    return () => {
      disposed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      riveRef.current?.cleanup?.();
      riveRef.current = null;
      modeInputRef.current = null;
    };
  }, [modeInputName, reduceMotion, src, stateMachine]);

  useEffect(() => {
    if (reduceMotion) return;
    const modeInput = modeInputRef.current;
    const instance = riveRef.current;
    if (!instance) return;

    if (modeInput) {
      modeInput.value = MODE_BY_STATE[normalizedState];
      return;
    }

    const timeline = TIMELINE_BY_STATE[normalizedState];
    if (timeline) instance.play?.(timeline);
  }, [normalizedState, reduceMotion]);

  if (reduceMotion || loadFailed) {
    return (
      <img
        src="/re-assets/char_stand.jpg"
        alt=""
        aria-hidden="true"
        className={`pointer-events-none select-none object-contain ${className}`.trim()}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none block select-none ${className}`.trim()}
    />
  );
}
