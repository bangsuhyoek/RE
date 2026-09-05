export const publicRoutes = new Set(["landing", "splash", "intro", "login", "register"]);
export const appRoutes = new Set(["onboarding", "home", "subscriptions", "calendar", "promotions", "detail"]);
export const knownRoutes = new Set([...publicRoutes, ...appRoutes]);

export const parseHash = (hash = "") => {
  const raw = String(hash).replace(/^#\/?/, "");
  if (!raw) return { route: null, id: null, params: new URLSearchParams() };
  const [routeAndId, queryPart] = raw.split("?");
  const parts = (routeAndId || "").split("/");
  const route = parts[0] || null;
  const id = parts.slice(1).join("/") || null;
  return {
    route,
    id: id ? decodeURIComponent(id) : null,
    params: new URLSearchParams(queryPart || ""),
  };
};

export const routeForSession = ({ requestedRoute, hasProfile, onboardingComplete }) => {
  if (requestedRoute && knownRoutes.has(requestedRoute)) {
    if (publicRoutes.has(requestedRoute)) return requestedRoute;
    if (!hasProfile) return "login";
    if (!onboardingComplete && requestedRoute !== "onboarding") return "onboarding";
    return requestedRoute;
  }
  if (!hasProfile) return "landing";
  return onboardingComplete ? "home" : "onboarding";
};

export const hashForRoute = (route, id = null) =>
  id ? `#/${route}/${encodeURIComponent(id)}` : `#/${route}`;
