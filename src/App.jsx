import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { AuthLogin, AuthRegister } from "./components/AuthScreens";
import { IntroScreen, LandingScreen, SplashScreen } from "./components/EntryScreens";
import { AddModal } from "./components/AddModal";
import { CancelModal } from "./components/CancelModal";
import { HomeScreen } from "./components/HomeScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { PromotionScreen } from "./components/PromotionScreen";
import { CalendarScreen, SubscriptionDetailScreen, SubscriptionListScreen } from "./components/SubscriptionScreens";
import { PushNotificationBanner, NotificationCenterModal } from "./components/NotificationComponents";
import { AppHeader, BottomNavigation, BottomSheet, Button, ServiceMark, Toast } from "./components/ui";
import { promotionCatalog, serviceCatalog } from "./data/subscriptionData";
import { daysUntilCharge, formatWon, getMonthKey, isPastDueThisCycle } from "./lib/dates";
import { readStoredValue, removeDemoSubscriptions, storageKeys, writeStoredValue } from "./lib/storage";
import { hashForRoute, knownRoutes, parseHash, publicRoutes, routeForSession } from "./lib/navigation";
import {
  generateSubscriptionAlerts,
  getStoredNotifications,
  saveStoredNotifications,
  requestNotificationPermission,
} from "./lib/notifications";

const notificationPermissionNow = () => {
  if (typeof window !== "undefined" && "Notification" in window) return Notification.permission;
  return "unsupported";
};

