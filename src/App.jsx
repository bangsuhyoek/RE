import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Bell } from "lucide-react";
import { AuthLogin, AuthRegister } from "./components/AuthScreens";
import { SplashScreen, LandingScreen } from "./components/LandingScreen";
import { AddModal } from "./components/AddModal";
import { AccountModal } from "./components/AccountModal";
import { TermsModal } from "./components/TermsModal";
import { requestPaymentCapturePermission, simulatePaymentDetection } from "./lib/paymentCapture";
import { isNativePlatform } from "./lib/platform";
import { CancelModal } from "./components/CancelModal";
import { AgentSheet } from "./components/AgentSheet";
import { HomeScreen } from "./components/HomeScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { PromotionScreen } from "./components/PromotionScreen";
import { RenewalSheet } from "./components/RenewalSheet";
import { CalendarScreen, SubscriptionDetailScreen, SubscriptionListScreen } from "./components/SubscriptionScreens";
import { NotificationCenterModal } from "./components/NotificationComponents";
import { AppHeader, BottomNavigation, Toast } from "./components/ui";
import { promotionCatalog, serviceCatalog } from "./data/subscriptionData";
import { removeDemoSubscriptions, getStoredUsers, saveUser, findUser, storageKeys, readStoredValue, readCancelHistory, writeCancelHistory } from "./lib/storage";
import { persistEvidenceCase } from "./lib/evidenceStore";
import { generateSubscriptionAlerts } from "./lib/notifications";
import { CANCEL_REMINDER_TYPE, scheduleSubscriptionNotifications } from "./lib/notifications";
import { consumePendingShare, listenForShares, sharedImageToFile, sharedTextToDetected } from "./lib/shareIntake";
import { assessDetectedPayment, buildRenewalResponse, createEvidenceCase, findCancelRecordForPayment } from "./lib/subscriptionAgent";
import { markRecordCharged, recordKey } from "./lib/cancelVerification";
import { shareText } from "./lib/shareText";
import { formatWon } from "./lib/dates";
import { useCareFeed } from "./hooks/useCareFeed";
import { CareSection } from "./components/CareSection";
import { RotationSheet } from "./components/RotationSheet";
import { useNavigation } from "./hooks/useNavigation";
import { useSubscriptions, createSubscription } from "./hooks/useSubscriptions";
import { useNotificationManager } from "./hooks/useNotificationManager";
import { supabase, isSupabaseConfigured, signInWithGoogle, signOut, upsertDbSubscription } from "./lib/supabase";

// 결제 사전 알림 중 갱신 승인 카드로 이어지는 종류
const RENEWAL_NOTIFICATION_TYPES = new Set(["billing_d3", "billing_d1", "trial_d1"]);
// 오늘 챙길 일 알림: 해지 화면으로 바로 가는 종류와 홈으로 가는 종류
const CARE_CANCEL_TYPES = new Set(["trial_d2", "rotation_cancel"]);
const CARE_HOME_TYPES = new Set(["cancel_check", "settlement_due", "rotation_resume"]);

