import { useCallback, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Bell } from "lucide-react";
import { AuthLogin, AuthRegister } from "./components/AuthScreens";
import { AddModal } from "./components/AddModal";
import { CancelModal } from "./components/CancelModal";
import { HomeScreen } from "./components/HomeScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { PromotionScreen } from "./components/PromotionScreen";
import { RenewalSheet } from "./components/RenewalSheet";
import { CalendarScreen, SubscriptionDetailScreen, SubscriptionListScreen } from "./components/SubscriptionScreens";
import { PushNotificationBanner, NotificationCenterModal } from "./components/NotificationComponents";
import { AppHeader, BottomNavigation, Toast } from "./components/ui";
import { createMockSubscriptions, promotionCatalog, serviceCatalog } from "./data/subscriptionData";
import { removeDemoSubscriptions } from "./lib/storage";
import { generateSubscriptionAlerts } from "./lib/notifications";
import { useNavigation } from "./hooks/useNavigation";
import { useSubscriptions, createSubscription } from "./hooks/useSubscriptions";
import { useNotificationManager } from "./hooks/useNotificationManager";

export default function App() {
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, duration = 3500) => {
    setToast({ message, duration, id: Date.now() });
  }, []);

  // Hash-based navigation
  const {
    screen,
    navigate,
    highlightCancelId,
    setHighlightCancelId,
    hasAppChrome,
    pageTitle,
  } = useNavigation();

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
    muteSubscription,
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

  // Handle URL query actions (?banner=1, ?notifications=1)
  useEffect(() => {
    if (screen.params?.get("banner") === "1") {
      const generated = generateSubscriptionAlerts(subscriptions.length ? subscriptions : createMockSubscriptions());
      setActiveBanner(generated[0] || null);
    }
    if (screen.params?.get("notifications") === "1") {
      setNotificationCenterOpen(true);
    }
  }, [screen, subscriptions, setActiveBanner, setNotificationCenterOpen]);

  // Hardware back button support for Android (Capacitor)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle = null;
    CapApp.addListener("backButton", () => {
      if (notificationCenterOpen) {
        setNotificationCenterOpen(false);
      } else if (addOpen) {
        setAddOpen(false);
      } else if (cancelTarget) {
        closeCancellation();
      } else if (renewalTarget) {
        setRenewalTarget(null);
      } else if (activeBanner) {
        setActiveBanner(null);
      } else if (screen.route === "detail") {
        setHighlightCancelId(null);
        navigate("subscriptions");
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
    notificationCenterOpen,
    addOpen,
    cancelTarget,
    renewalTarget,
    activeBanner,
    screen.route,
    closeCancellation,
    navigate,
    setHighlightCancelId,
    setNotificationCenterOpen,
    setRenewalTarget,
    setActiveBanner,
  ]);

  const selectedSubscription = useMemo(
    () => getSubscriptionById(screen.id),
    [getSubscriptionById, screen.id]
  );

  const completeLogin = (provider, nickname, guest = false) => {
    setProfile({ nickname: nickname || "민수", provider, guest, notificationsAllowed: true });
    if (guest) {
      const mockSubs = createMockSubscriptions();
      setSubscriptions(mockSubs);
      setOnboardingComplete(true);
      setNotifications(generateSubscriptionAlerts(mockSubs));
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
    setNotifications(generateSubscriptionAlerts(created));
    navigate("home");
    notify(`${picked.length}개 구독을 추가했어요.`);
  };

  const handleOnboardingSkip = () => {
    setSubscriptions([]);
    setOnboardingComplete(true);
    navigate("home");
  };

  const handlePromotion = useCallback((promotion) => {
    const source = subscriptions.find((subscription) => promotion.sourceServiceIds.includes(subscription.id));
    if (source) {
      startCancellation(source.subscriptionId, promotion);
      return;
    }
    window.open(promotion.link, "_blank", "noopener,noreferrer");
    notify("제휴 혜택 페이지를 새 탭에서 열었어요.");
  }, [subscriptions, startCancellation, notify]);

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
        onOpenSubscription={(id) => navigate("detail", id)}
        onShowAll={() => navigate("subscriptions")}
        onOpenPromotion={handlePromotion}
        onExplorePromotions={() => navigate("promotions")}
        onAdd={() => setAddOpen(true)}
        onStartOnboarding={() => navigate("onboarding")}
        onToggleNotificationPermission={() =>
          handleTogglePermissionFromHome(
            profile,
            (allowed) => setProfile((p) => ({ ...(p || {}), notificationsAllowed: allowed })),
            notify
          )
        }
        onOpenNotificationCenter={() => setNotificationCenterOpen(true)}
        onTriggerTestNotification={() => handleTriggerTestNotification(null, notify)}
      />
    );
  } else if (screen.route === "subscriptions") {
    content = (
      <SubscriptionListScreen
        subscriptions={subscriptions}
        onOpen={(id) => navigate("detail", id)}
        onAdd={() => setAddOpen(true)}
        onStartCancel={startCancellation}
        onMute={(id) => muteSubscription(id, notify)}
        onRefresh={() => notify("최신 구독 목록을 확인했어요.")}
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
        onUpdate={(id, update) => updateSubscription(id, update, notify)}
        onStartCancel={startCancellation}
        onBack={() => {
          setHighlightCancelId(null);
          navigate("subscriptions");
        }}
        promotion={promotionCatalog.find((p) => p.sourceServiceIds?.includes(selectedSubscription?.id))}
        onTriggerNotification={(sub) => handleTriggerTestNotification(sub, notify)}
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
          catalog={serviceCatalog}
          onClose={() => setAddOpen(false)}
          onAdd={(data) => handleAddSubscription(data, notify)}
        />
      )}
      {cancelSubscription && (
        <CancelModal
          subscription={cancelSubscription}
          promotion={cancelTarget?.promotion}
          onClose={closeCancellation}
          onComplete={(id, saved) => finishCancellation(id, saved, () => {
            if (screen.route === "detail") navigate("subscriptions");
          })}
          onToast={notify}
        />
      )}
      {renewalSubscription && (
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
        onOpenDetail={(subId) => handleOpenDetailFromNotification(subId, (id) => {
          setHighlightCancelId(id);
          navigate("detail", id);
        })}
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
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
