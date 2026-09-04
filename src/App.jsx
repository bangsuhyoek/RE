import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight, X } from "lucide-react";
import { AuthLogin, AuthRegister } from "./components/AuthScreens";
import { AddModal } from "./components/AddModal";
import { CancelModal } from "./components/CancelModal";
import { HomeScreen } from "./components/HomeScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { PromotionScreen } from "./components/PromotionScreen";
import { CalendarScreen, SubscriptionDetailScreen, SubscriptionListScreen } from "./components/SubscriptionScreens";
import { PushNotificationBanner, NotificationCenterModal } from "./components/NotificationComponents";
import { AppHeader, BottomNavigation, BottomSheet, Button, ServiceMark, Toast } from "./components/ui";
import { createMockSubscriptions, promotionCatalog, serviceCatalog } from "./data/subscriptionData";
import { formatWon, getMonthKey, isPastDueThisCycle } from "./lib/dates";
import { readStoredValue, removeDemoSubscriptions, storageKeys, writeStoredValue } from "./lib/storage";
import {
  generateSubscriptionAlerts,
  createTestNotification,
  getStoredNotifications,
  saveStoredNotifications,
  requestNotificationPermission,
  sendBrowserNotification,
} from "./lib/notifications";

const readHash = () => {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [routeAndId, queryPart] = raw.split("?");
  const parts = (routeAndId || "").split("/");
  const route = parts[0] || "home";
  const id = parts.slice(1).join("/") || null;
  const params = new URLSearchParams(queryPart || "");
  return { route: route || "home", id: id ? decodeURIComponent(id) : null, params };
};

const createSubscription = (service, index = 0) => ({
  ...service,
  subscriptionId: `onboard-${service.id}-${Date.now()}-${index}`,
  createdAt: new Date().toISOString(),
  billingCycle: "매월",
  status: service.isTrial ? "trial" : "active",
  alertD3: service.id === "netflix" || service.id === "chatgpt",
  alertD1: service.id === "youtube" || service.id === "spotify",
  renewalPending: false,
});

