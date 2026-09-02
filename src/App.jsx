import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight, X } from "lucide-react";
import { AuthLogin, AuthRegister } from "./components/AuthScreens";
import { AddModal } from "./components/AddModal";
import { CancelModal } from "./components/CancelModal";
import { HomeScreen } from "./components/HomeScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { PromotionScreen } from "./components/PromotionScreen";
import { CalendarScreen, SubscriptionDetailScreen, SubscriptionListScreen } from "./components/SubscriptionScreens";
import { AppHeader, BottomNavigation, BottomSheet, Button, ServiceMark, Toast } from "./components/ui";
import { createMockSubscriptions, promotionCatalog, serviceCatalog } from "./data/subscriptionData";
import { formatWon, getMonthKey, isPastDueThisCycle } from "./lib/dates";
import { readStoredValue, storageKeys, writeStoredValue } from "./lib/storage";

const readHash = () => {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [route = "", id = ""] = raw.split("/");
  return { route: route || "", id: id || null };
};

const createSubscription = (service, index = 0) => ({
  ...service,
  subscriptionId: `onboard-${service.id}-${Date.now()}-${index}`,
  createdAt: new Date().toISOString(),
  billingCycle: "매월",
  status: service.isTrial ? "trial" : "active",
  alertD3: service.id === "netflix",
  alertD1: service.id === "youtube" || service.id === "spotify",
  renewalPending: false,
});

