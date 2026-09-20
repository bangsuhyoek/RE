import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Bell } from "lucide-react";
import { AuthLogin, AuthRegister } from "./components/AuthScreens";
import { SplashScreen, LandingScreen } from "./components/LandingScreen";
import { AddModal } from "./components/AddModal";
import { AccountModal } from "./components/AccountModal";
import { TermsModal } from "./components/TermsModal";
import { requestPaymentCapturePermission, simulatePaymentDetection } from "./lib/paymentCapture";
import { isNativePlatform } from "./lib/platform";
import { detectPaymentNotification, PaymentDecision } from "./features/payment/paymentDetection.js";
import { getDemoPaymentFixture } from "./features/payment/paymentFixtures.js";
import { CancelModal } from "./components/CancelModal";
import { HomeScreen } from "./components/HomeScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { PromotionScreen } from "./components/PromotionScreen";
import { RenewalSheet } from "./components/RenewalSheet";
import { CalendarScreen, SubscriptionDetailScreen, SubscriptionListScreen } from "./components/SubscriptionScreens";
import { PushNotificationBanner, NotificationCenterModal } from "./components/NotificationComponents";
import { NotificationSetupModal } from "./components/NotificationSetupModal";
import { ContestDemoPanel } from "./components/ContestDemoPanel";
import { AppHeader, BottomNavigation, Toast } from "./components/ui";
import { promotionCatalog, serviceCatalog } from "./data/subscriptionData";
import {
  removeDemoSubscriptions,
  getStoredUsers,
  saveUser,
  findUser,
  storageKeys,
  readStoredValue,
  isContestDemoActive,
  setContestDemoActive,
  resetContestDemoStorage,
} from "./lib/storage";
import {
  generateSubscriptionAlerts,
  createWelcomeHeadsUpNotification,
} from "./lib/notifications";
import {
  clearNotificationSetupSeenThisSession,
  markNotificationSetupSeenThisSession,
  readNotificationSetup,
  shouldShowNotificationSetup,
  wasNotificationSetupSeenThisSession,
  writeNotificationSetup,
} from "./lib/notificationSetup";
import { useNavigation } from "./hooks/useNavigation";
import { useBenefits } from "./hooks/useBenefits";
import { summarizePublishedConfirmedSavings } from "./features/benefits/presentation/recommendationViewModel.js";
import { useSubscriptions, createSubscription } from "./hooks/useSubscriptions";
import { useNotificationManager } from "./hooks/useNotificationManager";
import { showHeadsUpDemoOnHome } from "./lib/headsUpDemo";
import { supabase, isSupabaseConfigured, signInWithGoogle, signOut, upsertDbSubscription } from "./lib/supabase";