export default function App() {
  const storedProfile = readStoredValue(storageKeys.profile, null);
  const initialHash = readHash();
  const isGuestOrDirect = !storedProfile && (initialHash.route === "home" || initialHash.route === "detail" || initialHash.route === "subscriptions" || initialHash.params?.get("guest") === "1");
  const effectiveProfile = storedProfile || (isGuestOrDirect ? { nickname: "민수", provider: "Guest", guest: true, notificationsAllowed: true } : null);
  const [profile, setProfile] = useState(effectiveProfile);
  const [subscriptions, setSubscriptions] = useState(() => {
    const saved = readStoredValue(storageKeys.subscriptions, null);
    if (Array.isArray(saved) && saved.length > 0) return effectiveProfile?.guest ? saved : removeDemoSubscriptions(saved);
    return effectiveProfile?.guest || isGuestOrDirect ? createMockSubscriptions() : [];
  });
  const [onboardingComplete, setOnboardingComplete] = useState(() => readStoredValue(storageKeys.onboardingComplete, true));
  const [savedAmount, setSavedAmount] = useState(() => readStoredValue(storageKeys.savedAmount, 0));
  const [screen, setScreen] = useState(() => {
    if (initialHash.route) return initialHash;
    return storedProfile ? { route: "home", id: null } : { route: "login", id: null };
  });
  const [selectedOnboarding, setSelectedOnboarding] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [renewalTarget, setRenewalTarget] = useState(null);
  const [completedCancelId, setCompletedCancelId] = useState(null);
  const [toast, setToast] = useState("");

  // Notification states
  const [notifications, setNotifications] = useState(() => {
    const stored = getStoredNotifications();
    if (stored.length > 0) return stored;
    return generateSubscriptionAlerts(createMockSubscriptions());
  });
  const [activeBanner, setActiveBanner] = useState(() => {
    if (initialHash.params?.get("banner") === "1") {
      const mockSubs = createMockSubscriptions();
      const alerts = generateSubscriptionAlerts(mockSubs);
      return alerts[0] || null;
    }
    return null;
  });
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(() => {
    return initialHash.params?.get("notifications") === "1";
  });
  const [highlightCancelId, setHighlightCancelId] = useState(() => {
    if (initialHash.params?.get("highlight") === "cancel") {
      return initialHash.id || "seed-spotify";
    }
    return null;
  });
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });

  useEffect(() => {
    const onHashChange = () => {
      const next = readHash();
      if (next.route) setScreen(next);
      if (next.params?.get("banner") === "1") {
        const generated = generateSubscriptionAlerts(subscriptions.length ? subscriptions : createMockSubscriptions());
        setActiveBanner(generated[0] || null);
      }
      if (next.params?.get("notifications") === "1") {
        setNotificationCenterOpen(true);
      }
      if (next.params?.get("highlight") === "cancel") {
        setHighlightCancelId(next.id || "seed-spotify");
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  useEffect(() => {
    writeStoredValue(storageKeys.profile, profile);
  }, [profile]);

  useEffect(() => {
    writeStoredValue(storageKeys.subscriptions, subscriptions);
  }, [subscriptions]);

  useEffect(() => {
    writeStoredValue(storageKeys.onboardingComplete, onboardingComplete);
  }, [onboardingComplete]);

  useEffect(() => {
    writeStoredValue(storageKeys.savedAmount, savedAmount);
  }, [savedAmount]);

  useEffect(() => {
    saveStoredNotifications(notifications);
  }, [notifications]);

  // Scan subscriptions and populate initial alerts (e.g. Spotify Trial D-1, etc.)
  useEffect(() => {
    if (!subscriptions || subscriptions.length === 0) return;
    const generated = generateSubscriptionAlerts(subscriptions);
    if (generated.length > 0) {
      setNotifications((current) => {
        const existingIds = new Set(current.map((n) => n.id));
        const newItems = generated.filter((n) => !existingIds.has(n.id));
        if (newItems.length === 0) return current;
        return [...newItems, ...current];
      });
    }
  }, [subscriptions]);

  useEffect(() => {
    if (screen.route !== "home") return;
    const currentMonth = getMonthKey();
    const pastDue = subscriptions.find((subscription) => isPastDueThisCycle(subscription) && subscription.renewalReviewedFor !== currentMonth);
    if (pastDue) setRenewalTarget(pastDue.subscriptionId);
  }, [screen.route, subscriptions]);

  const selectedSubscription = useMemo(() => {
    if (!screen.id) return null;
    return subscriptions.find((subscription) =>
      subscription.subscriptionId === screen.id ||
      subscription.id === screen.id ||
      String(subscription.subscriptionId) === String(screen.id) ||
      subscription.name.toLowerCase() === screen.id.toLowerCase()
    ) || null;
  }, [screen.id, subscriptions]);

  const renewalSubscription = useMemo(() => subscriptions.find((subscription) => subscription.subscriptionId === renewalTarget) || null, [renewalTarget, subscriptions]);
  const cancelSubscription = useMemo(() => subscriptions.find((subscription) => subscription.subscriptionId === cancelTarget?.id) || cancelTarget?.subscription || null, [cancelTarget, subscriptions]);

  const navigate = (route, id = null) => {
    const hash = id ? `#/${route}/${encodeURIComponent(id)}` : `#/${route}`;
    if (window.location.hash === hash) setScreen({ route, id });
    else window.location.hash = hash;
  };

  const notify = (message) => setToast(message);

  const handleTriggerTestNotification = (targetSub = null) => {
    const sub = targetSub || subscriptions.find((s) => s.id === "spotify") || subscriptions.find((s) => s.id === "netflix") || subscriptions[0];
    if (!sub) {
      notify("등록된 구독이 없어 알림을 생성할 수 없습니다.");
      return;
    }
    const alertItem = createTestNotification(sub, "auto");
    setNotifications((current) => [alertItem, ...current]);
    setActiveBanner(alertItem);
    sendBrowserNotification(alertItem.title, { body: alertItem.message });
    notify(`${alertItem.badge} 알림을 화면에 띄웠어요.`);
  };

  const handleOpenDetailFromNotification = (subId) => {
    setNotifications((current) =>
      current.map((n) => (n.subscriptionId === subId ? { ...n, read: true } : n))
    );
    setActiveBanner(null);
    setNotificationCenterOpen(false);
    setHighlightCancelId(subId);
    navigate("detail", subId);
  };

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === "granted") {
      setProfile((p) => ({ ...(p || {}), notificationsAllowed: true }));
      notify("브라우저 알림 권한이 허용되었습니다.");
    } else {
      setProfile((p) => ({ ...(p || {}), notificationsAllowed: false }));
      notify("알림 권한이 거부되었습니다.");
    }
  };

  const handleTogglePermissionFromHome = async () => {
    if (profile?.notificationsAllowed === false) {
      const perm = await requestNotificationPermission();
      setNotificationPermission(perm);
      setProfile((p) => ({ ...(p || {}), notificationsAllowed: true }));
      notify("결제 사전 알림이 켜졌어요.");
    } else {
      setProfile((p) => ({ ...(p || {}), notificationsAllowed: false }));
      notify("결제 사전 알림을 껐어요.");
    }
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const completeLogin = (provider, nickname, guest = false) => {
    setProfile({ nickname: nickname || "민수", provider, guest, notificationsAllowed: true });
    if (guest) {
      const mockSubs = createMockSubscriptions();
      setSubscriptions(mockSubs);
      setOnboardingComplete(true);
      const generated = generateSubscriptionAlerts(mockSubs);
      setNotifications(generated);
      navigate("home");
      notify("데모 구독 내역 5종을 불러왔어요.");
      return;
    }
    setSubscriptions((current) => removeDemoSubscriptions(current));
    setOnboardingComplete(false);
    navigate("onboarding");
  };

  const handleOnboardingFinish = () => {
    const picked = serviceCatalog.filter((service) => selectedOnboarding.includes(service.id));
    const created = picked.map(createSubscription);
    setSubscriptions(created);
    setOnboardingComplete(true);
    const generated = generateSubscriptionAlerts(created);
    setNotifications(generated);
    navigate("home");
    notify(`${picked.length}개 구독을 추가했어요.`);
  };

  const handleOnboardingSkip = () => {
    setSubscriptions([]);
    setOnboardingComplete(true);
    navigate("home");
  };

  const handleAddSubscription = (data) => {
    const duplicate = subscriptions.some((subscription) => subscription.name.trim().toLowerCase() === data.name.trim().toLowerCase() && subscription.plan.trim().toLowerCase() === data.plan.trim().toLowerCase());
    if (duplicate) {
      notify("이미 등록된 구독입니다. 기존 카드에서 정보를 수정해 주세요.");
      return false;
    }
    const matched = serviceCatalog.find((service) => service.name.toLowerCase() === data.name.trim().toLowerCase() || service.id === data.id);
    const subId = `manual-${Date.now()}`;
    const record = {
      ...data,
      id: matched?.id || `custom-${Date.now()}`,
      monogram: data.monogram || matched?.monogram || data.name.trim().slice(0, 1).toUpperCase(),
      category: data.category || matched?.category || "기타",
      cancelUrl: data.cancelUrl || matched?.cancelUrl || "https://google.com",
      subscriptionId: subId,
      createdAt: new Date().toISOString(),
      status: data.isTrial ? "trial" : "active",
      alertD3: true,
      alertD1: false,
      renewalPending: false,
    };
    setSubscriptions((current) => [record, ...current]);
    setOnboardingComplete(true);
    notify(`${record.name}을 내 구독에 추가했어요.`);
    return true;
  };

  const updateSubscription = (subscriptionId, update) => {
    setSubscriptions((current) => current.map((subscription) => subscription.subscriptionId === subscriptionId ? { ...subscription, ...update } : subscription));
    notify("구독 정보를 저장했어요.");
  };

  const startCancellation = (subscriptionId, promotion = null) => {
    const target = subscriptions.find((subscription) => subscription.subscriptionId === subscriptionId || subscription.id === subscriptionId);
    if (!target) return;
    setCancelTarget({ id: target.subscriptionId, subscription: target, promotion });
  };

  const closeCancellation = () => setCancelTarget(null);

  const finishCancellation = (subscriptionId, saved) => {
    const target = subscriptions.find((subscription) => subscription.subscriptionId === subscriptionId);
    if (!target) return;
    setSubscriptions((current) => current.filter((subscription) => subscription.subscriptionId !== subscriptionId));
    setSavedAmount((amount) => amount + (saved || target.amount));
    setCompletedCancelId(subscriptionId);
    setCancelTarget(null);
    if (screen.route === "detail") navigate("subscriptions");
  };

  const muteSubscription = (subscriptionId) => {
    setSubscriptions((current) => current.map((subscription) => subscription.subscriptionId === subscriptionId ? { ...subscription, alertD3: false, alertD1: false } : subscription));
    notify("사전 알림을 모두 껐어요.");
  };

  const openSubscription = (subscriptionId) => navigate("detail", subscriptionId);

  const handleRenewal = (keep) => {
    if (!renewalSubscription) return;
    if (keep) {
      setSubscriptions((current) => current.map((subscription) => subscription.subscriptionId === renewalSubscription.subscriptionId ? { ...subscription, renewalPending: false, renewalReviewedFor: getMonthKey() } : subscription));
      notify(`${renewalSubscription.name}을 다음 결제 주기로 유지했어요.`);
    } else {
      setSubscriptions((current) => current.filter((subscription) => subscription.subscriptionId !== renewalSubscription.subscriptionId));
      setSavedAmount((amount) => amount + renewalSubscription.amount);
      notify(`${renewalSubscription.name}을 목록에서 해지 처리했어요.`);
    }
    setRenewalTarget(null);
  };

  const handlePromotion = (promotion) => {
    const source = subscriptions.find((subscription) => promotion.sourceServiceIds.includes(subscription.id));
    if (source) {
      startCancellation(source.subscriptionId, promotion);
      return;
    }
    window.open(promotion.link, "_blank", "noopener,noreferrer");
    notify("제휴 혜택 페이지를 새 탭에서 열었어요.");
  };

  const hasAppChrome = !["login", "register", "onboarding"].includes(screen.route);
  const pageTitles = { home: "SubMate", subscriptions: "구독 목록", calendar: "결제 캘린더", promotions: "혜택", detail: "구독 상세" };

  let content;
  if (screen.route === "register") {
    content = <AuthRegister onBack={() => navigate("login")} onComplete={({ nickname }) => completeLogin("SubMate", nickname)} />;
  } else if (screen.route === "onboarding") {
    content = <OnboardingScreen catalog={serviceCatalog} selectedIds={selectedOnboarding} onToggle={(id) => setSelectedOnboarding((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onFinish={handleOnboardingFinish} onSkip={handleOnboardingSkip} />;
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
        onStartOnboarding={() => navigate("onboarding")}
        onToggleNotificationPermission={handleTogglePermissionFromHome}
        onOpenNotificationCenter={() => setNotificationCenterOpen(true)}
        onTriggerTestNotification={() => handleTriggerTestNotification()}
      />
    );
  } else if (screen.route === "subscriptions") {
    content = <SubscriptionListScreen subscriptions={subscriptions} onOpen={openSubscription} onAdd={() => setAddOpen(true)} onStartCancel={startCancellation} onMute={muteSubscription} onRefresh={() => notify("최신 구독 목록을 확인했어요.")} />;
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
        promotion={promotionCatalog.find((p) => p.sourceServiceIds?.includes(selectedSubscription?.id))}
        onTriggerNotification={handleTriggerTestNotification}
        highlightCancel={highlightCancelId === selectedSubscription?.subscriptionId}
      />
    );
  } else {
    content = <AuthLogin onGuest={() => completeLogin("Guest", "민수", true)} onSocial={(provider, nickname) => completeLogin(provider, nickname)} onRegister={() => navigate("register")} />;
  }

  return (
    <div className="app-shell" data-screen={screen.route} data-hash={typeof window !== "undefined" ? window.location.hash : ""}>
      {hasAppChrome && (
        <AppHeader
          title={pageTitles[screen.route] || "SubMate"}
          onBack={screen.route === "detail" ? () => {
            setHighlightCancelId(null);
            navigate("subscriptions");
          } : undefined}
          rightSlot={
            <button
              type="button"
              onClick={() => setNotificationCenterOpen(true)}
              className="relative grid h-9 w-9 place-items-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-black transition-colors"
              aria-label="알림 센터 열기"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </button>
          }
        />
      )}
      {content}
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
      {cancelSubscription && <CancelModal subscription={cancelSubscription} promotion={cancelTarget?.promotion} onClose={closeCancellation} onComplete={finishCancellation} onToast={notify} />}
      {renewalSubscription && <RenewalSheet subscription={renewalSubscription} onKeep={() => handleRenewal(true)} onCancel={() => handleRenewal(false)} onClose={() => setRenewalTarget(null)} />}
      <PushNotificationBanner
        notification={activeBanner}
        onClose={() => setActiveBanner(null)}
        onOpenDetail={handleOpenDetailFromNotification}
      />
      {notificationCenterOpen && (
        <NotificationCenterModal
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setNotificationCenterOpen(false)}
          onOpenDetail={handleOpenDetailFromNotification}
          onMarkAllRead={() => setNotifications((curr) => curr.map((n) => ({ ...n, read: true })))}
          onClearAll={() => setNotifications([])}
          onTriggerTest={() => handleTriggerTestNotification()}
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
      <div className="flex items-start gap-3"><ServiceMark monogram={subscription.monogram} className="h-11 w-11 rounded-xl text-[13px]" /><div><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">Renewal check</p><h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">이번 달에도 계속 이용하셨나요?</h2></div></div>
      <p className="mt-4 text-[14px] leading-6 text-[#71717A]"><strong className="font-semibold text-black">{subscription.name}</strong>은 지난 결제일이 지났어요. 계속 이용했다면 다음 달에도 알림을 보내드릴게요.</p>
      <div className="mt-6 grid grid-cols-2 gap-3"><Button variant="secondary" onClick={onCancel}>해지했음</Button><Button onClick={onKeep}>계속 유지</Button></div>
      <button type="button" onClick={onClose} className="mx-auto mt-4 block text-[12px] text-[#71717A] underline underline-offset-4">나중에 확인하기</button>
    </BottomSheet>
  );
}