export default function App() {
  const [addOpen, setAddOpen] = useState(false);
  const [addInitialMode, setAddInitialMode] = useState("manual");
  const [quickAddData, setQuickAddData] = useState(null);
  const [sharedFile, setSharedFile] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsTab, setTermsTab] = useState("terms");
  const [toast, setToast] = useState(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentMessages, setAgentMessages] = useState([]);
  // 알림·딥링크 리스너는 앱 시작 때 한 번만 등록되므로 최신 처리 함수를 ref로 넘긴다.
  const detectedPaymentHandlerRef = useRef(null);
  const renewalNotificationHandlerRef = useRef(null);
  const cancelReminderHandlerRef = useRef(null);
  const careNotificationHandlerRef = useRef(null);
  const shareHandlerRef = useRef(null);
  const [rotationOpen, setRotationOpen] = useState(false);
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
            detectedAt: detectedDate.toISOString(),
          };
          detectedPaymentHandlerRef.current?.(detected);
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

  // 결제 사전 알림(D-3, D-1)을 누르면 그 구독의 갱신 승인 카드를 연다. 앱이 꺼져 있을 때 누른 알림도 시작 직후 전달된다.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const handlePromise = LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
      const extra = event?.notification?.extra || {};
      if (extra.subscriptionId && extra.type === CANCEL_REMINDER_TYPE) {
        cancelReminderHandlerRef.current?.(extra.subscriptionId);
        return;
      }
      if (CARE_CANCEL_TYPES.has(extra.type) || CARE_HOME_TYPES.has(extra.type)) {
        careNotificationHandlerRef.current?.(extra);
        return;
      }
      if (!extra.subscriptionId || !RENEWAL_NOTIFICATION_TYPES.has(extra.type)) return;
      renewalNotificationHandlerRef.current?.(extra.subscriptionId);
    });
    return () => {
      handlePromise.then((handle) => handle?.remove?.()).catch(() => {});
    };
  }, []);

  // 다른 앱에서 '공유'로 보낸 결제 문자·영수증 캡처를 받는다. 앱이 꺼져 있었으면 시작 직후, 켜져 있으면 바로 전달된다.
  useEffect(() => {
    let active = true;
    consumePendingShare().then((shared) => {
      if (active && shared) shareHandlerRef.current?.(shared);
    });
    const stop = listenForShares((shared) => shareHandlerRef.current?.(shared));
    return () => {
      active = false;
      stop();
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

  const handleTestPaymentDetection = async () => {
    if (isNativePlatform()) {
      await simulatePaymentDetection({
        package: "com.shcard.smartpay",
        title: "[신한카드] 결제승인",
        body: "넷플릭스 17,000원(일시불) 정상승인",
      });
      notify("⚡ 넷플릭스 17,000원 결제 알림이 발송되었습니다!");
    } else {
      detectedPaymentHandlerRef.current?.({
        name: "Netflix",
        amount: 17000,
        plan: "프리미엄",
        paymentMethod: "신한카드",
        category: "OTT",
        serviceId: "netflix",
        dueDay: new Date().getDate(),
        billingCycle: "매월",
        sourceType: "sms",
        autoDetected: true,
        detectedAt: new Date().toISOString(),
      });
      notify("⚡ 넷플릭스 17,000원 결제가 감지되었습니다! (체험 시뮬레이션)");
    }
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

  // 오늘 챙길 일: 해지 확인 루프의 결과(확정·질문)를 알림 센터에 넣는다.
  const handleCareEvents = useCallback((events) => {
    const items = events.map((event) => ({
      id: "care-" + event.kind + "-" + recordKey(event.record),
      subscriptionId: event.record.subscriptionId,
      serviceName: event.record.name,
      monogram: event.record.name?.slice(0, 1) || "S",
      category: "기타",
      type: event.kind === "verified" ? "cancel_verified" : "cancel_check",
      badge: event.kind === "verified" ? "해지 확인" : "확인 필요",
      title: event.kind === "verified" ? event.record.name + " 해지가 확인됐어요" : event.record.name + " 해지됐는지 알려주세요",
      message: event.kind === "verified"
        ? "결제일이 지나도 결제가 없었어요. 매달 " + formatWon(event.record.amount) + "을 아끼고 있어요."
        : "결제일이 지났어요. 홈의 '오늘 챙길 일'에서 결제가 있었는지 알려주세요.",
      timestamp: new Date().toISOString(),
      read: false,
    }));
    setNotifications((current) => {
      const ids = new Set(current.map((item) => item.id));
      return [...items.filter((item) => !ids.has(item.id)), ...current];
    });
  }, [setNotifications]);
  const care = useCareFeed({ subscriptions, catalog: serviceCatalog, onEvents: handleCareEvents });

  const openAgentWith = useCallback((response) => {
    if (!response) return;
    setAgentMessages((current) => [...current, { id: "a-" + Date.now(), role: "agent", response }]);
    setAgentOpen(true);
  }, []);

  // 감지한 결제가 요금 인상·유료 전환·해지 후 결제면 경고 카드와 증빙 사건을 만들고, 아니면 기존처럼 빠른 등록을 연다.
  detectedPaymentHandlerRef.current = (detected) => {
    const alert = assessDetectedPayment({ detected, subscriptions, cancelHistory: readCancelHistory() });
    setAccountOpen(false);
    setTermsOpen(false);
    setNotificationCenterOpen(false);
    if (alert) {
      // 해지 확인 루프: 해지한 구독에서 결제가 잡히면 그 해지 기록을 '결제됨'으로 바꾼다.
      if (alert.kind === "charged_after_cancel") {
        const history = readCancelHistory();
        const record = findCancelRecordForPayment(detected, history, detected.detectedAt ? new Date(detected.detectedAt) : new Date());
        if (record) {
          writeCancelHistory(markRecordCharged(history, record));
          care.refreshHistory();
        }
      }
      persistEvidenceCase(profile?.user_id || null, createEvidenceCase(alert));
      setAddOpen(false);
      openAgentWith(alert);
      return;
    }
    setQuickAddData(detected);
    setAddInitialMode("quick-detect");
    setAddOpen(true);
  };

  renewalNotificationHandlerRef.current = (subscriptionId) => {
    const target = getSubscriptionById(subscriptionId);
    if (!target) {
      notify("알림의 구독을 찾지 못했어요. 이미 해지했는지 확인해 주세요.");
      return;
    }
    setNotificationCenterOpen(false);
    openAgentWith(buildRenewalResponse({ subscription: target }));
  };

  // 어카운트인포 이용시간에 맞춘 해지 다시 알림을 누르면 그 구독의 해지 안내를 바로 연다.
  cancelReminderHandlerRef.current = (subscriptionId) => {
    const target = getSubscriptionById(subscriptionId);
    if (!target) {
      notify("알림의 구독을 찾지 못했어요. 이미 해지했는지 확인해 주세요.");
      return;
    }
    setNotificationCenterOpen(false);
    startCancellation(target.subscriptionId);
  };

  // 오늘 챙길 일 알림을 누르면: 무료체험 D-2·순환 해지일은 해지 화면, 나머지는 홈의 '오늘 챙길 일'로 간다.
  careNotificationHandlerRef.current = (extra) => {
    setNotificationCenterOpen(false);
    if (CARE_CANCEL_TYPES.has(extra.type) && getSubscriptionById(extra.subscriptionId)) {
      startCancellation(extra.subscriptionId);
      return;
    }
    navigate("home");
  };

  // 해지했다고 처리한 구독은 목록에서 빠지므로, 해지 기록으로 결제 감지 흐름(증빙·환불 요청)을 다시 만든다.
  const openChargedAfterCancel = (record) => {
    if (!record) return;
    detectedPaymentHandlerRef.current?.({
      name: record.name,
      serviceId: record.serviceId || record.id,
      amount: record.amount,
      paymentMethod: record.paymentMethod || "",
      detectedAt: record.chargedAt || new Date().toISOString(),
      sourceType: "manual",
    });
  };

  const handleCareAction = async (item, action) => {
    const subscription = item.subscriptionId ? getSubscriptionById(item.subscriptionId) : null;
    switch (action) {
      case "cancel_no_charge":
        care.answerCancel(item.key, "no_charge");
        notify(item.serviceName + " 해지가 확인됐어요. 매달 " + formatWon(item.amount) + "을 아껴요.");
        break;
      case "cancel_charged":
        openChargedAfterCancel(care.answerCancel(item.key, "charged"));
        break;
      case "cancel_later":
        care.answerCancel(item.key, "later");
        notify("내일 오전 9시에 다시 물어볼게요.");
        break;
      case "open_refund":
        openChargedAfterCancel(item.record);
        break;
      case "start_cancel":
      case "rotation_act":
        if (item.reminderType === "rotation_resume") {
          // 다시 가입할 차례: 가입은 서비스에서 직접 하고, 꾸독에는 저장해 둔 정보로 바로 다시 등록한다.
          const snapshot = care.rotation?.services?.find((service) => service.subscriptionId === item.subscriptionId);
          setQuickAddData(snapshot ? { ...snapshot, subscriptionId: undefined, autoDetected: true, sourceType: "manual" } : null);
          setAddInitialMode(snapshot ? "quick-detect" : "manual");
          setAddOpen(true);
          care.ack(item.key);
          break;
        }
        if (subscription) startCancellation(subscription.subscriptionId);
        else notify("이미 목록에 없는 구독이에요. 해지됐는지 확인해 주세요.");
        if (action === "rotation_act") care.ack(item.key);
        break;
      case "trial_keep":
        care.ack(item.ackKey);
        notify(item.serviceName + "을 계속 쓰기로 했어요. 다음 결제부터 유료예요.");
        break;
      case "usage_used":
        if (subscription) care.answerUsage(subscription, "used");
        break;
      case "usage_unused":
        if (subscription) care.answerUsage(subscription, "unused");
        break;
      case "open_detail":
        navigate("detail", item.subscriptionId);
        break;
      case "share_settlement": {
        const result = await shareText({ title: item.request.title, text: item.request.message });
        if (result.method === "clipboard") notify("정산 요청 문구를 복사했어요. 카카오톡 단톡방에 붙여 넣어 보내세요.");
        else if (result.method === "web-share") notify("정산 요청을 공유했어요. 받으면 '이미 받았어요'를 눌러 주세요.");
        else if (!result.ok && result.method !== "cancelled") notify("공유하지 못했어요. 다시 시도해 주세요.");
        break;
      }
      case "open_rotation":
        setRotationOpen(true);
        break;
      case "dismiss":
        care.ack(item.key);
        break;
      default:
        break;
    }
  };

  const handleSaveRotation = (plan) => {
    care.saveRotation(plan);
    care.ack("rotation_suggest");
    setRotationOpen(false);
    scheduleSubscriptionNotifications(subscriptions).catch(() => {});
    notify("구독 순환 계획을 저장했어요. 해지·가입할 날마다 알려드릴게요.");
  };

  shareHandlerRef.current = (shared) => {
    setAccountOpen(false);
    setTermsOpen(false);
    setNotificationCenterOpen(false);
    if (shared.error === "IMAGE_TOO_LARGE") {
      notify("공유한 이미지가 8MB를 넘어요. 더 작은 캡처로 다시 공유해 주세요.");
      return;
    }
    if (shared.error) {
      notify("공유한 내용을 읽지 못했어요. 다시 공유해 주세요.");
      return;
    }
    if (shared.type === "text") {
      const detected = sharedTextToDetected(shared.text);
      if (detected) {
        detectedPaymentHandlerRef.current?.(detected);
        return;
      }
      notify("공유한 글에서 결제 정보를 찾지 못했어요. 직접 입력해 주세요.");
      setQuickAddData(null);
      setAddInitialMode("manual");
      setAddOpen(true);
      return;
    }
    const file = sharedImageToFile(shared);
    if (!file) {
      notify("JPG, PNG, WEBP 이미지만 등록할 수 있어요.");
      return;
    }
    setQuickAddData(null);
    setSharedFile(file);
    setAddInitialMode("ai");
    setAddOpen(true);
  };

  // 경고 카드에서 "계속 쓰기"를 고르면 등록 금액을 실제 결제 금액으로 맞춘다. 공동 이용이면 1인 부담금도 다시 나눈다.
  const handleAlertKeep = (alert) => {
    const target = getSubscriptionById(alert?.subscriptionId);
    if (!target) return;
    const shareCount = Number(target.shareCount) || 0;
    const update = target.sharingEnabled && shareCount > 1
      ? { grossAmount: alert.amount, amount: Math.round(alert.amount / shareCount) }
      : { grossAmount: alert.amount, amount: alert.amount };
    if (alert.kind === "trial_conversion") Object.assign(update, { status: "active", isTrial: false });
    updateSubscription(target.subscriptionId, update, notify);
  };

  
  // Supabase Auth session & state change listener
  useEffect(() => {
    if (!supabase) return;

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
  }, [navigate, notify, setOnboardingComplete, setProfile, setSubscriptions]);

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
    completeLogin("꾸독", user.nickname || accountId);
    notify(`${user.nickname || accountId}님, 환영합니다!`);
    return { success: true };
  };

  const handleRegisterComplete = ({ accountId, password, nickname }) => {
    saveUser({ accountId, password, nickname });
    completeLogin("꾸독", nickname);
    notify(`${nickname}님, 회원가입이 완료되었어요!`);
  };

  const handleLogout = async () => {
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

  const completeLogin = (provider, nickname) => {
    setProfile({ nickname: nickname || "사용자", provider, guest: false, notificationsAllowed: true });
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
    if (promotion?.link) {
      if (isNativePlatform()) {
        Browser.open({ url: promotion.link }).catch(() => {
          window.open(promotion.link, "_blank", "noopener,noreferrer");
        });
      } else {
        window.open(promotion.link, "_blank", "noopener,noreferrer");
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
        onAdd={() => { setAddInitialMode("manual"); setAddOpen(true); }}
        onScan={() => { setAddInitialMode("ai"); setAddOpen(true); }}
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
        onOpenAgent={() => setAgentOpen(true)}
        careSlot={
          <CareSection
            items={care.items}
            onAction={handleCareAction}
            hasRotation={Boolean(care.rotation)}
            onOpenRotation={() => setRotationOpen(true)}
          />
        }
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
    content = <PromotionScreen subscriptions={subscriptions} promotions={promotionCatalog} onOpenPromotion={handlePromotion} />;
  } else if (screen.route === "detail") {
    content = (
      <SubscriptionDetailScreen
        subscription={selectedSubscription}
        subscriptions={subscriptions}
        onUpdate={(id, update) => updateSubscription(id, update, notify)}
        onStartCancel={startCancellation}
        onToast={notify}
        onBack={() => {
          setHighlightCancelId(null);
          navigate("subscriptions");
        }}
        onDelete={(id) => {
          // '해지 완료로 표시'는 해지 기록을 남겨 해지 확인 루프와 해지 후 결제 경고가 이어지게 한다.
          finishCancellation(id);
          notify("해지 완료로 기록했어요. 다음 결제일까지 결제가 없는지 지켜볼게요.");
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
          initialFile={sharedFile}
          onClose={() => {
            setAddOpen(false);
            setQuickAddData(null);
            setSharedFile(null);
          }}
          onAdd={(data) => {
            const result = handleAddSubscription(data, notify);
            setQuickAddData(null);
            setSharedFile(null);
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
          onChannelChange={(id, channel) => updateSubscription(id, { paymentChannel: channel })}
        />
      )}
      {agentOpen && !cancelSubscription && (
        <AgentSheet
          subscriptions={subscriptions}
          messages={agentMessages}
          onMessagesChange={setAgentMessages}
          onClose={() => setAgentOpen(false)}
          onStartCancel={(subscriptionId, options) => {
            setAgentOpen(false);
            startCancellation(subscriptionId, null, options);
          }}
          onUpdateAmount={handleAlertKeep}
          userId={profile?.user_id || null}
          onToast={notify}
        />
      )}
      {rotationOpen && (
        <RotationSheet
          subscriptions={subscriptions}
          saved={care.rotation}
          onSave={handleSaveRotation}
          onClear={() => {
            care.clearRotation();
            setRotationOpen(false);
            scheduleSubscriptionNotifications(subscriptions).catch(() => {});
            notify("구독 순환 계획을 껐어요.");
          }}
          onClose={() => setRotationOpen(false)}
        />
      )}
      {renewalSubscription && !addOpen && !cancelSubscription && !notificationCenterOpen && !termsOpen && !agentOpen && (
        <RenewalSheet
          subscription={renewalSubscription}
          onKeep={() => handleRenewal(true, notify)}
          onCancel={() => handleRenewal(false, notify)}
          onClose={() => setRenewalTarget(null)}
        />
      )}
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
          userId={profile?.user_id || null}
          onToast={notify}
          onClose={() => setAccountOpen(false)}
          onUpdateNickname={handleUpdateNickname}
          onTestPaymentDetection={handleTestPaymentDetection}
          onRequestPaymentCapture={handleRequestPaymentCapture}
          onLogout={handleLogout}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
