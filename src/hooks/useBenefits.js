import { useCallback, useEffect, useState } from "react";
import { fetchActiveBenefitsResult, supabase } from "../lib/supabase.js";
import { BenefitLoadState } from "../features/benefits/api/fetchState.js";
import { loadBenefitRecommendations } from "../features/benefits/api/benefitRecommendationLoader.js";
import { fetchPublishedV7Offers } from "../features/benefits/api/v7PublishedOffers.js";

const EMPTY_CONTEXT = Object.freeze({});
const fetchLivePublishedV7Offers = () => fetchPublishedV7Offers(supabase);

export function useBenefits({
  enabled = true,
  subscriptions = [],
  userContext = EMPTY_CONTEXT,
  legacyFetcher = fetchActiveBenefitsResult,
  v7Fetcher = fetchLivePublishedV7Offers,
} = {}) {
  const [benefits, setBenefits] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [loadState, setLoadState] = useState(
    enabled ? BenefitLoadState.LOADING : BenefitLoadState.IDLE
  );
  const [source, setSource] = useState("unconfigured");
  const [sourceStates, setSourceStates] = useState({});
  const [partial, setPartial] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return [];

    setLoading(true);
    setError(null);
    setLoadState(BenefitLoadState.LOADING);

    const result = await loadBenefitRecommendations({
      subscriptions,
      userContext,
      legacyFetcher,
      v7Fetcher,
    });

    setBenefits(result.legacyBenefits);
    setRecommendations(result.recommendations);
    setLoadState(result.loadState);
    setError(result.error);
    setSource(result.source);
    setSourceStates(result.sourceStates);
    setPartial(result.partial);
    setLoading(false);

    return result.recommendations;
  }, [enabled, subscriptions, userContext, legacyFetcher, v7Fetcher]);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setLoading(false);
      setLoadState(BenefitLoadState.IDLE);
      return undefined;
    }

    Promise.resolve(reload()).catch((err) => {
      if (!active) return;
      console.warn("useBenefits reload error:", err);
      setBenefits([]);
      setRecommendations([]);
      setError(err);
      setLoading(false);
      setLoadState(BenefitLoadState.FETCH_FAILED);
    });

    return () => {
      active = false;
    };
  }, [enabled, reload]);

  return {
    benefits,
    recommendations,
    loading,
    error,
    loadState,
    reload,
    source,
    sourceStates,
    partial,
  };
}
