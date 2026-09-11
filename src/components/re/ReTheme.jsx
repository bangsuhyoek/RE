import React, { useState } from "react";
import {
  Home,
  CreditCard,
  CalendarDays,
  Gift,
  Settings,
  Bell,
  ArrowLeft,
} from "lucide-react";
import {
  ReHomeScreen,
  ReSubscriptionsScreen,
  ReDetailScreen,
  ReCalendarScreen,
  ReBenefitsScreen,
  ReNotificationScreen,
  ReMyPageScreen,
} from "./ReScreens";
import {
  ReLandingScreen,
  ReLoginScreen,
  ReSignUpScreen,
} from "./ReAuth";

// Phone Status Bar
function ReStatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-slate-800 text-[12px] font-semibold tracking-tight select-none">
      <span>9:41</span>
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="w-3 h-3 flex items-center justify-center">▲</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// Brand Header Bar
function ReHeader({ onOpenNotifications, unreadCount = 2 }) {
  return (
    <header className="px-5 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <img
          src="/assets/re/slices/logo_crop.png"
          alt="RE."
          className="h-7 object-contain"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>
      <button
        type="button"
        onClick={onOpenNotifications}
        className="relative w-9 h-9 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-slate-700 shadow-xs border border-white/80 transition-transform active:scale-95"
        aria-label="알림 열기"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        )}
      </button>
    </header>
  );
}

