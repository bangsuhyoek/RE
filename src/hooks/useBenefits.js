import { useCallback, useEffect, useState } from "react";
import {
  fetchActiveBenefits,
  isSupabaseConfigured,
} from "../lib/supabase.js";

export function useBenefits({ enabled = true } = {}) {
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled && isSupabaseConfigured));
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) return [];
    if (!isSupabaseConfigured) {
      setBenefits([]);
      setLoading(false);
      setError(null);
      return [];
    }

    setLoading(true);
    setError(null);
    try {
      const next = await fetchActiveBenefits();
      setBenefits(next);
      return next;
    } catch (err) {
      console.warn("useBenefits reload error:", err);
      setBenefits([]);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    Promise.resolve(reload()).catch((err) => {
      if (!active) return;
      setError(err);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [enabled, reload]);

  return {
    benefits,
    loading,
    error,
    reload,
    source: isSupabaseConfigured ? "supabase" : "unconfigured",
  };
}