export default function App() {
  const [addOpen, setAddOpen] = useState(false);
  const [addInitialMode, setAddInitialMode] = useState("manual");
  const [quickAddData, setQuickAddData] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsTab, setTermsTab] = useState("terms");
  const [contestDemoActive, setContestDemoActiveState] = useState(
    () => !isNativePlatform() && isContestDemoActive()
  );
  const [demoPhase, setDemoPhase] = useState("IDLE");
  const [demoFixture, setDemoFixture] = useState(null);
  const [demoResult, setDemoResult] = useState(null);
  const demoRunTokenRef = useRef(0);
  const [toast, setToast] = useState(null);
  const [notificationSetupOpen, setNotificationSetupOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("kudok_splash_shown");
    }
    return false;
  });

  const notify = useCallback((message, duration = 6000) => {
    setToast({ message, duration, id: Date.now() });
  }, []);

  // 이미 로그인 완료 안내를 받은 유저 ID 추적 (타 웹사이트 왕복, 탭 전환 시 중복 팝업 방지)
  const googleAuthNotifiedUserRef = useRef(
    typeof window !== "undefined"
      ? (readStoredValue(storageKeys.profile, null)?.user_id || sessionStorage.getItem("submate_google_login_notified_user"))
      : null
  );

  // Hash-based navigation
  const {
    screen,
    navigate,
    highlightCancelId,
    setHighlightCancelId,
    hasAppChrome,
    pageTitle,
  } = useNavigation();


  // Deep link listener (실시간 결제 감지 알림 탭 시 수신)
  useEffect(() => {
    const handleUrl = (event) => {
      const rawUrl = event?.url;
      if (!rawUrl) return;
      try {
        const parsed = new URL(rawUrl);
        if (rawUrl.includes("auth/callback") || rawUrl.includes("access_token=") || rawUrl.includes("code=")) {
          Browser.close().catch(() => {});
          if (rawUrl.includes("code=")) {
            const code = parsed.searchParams.get("code");
            if (code && supabase) {
              supabase.auth.exchangeCodeForSession(code).catch(console.error);
            }
          } else if (rawUrl.includes("#")) {
            const hash = rawUrl.substring(rawUrl.indexOf("#") + 1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");
            if (accessToken && refreshToken && supabase) {
              supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).catch(console.error);
            }
          }
          return;
        }

        if (parsed.protocol === "submate:" && (parsed.hostname === "quick-add" || parsed.pathname.includes("quick-add"))) {
          const params = parsed.searchParams;
          const detectedAt = Number(params.get("detectedAt")) || Date.now();
          const detectedDate = new Date(detectedAt);
          const dueDayFromLink = Number(params.get("dueDay"));
          const detectedDueDay =
            dueDayFromLink >= 1 && dueDayFromLink <= 31
              ? dueDayFromLink
              : detectedDate.getDate();

          const detected = {
            name: params.get("name") || "",
            amount: Number(params.get("amount")) || 0,
            plan: params.get("plan") || "",
            paymentMethod: params.get("method") || "",
            category: params.get("category") || "기타",
            serviceId: params.get("serviceId") || "",
            dueDay: detectedDueDay,
            billingCycle: "매월",
            sourceType: "sms",
            autoDetected: true,
          };
          setQuickAddData(detected);
          setAddInitialMode("quick-detect");
          setAddOpen(true);
        }
      } catch (err) {
        console.warn("Failed to parse deep link URL:", rawUrl, err);
      }
    };

    let sub;
    if (CapApp && typeof CapApp.addListener === "function") {
      sub = CapApp.addListener("appUrlOpen", handleUrl);
      if (typeof CapApp.getLaunchUrl === "function") {
        CapApp.getLaunchUrl().then((launch) => {
          if (launch?.url) handleUrl(launch);
        });
      }
    }

    return () => {
      if (sub && typeof sub.then === "function") {
        sub.then((handle) => handle?.remove?.());
      }
    };
  }, []);


  const handleOpenTerms = (tab = "terms") => {
    setTermsTab(tab);
    setTermsOpen(true);
  };

  const handleRequestPaymentCapture = async () => {
    if (isNativePlatform()) {
      await requestPaymentCapturePermission();
      notify("시스템 설정에서 꾸독 '알림 접근 허용'을 켜주세요.");
    } else {
      handleOpenTerms("permissions");
      notify("웹 환경입니다. 앱 접근 권한 안내 문서를 표시합니다.");
    }
  };

  const runWebPaymentDemo = useCallback(async (fixtureId = "netflix-shinhan") => {
    const fixture = getDemoPaymentFixture(fixtureId);
    if (!fixture) return;

    const token = ++demoRunTokenRef.current;
    setDemoFixture(fixture);
    setDemoResult(null);
    setDemoPhase("INCOMING");

    await new Promise((resolve) => window.setTimeout(resolve, 650));
    if (demoRunTokenRef.current !== token) return;
    setDemoPhase("ANALYZING");

    await new Promise((resolve) => window.setTimeout(resolve, 650));
    if (demoRunTokenRef.current !== token) return;

    const result = detectPaymentNotification(fixture.rawEvent);
    setDemoResult(result);

    if (result.decision === PaymentDecision.MATCH) {
      setDemoPhase("MATCHED");
      setQuickAddData(result.candidate);
      setAddInitialMode("quick-detect");
      setAddOpen(true);
      notify(
        `⚡ ${result.candidate.name} ${Number(result.candidate.amount).toLocaleString("ko-KR")}원 구독 결제를 확인했어요.`
      );
      return;
    }

    setDemoPhase("REJECTED");
    notify("구독 결제로 판단되지 않아 등록하지 않았어요.");
  }, [notify]);

  const handleTestPaymentDetection = async () => {
    if (isNativePlatform()) {
      await simulatePaymentDetection({
        package: "com.shcard.smartpay",
        title: "[신한카드] 결제승인",
        body: "넷플릭스 17,000원(일시불) 정상승인",
      });
      notify("⚡ 넷플릭스 17,000원 결제 알림이 발송되었습니다!");
      return;
    }

    await runWebPaymentDemo("netflix-shinhan");
  };

  // Subscriptions domain state
  const {
    profile,
    setProfile,
    subscriptions,
    setSubscriptions,
    setOnboardingComplete,
    selectedOnboarding,
    setSelectedOnboarding,
    cancelTarget,
    cancelSubscription,
    startCancellation,
    closeCancellation,
    finishCancellation,
    renewalTarget,
    setRenewalTarget,
    renewalSubscription,
    handleRenewal,
    getSubscriptionById,
    handleAddSubscription,
    updateSubscription,
    togglePinSubscription,
    muteSubscription,
    deleteSubscription,
  } = useSubscriptions({ currentRoute: screen.route });

  const {
    benefits: activeBenefits,
    recommendations: benefitRecommendations,
    loading: benefitsLoading,
    loadState: benefitsLoadState,
    partial: benefitsPartial,
    reload: reloadBenefits,
    source: benefitsSource,
  } = useBenefits({
    enabled: screen.route === "promotions" || screen.route === "home",
    subscriptions,
  });

  const homeBenefitSummary = useMemo(
    () => summarizePublishedConfirmedSavings(benefitRecommendations),
    [benefitRecommendations]
  );

  // Notifications domain state
  const {
    notifications,
    setNotifications,
    activeBanner,
    setActiveBanner,
    notificationCenterOpen,
    setNotificationCenterOpen,
    notificationPermission,
    unreadCount,
    handleTriggerTestNotification,
    handleOpenDetailFromNotification,
    handleRequestPermission,
    handleTogglePermissionFromHome,
    markAllRead,
    clearAll,
  } = useNotificationManager({ subscriptions });

  useEffect(() => {
    if (contestDemoActive || !profile) {
      setNotificationSetupOpen(false);
      return;
    }
    const record = readNotificationSetup(profile);
    const seenThisSession = wasNotificationSetupSeenThisSession(profile);
    setNotificationSetupOpen(
      shouldShowNotificationSetup({
        profile,
        permission: notificationPermission,
        record,
        seenThisSession,
      })
    );
  }, [
    profile?.user_id,
    profile?.accountId,
    profile?.nickname,
    profile?.provider,
    contestDemoActive,
    notificationPermission,
  ]);

  const handleNotificationSetupPermission = useCallback(async () => {
    return handleRequestPermission(
      (allowed) => setProfile((current) => ({ ...(current || {}), notificationsAllowed: allowed })),
      notify
    );
  }, [handleRequestPermission, notify, setProfile]);

  const handleNotificationSetupContinue = useCallback(async () => {
    if (!profile) return;

    const existing = readNotificationSetup(profile);
    const nativeAndroid =
      Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
    const shouldRunNativeDemo =
      nativeAndroid &&
      notificationPermission === "granted" &&
      !existing?.demoShown;

    markNotificationSetupSeenThisSession(profile);
    writeNotificationSetup(profile, {
      completed: true,
      permission: notificationPermission,
      demoPending: false,
    });
    setProfile((current) => ({
      ...(current || {}),
      notificationsAllowed: notificationPermission === "granted",
    }));
    setNotificationSetupOpen(false);

    if (!shouldRunNativeDemo) return;

    const item = createWelcomeHeadsUpNotification();
    const result = await showHeadsUpDemoOnHome({
      title: item.title,
      body: item.message,
      delayMs: 2500,
    });

    if (result?.scheduled) {
      writeNotificationSetup(profile, {
        demoPending: false,
        demoShown: true,
        demoShownAt: new Date().toISOString(),
      });
      return;
    }

    writeNotificationSetup(profile, {
      demoPending: false,
      demoShown: false,
    });
    notify("Heads-up 알림 체험을 시작하지 못했어요. 알림 권한을 다시 확인해 주세요.");
  }, [notificationPermission, notify, profile, setProfile]);

  const handleStartContestDemo = useCallback(() => {
    if (isNativePlatform()) return;
    demoRunTokenRef.current += 1;
    resetContestDemoStorage();
    setContestDemoActive(true);
    setContestDemoActiveState(true);
    setDemoPhase("IDLE");
    setDemoFixture(null);
    setDemoResult(null);
    setProfile({
      nickname: "사용자",
      provider: "Web",
      contestDemo: true,
      guest: false,
      notificationsAllowed: true,
    });
    setSubscriptions([]);
    setOnboardingComplete(true);
    setNotifications([]);
    navigate("home");
    notify("바로 시작할게요. 최근 결제에서 구독을 찾아보세요.");
  }, [navigate, notify, setNotifications, setOnboardingComplete, setProfile, setSubscriptions]);

  const handleResetContestDemo = useCallback(() => {
    if (!contestDemoActive) return;
    demoRunTokenRef.current += 1;
    resetContestDemoStorage();
    setContestDemoActive(true);
    setDemoPhase("IDLE");
    setDemoFixture(null);
    setDemoResult(null);
    setAddOpen(false);
    setQuickAddData(null);
    setProfile({
      nickname: "사용자",
      provider: "Web",
      contestDemo: true,
      guest: false,
      notificationsAllowed: true,
    });
    setSubscriptions([]);
    setOnboardingComplete(true);
    setNotifications([]);
    navigate("home");
    notify("등록 내용을 초기화했어요.");
  }, [contestDemoActive, navigate, notify, setNotifications, setOnboardingComplete, setProfile, setSubscriptions]);

  const handleExitContestDemo = useCallback(() => {
    demoRunTokenRef.current += 1;
    resetContestDemoStorage();
    setContestDemoActive(false);
    setContestDemoActiveState(false);
    setDemoPhase("IDLE");
    setDemoFixture(null);
    setDemoResult(null);
    setAddOpen(false);
    setQuickAddData(null);
    setProfile(null);
    setSubscriptions([]);
    setNotifications([]);
    navigate("login");
    notify("로그인 화면으로 돌아왔어요.");
  }, [navigate, notify, setNotifications, setProfile, setSubscriptions]);

  
  // Supabase Auth session & state change listener
  useEffect(() => {
    if (!supabase || contestDemoActive) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = session.user;
        const nickname = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "사용자";
        setProfile((prev) => ({
          ...(prev || {}),
          user_id: user.id,
          nickname: prev?.nickname || nickname,
          email: user.email,
          provider: "Google",
          guest: false,
          notificationsAllowed: prev?.notificationsAllowed ?? true,
        }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const user = session.user;
        const nickname = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "사용자";
        setProfile((prev) => ({
          ...(prev || {}),
          user_id: user.id,
          nickname: prev?.nickname || nickname,
          email: user.email,
          provider: "Google",
          guest: false,
          notificationsAllowed: prev?.notificationsAllowed ?? true,
        }));
        setOnboardingComplete(true);

        // 타 웹사이트 왕복/탭 포커스 복귀 시 중복 팝업 방지 (최초 1회만 알림 표시 및 홈 이동)
        const alreadyNotified =
          googleAuthNotifiedUserRef.current === user.id ||
          (typeof window !== "undefined" && sessionStorage.getItem("submate_google_login_notified_user") === user.id);

        if (!alreadyNotified) {
          googleAuthNotifiedUserRef.current = user.id;
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem("submate_google_login_notified_user", user.id);
            } catch (e) {}
          }
          navigate("home");
          notify(`${nickname}님, 구글 계정으로 로그인되었어요!`);
        }
      } else if (event === "SIGNED_OUT") {
        clearNotificationSetupSeenThisSession(readStoredValue(storageKeys.profile, null));
        googleAuthNotifiedUserRef.current = null;
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem("submate_google_login_notified_user");
          } catch (e) {}
        }
        setProfile(null);
        setSubscriptions([]);
        navigate("login");
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [contestDemoActive, navigate, notify, setOnboardingComplete, setProfile, setSubscriptions]);

  // Handle URL query actions (?notifications=1)
  useEffect(() => {
    if (screen.params?.get("notifications") === "1") {
      setNotificationCenterOpen(true);
    }
  }, [screen, setNotificationCenterOpen]);

  // Route guard: unauthenticated users must stay on auth screens
  useEffect(() => {
    if (!profile && screen.route !== "login" && screen.route !== "register") {
      navigate("login");
    }
  }, [profile, screen.route, screen.params, navigate]);

  // Hardware back button support for Android (Capacitor)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle = null;
    CapApp.addListener("backButton", () => {
      if (accountOpen) {
        setAccountOpen(false);
      } else if (notificationCenterOpen) {
        setNotificationCenterOpen(false);
      } else if (addOpen) {
        setAddOpen(false);
      } else if (cancelTarget) {
        closeCancellation();
      } else if (renewalTarget) {
        setRenewalTarget(null);
      } else if (screen.route === "detail") {
        setHighlightCancelId(null);
        navigate("subscriptions");
      } else if (screen.route === "register") {
        navigate("login");
      } else if (screen.route !== "home" && screen.route !== "login") {
        navigate("home");
      } else {
        CapApp.exitApp();
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, [
    accountOpen,
    notificationCenterOpen,
    addOpen,
    cancelTarget,
    renewalTarget,
    screen.route,
    closeCancellation,
    navigate,
    setHighlightCancelId,
    setNotificationCenterOpen,
    setRenewalTarget,
  ]);

  const selectedSubscription = useMemo(
    () => getSubscriptionById(screen.id),
    [getSubscriptionById, screen.id]
  );

  
  const handleSocialLogin = async (provider, defaultName) => {
    if (provider === "Google" && isSupabaseConfigured) {
      try {
        notify("구글 로그인 화면으로 이동합니다...");
        const { error } = await signInWithGoogle();
        if (error) throw error;
        return;
      } catch (err) {
        console.error("Google sign in error:", err);
        notify(err.message || "구글 로그인 중 오류가 발생했습니다.");
        return;
      }
    }
    completeLogin(provider, defaultName);
  };

  const handleIdLogin = ({ accountId, password }) => {
    const user = findUser(accountId);
    if (!user) {
      return { error: "존재하지 않는 아이디입니다." };
    }
    if (user.password !== password) {
      return { error: "비밀번호가 일치하지 않습니다." };
    }
    completeLogin("꾸독", user.nickname || accountId, accountId);
    notify(`${user.nickname || accountId}님, 환영합니다!`);
    return { success: true };
  };

  const handleRegisterComplete = ({ accountId, password, nickname }) => {
    saveUser({ accountId, password, nickname });
    completeLogin("꾸독", nickname, accountId);
    notify(`${nickname}님, 회원가입이 완료되었어요!`);
  };

  const handleLogout = async () => {
    if (profile) clearNotificationSetupSeenThisSession(profile);
    if (contestDemoActive) {
      handleExitContestDemo();
      return;
    }
    setAccountOpen(false);
    googleAuthNotifiedUserRef.current = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("submate_google_login_notified_user");
      } catch (e) {}
    }
    if (isSupabaseConfigured && profile?.user_id) {
      await signOut();
      notify("로그아웃되었습니다.");
    } else {
      setProfile(null);
      setSubscriptions([]);
      navigate("login");
      notify("로그아웃되었습니다.");
    }
  };

  const handleUpdateNickname = (newNickname) => {
    setProfile((prev) => ({
      ...(prev || {}),
      nickname: newNickname,
    }));
    notify(`${newNickname}으로 닉네임이 변경되었어요!`);
  };

  const completeLogin = (provider, nickname, accountId = "") => {
    setProfile({
      nickname: nickname || "사용자",
      provider,
      accountId: accountId || undefined,
      guest: false,
      notificationsAllowed:
        typeof Notification !== "undefined" ? Notification.permission === "granted" : false,
    });
    setSubscriptions((current) => removeDemoSubscriptions(current));
    setOnboardingComplete(false);
    navigate("onboarding");
  };

  const handleOnboardingFinish = (customItems) => {
    const itemsToCreate = Array.isArray(customItems) && customItems.length > 0
      ? customItems
      : serviceCatalog.filter((service) => selectedOnboarding.includes(service.id));
    const created = itemsToCreate.map((item, idx) => createSubscription(item, idx));
    setSubscriptions(created);
    if (profile?.user_id) {
      created.forEach((sub) => upsertDbSubscription(profile.user_id, sub));
    }
    setOnboardingComplete(true);
    setNotifications(generateSubscriptionAlerts(created));
    navigate("home");
    notify(`${created.length}개 구독을 추가했어요.`);
  };

  const handleOnboardingSkip = () => {
    setSubscriptions([]);
    setOnboardingComplete(true);
    navigate("home");
  };

  const handlePromotion = useCallback((promotion) => {
    const promotionUrl = promotion?.sourceUrl || promotion?.source_url || promotion?.link;
    if (promotionUrl) {
      if (isNativePlatform()) {
        Browser.open({ url: promotionUrl }).catch(() => {
          window.open(promotionUrl, "_blank", "noopener,noreferrer");
        });
      } else {
        window.open(promotionUrl, "_blank", "noopener,noreferrer");
      }
      notify("제휴 혜택 페이지를 열었어요.");
    } else {
      navigate("promotions");
    }
  }, [navigate, notify]);

  let content;
  if (screen.route === "landing") {
    content = (
      <LandingScreen
        onStart={() => navigate("home")}
        onLogin={() => navigate("login")}
      />
    );
  } else if (screen.route === "register") {
    content = (
      <AuthRegister
        onBack={() => navigate("login")}
        onComplete={handleRegisterComplete}
        existingUsers={getStoredUsers()}
      />
    );
  } else if (screen.route === "onboarding") {
    content = <OnboardingScreen catalog={serviceCatalog} selectedIds={selectedOnboarding} onToggle={(id) => setSelectedOnboarding((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onFinish={handleOnboardingFinish} onSkip={handleOnboardingSkip} />;
  } else if (screen.route === "home") {
    content = (
      <HomeScreen
        subscriptions={subscriptions}
        promotions={promotionCatalog}
        profile={profile}
        notificationDenied={profile?.notificationsAllowed === false}
        onOpenSubscription={(id) => navigate("detail", id)}
        onShowAll={() => navigate("subscriptions")}
        onOpenPromotion={handlePromotion}
        onExplorePromotions={() => navigate("promotions")}
        benefitSummary={homeBenefitSummary}
        benefitsLoading={benefitsLoading}
        onAdd={() => { setAddInitialMode("manual"); setAddOpen(true); }}
        onImageScan={() => { setAddInitialMode("ai"); setAddOpen(true); }}
        onScan={() => {
          if (!isNativePlatform() && contestDemoActive) {
            runWebPaymentDemo("netflix-shinhan");
            return;
          }
          setAddInitialMode("ai");
          setAddOpen(true);
        }}
        webPaymentMode={!isNativePlatform() && contestDemoActive}
        onStartOnboarding={() => navigate("onboarding")}
        onToggleNotificationPermission={() =>
          handleTogglePermissionFromHome(
            profile,
            (allowed) => setProfile((p) => ({ ...(p || {}), notificationsAllowed: allowed })),
            notify
          )
        }
        onOpenNotificationCenter={() => setNotificationCenterOpen(true)}
        onTestPaymentDetection={handleTestPaymentDetection}
        onRequestPaymentCapture={handleRequestPaymentCapture}
        onOpenTerms={handleOpenTerms}
        onLogout={handleLogout}
        onOpenAccount={() => setAccountOpen(true)}
        onTogglePin={(id) => togglePinSubscription(id, notify)}
      />
    );
  } else if (screen.route === "subscriptions") {
    content = (
      <SubscriptionListScreen
        subscriptions={subscriptions}
        onOpen={(id) => navigate("detail", id)}
        onAdd={() => { setAddInitialMode("manual"); setAddOpen(true); }}
        onStartCancel={startCancellation}
        onMute={(id) => muteSubscription(id, notify)}
        onRefresh={() => notify("최신 구독 목록을 확인했어요.")}
        onTogglePin={(id) => togglePinSubscription(id, notify)}
      />
    );
  } else if (screen.route === "calendar") {
    content = <CalendarScreen subscriptions={subscriptions} onOpen={(id) => navigate("detail", id)} />;
  } else if (screen.route === "promotions") {
    content = (
      <PromotionScreen
        subscriptions={subscriptions}
        benefits={activeBenefits}
        recommendations={benefitRecommendations}
        loading={benefitsLoading}
        loadState={benefitsLoadState}
        partial={benefitsPartial}
        source={benefitsSource}
        onOpenPromotion={handlePromotion}
        onRefresh={reloadBenefits}
      />
    );
  } else if (screen.route === "detail") {
    content = (
      <SubscriptionDetailScreen
        subscription={selectedSubscription}
        subscriptions={subscriptions}
        onUpdate={(id, update) => updateSubscription(id, update, notify)}
        onStartCancel={startCancellation}
        onBack={() => {
          closeCancellation();
          setHighlightCancelId(null);
          navigate("subscriptions");
        }}
        onDelete={(id) => {
          deleteSubscription(id);
          notify("구독이 삭제되었습니다.");
          setHighlightCancelId(null);
          navigate("subscriptions");
        }}
        promotion={promotionCatalog.find((p) => p.sourceServiceIds?.includes(selectedSubscription?.id))}
        onTriggerNotification={(sub) => handleTriggerTestNotification(sub, notify)}
        highlightCancel={highlightCancelId === selectedSubscription?.subscriptionId}
      />
    );
  } else {
    content = (
      <AuthLogin
        onSocial={handleSocialLogin}
        onLogin={handleIdLogin}
        onRegister={() => navigate("register")}
        onDemo={!isNativePlatform() ? handleStartContestDemo : undefined}
      />
    );
  }

  return (
    <div className="app-shell" data-screen={screen.route} data-hash={typeof window !== "undefined" ? window.location.hash : ""}>
      {showSplash && (
        <SplashScreen
          onFinish={() => {
            if (typeof window !== "undefined") {
              sessionStorage.setItem("kudok_splash_shown", "1");
            }
            setShowSplash(false);
          }}
        />
      )}
      {hasAppChrome && screen.route !== "home" && screen.route !== "detail" && (
        <AppHeader
          title={pageTitle}
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
      {hasAppChrome && screen.route !== "detail" && (
        <BottomNavigation
          route={screen.route}
          onNavigate={(targetRoute) => {
            setHighlightCancelId(null);
            navigate(targetRoute);
          }}
          onOpenAdd={() => { setAddInitialMode("manual"); setAddOpen(true); }}
          onOpenNotifications={() => setNotificationCenterOpen(true)}
          onOpenAccount={() => setAccountOpen(true)}
        />
      )}
      {addOpen && (
        <AddModal
          catalog={serviceCatalog}
          subscriptions={subscriptions}
          initialMode={addInitialMode}
          initialData={quickAddData}
          onClose={() => {
            setAddOpen(false);
            setQuickAddData(null);
          }}
          onAdd={(data) => {
            const result = handleAddSubscription(data, notify);
            setQuickAddData(null);
            return result;
          }}
        />
      )}
      {cancelSubscription && (
        <CancelModal
          subscription={cancelSubscription}
          promotion={cancelTarget?.promotion}
          autoOpen={cancelTarget?.autoOpen}
          onClose={closeCancellation}
          onComplete={(id, saved) => finishCancellation(id, saved, () => {
            if (screen.route === "detail") navigate("subscriptions");
          })}
          onToast={notify}
        />
      )}
      {renewalSubscription && !addOpen && !cancelSubscription && !notificationCenterOpen && !termsOpen && (
        <RenewalSheet
          subscription={renewalSubscription}
          onKeep={() => handleRenewal(true, notify)}
          onCancel={() => handleRenewal(false, notify)}
          onClose={() => setRenewalTarget(null)}
        />
      )}
      <PushNotificationBanner
        notification={activeBanner}
        onClose={() => setActiveBanner(null)}
        onOpenDetail={(subId) => {
          if (!subId) {
            setActiveBanner(null);
            navigate("promotions");
            return;
          }
          handleOpenDetailFromNotification(subId, (id) => {
            setHighlightCancelId(id);
            navigate("detail", id);
          });
        }}
      />
      {notificationCenterOpen && (
        <NotificationCenterModal
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setNotificationCenterOpen(false)}
          onOpenDetail={(subId) => handleOpenDetailFromNotification(subId, (id) => {
            setHighlightCancelId(id);
            navigate("detail", id);
          })}
          onMarkAllRead={markAllRead}
          onClearAll={clearAll}
          onTriggerTest={() => handleTriggerTestNotification(null, notify)}
          notificationPermission={notificationPermission}
          onRequestPermission={() =>
            handleRequestPermission(
              (allowed) => setProfile((p) => ({ ...(p || {}), notificationsAllowed: allowed })),
              notify
            )
          }
          onTestPaymentDetection={handleTestPaymentDetection}
          onRequestPaymentCapture={handleRequestPaymentCapture}
          onOpenTerms={handleOpenTerms}
        />
      )}
      {termsOpen && (
        <TermsModal
          initialTab={termsTab}
          onClose={() => setTermsOpen(false)}
        />
      )}
      {accountOpen && (
        <AccountModal
          profile={profile}
          onClose={() => setAccountOpen(false)}
          onUpdateNickname={handleUpdateNickname}
          onTestPaymentDetection={handleTestPaymentDetection}
          onRequestPaymentCapture={handleRequestPaymentCapture}
          onLogout={handleLogout}
        />
      )}
      <ContestDemoPanel
        active={
          contestDemoActive &&
          Boolean(profile?.contestDemo) &&
          screen.route === "home" &&
          subscriptions.length > 0
        }
        phase={demoPhase}
        fixture={demoFixture}
        result={demoResult}
        onRunScenario={runWebPaymentDemo}
        onReset={handleResetContestDemo}
      />
      {notificationSetupOpen && (
        <NotificationSetupModal
          permission={notificationPermission}
          nativeMode={isNativePlatform()}
          onRequestPermission={handleNotificationSetupPermission}
          onContinue={handleNotificationSetupContinue}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