export default function App() {
  const storedProfile = readStoredValue(storageKeys.profile, null);
  const initialHash = parseHash(window.location.hash);
  const explicitGuest = initialHash.params?.get("guest") === "1";
  const effectiveProfile = storedProfile || (explicitGuest ? { nickname: "", provider: "Guest", guest: true, notificationsAllowed: true } : null);

  const [profile, setProfile] = useState(effectiveProfile);
  const profileRef = useRef(effectiveProfile);
  const [subscriptions, setSubscriptions] = useState(() => {
    const saved = readStoredValue(storageKeys.subscriptions, []);
    return Array.isArray(saved) ? removeDemoSubscriptions(saved) : [];
  });
  const initialOnboardingComplete = readStoredValue(storageKeys.onboardingComplete, false);
  const [onboardingComplete, setOnboardingComplete] = useState(initialOnboardingComplete);
  const [screen, setScreen] = useState(() => {
    const route = routeForSession({
      requestedRoute: initialHash.route,
      hasProfile: Boolean(effectiveProfile),
      onboardingComplete: initialOnboardingComplete,
    });
    return { ...initialHash, route, id: initialHash.route === route ? initialHash.id : null };
  });
  const [addOpen, setAddOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [renewalTarget, setRenewalTarget] = useState(null);
  const [toast, setToast] = useState("");
  const [notifications, setNotifications] = useState(() => getStoredNotifications());
  const [activeBanner, setActiveBanner] = useState(null);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(() => initialHash.params?.get("notifications") === "1");
  const [highlightCancelId, setHighlightCancelId] = useState(() => initialHash.params?.get("highlight") === "cancel" ? initialHash.id : null);
  const [notificationPermission, setNotificationPermission] = useState(notificationPermissionNow);

  useEffect(() => {
    const onHashChange = () => {
      const next = parseHash(window.location.hash);
      if (!next.route) return;
      if (!knownRoutes.has(next.route)) {
        const fallback = routeForSession({
          requestedRoute: null,
          hasProfile: Boolean(profileRef.current),
          onboardingComplete,
        });
        setScreen({ route: fallback, id: null, params: new URLSearchParams() });
        return;
      }
      if (!profileRef.current && !publicRoutes.has(next.route)) {
        setScreen({ route: "login", id: null, params: new URLSearchParams() });
        return;
      }
      setScreen(next);
      if (next.params?.get("notifications") === "1") setNotificationCenterOpen(true);
      if (next.params?.get("highlight") === "cancel") setHighlightCancelId(next.id || null);
      if (next.params?.get("banner") === "1") {
        const generated = generateSubscriptionAlerts(subscriptions);
        setActiveBanner(generated[0] || null);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [onboardingComplete, subscriptions]);

  useEffect(() => window.scrollTo(0, 0), [screen.route, screen.id]);
  useEffect(() => writeStoredValue(storageKeys.profile, profile), [profile]);
  useEffect(() => writeStoredValue(storageKeys.subscriptions, subscriptions), [subscriptions]);
  useEffect(() => writeStoredValue(storageKeys.onboardingComplete, onboardingComplete), [onboardingComplete]);
  useEffect(() => saveStoredNotifications(notifications), [notifications]);

  useEffect(() => {
    if (!subscriptions.length) return;
    const generated = generateSubscriptionAlerts(subscriptions);
    if (!generated.length) return;
    setNotifications((current) => {
      const existingIds = new Set(current.map((n) => n.id));
      const next = generated.filter((n) => !existingIds.has(n.id));
      return next.length ? [...next, ...current] : current;
    });
  }, [subscriptions]);

  useEffect(() => {
    if (screen.route !== "home") return;
    const currentMonth = getMonthKey();
    const pastDue = subscriptions.find((subscription) =>
      subscription.status !== "cancel_pending" &&
      subscription.status !== "cancel_in_progress" &&
      isPastDueThisCycle(subscription) &&
      subscription.renewalReviewedFor !== currentMonth
    );
    if (pastDue) setRenewalTarget(pastDue.subscriptionId);
  }, [screen.route, subscriptions]);

  const navigate = (route, id = null) => {
    const next = { route, id, params: new URLSearchParams() };
    setScreen(next);
    const hash = hashForRoute(route, id);
    if (window.location.hash !== hash) window.location.hash = hash;
  };

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

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const completeLogin = (provider, nickname, guest = false) => {
    const nextProfile = { nickname: nickname || "", provider, guest, notificationsAllowed: true };
    profileRef.current = nextProfile;
    setProfile(nextProfile);
    setSubscriptions((current) => removeDemoSubscriptions(current));
    setNotifications([]);
    if (guest) {
      setOnboardingComplete(true);
      navigate("home");
      return;
    }
    setOnboardingComplete(false);
    navigate("onboarding");
  };

  const handleOnboardingFindComplete = () => {
    setOnboardingComplete(true);
    navigate("home");
  };

  const handleOnboardingManual = () => {
    setOnboardingComplete(true);
    navigate("home");
    setAddOpen(true);
  };

  const handleAddSubscription = (data) => {
    const normalizedName = data.name.trim().toLowerCase();
    const normalizedPlan = String(data.plan || "").trim().toLowerCase();
    const duplicate = subscriptions.some((subscription) =>
      subscription.name?.trim().toLowerCase() === normalizedName &&
      String(subscription.plan || "").trim().toLowerCase() === normalizedPlan
    );
    if (duplicate) {
      notify("이미 등록된 구독이에요. 기존 구독에서 정보를 확인해주세요.");
      return false;
    }

    const matched = serviceCatalog.find((service) =>
      service.name.toLowerCase() === normalizedName || service.id === data.id
    );
    const nextDate = data.nextBillingDate ? new Date(`${data.nextBillingDate}T12:00:00`) : null;
    const dueDay = nextDate && !Number.isNaN(nextDate.getTime()) ? nextDate.getDate() : null;
    if (!dueDay) {
      notify("다음 결제일을 확인해주세요.");
      return false;
    }

    const record = {
      ...data,
      id: matched?.id || `custom-${Date.now()}`,
      monogram: data.monogram || matched?.monogram || data.name.trim().slice(0, 1).toUpperCase(),
      category: data.category || matched?.category || "기타",
      cancelUrl: data.cancelUrl || matched?.cancelUrl || "",
      subscriptionId: `manual-${Date.now()}`,
      createdAt: new Date().toISOString(),
      dueDay,
      status: data.isTrial ? "trial" : "active",
      alertD3: true,
      alertD1: true,
      renewalPending: false,
    };
    setSubscriptions((current) => [record, ...current]);
    setOnboardingComplete(true);
    notify(`${record.name}도 이제 RE.가 같이 챙길게요.`);
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

  const markCancellationIncomplete = (subscriptionId) => {
    setSubscriptions((current) => current.map((subscription) =>
      subscription.subscriptionId === subscriptionId
        ? { ...subscription, status: "cancel_in_progress", cancellationStartedAt: subscription.cancellationStartedAt || new Date().toISOString() }
        : subscription
    ));
    setCancelTarget(null);
    notify("여기까지 기억해둘게요. 다음에 이어서 해지할 수 있어요.");
  };

  const finishCancellation = (subscriptionId, destination = "subscriptions") => {
    setSubscriptions((current) => current.map((subscription) =>
      subscription.subscriptionId === subscriptionId
        ? {
            ...subscription,
            status: "cancel_pending",
            cancellationConfirmedAt: new Date().toISOString(),
            renewalPending: false,
            alertD3: false,
            alertD1: false,
          }
        : subscription
    ));
    setCancelTarget(null);
    setRenewalTarget(null);
    navigate(destination === "home" ? "home" : "subscriptions");
  };

  const muteSubscription = (subscriptionId) => {
    setSubscriptions((current) => current.map((subscription) =>
      subscription.subscriptionId === subscriptionId ? { ...subscription, alertD3: false, alertD1: false } : subscription
    ));
    notify("사전 알림을 껐어요.");
  };

  const handleRenewal = (keep) => {
    if (!renewalSubscription) return;
    const target = renewalSubscription;
    setRenewalTarget(null);
    if (keep) {
      setSubscriptions((current) => current.map((subscription) =>
        subscription.subscriptionId === target.subscriptionId
          ? { ...subscription, renewalPending: false, renewalReviewedFor: getMonthKey() }
          : subscription
      ));
      notify(`${target.name}은 이번 주기에 계속 이용하는 것으로 기억할게요.`);
      return;
    }
    startCancellation(target.subscriptionId);
  };

  const handlePromotion = (promotion) => {
    const source = subscriptions.find((subscription) => promotion.sourceServiceIds?.includes(subscription.id));
    if (source) startCancellation(source.subscriptionId, promotion);
    else if (promotion.link) window.open(promotion.link, "_blank", "noopener,noreferrer");
  };

  const handleOpenDetailFromNotification = (subId) => {
    setNotifications((current) => current.map((n) => n.subscriptionId === subId ? { ...n, read: true } : n));
    setActiveBanner(null);
    setNotificationCenterOpen(false);
    setHighlightCancelId(subId);
    navigate("detail", subId);
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

  const hasAppChrome = Boolean(profile) && !publicRoutes.has(screen.route) && screen.route !== "onboarding";
  const pageTitles = {
    home: "RE.",
    subscriptions: "구독 목록",
    calendar: "결제 캘린더",
    promotions: "혜택",
    detail: "구독 상세",
  };

  let content;
  if (screen.route === "landing") {
    content = <LandingScreen onStart={() => navigate("splash")} onLogin={() => navigate("login")} />;
  } else if (screen.route === "splash") {
    content = <SplashScreen onDone={() => navigate("intro")} />;
  } else if (screen.route === "intro") {
    content = <IntroScreen onContinue={() => navigate("login")} onBack={() => navigate("landing")} />;
  } else if (screen.route === "login") {
    content = (
      <AuthLogin
        onGuest={() => completeLogin("Guest", "", true)}
        onSocial={(provider, nickname) => completeLogin(provider, nickname)}
        onRegister={() => navigate("register")}
        onBack={() => navigate("intro")}
      />
    );
  } else if (screen.route === "register") {
    content = <AuthRegister onBack={() => navigate("login")} onComplete={({ nickname }) => completeLogin("RE.", nickname)} />;
  } else if (screen.route === "onboarding") {
    content = <OnboardingScreen onFindComplete={handleOnboardingFindComplete} onManual={handleOnboardingManual} />;
  } else if (screen.route === "home") {
    content = (
      <HomeScreen
        subscriptions={subscriptions}
        promotions={promotionCatalog}
        profile={profile}
        notificationDenied={profile?.notificationsAllowed === false}
        onOpenSubscription={(subscriptionId) => navigate("detail", subscriptionId)}
        onReviewSubscription={(subscriptionId) => setRenewalTarget(subscriptionId)}
        onShowAll={() => navigate("subscriptions")}
        onOpenPromotion={handlePromotion}
        onExplorePromotions={() => navigate("promotions")}
        onAdd={() => setAddOpen(true)}
        onToggleNotificationPermission={handleTogglePermissionFromHome}
        onResumeCancel={startCancellation}
      />
    );
  } else if (screen.route === "subscriptions") {
    content = (
      <SubscriptionListScreen
        subscriptions={subscriptions}
        onOpen={(subscriptionId) => navigate("detail", subscriptionId)}
        onAdd={() => setAddOpen(true)}
        onStartCancel={startCancellation}
        onMute={muteSubscription}
        onRefresh={() => notify("저장된 구독 정보를 다시 확인했어요.")}
      />
    );
  } else if (screen.route === "calendar") {
    content = <CalendarScreen subscriptions={subscriptions} onOpen={(subscriptionId) => navigate("detail", subscriptionId)} />;
  } else if (screen.route === "promotions") {
    content = <PromotionScreen subscriptions={subscriptions} promotions={promotionCatalog} onOpenPromotion={handlePromotion} />;
  } else if (screen.route === "detail") {
    content = (
      <SubscriptionDetailScreen
        subscription={selectedSubscription}
        onUpdate={updateSubscription}
        onStartCancel={startCancellation}
        onBack={() => navigate("subscriptions")}
        promotion={promotionCatalog.find((p) => p.sourceServiceIds?.includes(selectedSubscription?.id))}
        highlightCancel={highlightCancelId === selectedSubscription?.subscriptionId}
      />
    );
  } else {
    content = (
      <main className="px-6 py-20 text-center">
        <h1 className="text-[23px] font-extrabold text-[#1B2A8C]">화면을 찾을 수 없어요.</h1>
        <p className="mt-3 text-[13px] leading-6 text-[#7E8AC0]">저장된 정보는 그대로 두고 안전한 화면으로 돌아갈게요.</p>
        <Button className="mt-6" onClick={() => navigate(profileRef.current ? (onboardingComplete ? "home" : "onboarding") : "landing")}>돌아가기</Button>
      </main>
    );
  }

  return (
    <div className="app-shell" data-screen={screen.route || "landing"}>
      {hasAppChrome && (
        <AppHeader
          title={pageTitles[screen.route] || "RE."}
          onBack={screen.route === "detail" ? () => navigate("subscriptions") : undefined}
          rightSlot={
            <button
              type="button"
              onClick={() => setNotificationCenterOpen(true)}
              className="re-icon-button relative"
              aria-label="알림 열기"
            >
              <Bell size={19} />
              {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#E43C78]" />}
            </button>
          }
        />
      )}

      <div key={`${screen.route || "login"}-${screen.id || ""}`} className="re-page-journey">
        {content}
      </div>

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

      {addOpen && <AddModal catalog={serviceCatalog} onClose={() => setAddOpen(false)} onAdd={handleAddSubscription} />}
      {cancelSubscription && (
        <CancelModal
          subscription={cancelSubscription}
          promotion={cancelTarget?.promotion}
          onClose={() => setCancelTarget(null)}
          onComplete={finishCancellation}
          onIncomplete={markCancellationIncomplete}
          onToast={notify}
        />
      )}
      {renewalSubscription && (
        <RenewalSheet
          subscription={renewalSubscription}
          onKeep={() => handleRenewal(true)}
          onCancel={() => handleRenewal(false)}
          onClose={() => setRenewalTarget(null)}
        />
      )}

      <PushNotificationBanner notification={activeBanner} onClose={() => setActiveBanner(null)} onOpenDetail={handleOpenDetailFromNotification} />

      {notificationCenterOpen && (
        <NotificationCenterModal
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setNotificationCenterOpen(false)}
          onOpenDetail={handleOpenDetailFromNotification}
          onMarkAllRead={() => setNotifications((current) => current.map((n) => ({ ...n, read: true })))}
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
  const days = daysUntilCharge(subscription);
  const timing = days <= 0 ? "오늘 결제일이에요." : `${days}일 뒤 ${formatWon(subscription.amount)}이 결제될 예정이에요.`;
  return (
    <BottomSheet onClose={onClose} label="이번 결제 주기 확인">
      <div className="flex items-start gap-3">
        <ServiceMark monogram={subscription.monogram || subscription.name?.slice(0, 1)} />
        <div>
          <p className="re-eyebrow">RE. CHECK</p>
          <h2 className="mt-1 text-[20px] font-extrabold leading-7 text-[#1B2A8C]">이번에도 계속 이용할까요?</h2>
        </div>
      </div>
      <p className="mt-4 text-[13px] leading-6 text-[#5B6DA9]">
        <strong className="font-bold text-[#3746A5]">{subscription.name}</strong>은 {timing} 지금 정하면 같은 결제 주기의 추가 확인은 줄일게요.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onCancel}>그만 이용할래요</Button>
        <Button onClick={onKeep}>계속 이용할게요</Button>
      </div>
      <button type="button" onClick={onClose} className="mx-auto mt-4 block text-[12px] font-medium text-[#7E8AC0] underline underline-offset-4">나중에 확인하기</button>
    </BottomSheet>
  );
}
