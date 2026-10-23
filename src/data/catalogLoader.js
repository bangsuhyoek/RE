/**
 * Subscription catalog async loader
 * Defers loading the 100KB+ subscriptionData until requested
 */
let catalogPromise = null;
let cachedCatalog = null;

export async function loadSubscriptionData() {
  if (cachedCatalog) return cachedCatalog;
  if (!catalogPromise) {
    catalogPromise = import("./subscriptionData.js").then((mod) => {
      cachedCatalog = mod;
      return mod;
    });
  }
  return catalogPromise;
}

export function getCachedCatalog() {
  return cachedCatalog;
}
