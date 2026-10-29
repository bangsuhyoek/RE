import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Bell, LoaderCircle } from "lucide-react";
import { AuthLogin } from "./components/AuthScreens";
import { SplashScreen, LandingScreen } from "./components/LandingScreen";
import { requestPaymentCapturePermission, simulatePaymentDetection, gatedRequestPaymentCapturePermission, setPaymentCaptureConsent } from "./lib/paymentCapture";
import { PaymentCaptureDisclosureModal } from "./components/capture/PaymentCaptureDisclosureModal";
import { isNativePlatform } from "./lib/platform";
import { HomeScreen } from "./components/HomeScreen";
import { AppHeader, BottomNavigation, Toast } from "./components/ui";
import { SyncStatusIndicator } from "./components/SyncStatusIndicator";
import { loadSubscriptionData } from "./data/catalogLoader";
import {
  clearUserScopedData,
  migrateLocalUsersToGuest,
  removeDemoSubscriptions,
  storageKeys,
  readStoredValue,
  clearStoredValue,
  runLogoutFlow,
  shouldClearUserDataOnAccountSwitch,
  readCancelHistory,
  writeCancelHistory,
} from "./lib/storage";
import { persistEvidenceCase } from "./lib/evidenceStore";
import { clearAllCancelProofs, retryPendingCancelProofWipe } from "./lib/cancelProof";
import {
  cancelScheduledUserNotifications,
  generateSubscriptionAlerts,
  registerNotificationActionTypes,
  scheduleSubscriptionNotifications,
} from "./lib/notifications";
import { sharedImageToFile, sharedTextToDetected } from "./lib/shareIntake";
import { assessDetectedPayment, buildRenewalResponse, createEvidenceCase, findCancelRecordForPayment } from "./lib/subscriptionAgent";
import { markRecordCharged, recordKey } from "./lib/cancelVerification";
import { shareText } from "./lib/shareText";
import { formatWon } from "./lib/dates";
import { useCareFeed } from "./hooks/useCareFeed";
import { useAgentInsights } from "./hooks/useAgentInsights";
import { CareSection } from "./components/CareSection";
import { useNavigation } from "./hooks/useNavigation";
import { useSubscriptions, createSubscription } from "./hooks/useSubscriptions";
import { useNotificationManager } from "./hooks/useNotificationManager";
import { useAppRouting } from "./hooks/useAppRouting";
import { supabase, isSupabaseConfigured, signInWithGoogle, signOut, upsertDbSubscription } from "./lib/supabase";
import { getInitialPromotions, loadLivePromotions } from "./lib/promotionsSync";
import { buildDiscoveredSubscriptions } from "./lib/subscriptionDiscovery";
import { clearConsentOnSignOut } from "./lib/consentStore";
import { clearCancelBrowserSession } from "./lib/cancelBrowser";

// 첫 화면(랜딩·홈)에 필요 없는 화면과 시트는 열 때 불러와 첫 로딩 묶음을 줄인다.
const lazyNamed = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })));
const AddModal = lazyNamed(() => import("./components/AddModal"), "AddModal");
const SubscriptionDiscoveryModal = lazyNamed(() => import("./components/SubscriptionDiscoveryModal"), "SubscriptionDiscoveryModal");
const AccountModal = lazyNamed(() => import("./components/AccountModal"), "AccountModal");
const TermsModal = lazyNamed(() => import("./components/TermsModal"), "TermsModal");
const CancelModal = lazyNamed(() => import("./components/CancelModal"), "CancelModal");
const AgentSheet = lazyNamed(() => import("./components/AgentSheet"), "AgentSheet");
const OnboardingScreen = lazyNamed(() => import("./components/OnboardingScreen"), "OnboardingScreen");
const PromotionScreen = lazyNamed(() => import("./components/PromotionScreen"), "PromotionScreen");
const RenewalSheet = lazyNamed(() => import("./components/RenewalSheet"), "RenewalSheet");
const RotationSheet = lazyNamed(() => import("./components/RotationSheet"), "RotationSheet");
const NotificationCenterModal = lazyNamed(() => import("./components/NotificationComponents"), "NotificationCenterModal");
const CalendarScreen = lazyNamed(() => import("./components/CalendarScreen"), "CalendarScreen");
const SubscriptionDetailScreen = lazyNamed(() => import("./components/SubscriptionDetailScreen"), "SubscriptionDetailScreen");
const SubscriptionListScreen = lazyNamed(() => import("./components/SubscriptionListScreen"), "SubscriptionListScreen");

function ScreenFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="화면을 불러오는 중">
      <LoaderCircle size={26} className="animate-spin text-[#153D2E]" />
    </div>
  );
}

function SheetFallback() {
  return (
    <div className="sheet-backdrop fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" role="status" aria-label="불러오는 중">
      <div className="sheet-slide-up fixed inset-x-0 bottom-0 z-50 mx-auto grid h-44 w-full max-w-full place-items-center rounded-t-[24px] border-t border-[#F2F4F6] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] sm:max-w-[440px]">
        <LoaderCircle size={26} className="animate-spin text-[#153D2E]" />
      </div>
    </div>
  );
}

async function clearLocalAccountData(ownerUserId) {
  clearUserScopedData(ownerUserId);
  const [proofsCleared, notificationsCleared] = await Promise.all([
    clearAllCancelProofs(ownerUserId),
    cancelScheduledUserNotifications(),
  ]);
  if (!proofsCleared) console.warn("Could not clear all local cancel proofs.");
  if (!notificationsCleared) console.warn("Could not cancel all local notifications.");
}

function AppContent({ onAccountToast, onUserScopeChange }) {
  const [addOpen, setAddOpen] = useState(false);
  const [addInitialMode, setAddInitialMode] = useState("manual");
  const [quickAddData, setQuickAddData] = useState(null);
  const [sharedFile, setSharedFile] = useState(null);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsTab, setTermsTab] = useState("terms");
  const [paymentCaptureDisclosureOpen, setPaymentCaptureDisclosureOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentInitialInsight, setAgentInitialInsight] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [livePromotions, setLivePromotions] = useState(() =>
    getInitialPromotions({ fallbackPromotions: [] })
  );
  // 알림·딥링크 리스너는 앱 시작 때 한 번만 등록되므로 최신 처리 함수를 ref로 넘긴다.
  const detectedPaymentHandlerRef = useRef(null);
  const renewalNotificationHandlerRef = useRef(null);
  const cancelReminderHandlerRef = useRef(null);
  const careNotificationHandlerRef = useRef(null);
  const agentNotificationHandlerRef = useRef(null);
  const usageNotificationHandlerRef = useRef(null);
  const shareHandlerRef = useRef(null);
  const closeNotificationCenterRef = useRef(null);
  const explicitLogoutInProgressRef = useRef(false);
  const [rotationOpen, setRotationOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("kudok_splash_shown");
    }
    return false;
  });

  useEffect(() => {
    migrateLocalUsersToGuest();
    registerNotificationActionTypes().catch(() => {});
    retryPendingCancelProofWipe().catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    loadSubscriptionData().then((mod) => {
      if (active && mod?.serviceCatalog) {
        setCatalog(mod.serviceCatalog);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadSubscriptionData().then((mod) => {
      if (!active) return;
      loadLivePromotions({
        fallbackPromotions: mod?.promotionCatalog || [],
        supabaseClient: supabase,
      }).then((items) => {
        if (active && Array.isArray(items) && items.length > 0) {
          setLivePromotions(items);
        }
      });
    });
    return () => {
      active = false;
    };
  }, []);

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


  useAppRouting({
    detectedPaymentHandlerRef,
    renewalNotificationHandlerRef,
    cancelReminderHandlerRef,
    careNotificationHandlerRef,
    agentNotificationHandlerRef,
    usageNotificationHandlerRef,
    shareHandlerRef,
    closeNotificationCenterRef,
    navigate,
  });


  const handleOpenTerms = (tab = "terms") => {
    setTermsTab(tab);
    setTermsOpen(true);
  };

  const handleRequestPaymentCapture = async () => {
    if (!isNativePlatform()) {
      handleOpenTerms("permissions");
      notify("웹 환경입니다. 앱 접근 권한 안내 문서를 표시합니다.");
      return;
    }

    const res = await gatedRequestPaymentCapturePermission({
      userId: profile?.user_id || null,
      onRequireDisclosure: () => {
        setPaymentCaptureDisclosureOpen(true);
      },
    });

    if (res?.status === "PERMISSION_GRANTED" || res?.status === "REQUESTED") {
      notify("시스템 설정에서 꾸독 '알림 접근 허용'을 켜주세요.");
    }
  };

  const handleConfirmPaymentCaptureDisclosure = async () => {
    setPaymentCaptureConsent(true, null, profile?.user_id || null);
    setPaymentCaptureDisclosureOpen(false);
    if (isNativePlatform()) {
      await requestPaymentCapturePermission();
      notify("시스템 설정에서 꾸독 '알림 접근 허용'을 켜주세요.");
    }
  };

  // 결제 시뮬레이션 버튼 핸들러 (DEV 환경에서만 동작)
  const handleTestPaymentDetection = import.meta.env.DEV
    ? async () => {
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
      }
    : undefined;


  // Subscriptions domain state
  const {
    profile,
    setProfile,
    subscriptions,
    setSubscriptions,
    savedAmount,
    setOnboardingComplete,
    selectedOnboarding,
    setSelectedOnboarding,
    cancelTarget,
    setCancelTarget,
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
    refreshSubscriptions,
    retryFirstLoginMigration,
    migrationError,
    syncState,
    pendingRetryCount,
    retrySync,
  } = useSubscriptions({ currentRoute: screen.route, catalog, onAccountScopeChange: onUserScopeChange });
  const userScopeKey = profile ? (profile.user_id ? `user:${profile.user_id}` : "guest") : "signed-out";

  // Notifications domain state
  const {
    notifications,
    setNotifications,
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
  closeNotificationCenterRef.current = () => setNotificationCenterOpen(false);

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
  const care = useCareFeed({ subscriptions, catalog, onEvents: handleCareEvents });
  const { topInsight: agentInsight, dismiss: dismissAgentInsight } = useAgentInsights(subscriptions);

  const previousUserScopeRef = useRef(userScopeKey);
  useEffect(() => {
    if (previousUserScopeRef.current === userScopeKey) return;
    const previousScope = previousUserScopeRef.current;
    previousUserScopeRef.current = userScopeKey;

    // 계정 범위가 바뀌면 이전 사용자의 대화·초안·열린 시트가 새 화면에 남지 않게 닫는다.
    setAgentMessages([]);
    setAgentInitialInsight(null);
    setAgentOpen(false);
    setNotificationCenterOpen(false);
    setAddOpen(false);
    setQuickAddData(null);
    setSharedFile(null);
    setDiscoveryOpen(false);
    setAccountOpen(false);
    setTermsOpen(false);
    setPaymentCaptureDisclosureOpen(false);
    setRotationOpen(false);
    setCancelTarget(null);
    setRenewalTarget(null);
    setSelectedOnboarding([]);
    setHighlightCancelId(null);
    // 알림 기록·순환 계획은 실사용자 A→B 전환에서만 지운다. 게스트·세션 만료는 보존한다.
    if (shouldClearUserDataOnAccountSwitch(previousScope, userScopeKey)) {
      clearAll();
      care.clearRotation();
    }
    care.refreshHistory();
  }, [
    care,
    clearAll,
    setCancelTarget,
    setHighlightCancelId,
    setNotificationCenterOpen,
    setRenewalTarget,
    setSelectedOnboarding,
    userScopeKey,
  ]);

  const handleOpenAgentInsight = useCallback((insight) => {
    setAgentInitialInsight(insight);
    setAgentOpen(true);
  }, []);

  agentNotificationHandlerRef.current = (insight) => {
    setNotificationCenterOpen(false);
    setAgentInitialInsight(insight || null);
    setAgentOpen(true);
  };

  const handleAddSubscriptionFromAgent = useCallback((payload) => {
    const dueDay = payload.billingDay || (payload.nextChargeDate ? Number(String(payload.nextChargeDate).split("-")[2]) : 1);
    const nextBillingDate = payload.billingCycle === "매년" ? payload.nextChargeDate : null;
    return handleAddSubscription({
      ...payload,
      dueDay,
      nextBillingDate,
    }, notify);
  }, [handleAddSubscription, notify]);

  const handleUpdateSubscriptionFromAgent = useCallback((id, changes) => {
    const mapped = { ...changes }; if (changes.billingDay !== undefined) { mapped.dueDay = Number(changes.billingDay); } else if (changes.nextChargeDate) { const parsedDay = Number(String(changes.nextChargeDate).split("-")[2]); if (Number.isFinite(parsedDay) && parsedDay >= 1 && parsedDay <= 31) { mapped.dueDay = parsedDay; } } if (changes.nextChargeDate !== undefined) { mapped.nextBillingDate = changes.nextChargeDate; } if (changes.amount !== undefined) { mapped.amount = Number(changes.amount); } updateSubscription(id, mapped, notify);
  }, [updateSubscription, notify]);

  const handleSetAlertsFromAgent = useCallback((id, { alertD3, alertD1 }) => {
    if (id === "all") {
      subscriptions.filter((s) => s.status !== "cancelled").forEach((s) => updateSubscription(s.subscriptionId || s.id, { alertD3, alertD1 }));
      notify("모든 구독의 사전 알림을 설정했어요.");
    } else {
      updateSubscription(id, { alertD3, alertD1 }, notify);
    }
  }, [subscriptions, updateSubscription, notify]);

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
  careNotificationHandlerRef.current = (route) => {
    setNotificationCenterOpen(false);
    if (route.kind === "care_cancel" && getSubscriptionById(route.subscriptionId)) {
      startCancellation(route.subscriptionId);
      return;
    }
    navigate("home");
  };

  usageNotificationHandlerRef.current = (extra, actionId) => {
    if (extra.type === "usage_cancel_suggest") {
      setNotificationCenterOpen(false);
      setHighlightCancelId(extra.subscriptionId);
      navigate("detail", extra.subscriptionId);
      return;
    }
    if (extra.type === "usage_check") {
      if (actionId === "used" || actionId === "unused") {
        const sub = getSubscriptionById(extra.subscriptionId);
        if (!sub || !extra.cycleKey) return;
        care.answerUsage(sub, actionId, extra.cycleKey);
        notify("기록했어요");
        return;
      }
      setNotificationCenterOpen(false);
      navigate("detail", extra.subscriptionId);
      return;
    }
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
    scheduleSubscriptionNotifications(subscriptions, new Date(), { savedAmount }).catch(() => {});
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
        setProfile((prev) => {
          const sameUser = prev?.user_id === user.id;
          return {
            ...(prev || {}),
            user_id: user.id,
            nickname: sameUser && prev?.nickname ? prev.nickname : nickname,
            email: user.email,
            provider: "Google",
            guest: false,
            notificationsAllowed: prev?.notificationsAllowed ?? true,
          };
        });
        if (
          typeof window !== "undefined" &&
          (!window.location.hash || window.location.hash.startsWith("#/login"))
        ) {
          navigate("home");
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const user = session.user;
        const nickname = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "사용자";
        setProfile((prev) => {
          const sameUser = prev?.user_id === user.id;
          return {
            ...(prev || {}),
            user_id: user.id,
            nickname: sameUser && prev?.nickname ? prev.nickname : nickname,
            email: user.email,
            provider: "Google",
            guest: false,
            notificationsAllowed: prev?.notificationsAllowed ?? true,
          };
        });
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
            } catch {
              // 세션 스토리지 접근이 막힌 환경(시크릿 모드 등)에서는 무시한다
            }
          }
          navigate("home");
          onAccountToast?.(nickname + "님, 구글 계정으로 로그인되었어요!");
        }
      } else if (event === "SIGNED_OUT") {
        // 명시적 로그아웃은 handleLogout이 세션 확인 후 한 번만 정리한다.
        // 세션 만료·강제 SIGNED_OUT에서는 어떤 사용자 데이터도 지우지 않는다.
        if (explicitLogoutInProgressRef.current) return;
        googleAuthNotifiedUserRef.current = null;
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem("submate_google_login_notified_user");
          } catch {
            // 세션 스토리지 접근이 막힌 환경(시크릿 모드 등)에서는 무시한다
          }
        }
        setProfile(null);
        setSubscriptions([]);
        navigate("login");
        onAccountToast?.("세션이 만료되어 로그인 화면으로 이동했어요.");
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate, notify, onAccountToast, setOnboardingComplete, setProfile, setSubscriptions]);

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

  // Hardware back button handler: keep latest state in a ref so listener is registered once on mount.
  const handleBackButton = useCallback(() => {
    if (paymentCaptureDisclosureOpen) {
      setPaymentCaptureDisclosureOpen(false);
    } else if (termsOpen) {
      setTermsOpen(false);
    } else if (accountOpen) {
      setAccountOpen(false);
    } else if (notificationCenterOpen) {
      setNotificationCenterOpen(false);
    } else if (discoveryOpen) {
      setDiscoveryOpen(false);
    } else if (addOpen) {
      setAddOpen(false);
    } else if (cancelTarget) {
      closeCancellation();
    } else if (agentOpen) {
      setAgentOpen(false);
    } else if (rotationOpen) {
      setRotationOpen(false);
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
  }, [
    paymentCaptureDisclosureOpen,
    termsOpen,
    accountOpen,
    notificationCenterOpen,
    discoveryOpen,
    addOpen,
    cancelTarget,
    agentOpen,
    rotationOpen,
    renewalTarget,
    screen.route,
    closeCancellation,
    navigate,
    setHighlightCancelId,
    setNotificationCenterOpen,
    setRenewalTarget,
  ]);

  const backButtonHandlerRef = useRef(handleBackButton);
  useEffect(() => {
    backButtonHandlerRef.current = handleBackButton;
  }, [handleBackButton]);

  // Hardware back button support for Android (Capacitor)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let listenerHandle = null;

    CapApp.addListener("backButton", () => {
      backButtonHandlerRef.current?.();
    }).then((handle) => {
      if (cancelled) {
        handle?.remove();
      } else {
        listenerHandle = handle;
      }
    });

    return () => {
      cancelled = true;
      listenerHandle?.remove();
    };
  }, []);

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

  const handleGuestLogin = () => {
    setProfile({ nickname: "체험 사용자", provider: "Guest", guest: true, notificationsAllowed: true });
    navigate("home");
  };

  const handleRefreshSubscriptions = async () => {
    const result = await refreshSubscriptions();
    if (result?.ok) {
      notify("최신 구독 목록으로 동기화했어요.");
    } else if (result?.reason === "not_signed_in") {
      notify("로그인하면 구독 목록을 새로고침할 수 있어요.");
    } else {
      notify("구독 목록을 새로고침하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleLogout = async () => {
    setAccountOpen(false);
    const ownerUserId = profile?.user_id || null;
    const isRemoteUser = Boolean(isSupabaseConfigured && ownerUserId);

    const clearLocalSession = async () => {
      // HEAD와 동일하게 게스트·로컬 계정의 구독·채팅·증빙은 보존한다.
      googleAuthNotifiedUserRef.current = null;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("submate_google_login_notified_user");
        } catch {
          // 세션 스토리지 접근이 막힌 환경(시크릿 모드 등)에서는 무시한다
        }
      }
      clearConsentOnSignOut();
      clearCancelBrowserSession().catch(() => {});
      clearStoredValue(storageKeys.syncTombstones);
      clearStoredValue(storageKeys.syncRetryQueue);
      setProfile(null);
      setSubscriptions([]);
      navigate("login");
    };

    const finishRemoteLogout = async () => {
      googleAuthNotifiedUserRef.current = null;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("submate_google_login_notified_user");
        } catch {
          // 세션 스토리지 접근이 막힌 환경(시크릿 모드 등)에서는 무시한다
        }
      }
      clearConsentOnSignOut();
      await clearCancelBrowserSession().catch(() => {});
      clearAll();
      care.clearRotation();
      clearUserScopedData(ownerUserId);
      setProfile(null);
      setSubscriptions([]);
      setOnboardingComplete(false);
      navigate("login");
    };

    if (isRemoteUser) explicitLogoutInProgressRef.current = true;
    const result = await runLogoutFlow({
      isRemoteUser,
      signOut,
      getSession: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session;
      },
      clearRemoteData: () => clearLocalAccountData(ownerUserId),
      clearLocalSession,
    });
    explicitLogoutInProgressRef.current = false;

    if (result.ok) {
      if (isRemoteUser) await finishRemoteLogout();
      onAccountToast?.("로그아웃되었습니다.");
    } else {
      console.error("Sign out failed:", result.error);
      onAccountToast?.("로그아웃하지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
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
      : catalog.filter((service) => selectedOnboarding.includes(service.id));
    const created = itemsToCreate.map((item, idx) => createSubscription(item, idx));
    setSubscriptions((current) => {
      const currentList = Array.isArray(current) ? current : [];
      const existingIds = new Set(currentList.map((s) => s.subscriptionId || s.id));
      const newlyAdded = created.filter((s) => !existingIds.has(s.subscriptionId || s.id));
      return [...currentList, ...newlyAdded];
    });
    if (profile?.user_id) {
      created.forEach((sub) => upsertDbSubscription(profile.user_id, sub));
    }
    setOnboardingComplete(true);
    setNotifications((current) => [
      ...generateSubscriptionAlerts(created),
      ...(Array.isArray(current) ? current : []),
    ]);
    navigate("home");
    notify(`${created.length}개 구독을 추가했어요.`);
  };

  const handleOnboardingSkip = () => {
    setOnboardingComplete(true);
    navigate("home");
  };

  const handleAddSubscriptionBatch = useCallback((items = []) => {
    if (!Array.isArray(items) || items.length === 0) return;
    // 묶음 전체를 한 번에 만들고 한 번에 반영한다. 기존 목록·묶음 안의 중복은 빼고 항목마다 고유 ID 를 붙인다.
    const { records, skippedCount } = buildDiscoveredSubscriptions(items, subscriptions, { catalog });
    if (records.length === 0) {
      notify("선택한 구독은 이미 등록되어 있어요.");
      return;
    }
    setSubscriptions((current) => [...records, ...current]);
    if (profile?.user_id) {
      records.forEach((record) => upsertDbSubscription(profile.user_id, record).catch(console.error));
    }
    setOnboardingComplete(true);
    if (screen.route === "onboarding") {
      navigate("home");
    }
    notify(
      records.length + "개의 숨은 구독을 한 번에 등록했어요!" +
      (skippedCount > 0 ? " (이미 있는 " + skippedCount + "개는 제외)" : "")
    );
  }, [catalog, navigate, notify, profile?.user_id, screen.route, setOnboardingComplete, setSubscriptions, subscriptions]);

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
  } else if (screen.route === "onboarding") {

    content = (
      <OnboardingScreen
        catalog={catalog}
        selectedIds={selectedOnboarding}
        onToggle={(id) =>
          setSelectedOnboarding((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
          )
        }
        onFinish={handleOnboardingFinish}
        onSkip={handleOnboardingSkip}
        onOpenDiscovery={() => setDiscoveryOpen(true)}
      />
    );
  } else if (screen.route === "home") {
    content = (
      <HomeScreen
        subscriptions={subscriptions}
        promotions={livePromotions}
        unreadCount={unreadCount}
        profile={profile}
        notificationDenied={profile?.notificationsAllowed === false}
        onOpenSubscription={(id) => navigate("detail", id)}
        onShowAll={() => navigate("subscriptions")}
        onOpenPromotion={handlePromotion}
        onExplorePromotions={() => navigate("promotions")}
        onAdd={() => { setAddInitialMode("manual"); setAddOpen(true); }}
        onScan={() => { setAddInitialMode("ai"); setAddOpen(true); }}
        onOpenDiscovery={() => setDiscoveryOpen(true)}
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
        agentInsight={agentInsight}
        onOpenAgentInsight={handleOpenAgentInsight}
        onDismissInsight={dismissAgentInsight}
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
        cancelHistory={care.cancelHistory}
        savedAmount={savedAmount}
        onOpen={(id) => navigate("detail", id)}
        onAdd={() => { setAddInitialMode("manual"); setAddOpen(true); }}
        onStartCancel={startCancellation}
        onMute={(id) => muteSubscription(id, notify)}
        onRefresh={handleRefreshSubscriptions}
        onTogglePin={(id) => togglePinSubscription(id, notify)}
        onAnswerCancel={(record, answer) => {
          const key = recordKey(record);
          if (answer === "no_charge") {
            care.answerCancel(key, "no_charge");
            notify(record.name + " 해지가 확인됐어요. 매달 " + formatWon(record.amount) + "을 아껴요.");
          } else if (answer === "charged") {
            openChargedAfterCancel(care.answerCancel(key, "charged"));
          }
        }}
        onToast={notify}
      />
    );
  } else if (screen.route === "calendar") {
    content = <CalendarScreen subscriptions={subscriptions} onOpen={(id) => navigate("detail", id)} />;
  } else if (screen.route === "promotions") {
    content = <PromotionScreen catalog={catalog} subscriptions={subscriptions} promotions={livePromotions} onOpenPromotion={handlePromotion} />;
  } else if (screen.route === "detail") {
    content = (
      <SubscriptionDetailScreen
        catalog={catalog}
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
        promotion={livePromotions.find((p) => p.sourceServiceIds?.includes(selectedSubscription?.id))}
        onTriggerNotification={(sub) => handleTriggerTestNotification(sub, notify)}
        highlightCancel={highlightCancelId === (selectedSubscription?.subscriptionId || selectedSubscription?.id)}
        userId={profile?.user_id || null}
      />
    );
  } else {
    content = (
      <AuthLogin
        onSocial={handleSocialLogin}
        onGuest={handleGuestLogin}
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
      <SyncStatusIndicator
        syncState={syncState}
        pendingRetryCount={pendingRetryCount}
        onRetry={retrySync}
      />
      {migrationError && (
        <div
          role="alert"
          className="mx-auto mt-2 flex w-full max-w-md items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          <span className="flex-1">이 기기의 기존 데이터를 계정으로 옮기지 못했어요</span>
          <button
            type="button"
            onClick={retryFirstLoginMigration}
            className="shrink-0 rounded-lg bg-amber-900 px-2.5 py-1 font-semibold text-white"
          >
            다시 시도
          </button>
        </div>
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
      <Suspense fallback={<ScreenFallback />}>{content}</Suspense>
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
      <Suspense fallback={<SheetFallback />}>
      {addOpen && (
        <AddModal
          catalog={catalog}
          subscriptions={subscriptions}
          initialMode={addInitialMode}
          initialData={quickAddData}
          initialFile={sharedFile}
          onClose={() => {
            setAddOpen(false);
            setQuickAddData(null);
            setSharedFile(null);
          }}
          onOpenDiscovery={() => {
            setAddOpen(false);
            setDiscoveryOpen(true);
          }}
          onAdd={(data) => {
            const result = handleAddSubscription(data, notify);
            setQuickAddData(null);
            setSharedFile(null);
            return result;
          }}
        />
      )}
      {discoveryOpen && (
        <SubscriptionDiscoveryModal
          catalog={catalog}
          subscriptions={subscriptions}
          onClose={() => setDiscoveryOpen(false)}
          onAddBatch={handleAddSubscriptionBatch}
          notify={notify}
        />
      )}
      {cancelSubscription && (
        <CancelModal
          catalog={catalog}
          subscription={cancelSubscription}
          promotion={cancelTarget?.promotion}
          autoOpen={cancelTarget?.autoOpen}
          onClose={closeCancellation}
          onComplete={(id, saved) => finishCancellation(id, saved, () => {
            if (screen.route === "detail") navigate("subscriptions");
          })}
          onToast={notify}
          onChannelChange={(id, channel) => updateSubscription(id, { paymentChannel: channel })}
          subscriptions={subscriptions}
          rotationPlan={care.rotation}
          onOpenRotation={() => {
            closeCancellation();
            setRotationOpen(true);
          }}
          userId={profile?.user_id || null}
        />
      )}
      {agentOpen && !cancelSubscription && (
        <AgentSheet
          subscriptions={subscriptions}
          messages={agentMessages}
          onMessagesChange={setAgentMessages}
          onClose={() => { setAgentOpen(false); setAgentInitialInsight(null); }}
          initialInsight={agentInitialInsight}
          onAddSubscription={handleAddSubscriptionFromAgent}
          onUpdateSubscription={handleUpdateSubscriptionFromAgent}
          onSetAlerts={handleSetAlertsFromAgent}
          onStartCancel={(subscriptionId, options) => {
            setAgentOpen(false);
            startCancellation(subscriptionId, null, options);
          }}
          onUpdateAmount={handleAlertKeep}
          userId={profile?.user_id || null}
          onToast={notify}
          usageAnswers={care.usageAnswers}
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
            scheduleSubscriptionNotifications(subscriptions, new Date(), { savedAmount }).catch(() => {});
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
      {paymentCaptureDisclosureOpen && (
        <PaymentCaptureDisclosureModal
          isOpen={paymentCaptureDisclosureOpen}
          onConfirm={handleConfirmPaymentCaptureDisclosure}
          onCancel={() => setPaymentCaptureDisclosureOpen(false)}
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
      </Suspense>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default function App() {
  const [accountScopeVersion, setAccountScopeVersion] = useState(0);
  const [accountToast, setAccountToast] = useState(null);
  const handleUserScopeChange = useCallback(() => {
    setAccountScopeVersion((version) => version + 1);
  }, []);
  const showAccountToast = useCallback((message, duration = 6000) => {
    setAccountToast({ message, duration, id: Date.now() });
  }, []);

  return (
    <>
      <AppContent
        key={accountScopeVersion}
        onAccountToast={showAccountToast}
        onUserScopeChange={handleUserScopeChange}
      />
      <Toast toast={accountToast} onClose={() => setAccountToast(null)} />
    </>
  );
}
