import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { AuthLogin, AuthRegister } from "./components/AuthScreens";
import { LandingScreen, SplashScreen, IntroScreen } from "./components/EntryScreens";
import { AddModal } from "./components/AddModal";
import { CancelModal } from "./components/CancelModal";
import { HomeScreen } from "./components/HomeScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { PromotionScreen } from "./components/PromotionScreen";
import { CalendarScreen, SubscriptionDetailScreen, SubscriptionListScreen } from "./components/SubscriptionScreens";
import { PushNotificationBanner, NotificationCenterModal } from "./components/NotificationComponents";
import { AppHeader, BottomNavigation, BottomSheet, Button, ServiceMark, Toast } from "./components/ui";
import { promotionCatalog, serviceCatalog } from "./data/subscriptionData";
import { getMonthKey, isPastDueThisCycle } from "./lib/dates";
import { readStoredValue, removeDemoSubscriptions, storageKeys, writeStoredValue } from "./lib/storage";
import {
  generateSubscriptionAlerts,
  getStoredNotifications,
  saveStoredNotifications,
  requestNotificationPermission,
} from "./lib/notifications";

const PUBLIC_ROUTES = new Set(["splash", "landing", "intro", "login", "register"]);
const APP_ROUTES = new Set(["home", "subscriptions", "calendar", "promotions", "detail", "onboarding"]);
const PAGE_TURN_MS = 320;

const readHash = () => {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [routeAndId, queryPart] = raw.split("?");
  const parts = (routeAndId || "").split("/");
  const route = parts[0] || "";
  const id = parts.slice(1).join("/") || null;
  const params = new URLSearchParams(queryPart || "");
  return { route, id: id ? decodeURIComponent(id) : null, params };
};

const notificationPermissionNow = () => {
  if (typeof window !== "undefined" && "Notification" in window) return Notification.permission;
  return "unsupported";
};

