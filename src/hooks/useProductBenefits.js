import { useEffect, useState } from "react";
import { promotionCatalog } from "../data/subscriptionData.js";
import { supabase } from "../lib/supabase.js";
import { loadREProductBenefits } from "../features/benefits/api/reProductBenefits.js";

export function useProductBenefits(subscriptions, userContext) {
  const [promotions, setPromotions] = useState(promotionCatalog);
  useEffect(() => {
    let disposed = false;
    async function refresh() {
      try {
        const result = await loadREProductBenefits({ client: supabase, legacy: promotionCatalog, subscriptions, userContext });
        if (!disposed) setPromotions(result.promotions);
      } catch {
        if (!disposed) setPromotions(promotionCatalog);
      }
    }
    setPromotions(promotionCatalog);
    refresh();
    const timer = setInterval(refresh, 60_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { disposed = true; clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [subscriptions, userContext]);
  return promotions;
}