// Bottom Navigation Bar with 5 Tabs
function ReBottomNav({ route, onNavigate }) {
  const tabs = [
    { id: "home", label: "홈", icon: Home },
    { id: "subscriptions", label: "구독", icon: CreditCard },
    { id: "calendar", label: "캘린더", icon: CalendarDays },
    { id: "benefits", label: "혜택", icon: Gift },
    { id: "settings", label: "설정", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[430px] bg-white/90 backdrop-blur-lg border-t border-white/90 shadow-[0_-4px_25px_rgba(147,197,253,0.18)] px-4 py-2 flex items-center justify-around">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = route === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onNavigate(tab.id)}
            className={`flex flex-col items-center justify-center transition-all ${
              isActive
                ? "bg-sky-100/80 text-sky-700 font-extrabold px-3.5 py-1.5 rounded-full shadow-xs scale-105"
                : "text-slate-400 hover:text-slate-600 font-semibold p-1"
            }`}
          >
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[11px] tracking-tight mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// 12 Mockups Showcase & Quick Switch Modal
function ReMockupGalleryModal({ onClose, onSelectScreen }) {
  const mockups = [
    { key: "01", name: "01. 리플래쉬 로고", file: "01_logo.png", screen: "landing" },
    { key: "02", name: "02. 리플래쉬 캐릭터", file: "02_character.png", screen: "landing" },
    { key: "03", name: "03. 랜딩 온보딩", file: "03_landing.png", screen: "landing" },
    { key: "04", name: "04. 로그인", file: "04_login.png", screen: "login" },
    { key: "05", name: "05. 회원가입", file: "05_signup.png", screen: "signup" },
    { key: "06", name: "06. 메인화면", file: "06_home.png", screen: "home" },
    { key: "07", name: "07. 구독 목록", file: "07_subscriptions.png", screen: "subscriptions" },
    { key: "08", name: "08. 구독상세", file: "08_detail.png", screen: "detail" },
    { key: "09", name: "09. 캘린더", file: "09_calendar.png", screen: "calendar" },
    { key: "10", name: "10. 혜택 & 프로모션", file: "10_benefits.png", screen: "benefits" },
    { key: "11", name: "11. 알림", file: "11_notifications.png", screen: "notifications" },
    { key: "12", name: "12. 마이페이지", file: "12_mypage.png", screen: "settings" },
  ];

  const [previewMockup, setPreviewMockup] = useState(null);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-[420px] w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-white">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-[16px] font-black text-slate-800">RE. 12대 디자인 목업</h3>
            <p className="text-[11px] text-slate-500">목업을 누르면 해당 화면으로 바로 이동합니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-600 hover:bg-slate-300 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-3 overflow-y-auto space-y-2.5">
          {previewMockup ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setPreviewMockup(null)}
                className="text-xs font-bold text-sky-600 flex items-center gap-1 hover:underline"
              >
                &larr; 목업 목록으로 돌아가기
              </button>
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                <img
                  src={`/assets/re/${previewMockup.file}`}
                  alt={previewMockup.name}
                  className="w-full h-auto object-contain max-h-[55vh] mx-auto"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">{previewMockup.name}</h4>
                  <p className="text-[11px] text-slate-400">오리지널 디자인 에셋</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectScreen(previewMockup.screen)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 text-white font-bold text-xs shadow-sm hover:opacity-95"
                >
                  화면 체험하기 &gt;
                </button>
              </div>
            </div>
          ) : (
            mockups.map((m) => (
              <div
                key={m.key}
                className="flex items-center gap-3 p-2 rounded-2xl border border-slate-200/80 hover:border-sky-400 hover:bg-sky-50/50 cursor-pointer transition-all group"
              >
                <img
                  src={`/assets/re/${m.file}`}
                  alt={m.name}
                  onClick={() => setPreviewMockup(m)}
                  className="w-12 h-20 object-cover rounded-xl border border-slate-200 group-hover:scale-105 transition-transform shrink-0"
                />
                <div
                  className="flex-1"
                  onClick={() => onSelectScreen(m.screen)}
                >
                  <h4 className="text-[13px] font-bold text-slate-800 group-hover:text-sky-600">
                    {m.name}
                  </h4>
                  <p className="text-[11px] text-sky-500 font-semibold mt-0.5">인터랙티브 화면 열기 &gt;</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewMockup(m)}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg shrink-0"
                >
                  원본 보기
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// MAIN RE THEME CONTAINER
export function ReAppContainer({
  onSwitchClassic,
  subscriptions,
  onAddSubscription,
  initialScreen = "home",
}) {
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const handleOpenDetail = () => {
    setCurrentScreen("detail");
  };

  return (
    <div className="relative min-h-screen w-full max-w-[430px] mx-auto overflow-x-hidden font-sans text-slate-800 bg-[#E8F4FC] shadow-2xl">
      {/* Background Watercolor Lotus Backdrop */}
      <div
        className="fixed inset-0 max-w-[430px] mx-auto pointer-events-none z-0 opacity-40 mix-blend-multiply bg-cover bg-center"
        style={{
          backgroundImage: "url('/assets/re/slices/bg_lotus.png')",
        }}
      />

      {/* Floating Theme & Mockup Pill */}
      <div className="fixed top-2 right-4 z-50 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setGalleryOpen(true)}
          className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white/90 text-[10px] font-bold text-indigo-600 shadow-md hover:bg-white transition-all flex items-center gap-1"
          title="12개 원본 목업 갤러리"
        >
          <span>🎨 목업 12선</span>
        </button>
        <button
          type="button"
          onClick={onSwitchClassic}
          className="px-2.5 py-1 rounded-full bg-slate-900/90 text-white text-[10px] font-bold shadow-md hover:bg-black transition-all flex items-center gap-1"
          title="클래식 SubMate 모드로 전환"
        >
          <span>클래식 모드</span>
        </button>
      </div>

      {/* Content Canvas */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between">
        <div>
          <ReStatusBar />
          {currentScreen !== "landing" && currentScreen !== "login" && currentScreen !== "signup" && currentScreen !== "detail" && (
            <ReHeader
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              unreadCount={2}
            />
          )}

          <main className="px-4 pt-1">
            {isNotificationsOpen ? (
              <div className="relative">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="flex items-center gap-1.5 text-[14px] font-bold text-slate-700"
                  >
                    <ArrowLeft className="w-4 h-4" /> 돌아가기
                  </button>
                  <span className="text-[12px] font-bold text-sky-600">알림 센터</span>
                </div>
                <ReNotificationScreen
                  onClose={() => setIsNotificationsOpen(false)}
                  onOpenDetail={() => {
                    setIsNotificationsOpen(false);
                    handleOpenDetail();
                  }}
                />
              </div>
            ) : currentScreen === "home" ? (
              <ReHomeScreen
                subscriptions={subscriptions}
                onNavigate={setCurrentScreen}
                onOpenDetail={handleOpenDetail}
                onAddSubscription={onAddSubscription}
              />
            ) : currentScreen === "subscriptions" ? (
              <ReSubscriptionsScreen
                onOpenDetail={handleOpenDetail}
                onAddSubscription={onAddSubscription}
              />
            ) : currentScreen === "calendar" ? (
              <ReCalendarScreen onOpenDetail={handleOpenDetail} />
            ) : currentScreen === "benefits" ? (
              <ReBenefitsScreen />
            ) : currentScreen === "settings" ? (
              <ReMyPageScreen
                onNavigate={setCurrentScreen}
                onLogout={() => setCurrentScreen("login")}
              />
            ) : currentScreen === "detail" ? (
              <ReDetailScreen
                onBack={() => setCurrentScreen("subscriptions")}
                onNavigate={setCurrentScreen}
              />
            ) : currentScreen === "landing" ? (
              <ReLandingScreen
                onStart={() => setCurrentScreen("home")}
                onSkip={() => setCurrentScreen("home")}
              />
            ) : currentScreen === "login" ? (
              <ReLoginScreen
                onLogin={() => setCurrentScreen("home")}
                onRegister={() => setCurrentScreen("signup")}
                onGuest={() => setCurrentScreen("home")}
              />
            ) : currentScreen === "signup" ? (
              <ReSignUpScreen
                onBack={() => setCurrentScreen("login")}
                onComplete={() => setCurrentScreen("home")}
              />
            ) : null}
          </main>
        </div>

        {/* Bottom Nav Bar */}
        {currentScreen !== "landing" && currentScreen !== "login" && currentScreen !== "signup" && !isNotificationsOpen && (
          <ReBottomNav
            route={currentScreen}
            onNavigate={(screenId) => {
              setIsNotificationsOpen(false);
              setCurrentScreen(screenId);
            }}
          />
        )}
      </div>

      {galleryOpen && (
        <ReMockupGalleryModal
          onClose={() => setGalleryOpen(false)}
          onSelectScreen={(screenKey) => {
            setCurrentScreen(screenKey);
            setIsNotificationsOpen(screenKey === "notifications");
            setGalleryOpen(false);
          }}
        />
      )}
    </div>
  );
}