export default function App() {
  const storedProfile = readStoredValue(storageKeys.profile, null);
  const initialRequested = useRef(readHash());
  const initialOnboardingComplete = readStoredValue(storageKeys.onboardingComplete, false);
  const initialIntroSeen = readStoredValue(storageKeys.introSeen, false);

  const [profile, setProfile] = useState(storedProfile);
  const profileRef = useRef(storedProfile);
  const [subscriptions, setSubscriptions] = useState(() => {
    const saved = readStoredValue(storageKeys.subscriptions, []);
    return removeDemoSubscriptions(saved);
  });
  const [onboardingComplete, setOnboardingComplete] = useState(initialOnboardingComplete);
  const onboardingCompleteRef = useRef(initialOnboardingComplete);
  const [introSeen, setIntroSeen] = useState(initialIntroSeen);
  const introSeenRef = useRef(initialIntroSeen);
  const [savedAmount, setSavedAmount] = useState(() => readStoredValue(storageKeys.savedAmount, 0));
  const [screen, setScreen] = useState({ route: "splash", id: null, params: new URLSearchParams() });
  const screenRef = useRef(screen);
  const [pageTurn, setPageTurn] = useState("");
  const pageTurnTimerRef = useRef(null);

  const [selectedOnboarding, setSelectedOnboarding] = useState([]);
  const [onboardingQueue, setOnboardingQueue] = useState([]);
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [renewalTarget, setRenewalTarget] = useState(null);
  const [toast, setToast] = useState("");

  const [notifications, setNotifications] = useState(() =>
    getStoredNotifications().filter((item) => !item?.isTest && !String(item?.subscriptionId || "").startsWith("seed-"))
  );
  const [activeBanner, setActiveBanner] = useState(null);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [highlightCancelId, setHighlightCancelId] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(notificationPermissionNow);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    onboardingCompleteRef.current = onboardingComplete;
  }, [onboardingComplete]);

  useEffect(() => {
    introSeenRef.current = introSeen;
  }, [introSeen]);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => () => {
    if (pageTurnTimerRef.current) window.clearTimeout(pageTurnTimerRef.current);
  }, []);

  const startPageTurn = (kind) => {
    if (!kind) return;
    setPageTurn(kind);
    if (pageTurnTimerRef.current) window.clearTimeout(pageTurnTimerRef.current);
    pageTurnTimerRef.current = window.setTimeout(() => setPageTurn(""), PAGE_TURN_MS + 60);
  };

  const navigate = (route, id = null, transition = "") => {
    startPageTurn(transition);
    const next = { route, id, params: new URLSearchParams() };
    setScreen(next);
    const hash = id ? `#/${route}/${encodeURIComponent(id)}` : `#/${route}`;
    if (window.location.hash !== hash) window.location.hash = hash;
  };

  const routeAfterSplash = () => {
    if (!introSeenRef.current) {
      navigate("landing");
      return;
    }
    if (!profileRef.current) {
      navigate("login");
      return;
    }
    if (!onboardingCompleteRef.current) {
      navigate("onboarding");
      return;
    }

    const requested = initialRequested.current;
    if (APP_ROUTES.has(requested.route) && requested.route !== "onboarding") {
      navigate(requested.route, requested.id);
      if (requested.params?.get("notifications") === "1") setNotificationCenterOpen(true);
      if (requested.params?.get("highlight") === "cancel") setHighlightCancelId(requested.id || null);
      return;
    }
    navigate("home");
  };

  useEffect(() => {
    const onHashChange = () => {
      const next = readHash();
      if (!next.route || next.route === "splash") return;
      if (!PUBLIC_ROUTES.has(next.route) && !APP_ROUTES.has(next.route)) {
        navigate(profileRef.current ? "home" : "login");
        return;
      }
      if (!PUBLIC_ROUTES.has(next.route) && !profileRef.current) {
        navigate("login");
        return;
      }
      if (profileRef.current && !onboardingCompleteRef.current && next.route !== "onboarding" && !PUBLIC_ROUTES.has(next.route)) {
        navigate("onboarding");
        return;
      }
      setScreen(next);
      if (next.params?.get("notifications") === "1") setNotificationCenterOpen(true);
      if (next.params?.get("highlight") === "cancel") setHighlightCancelId(next.id || null);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => window.scrollTo(0, 0), [screen.route, screen.id]);
  useEffect(() => writeStoredValue(storageKeys.profile, profile), [profile]);
  useEffect(() => writeStoredValue(storageKeys.subscriptions, subscriptions), [subscriptions]);
  useEffect(() => writeStoredValue(storageKeys.onboardingComplete, onboardingComplete), [onboardingComplete]);
  useEffect(() => writeStoredValue(storageKeys.introSeen, introSeen), [introSeen]);
  useEffect(() => writeStoredValue(storageKeys.savedAmount, savedAmount), [savedAmount]);
  useEffect(() => saveStoredNotifications(notifications), [notifications]);

  useEffect(() => {
    if (!subscriptions.length) return;
    const generated = generateSubscriptionAlerts(subscriptions);
    if (!generated.length) return;
    setNotifications((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      const next = generated.filter((item) => !existingIds.has(item.id));
      return next.length ? [...next, ...current] : current;
    });
  }, [subscriptions]);

  useEffect(() => {
    if (screen.route !== "home") return;
    const currentMonth = getMonthKey();
    const pastDue = subscriptions.find((subscription) =>
      isPastDueThisCycle(subscription) && subscription.renewalReviewedFor !== currentMonth
    );
    if (pastDue) setRenewalTarget(pastDue.subscriptionId);
  }, [screen.route, subscriptions]);

  const notify = (message) => setToast(message);

  const selectedSubscription = useMemo(() => {
    if (!screen.id) return null;
    const needle = String(screen.id).toLowerCase();
    return subscriptions.find((subscription) =>
      String(subscription.subscriptionId || "").toLowerCase() === needle ||
      String(subscription.id || "").toLowerCase() === needle ||
      String(subscription.name || "").toLowerCase() === needle
    ) || null;
  }, [screen.id, subscriptions]);

  const renewalSubscription = useMemo(
    () => subscriptions.find((subscription) => subscription.subscriptionId === renewalTarget) || null,
    [renewalTarget, subscriptions]
  );

  const cancelSubscription = useMemo(
    () => subscriptions.find((subscription) => subscription.subscriptionId === cancelTarget?.id) || cancelTarget?.subscription || null,
    [cancelTarget, subscriptions]
  );

  const currentOnboardingService = onboardingQueue[onboardingIndex] || null;
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  const handleIntroComplete = () => {
    introSeenRef.current = true;
    setIntroSeen(true);
    navigate("login", null, "page-turn");
  };

  const completeLogin = (provider, nickname, guest = false) => {
    const nextProfile = { nickname: nickname || "", provider, guest, notificationsAllowed: true };
    profileRef.current = nextProfile;
    setProfile(nextProfile);
    setSubscriptions((current) => removeDemoSubscriptions(current));
    setNotifications((current) => current.filter((item) => !item?.isTest && !String(item?.subscriptionId || "").startsWith("seed-")));

    if (guest) {
      setSubscriptions([]);
      setNotifications([]);
      onboardingCompleteRef.current = true;
      setOnboardingComplete(true);
      navigate("home");
      return;
    }

    onboardingCompleteRef.current = false;
    setOnboardingComplete(false);
    navigate("onboarding");
  };

  const handleOnboardingFinish = () => {
    const picked = serviceCatalog.filter((service) => selectedOnboarding.includes(service.id));
    if (!picked.length) return;
    setOnboardingQueue(picked);
    setOnboardingIndex(0);
    setAddOpen(true);
  };

  const handleOnboardingSkip = () => {
    setSelectedOnboarding([]);
    setOnboardingQueue([]);
    onboardingCompleteRef.current = true;
    setOnboardingComplete(true);
    navigate("home", null, "page-turn");
  };

  const handleCloseAdd = () => {
    setAddOpen(false);
    if (onboardingQueue.length) {
      setOnboardingQueue([]);
      setOnboardingIndex(0);
    }
  };

  const handleAddSubscription = (data) => {
    const normalizedName = String(data.name || "").trim().toLowerCase();
    const normalizedPlan = String(data.plan || "").trim().toLowerCase();
    const duplicate = subscriptions.some((subscription) =>
      String(subscription.name || "").trim().toLowerCase() === normalizedName &&
      String(subscription.plan || "").trim().toLowerCase() === normalizedPlan
    );
    if (duplicate) {
      notify("이미 등록된 구독입니다. 기존 카드에서 정보를 수정해 주세요.");
      return false;
    }

    const matched = serviceCatalog.find((service) =>
      service.name.toLowerCase() === normalizedName || service.id === data.id
    );
    const dueDay = Number(data.dueDay);
    if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) {
      notify("결제일을 1~31 사이로 확인해 주세요.");
      return false;
    }

    const record = {
      ...data,
      id: matched?.id || `custom-${Date.now()}`,
      monogram: data.monogram || matched?.monogram || String(data.name || "").trim().slice(0, 1).toUpperCase(),
      category: data.category || matched?.category || "기타",
      cancelUrl: data.cancelUrl || matched?.cancelUrl || "",
      subscriptionId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      dueDay,
      amount: Number(data.amount),
      status: data.isTrial ? "trial" : "active",
      alertD3: true,
      alertD1: true,
      renewalPending: false,
    };

    setSubscriptions((current) => [record, ...current]);
    notify(`${record.name}을 내 구독에 추가했어요.`);

    if (onboardingQueue.length) {
      const nextIndex = onboardingIndex + 1;
      if (nextIndex < onboardingQueue.length) {
        setOnboardingIndex(nextIndex);
        return "next";
      }

      setOnboardingQueue([]);
      setOnboardingIndex(0);
      setSelectedOnboarding([]);
      onboardingCompleteRef.current = true;
      setOnboardingComplete(true);
      navigate("home", null, "page-turn");
      return true;
    }

    setOnboardingComplete(true);
    return true;
  };

  const updateSubscription = (subscriptionId, update) => {
    setSubscriptions((current) => current.map((subscription) =>
      subscription.subscriptionId === subscriptionId ? { ...subscription, ...update } : subscription
    ));
    notify("구독 정보를 저장했어요.");
  };

  const startCancellation = (subscriptionId, promotion = null) => {
    const target = subscriptions.find((subscription) =>
      subscription.subscriptionId === subscriptionId || subscription.id === subscriptionId
    );
    if (!target) return;
    setCancelTarget({ id: target.subscriptionId, subscription: target, promotion });
  };

  const closeCancellation = () => setCancelTarget(null);

  const finishCancellation = (subscriptionId, saved) => {
    const target = subscriptions.find((subscription) => subscription.subscriptionId === subscriptionId);
    if (!target) return;
    setSubscriptions((current) => current.filter((subscription) => subscription.subscriptionId !== subscriptionId));
    setSavedAmount((amount) => amount + Number(saved || target.amount || 0));
    setRenewalTarget(null);
    if (screenRef.current.route === "detail") navigate("subscriptions");
    // cancelTarget은 완료 모션이 끝날 때까지 유지합니다. 실제 삭제는 위에서 이미 끝납니다.
  };

  const muteSubscription = (subscriptionId) => {
    setSubscriptions((current) => current.map((subscription) =>
      subscription.subscriptionId === subscriptionId ? { ...subscription, alertD3: false, alertD1: false } : subscription
    ));
    notify("사전 알림을 모두 껐어요.");
  };

  const openSubscription = (subscriptionId) => {
    const transition = screenRef.current.route === "home" ? "page-turn" : "";
    navigate("detail", subscriptionId, transition);
  };

  const handleRenewal = (keep) => {
    if (!renewalSubscription) return;
    if (keep) {
      setSubscriptions((current) => current.map((subscription) =>
        subscription.subscriptionId === renewalSubscription.subscriptionId
          ? { ...subscription, renewalPending: false, renewalReviewedFor: getMonthKey() }
          : subscription
      ));
      notify(`${renewalSubscription.name}을 다음 결제 주기로 유지했어요.`);
    } else {
      setSubscriptions((current) => current.filter((subscription) => subscription.subscriptionId !== renewalSubscription.subscriptionId));
      setSavedAmount((amount) => amount + Number(renewalSubscription.amount || 0));
      notify(`${renewalSubscription.name}을 목록에서 해지 처리했어요.`);
    }
    setRenewalTarget(null);
  };

  const handlePromotion = (promotion) => {
    const source = subscriptions.find((subscription) => promotion.sourceServiceIds?.includes(subscription.id));
    if (source) {
      startCancellation(source.subscriptionId, promotion);
      return;
    }
    if (promotion.link) window.open(promotion.link, "_blank", "noopener,noreferrer");
  };

  const handleOpenDetailFromNotification = (subscriptionId) => {
    setNotifications((current) => current.map((item) =>
      item.subscriptionId === subscriptionId ? { ...item, read: true } : item
    ));
    setActiveBanner(null);
    setNotificationCenterOpen(false);
    setHighlightCancelId(subscriptionId);
    navigate("detail", subscriptionId);
  };

  const handleRequestPermission = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    setProfile((current) => current ? { ...current, notificationsAllowed: permission === "granted" } : current);
    notify(permission === "granted" ? "결제 전 알림을 켰어요." : "알림 권한이 허용되지 않았어요.");
  };

  const handleTogglePermissionFromHome = async () => {
    if (profile?.notificationsAllowed === false) {
      await handleRequestPermission();
      return;
    }
    setProfile((current) => current ? { ...current, notificationsAllowed: false } : current);
    notify("결제 전 알림을 껐어요.");
  };

  const hasAppChrome = Boolean(profile) && !PUBLIC_ROUTES.has(screen.route) && screen.route !== "onboarding";
  const pageTitles = { home: "RE.", subscriptions: "구독 목록", calendar: "결제 캘린더", promotions: "혜택", detail: "구독 상세" };

  let content;
  if (screen.route === "splash") {
    content = <SplashScreen onDone={routeAfterSplash} />;
  } else if (screen.route === "landing") {
    content = <LandingScreen onContinue={() => navigate("intro", null, "page-turn")} />;
  } else if (screen.route === "intro") {
    content = <IntroScreen onContinue={handleIntroComplete} />;
  } else if (screen.route === "register") {
    content = <AuthRegister onBack={() => navigate("login")} onComplete={({ nickname }) => completeLogin("RE.", nickname)} />;
  } else if (screen.route === "onboarding") {
    content = (
      <OnboardingScreen
        catalog={serviceCatalog}
        selectedIds={selectedOnboarding}
        onToggle={(id) => setSelectedOnboarding((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
        onFinish={handleOnboardingFinish}
        onSkip={handleOnboardingSkip}
      />
    );
  } else if (screen.route === "home") {
    content = (
      <HomeScreen
        subscriptions={subscriptions}
        promotions={promotionCatalog}
        profile={profile}
        notificationDenied={profile?.notificationsAllowed === false}
        onOpenSubscription={openSubscription}
        onShowAll={() => navigate("subscriptions")}
        onOpenPromotion={handlePromotion}
        onExplorePromotions={() => navigate("promotions")}
        onAdd={() => setAddOpen(true)}
        onToggleNotificationPermission={handleTogglePermissionFromHome}
      />
    );
  } else if (screen.route === "subscriptions") {
    content = <SubscriptionListScreen subscriptions={subscriptions} onOpen={openSubscription} onAdd={() => setAddOpen(true)} onStartCancel={startCancellation} onMute={muteSubscription} onRefresh={() => notify("저장된 구독 목록을 다시 확인했어요.")} />;
  } else if (screen.route === "calendar") {
    content = <CalendarScreen subscriptions={subscriptions} onOpen={openSubscription} />;
  } else if (screen.route === "promotions") {
    content = <PromotionScreen subscriptions={subscriptions} promotions={promotionCatalog} onOpenPromotion={handlePromotion} />;
  } else if (screen.route === "detail") {
    content = (
      <SubscriptionDetailScreen
        subscription={selectedSubscription}
        onUpdate={updateSubscription}
        onStartCancel={startCancellation}
        onBack={() => {
          setHighlightCancelId(null);
          navigate("subscriptions");
        }}
        promotion={promotionCatalog.find((promotion) => promotion.sourceServiceIds?.includes(selectedSubscription?.id))}
        highlightCancel={highlightCancelId === selectedSubscription?.subscriptionId}
      />
    );
  } else {
    content = (
      <AuthLogin
        onGuest={() => completeLogin("Guest", "", true)}
        onSocial={(provider, nickname) => completeLogin(provider, nickname)}
        onRegister={() => navigate("register")}
        onBack={() => navigate(introSeen ? "login" : "intro")}
      />
    );
  }

  return (
    <div className="app-shell" data-screen={screen.route}>
      {hasAppChrome && (
        <AppHeader
          title={pageTitles[screen.route] || "RE."}
          onBack={screen.route === "detail" ? () => {
            setHighlightCancelId(null);
            navigate("subscriptions");
          } : undefined}
          rightSlot={
            <button type="button" onClick={() => setNotificationCenterOpen(true)} className="re-icon-control relative" aria-label="알림 센터 열기">
              <Bell size={20} />
              {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />}
            </button>
          }
        />
      )}

      <div className={pageTurn ? "re-page-transition re-page-turn-soft" : "re-page-transition"}>{content}</div>

      {hasAppChrome && (
        <BottomNavigation
          route={screen.route}
          onNavigate={(targetRoute) => {
            setHighlightCancelId(null);
            navigate(targetRoute);
          }}
          onOpenAdd={() => setAddOpen(true)}
        />
      )}

      {addOpen && (
        <AddModal
          key={currentOnboardingService ? `onboarding-${currentOnboardingService.id}-${onboardingIndex}` : "regular-add"}
          catalog={serviceCatalog}
          initialService={currentOnboardingService}
          onClose={handleCloseAdd}
          onAdd={handleAddSubscription}
        />
      )}
      {cancelSubscription && <CancelModal subscription={cancelSubscription} promotion={cancelTarget?.promotion} onClose={closeCancellation} onComplete={finishCancellation} onToast={notify} />}
      {renewalSubscription && <RenewalSheet subscription={renewalSubscription} onKeep={() => handleRenewal(true)} onCancel={() => handleRenewal(false)} onClose={() => setRenewalTarget(null)} />}
      <PushNotificationBanner notification={activeBanner} onClose={() => setActiveBanner(null)} onOpenDetail={handleOpenDetailFromNotification} />
      {notificationCenterOpen && (
        <NotificationCenterModal
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setNotificationCenterOpen(false)}
          onOpenDetail={handleOpenDetailFromNotification}
          onMarkAllRead={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))}
          onClearAll={() => setNotifications([])}
          notificationPermission={notificationPermission}
          onRequestPermission={handleRequestPermission}
        />
      )}
      <Toast toast={toast} onClose={() => setToast("")} />
    </div>
  );
}

function RenewalSheet({ subscription, onKeep, onCancel, onClose }) {
  return (
    <BottomSheet onClose={onClose} label="결제일 경과 구독 확인">
      <div className="flex items-start gap-3"><ServiceMark monogram={subscription.monogram} className="h-11 w-11 rounded-xl text-[13px]" /><div><p className="re-eyebrow">RENEWAL CHECK</p><h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-[#1B2A8C]">이번 달에도 계속 이용하셨나요?</h2></div></div>
      <p className="mt-4 text-[14px] leading-6 text-[#71717A]"><strong className="font-semibold text-black">{subscription.name}</strong>은 지난 결제일이 지났어요. 계속 이용했다면 다음 달에도 알림을 보내드릴게요.</p>
      <div className="mt-6 grid grid-cols-2 gap-3"><Button variant="secondary" onClick={onCancel}>해지했음</Button><Button onClick={onKeep}>계속 유지</Button></div>
      <button type="button" onClick={onClose} className="mx-auto mt-4 block text-[12px] text-[#71717A] underline underline-offset-4">나중에 확인하기</button>
    </BottomSheet>
  );
}
