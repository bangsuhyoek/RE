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
  const [riveReady, setRiveReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const normalizedState = useMemo(() => MODE_BY_STATE[state] === undefined ? "idle" : state, [state]);
  const latestStateRef = useRef(normalizedState);
  latestStateRef.current = normalizedState;

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
    setLoadFailed(false);
    setRiveReady(false);

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
            setRiveReady(true);
            instance.resizeDrawingSurfaceToCanvas?.();
            const inputs = instance.stateMachineInputs?.(stateMachine) || [];
            modeInputRef.current = inputs.find((input) => input.name === modeInputName) || null;
            const latestState = latestStateRef.current;
            if (modeInputRef.current) {
              modeInputRef.current.value = MODE_BY_STATE[latestState];
              instance.play?.(stateMachine);
            } else {
              instance.play?.(TIMELINE_BY_STATE[latestState]);
            }
          },
          onLoadError: () => {
            if (!disposed) {
              setRiveReady(false);
              setLoadFailed(true);
            }
          },
        });
        riveRef.current = instance;
        resizeHandler = () => instance.resizeDrawingSurfaceToCanvas?.();
        window.addEventListener("resize", resizeHandler);
      } catch {
        setRiveReady(false);
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
    if (reduceMotion || !riveReady) return;
    const modeInput = modeInputRef.current;
    const instance = riveRef.current;
    if (!instance) return;

    if (modeInput) {
      modeInput.value = MODE_BY_STATE[normalizedState];
      return;
    }

    const timeline = TIMELINE_BY_STATE[normalizedState];
    if (timeline) instance.play?.(timeline);
  }, [normalizedState, reduceMotion, riveReady]);

  return (
    <div aria-hidden="true" className={`pointer-events-none relative select-none ${className}`.trim()}>
      {(!riveReady || reduceMotion || loadFailed) && (
        <img
          src="/re-assets/char_stand.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
      {!reduceMotion && !loadFailed && (
        <canvas
          ref={canvasRef}
          className={`block h-full w-full transition-opacity duration-150 ${riveReady ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