export default function App() {
  const storedProfile = readStoredValue(storageKeys.profile, null);
  const initialHash = readHash();
  const [profile, setProfile] = useState(storedProfile);
  const [subscriptions, setSubscriptions] = useState(() => readStoredValue(storageKeys.subscriptions, []));
  const [onboardingComplete, setOnboardingComplete] = useState(() => readStoredValue(storageKeys.onboardingComplete, false));
  const [savedAmount, setSavedAmount] = useState(() => readStoredValue(storageKeys.savedAmount, 0));
  const [screen, setScreen] = useState(() => {
    if (initialHash.route) return initialHash;
    return storedProfile && onboardingComplete ? { route: "home", id: null } : { route: "login", id: null };
  });
  const [selectedOnboarding, setSelectedOnboarding] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [renewalTarget, setRenewalTarget] = useState(null);
  const [completedCancelId, setCompletedCancelId] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const onHashChange = () => {
      const next = readHash();
      if (next.route) setScreen(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.id, screen.route]);

  useEffect(() => { writeStoredValue(storageKeys.profile, profile); }, [profile]);
  useEffect(() => { writeStoredValue(storageKeys.subscriptions, subscriptions); }, [subscriptions]);
  useEffect(() => { writeStoredValue(storageKeys.onboardingComplete, onboardingComplete); }, [onboardingComplete]);
  useEffect(() => { writeStoredValue(storageKeys.savedAmount, savedAmount); }, [savedAmount]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (screen.route !== "home" || renewalTarget || !subscriptions.length) return undefined;
    const candidate = subscriptions.find((subscription) => isPastDueThisCycle(subscription) && subscription.renewalReviewedFor !== getMonthKey());
    if (!candidate) return undefined;
    const timer = window.setTimeout(() => setRenewalTarget(candidate.subscriptionId), 600);
    return () => window.clearTimeout(timer);
  }, [renewalTarget, screen.route, subscriptions]);

  const selectedSubscription = useMemo(() => subscriptions.find((subscription) => subscription.subscriptionId === screen.id) || null, [screen.id, subscriptions]);
  const renewalSubscription = useMemo(() => subscriptions.find((subscription) => subscription.subscriptionId === renewalTarget) || null, [renewalTarget, subscriptions]);
  const cancelSubscription = useMemo(() => subscriptions.find((subscription) => subscription.subscriptionId === cancelTarget?.id) || cancelTarget?.subscription || null, [cancelTarget, subscriptions]);

  const navigate = (route, id = null) => {
    const hash = id ? `#/${route}/${id}` : `#/${route}`;
    if (window.location.hash === hash) setScreen({ route, id });
    else window.location.hash = hash;
  };

  const notify = (message) => setToast(message);

  const completeLogin = (provider, nickname, guest = false) => {
    setProfile({ nickname: nickname || "민수", provider, guest, notificationsAllowed: true });
    if (guest) {
      setSubscriptions((current) => current.length ? current : createMockSubscriptions());
      setOnboardingComplete(true);
      navigate("home");
      notify("데모 구독 내역을 불러왔어요.");
      return;
    }
    setOnboardingComplete(false);
    navigate("onboarding");
  };

  const handleOnboardingFinish = () => {
    const picked = serviceCatalog.filter((service) => selectedOnboarding.includes(service.id));
    setSubscriptions(picked.map(createSubscription));
    setOnboardingComplete(true);
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
    const matched = serviceCatalog.find((service) => service.name === data.name);
    const record = {
      ...data,
      id: matched?.id || `custom-${Date.now()}`,
      monogram: data.monogram || matched?.monogram || data.name.trim().slice(0, 1).toUpperCase(),
      category: data.category || matched?.category || "기타",
      cancelUrl: data.cancelUrl || matched?.cancelUrl || "",
      subscriptionId: `manual-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: data.isTrial ? "trial" : "active",
      alertD3: true,
      alertD1: false,
      renewalPending: false,
    };
    setSubscriptions((current) => [...current, record]);
    setOnboardingComplete(true);
    notify(`${record.name}을 내 구독에 추가했어요.`);
    return true;
  };

  const updateSubscription = (subscriptionId, update) => {
    setSubscriptions((current) => current.map((subscription) => subscription.subscriptionId === subscriptionId ? { ...subscription, ...update } : subscription));
    notify("구독 정보를 저장했어요.");
  };

  const openSubscription = (subscriptionId) => navigate("detail", subscriptionId);

  const startCancellation = (subscriptionId, promotion = null) => {
    const subscription = subscriptions.find((item) => item.subscriptionId === subscriptionId);
    if (!subscription) {
      notify("해지할 구독 정보를 찾지 못했습니다.");
      return;
    }
    setCancelTarget({ id: subscriptionId, promotion, subscription });
  };

  const closeCancellation = () => {
    if (completedCancelId) {
      setCompletedCancelId(null);
      navigate("home");
    }
    setCancelTarget(null);
  };

  const finishCancellation = (subscription) => {
    setSubscriptions((current) => current.filter((item) => item.subscriptionId !== subscription.subscriptionId));
    setSavedAmount((amount) => amount + subscription.amount);
    setCompletedCancelId(subscription.subscriptionId);
    navigate("home");
    notify(`${subscription.name}을 구독 목록에서 삭제했어요.`);
  };

  const muteSubscription = (subscriptionId) => {
    setSubscriptions((current) => current.map((subscription) => subscription.subscriptionId === subscriptionId ? { ...subscription, alertD3: false, alertD1: false } : subscription));
    notify("이 구독의 사전 알림을 일시정지했어요.");
  };

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
    content = <HomeScreen subscriptions={subscriptions} promotions={promotionCatalog.filter((promotion) => promotion.sourceServiceIds.some((id) => subscriptions.some((subscription) => subscription.id === id)))} profile={profile} notificationDenied={profile?.notificationsAllowed === false} onOpenSubscription={openSubscription} onShowAll={() => navigate("subscriptions")} onOpenPromotion={handlePromotion} onExplorePromotions={() => navigate("promotions")} onAdd={() => setAddOpen(true)} onStartOnboarding={() => navigate("onboarding")} />;
  } else if (screen.route === "subscriptions") {
    content = <SubscriptionListScreen subscriptions={subscriptions} onOpen={openSubscription} onAdd={() => setAddOpen(true)} onStartCancel={startCancellation} onMute={muteSubscription} onRefresh={() => notify("최신 구독 목록을 확인했어요.")} />;
  } else if (screen.route === "calendar") {
    content = <CalendarScreen subscriptions={subscriptions} onOpen={openSubscription} />;
  } else if (screen.route === "promotions") {
    content = <PromotionScreen subscriptions={subscriptions} promotions={promotionCatalog} onOpenPromotion={handlePromotion} />;
  } else if (screen.route === "detail" && selectedSubscription) {
    content = <SubscriptionDetailScreen subscription={selectedSubscription} onUpdate={updateSubscription} onStartCancel={startCancellation} />;
  } else {
    content = <AuthLogin onGuest={() => completeLogin("Guest", "민수", true)} onSocial={(provider, nickname) => completeLogin(provider, nickname)} onRegister={() => navigate("register")} />;
  }

  return (
    <div className="app-shell">
      {hasAppChrome && <AppHeader title={pageTitles[screen.route]} onBack={screen.route === "detail" ? () => navigate("subscriptions") : undefined} onAdd={() => setAddOpen(true)} rightSlot={screen.route === "home" && savedAmount > 0 ? <span className="whitespace-nowrap rounded-full border border-[#E4E4E7] bg-[#F4F4F5] px-2.5 py-1 text-[12px] font-semibold text-black">절약 {formatWon(savedAmount)}</span> : null} />}
      {content}
      {hasAppChrome && <BottomNavigation route={screen.route} onNavigate={navigate} />}
      {addOpen && <AddModal catalog={serviceCatalog} onClose={() => setAddOpen(false)} onAdd={handleAddSubscription} />}
      {cancelSubscription && <CancelModal subscription={cancelSubscription} promotion={cancelTarget?.promotion} onClose={closeCancellation} onComplete={finishCancellation} onToast={notify} />}
      {renewalSubscription && <RenewalSheet subscription={renewalSubscription} onKeep={() => handleRenewal(true)} onCancel={() => handleRenewal(false)} onClose={() => setRenewalTarget(null)} />}
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
