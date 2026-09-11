import React, { useState, useMemo } from "react";
import {
  Bell,
  Search,
  Filter,
  Plus,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  MoreVertical,
  ExternalLink,
  CheckCircle2,
  Gift,
  Layers,
  Leaf,
  Info,
  CalendarDays,
  SlidersHorizontal,
  User,
  PlayCircle,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { ServiceIcon } from "./ReIcons";

// Bottom Quote Banner with Skateboard Character
export function ReQuoteBanner({ message = "지금도, 더 좋은 너를 향해. RE.", onClick }) {
  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 p-3.5 shadow-[0_4px_16px_rgba(147,197,253,0.16)] flex items-center justify-between cursor-pointer hover:bg-white/90 transition-all active:scale-[0.99] group mt-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center overflow-hidden shrink-0">
          <img
            src="/assets/re/slices/avatar_crop.png"
            alt="Mascot"
            className="w-full h-full object-cover scale-110"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
        <div>
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 tracking-tight">
            💡 오늘의 한마디
          </span>
          <p className="text-[13px] font-semibold text-slate-800 tracking-tight mt-0.5">
            {message}
          </p>
        </div>
      </div>
      <div className="w-7 h-7 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center group-hover:translate-x-0.5 transition-transform shrink-0">
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
}

// SCREEN 06: HOME SCREEN
export function ReHomeScreen({
  subscriptions,
  onNavigate,
  onOpenDetail,
  onAddSubscription,
}) {
  const totalAmount = useMemo(
    () => (subscriptions || []).reduce((sum, s) => sum + (s.amount || 0), 0) || 128400,
    [subscriptions]
  );

  return (
    <div className="space-y-4 pb-24">
      {/* Greeting & Mascot */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
            좋은 하루예요. 🌸
          </h1>
          <p className="text-[13px] font-medium text-slate-500 mt-0.5">
            오늘도 더 가벼운 일상을 만들어봐요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <span className="text-[11px] text-slate-600 font-medium">작은 변화가,</span>
            <p className="text-[11px] font-semibold text-sky-600">더 여유로운 내일을.</p>
          </div>
          <div className="w-12 h-12 rounded-full ring-2 ring-white/90 shadow-sm overflow-hidden bg-sky-100 shrink-0">
            <img
              src="/assets/re/slices/avatar_crop.png"
              alt="RE Mascot"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* 2x2 Stats Summary Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-white/85 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">이번 달 구독 총액</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-500 flex items-center justify-center">
              <span className="text-xs font-bold">📊</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[18px] font-extrabold text-slate-800 tracking-tight">
              ₩{totalAmount.toLocaleString()}
            </span>
            <span className="block text-[11px] font-bold text-emerald-500 mt-0.5">
              -12% 지난 달 대비
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white/85 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">구독 개수</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[18px] font-extrabold text-slate-800 tracking-tight">
              {subscriptions && subscriptions.length ? subscriptions.length : 7}개
            </span>
            <span className="block text-[11px] font-semibold text-slate-400 mt-0.5">
              활성 구독
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white/85 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">결제 예정</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[18px] font-extrabold text-slate-800 tracking-tight">
              2개
            </span>
            <span className="block text-[11px] font-bold text-amber-500 mt-0.5">
              D-3, D-1
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white/85 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">이번 달 절약 예정액</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[18px] font-extrabold text-slate-800 tracking-tight">
              ₩52,000
            </span>
            <span className="block text-[11px] font-semibold text-emerald-600 mt-0.5">
              지금도 잘하고 있어요!
            </span>
          </div>
        </div>
      </div>

      {/* 다가오는 결제 (Upcoming payments) */}
      <section className="rounded-2xl bg-white/85 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">다가오는 결제</h2>
          <button
            type="button"
            onClick={() => onNavigate("calendar")}
            className="text-[12px] font-semibold text-sky-600 flex items-center gap-0.5 hover:underline"
          >
            전체보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          <div
            onClick={() => onOpenDetail("netflix")}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-sky-50/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <ServiceIcon name="Netflix" />
              <div>
                <h3 className="text-[14px] font-bold text-slate-800">Netflix</h3>
                <p className="text-[12px] font-medium text-slate-500">4월 27일 (일)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-slate-800">₩17,000</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                D-3
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div
            onClick={() => onOpenDetail("youtube")}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-sky-50/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <ServiceIcon name="YouTube Premium" />
              <div>
                <h3 className="text-[14px] font-bold text-slate-800">YouTube Premium</h3>
                <p className="text-[12px] font-medium text-slate-500">4월 29일 (화)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-slate-800">₩14,900</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                D-5
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
      </section>

      {/* 내 구독 서비스 (Horizontal Scroll) */}
      <section className="rounded-2xl bg-white/85 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">내 구독 서비스</h2>
          <button
            type="button"
            onClick={() => onNavigate("subscriptions")}
            className="text-[12px] font-semibold text-sky-600 flex items-center gap-0.5 hover:underline"
          >
            전체보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          <div
            onClick={() => onOpenDetail("netflix")}
            className="flex flex-col items-center gap-1.5 min-w-[70px] p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-center"
          >
            <ServiceIcon name="Netflix" />
            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[65px]">Netflix</span>
            <span className="text-[10px] text-slate-500">₩17,000</span>
          </div>

          <div
            onClick={() => onOpenDetail("youtube")}
            className="flex flex-col items-center gap-1.5 min-w-[70px] p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-center"
          >
            <ServiceIcon name="YouTube Premium" />
            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[65px]">YouTube</span>
            <span className="text-[10px] text-slate-500">₩14,900</span>
          </div>

          <div
            onClick={() => onOpenDetail("spotify")}
            className="flex flex-col items-center gap-1.5 min-w-[70px] p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-center"
          >
            <ServiceIcon name="Spotify" />
            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[65px]">Spotify</span>
            <span className="text-[10px] text-slate-500">₩10,900</span>
          </div>

          <div
            onClick={() => onOpenDetail("disney")}
            className="flex flex-col items-center gap-1.5 min-w-[70px] p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-center"
          >
            <ServiceIcon name="Disney+" />
            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[65px]">Disney+</span>
            <span className="text-[10px] text-slate-500">₩9,900</span>
          </div>

          <button
            type="button"
            onClick={onAddSubscription}
            className="flex flex-col items-center justify-center gap-1 min-w-[70px] h-[95px] rounded-xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 hover:bg-sky-50 cursor-pointer transition-all text-sky-600"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[11px] font-bold">구독 추가</span>
          </button>
        </div>
      </section>

      {/* 미니 캘린더 위젯 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/85 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-extrabold text-slate-800">2025년 4월</span>
            <div className="flex items-center gap-1 text-slate-400">
              <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-slate-700" />
              <ChevronRight className="w-4 h-4 cursor-pointer hover:text-slate-700" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400 mb-1">
            <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-700">
            <span className="text-slate-300"></span><span className="text-slate-300"></span>
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span>
            <span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span><span>19</span>
            <span>20</span><span>21</span><span>22</span><span>23</span><span>24</span><span>25</span>
            <span className="w-6 h-6 mx-auto rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">26</span>
            <span className="w-6 h-6 mx-auto rounded-full bg-purple-200 text-purple-800 flex items-center justify-center font-bold">27</span>
            <span>28</span>
            <span className="w-6 h-6 mx-auto rounded-full bg-sky-200 text-sky-800 flex items-center justify-center font-bold">29</span>
            <span>30</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white/85 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)] flex flex-col justify-center space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-semibold text-slate-500">4월 27일 (일)</span>
              <div className="flex items-center gap-2 mt-0.5">
                <ServiceIcon name="Netflix" size="sm" />
                <span className="text-[13px] font-bold text-slate-800">Netflix</span>
              </div>
            </div>
            <span className="text-[13px] font-bold text-slate-800">₩17,000</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-[11px] font-semibold text-slate-500">4월 29일 (화)</span>
              <div className="flex items-center gap-2 mt-0.5">
                <ServiceIcon name="YouTube Premium" size="sm" />
                <span className="text-[13px] font-bold text-slate-800">YouTube Premium</span>
              </div>
            </div>
            <span className="text-[13px] font-bold text-slate-800">₩14,900</span>
          </div>
        </div>
      </section>

      {/* Quote Banner */}
      <ReQuoteBanner
        message="지금도, 더 좋은 너를 향해. RE."
        onClick={() => onNavigate("benefits")}
      />
    </div>
  );
}

// SCREEN 07: SUBSCRIPTIONS LIST SCREEN
export function ReSubscriptionsScreen({
  onOpenDetail,
  onAddSubscription,
}) {
  const [filterTab, setFilterTab] = useState("all");
  const [search, setSearch] = useState("");

  const tabs = [
    { id: "all", label: "전체", count: 4 },
    { id: "active", label: "활성", count: 3 },
    { id: "paused", label: "일시정지", count: 0 },
    { id: "cancelled", label: "해지됨", count: 1 },
  ];

  const subItems = [
    {
      id: "netflix",
      name: "Netflix",
      plan: "스탠다드 요금제",
      amount: 17000,
      cycle: "월",
      status: "활성",
      dueDate: "2025년 4월 27일 (일)",
      icon: "Netflix",
    },
    {
      id: "youtube",
      name: "YouTube Premium",
      plan: "개인 요금제",
      amount: 14900,
      cycle: "월",
      status: "활성",
      dueDate: "2025년 4월 29일 (화)",
      icon: "YouTube Premium",
    },
    {
      id: "spotify",
      name: "Spotify",
      plan: "개인 요금제",
      amount: 10900,
      cycle: "월",
      status: "활성",
      dueDate: "2025년 5월 10일 (토)",
      icon: "Spotify",
    },
    {
      id: "disney",
      name: "Disney+",
      plan: "스탠다드 요금제",
      amount: 9900,
      cycle: "월",
      status: "일시정지",
      dueDate: "일시정지 중 (2025년 4월 15일에 일시정지됨)",
      icon: "Disney+",
    },
  ];

  const filtered = subItems.filter((item) => {
    if (filterTab === "active" && item.status !== "활성") return false;
    if (filterTab === "paused" && item.status !== "일시정지") return false;
    if (filterTab === "cancelled" && item.status !== "해지됨") return false;
    if (search.trim()) {
      return item.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-[22px] font-black text-slate-800 tracking-tight">내 구독</h1>
          <p className="text-[13px] font-medium text-slate-500 mt-0.5">
            좋아하는 서비스가, 더 좋은 일상을 만들어줘요. 🌸
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-sky-100 shadow-sm shrink-0 border border-white/90">
          <img
            src="/assets/re/slices/avatar_crop.png"
            alt="Mascot"
            className="w-full h-full object-cover scale-110"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`flex-1 min-w-[75px] py-2 rounded-xl text-[12px] font-bold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-sky-400 to-indigo-400 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              {tab.label} {tab.count}
            </button>
          );
        })}
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="구독 서비스 검색하기..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white/85 backdrop-blur-md border border-white/90 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-xs"
          />
        </div>
        <button
          type="button"
          className="h-11 px-3.5 rounded-2xl bg-white/85 backdrop-blur-md border border-white/90 flex items-center gap-1.5 text-[12px] font-bold text-slate-700 shadow-xs hover:bg-white transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <span>필터</span>
        </button>
      </div>

      {/* Subscription Cards List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl bg-white/90 backdrop-blur-md p-4 border border-white/90 shadow-[0_6px_20px_rgba(147,197,253,0.14)] space-y-3.5 hover:shadow-[0_8px_25px_rgba(147,197,253,0.2)] transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <ServiceIcon name={item.icon} size="md" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[16px] font-extrabold text-slate-800 tracking-tight">
                      {item.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === "활성"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "일시정지"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">{item.plan}</p>
                  <p className="text-[15px] font-extrabold text-slate-900 tracking-tight mt-0.5">
                    ₩{item.amount.toLocaleString()} <span className="text-[12px] font-normal text-slate-500">/ {item.cycle}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenDetail(item.id)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <CalendarDays className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span className="truncate">다음 결제일: {item.dueDate}</span>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => onOpenDetail(item.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[12px] font-bold text-slate-700 border border-slate-200 transition-colors"
                >
                  상세
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[12px] font-bold text-slate-700 border border-slate-200 flex items-center gap-1 transition-colors"
                >
                  <Bell className="w-3 h-3 text-slate-400" />
                  <span>{item.status === "일시정지" ? "알림 켜기" : "알림 끄기"}</span>
                </button>
                {item.status === "일시정지" ? (
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[12px] font-bold text-indigo-600 border border-indigo-200 transition-colors"
                  >
                    재개하기
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenDetail(item.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[12px] font-bold text-rose-600 border border-rose-200 transition-colors"
                  >
                    해지
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Subscription Dashed Card */}
      <button
        type="button"
        onClick={onAddSubscription}
        className="w-full py-5 rounded-3xl border-2 border-dashed border-sky-300 hover:border-sky-500 bg-white/70 hover:bg-white/90 backdrop-blur-md flex flex-col items-center justify-center gap-1 text-sky-600 transition-all active:scale-[0.99] shadow-xs"
      >
        <span className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight">
          <Plus className="w-5 h-5" /> 구독 추가하기
        </span>
        <span className="text-[12px] font-medium text-slate-400">
          새로운 구독을 추가하고 모두 한 곳에서 관리해요.
        </span>
      </button>
    </div>
  );
}

// SCREEN 08: SUBSCRIPTION DETAIL SCREEN
export function ReDetailScreen({ onBack, onNavigate }) {
  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-800 hover:text-slate-600 font-extrabold text-[17px]"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>구독 상세</span>
        </button>
        <button type="button" className="text-slate-500 hover:text-slate-800 p-1">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Service Hero Card with Mascot */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-md p-4 border border-white/90 shadow-[0_6px_20px_rgba(147,197,253,0.15)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ServiceIcon name="YouTube Premium" size="lg" />
          <div>
            <h2 className="text-[18px] font-black text-slate-800 tracking-tight">
              YouTube Premium
            </h2>
            <p className="text-[12px] font-medium text-slate-500 mt-0.5">
              광고 없는 더 좋은 감상 경험
            </p>
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 mt-1">
              엔터테인먼트
            </span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-sky-100 shadow-xs border border-white">
            <img
              src="/assets/re/slices/avatar_crop.png"
              alt="Mascot"
              className="w-full h-full object-cover scale-110"
            />
          </div>
          <span className="text-[10px] text-sky-600 font-medium mt-1">
            좋은 콘텐츠와 더 가까워지는 시간이에요. ♡
          </span>
        </div>
      </div>

      {/* Info Rows Card */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-md p-5 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)] space-y-3 text-[13px]">
        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="font-semibold text-slate-500">월 요금</span>
          <span className="font-extrabold text-[16px] text-slate-800">₩14,900</span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="font-semibold text-slate-500">결제 주기</span>
          <span className="font-bold text-slate-800">매월 자동 결제</span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="font-semibold text-slate-500">다음 결제일</span>
          <span className="font-bold text-slate-800">2025년 4월 29일 (화)</span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-slate-100 cursor-pointer hover:bg-slate-50/50">
          <span className="font-semibold text-slate-500">결제 수단</span>
          <span className="font-bold text-slate-800 flex items-center gap-1">
            신한카드 **** 1234 <ChevronRight className="w-4 h-4 text-slate-400" />
          </span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="font-semibold text-slate-500">카테고리</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-600">
            엔터테인먼트
          </span>
        </div>
        <div className="flex items-center justify-between py-1 cursor-pointer hover:bg-slate-50/50">
          <span className="font-semibold text-slate-500">메모</span>
          <span className="font-medium text-slate-700 flex items-center gap-1">
            광고 없이 유튜브, 오프라인 저장까지! <ChevronRight className="w-4 h-4 text-slate-400" />
          </span>
        </div>
      </div>

      {/* 4 Quick Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-2xl bg-white/85 backdrop-blur-md p-3.5 border border-white/90 shadow-xs flex flex-col items-center text-center cursor-pointer hover:bg-white transition-all group">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <ExternalLink className="w-5 h-5" />
          </div>
          <span className="text-[12px] font-bold text-slate-800">공식 해지 사이트</span>
          <span className="text-[10px] text-slate-400 mt-0.5">바로 이동하기 &gt;</span>
        </div>

        <div className="rounded-2xl bg-white/85 backdrop-blur-md p-3.5 border border-white/90 shadow-xs flex flex-col items-center text-center cursor-pointer hover:bg-white transition-all group">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-[12px] font-bold text-slate-800">해지 체크리스트</span>
          <span className="text-[10px] text-slate-400 mt-0.5">놓치는 것 없이 &gt;</span>
        </div>

        <div className="rounded-2xl bg-white/85 backdrop-blur-md p-3.5 border border-white/90 shadow-xs flex flex-col items-center text-center cursor-pointer hover:bg-white transition-all group">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <Bell className="w-5 h-5" />
          </div>
          <span className="text-[12px] font-bold text-slate-800">결제 알림</span>
          <span className="text-[10px] text-slate-400 mt-0.5">미리 알려드려요 &gt;</span>
        </div>

        <div className="rounded-2xl bg-white/85 backdrop-blur-md p-3.5 border border-white/90 shadow-xs flex flex-col items-center text-center cursor-pointer hover:bg-white transition-all group">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <Gift className="w-5 h-5" />
          </div>
          <span className="text-[12px] font-bold text-slate-800">혜택 보기</span>
          <span className="text-[10px] text-slate-400 mt-0.5">지금도 좋은 혜택 &gt;</span>
        </div>
      </div>

      {/* 해지 가이드 */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-md p-5 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sky-500 font-bold">📢</span>
            <h3 className="text-[15px] font-extrabold text-slate-800 tracking-tight">해지 가이드</h3>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            아래 순서대로 차근차근 진행해보세요.
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <h4 className="text-[13px] font-bold text-slate-800">공식 해지 사이트로 이동하기</h4>
                <p className="text-[11px] text-slate-400">YouTube 계정에서 구독 관리를 열어주세요.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <h4 className="text-[13px] font-bold text-slate-800">YouTube Premium 구독 선택</h4>
                <p className="text-[11px] text-slate-400">구독 중인 항목에서 YouTube Premium을 선택하세요.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <h4 className="text-[13px] font-bold text-slate-800">구독 취소 진행하기</h4>
                <p className="text-[11px] text-slate-400">안내에 따라 구독 취소를 진행해주세요.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                4
              </span>
              <div>
                <h4 className="text-[13px] font-bold text-slate-800">해지 완료 확인하기</h4>
                <p className="text-[11px] text-slate-400">이메일 또는 화면에서 해지 완료 여부를 꼭 확인하세요.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Tip Box */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 flex items-start gap-2.5">
          <span className="text-amber-500 text-base shrink-0">💡</span>
          <div>
            <h5 className="text-[12px] font-bold text-slate-800">잠깐!</h5>
            <p className="text-[11px] text-slate-600 mt-0.5">
              해지해도 다음 결제일까지는 기존 혜택을 계속 이용할 수 있어요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// SCREEN 09: CALENDAR SCREEN
export function ReCalendarScreen({ onOpenDetail }) {
  const [selectedDay, setSelectedDay] = useState(27);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-[22px] font-black text-slate-800 tracking-tight">좋은 하루예요. 🌸</h1>
          <p className="text-[13px] font-medium text-slate-500 mt-0.5">
            오늘도 더 가벼운 일상을 만들어봐요.
          </p>
        </div>
        <div className="w-12 h-12 rounded-full ring-2 ring-white/90 shadow-sm overflow-hidden bg-sky-100 shrink-0">
          <img
            src="/assets/re/slices/avatar_crop.png"
            alt="Mascot"
            className="w-full h-full object-cover scale-110"
          />
        </div>
      </div>

      {/* Month Calendar Card */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-md p-5 border border-white/90 shadow-[0_6px_20px_rgba(147,197,253,0.15)]">
        <div className="flex items-center justify-between mb-4">
          <button type="button" className="text-slate-400 hover:text-slate-700 p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-[17px] font-extrabold text-slate-800">2025년 4월</span>
          <button type="button" className="text-slate-400 hover:text-slate-700 p-1">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-semibold text-slate-400 mb-2">
          <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[13px] font-semibold text-slate-700">
          <span className="py-2 text-slate-300">30</span>
          <span className="py-2 text-slate-300">31</span>
          <span className="py-2">1</span>
          <span className="py-2">2</span>
          <span className="py-2">3</span>
          <span className="py-2 relative flex flex-col items-center justify-center">
            4
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-0.5" />
          </span>
          <span className="py-2">5</span>
          <span className="py-2">6</span>
          <span className="py-2">7</span>
          <span className="py-2 relative flex flex-col items-center justify-center">
            8
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-0.5" />
          </span>
          <span className="py-2">9</span>
          <span className="py-2">10</span>
          <span className="py-2">11</span>
          <span className="py-2">12</span>
          <span className="py-2">13</span>
          <span className="py-2 relative flex flex-col items-center justify-center">
            14
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-0.5" />
          </span>
          <span className="py-2">15</span>
          <span className="py-2">16</span>
          <span className="py-2">17</span>
          <span className="py-2">18</span>
          <span className="py-2">19</span>
          <span className="py-2">20</span>
          <span className="py-2">21</span>
          <span className="py-2">22</span>
          <span className="py-2">23</span>
          <span className="py-2">24</span>
          <span className="py-2">25</span>
          <span
            onClick={() => setSelectedDay(26)}
            className={`py-2 rounded-full cursor-pointer flex items-center justify-center font-bold ${
              selectedDay === 26 ? "bg-emerald-400 text-white shadow-sm" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            26
          </span>
          <span
            onClick={() => setSelectedDay(27)}
            className={`py-2 rounded-full cursor-pointer flex items-center justify-center font-bold ${
              selectedDay === 27 ? "bg-purple-500 text-white shadow-sm" : "bg-purple-200 text-purple-800"
            }`}
          >
            27
          </span>
          <span className="py-2">28</span>
          <span
            onClick={() => setSelectedDay(29)}
            className={`py-2 rounded-full cursor-pointer flex items-center justify-center font-bold ${
              selectedDay === 29 ? "bg-sky-500 text-white shadow-sm" : "bg-sky-200 text-sky-800"
            }`}
          >
            29
          </span>
          <span className="py-2">30</span>
          <span className="py-2 text-slate-300">1</span>
          <span className="py-2 text-slate-300">2</span>
          <span className="py-2 text-slate-300">3</span>
        </div>
      </div>

      {/* Summary Stat Card */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500">이번 달 결제 예정</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[16px] font-extrabold text-slate-800">4건</span>
              <span className="text-[12px] font-medium text-slate-400">예상 결제 금액 ₩52,000</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-medium text-slate-400">지난 달보다</span>
          <span className="block text-[15px] font-black text-emerald-500">-12%</span>
        </div>
      </div>

      {/* Date-Grouped Payments */}
      <div className="space-y-3">
        <div className="rounded-3xl bg-white/90 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-slate-800">4월 27일 (일)</span>
            <span className="text-[11px] font-semibold text-sky-600 cursor-pointer">전체보기 &gt;</span>
          </div>
          <div
            onClick={() => onOpenDetail("netflix")}
            className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <ServiceIcon name="Netflix" />
              <div>
                <h4 className="text-[14px] font-bold text-slate-800">Netflix</h4>
                <p className="text-[11px] text-slate-400">구독 결제</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-extrabold text-slate-800">₩17,000</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white/90 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-slate-800">4월 29일 (화)</span>
            <span className="text-[11px] font-semibold text-sky-600 cursor-pointer">전체보기 &gt;</span>
          </div>
          <div
            onClick={() => onOpenDetail("youtube")}
            className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <ServiceIcon name="YouTube Premium" />
              <div>
                <h4 className="text-[14px] font-bold text-slate-800">YouTube Premium</h4>
                <p className="text-[11px] text-slate-400">구독 결제</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-extrabold text-slate-800">₩14,900</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      <ReQuoteBanner message="계획하는 지금이, 더 좋은 내일을 만들어요. RE." />
    </div>
  );
}

// SCREEN 10: BENEFITS & PROMOTIONS SCREEN
export function ReBenefitsScreen() {
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { id: "all", label: "전체 혜택" },
    { id: "free", label: "무료체험" },
    { id: "ott", label: "OTT 할인" },
    { id: "telecom", label: "통신사 결합" },
    { id: "student", label: "학생 할인" },
  ];

  const promotions = [
    {
      id: "netflix-telecom",
      service: "Netflix",
      tag: "묶음 할인",
      tagColor: "bg-rose-100 text-rose-700",
      title: "Netflix + 통신사 결합 할인",
      description: "지금 통신사와 결합하면 최대 30% 할인된 요금으로!",
      requirement: "통신사 결합 필수 | 3개월 이상 유지",
      icon: "Netflix",
    },
    {
      id: "youtube-student",
      service: "YouTube Premium",
      tag: "학생 할인",
      tagColor: "bg-emerald-100 text-emerald-700",
      title: "YouTube Premium 학생 요금제",
      description: "학생 인증 시 최대 50% 할인! 광고 없는 감상, 지금 더 가볍게.",
      requirement: "학생 인증 필요 | 최대 4년까지 적용",
      icon: "YouTube Premium",
    },
    {
      id: "spotify-trial",
      service: "Spotify",
      tag: "무료체험",
      tagColor: "bg-sky-100 text-sky-700",
      title: "Spotify Premium 2개월 무료",
      description: "지금 시작하고, 2개월 동안 프리미엄을 경험해보세요.",
      requirement: "신규 가입자 한정 | 이후 월 ₩10,900",
      icon: "Spotify",
    },
    {
      id: "disney-promo",
      service: "Disney+",
      tag: "특별 프로모션",
      tagColor: "bg-indigo-100 text-indigo-700",
      title: "Disney+ 3개월 50% 할인",
      description: "지금 구독하면 3개월간 월 ₩4,950에 즐길 수 있어요!",
      requirement: "신규/복귀 고객 대상 | 3개월 후 정상가",
      icon: "Disney+",
    },
  ];

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-[22px] font-black text-slate-800 tracking-tight">
            맞춤 혜택 &amp; 프로모션 🎁
          </h1>
          <p className="text-[13px] font-medium text-slate-500 mt-0.5">
            지금, 더 좋은 구독 생활을 만나보세요.
          </p>
        </div>
        <div className="w-12 h-12 rounded-full ring-2 ring-white/90 shadow-sm overflow-hidden bg-sky-100 shrink-0">
          <img
            src="/assets/re/slices/avatar_crop.png"
            alt="Mascot"
            className="w-full h-full object-cover scale-110"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 overflow-x-auto scrollbar-none">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-gradient-to-r from-sky-400 to-indigo-400 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {promotions.map((p) => (
          <div
            key={p.id}
            className="rounded-3xl bg-white/90 backdrop-blur-md p-4 border border-white/90 shadow-[0_6px_20px_rgba(147,197,253,0.14)] space-y-3 hover:shadow-[0_8px_25px_rgba(147,197,253,0.2)] transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <ServiceIcon name={p.icon} size="md" />
                <div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.tagColor}`}>
                    {p.tag}
                  </span>
                  <h3 className="text-[15px] font-extrabold text-slate-800 tracking-tight mt-1">
                    {p.title}
                  </h3>
                  <p className="text-[12px] text-slate-500 mt-0.5">{p.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{p.requirement}</span>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 font-bold hover:bg-sky-100 transition-colors"
              >
                자세히 보기 &gt;
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 shadow-xs flex items-start gap-2.5 text-[12px]">
        <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-slate-800">혜택 안내</h4>
          <p className="text-slate-500 mt-0.5 leading-relaxed">
            프로모션 내용, 기간, 적용 조건은 각 서비스의 공식 페이지에서 다시 한 번 확인해 주세요.
          </p>
        </div>
      </div>

      <ReQuoteBanner message="작은 혜택이, 더 큰 취향을 이어줘요. RE." />
    </div>
  );
}

// SCREEN 11: NOTIFICATIONS SCREEN
export function ReNotificationScreen({ onClose, onOpenDetail }) {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { id: "all", label: "전체" },
    { id: "billing", label: "결제 알림" },
    { id: "news", label: "서비스 소식" },
    { id: "promo", label: "혜택·이벤트" },
  ];

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-[22px] font-black text-slate-800 tracking-tight">알림 🌸</h1>
          <p className="text-[13px] font-medium text-slate-500 mt-0.5">
            소중한 구독 생활을, RE.가 함께 챙겨드려요.
          </p>
        </div>
        <div className="w-12 h-12 rounded-full ring-2 ring-white/90 shadow-sm overflow-hidden bg-sky-100 shrink-0">
          <img
            src="/assets/re/slices/avatar_crop.png"
            alt="Mascot"
            className="w-full h-full object-cover scale-110"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-gradient-to-r from-sky-400 to-indigo-400 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 다가오는 결제 알림 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[14px] font-extrabold text-slate-800">다가오는 결제 알림</h3>
          <span className="text-[11px] font-semibold text-sky-600 cursor-pointer">전체보기 &gt;</span>
        </div>

        <div className="rounded-3xl bg-white/90 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)] space-y-3">
          <div
            onClick={() => onOpenDetail && onOpenDetail("netflix")}
            className="flex items-start justify-between cursor-pointer hover:bg-slate-50/50 p-1 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <ServiceIcon name="Netflix" />
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  D-3 결제 예정
                </span>
                <h4 className="text-[14px] font-bold text-slate-800 mt-1">Netflix</h4>
                <p className="text-[12px] text-slate-500">2025년 4월 27일 (일)에 ₩17,000이 결제될 예정이에요.</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400">4월 24일 (목) 09:00</span>
              <span className="block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
                예정 &gt;
              </span>
            </div>
          </div>

          <div
            onClick={() => onOpenDetail && onOpenDetail("youtube")}
            className="flex items-start justify-between cursor-pointer hover:bg-slate-50/50 p-1 rounded-xl pt-2 border-t border-slate-100"
          >
            <div className="flex items-start gap-3">
              <ServiceIcon name="YouTube Premium" />
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  D-1 결제 예정
                </span>
                <h4 className="text-[14px] font-bold text-slate-800 mt-1">YouTube Premium</h4>
                <p className="text-[12px] text-slate-500">2025년 4월 29일 (화)에 ₩14,900이 결제될 예정이에요.</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400">4월 28일 (월) 09:00</span>
              <span className="block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
                예정 &gt;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 서비스 소식 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[14px] font-extrabold text-slate-800">서비스 소식</h3>
          <span className="text-[11px] font-semibold text-sky-600 cursor-pointer">전체보기 &gt;</span>
        </div>

        <div className="rounded-3xl bg-white/90 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)] space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <ServiceIcon name="Spotify" />
              <div>
                <h4 className="text-[14px] font-bold text-slate-800">Spotify</h4>
                <p className="text-[12px] font-semibold text-slate-700 mt-0.5">요금이 변경될 예정이에요.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">2025년 5월 1일부터 월 요금이 ₩10,900에서 ₩11,900으로 변경됩니다.</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400">4월 20일 (일) 14:30</span>
              <span className="block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600">
                읽음 &gt;
              </span>
            </div>
          </div>

          <div className="flex items-start justify-between pt-2 border-t border-slate-100">
            <div className="flex items-start gap-3">
              <ServiceIcon name="Disney+" />
              <div>
                <h4 className="text-[14px] font-bold text-slate-800">Disney+</h4>
                <p className="text-[12px] font-semibold text-slate-700 mt-0.5">새로운 콘텐츠가 추가되었어요!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">지금, 더 많은 이야기를 만나보세요.</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400">4월 21일 (월) 11:00</span>
              <span className="block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600">
                읽음 &gt;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 혜택 & 이벤트 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[14px] font-extrabold text-slate-800">혜택 · 이벤트</h3>
          <span className="text-[11px] font-semibold text-sky-600 cursor-pointer">전체보기 &gt;</span>
        </div>

        <div className="rounded-3xl bg-white/90 backdrop-blur-md p-4 border border-white/90 shadow-[0_4px_16px_rgba(147,197,253,0.12)]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <ServiceIcon name="YouTube Premium" />
              <div>
                <h4 className="text-[14px] font-bold text-slate-800">YouTube Premium</h4>
                <p className="text-[12px] font-semibold text-slate-700 mt-0.5">3개월 특별 할인 혜택!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">지금 다시 구독하면 3개월간 30% 할인 혜택을 받을 수 있어요.</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400">4월 18일 (금) 10:00</span>
              <span className="block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600">
                읽음 &gt;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Resting Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-sky-50/80 via-white/80 to-pink-50/80 backdrop-blur-md border border-white/90 shadow-xs flex items-center justify-between">
        <div>
          <h4 className="text-[13px] font-extrabold text-slate-800">지금은 새로운 알림이 없어요.</h4>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
            좋은 하루가, 더 좋은 구독 생활로 이어지길. 🌸
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-indigo-500">조금만 쉬어가도 좋아요. ♡</span>
        </div>
      </div>
    </div>
  );
}

// SCREEN 12: MY PAGE & SETTINGS SCREEN
export function ReMyPageScreen({ onNavigate, onLogout }) {
  const [remindDue, setRemindDue] = useState(true);
  const [remindPaid, setRemindPaid] = useState(true);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-[22px] font-black text-slate-800 tracking-tight">언제나 고마워요. 🌸</h1>
          <p className="text-[13px] font-medium text-slate-500 mt-0.5">
            더 좋은 하루가 이어지길 바라요.
          </p>
        </div>
        <div className="w-12 h-12 rounded-full ring-2 ring-white/90 shadow-sm overflow-hidden bg-sky-100 shrink-0">
          <img
            src="/assets/re/slices/avatar_crop.png"
            alt="Mascot"
            className="w-full h-full object-cover scale-110"
          />
        </div>
      </div>

      {/* Account Profile Card */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-md p-5 border border-white/90 shadow-[0_6px_20px_rgba(147,197,253,0.14)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="text-[15px] font-bold text-slate-800">계정</h3>
              <p className="text-[11px] text-slate-400">프로필 정보와 계정 설정을 관리해요.</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>

        <div className="flex items-center justify-between cursor-pointer hover:bg-slate-50/50 p-1 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-sky-100 shadow-xs ring-2 ring-white shrink-0">
              <img
                src="/assets/re/slices/avatar_crop.png"
                alt="User Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="text-[15px] font-extrabold text-slate-800">RE. 유저</h4>
              <p className="text-[12px] text-slate-400 font-medium">re.user@email.com</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>
      </div>

      {/* 결제 알림 Toggles */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-md p-5 border border-white/90 shadow-[0_6px_20px_rgba(147,197,253,0.14)] space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Bell className="w-5 h-5 text-rose-500" />
          <div>
            <h3 className="text-[15px] font-bold text-slate-800">결제 알림</h3>
            <p className="text-[11px] text-slate-400">결제 예정, 결제 완료 등의 알림을 받아보세요.</p>
          </div>
        </div>

        <div className="flex items-center justify-between py-1">
          <div>
            <h4 className="text-[13px] font-bold text-slate-800">결제 예정 알림</h4>
            <p className="text-[11px] text-slate-400">다음 결제일 전, 미리 알려드려요.</p>
          </div>
          <button
            type="button"
            onClick={() => setRemindDue(!remindDue)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              remindDue ? "bg-sky-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                remindDue ? "right-0.5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-1 pt-2 border-t border-slate-100">
          <div>
            <h4 className="text-[13px] font-bold text-slate-800">결제 완료 알림</h4>
            <p className="text-[11px] text-slate-400">결제가 완료되면 알려드려요.</p>
          </div>
          <button
            type="button"
            onClick={() => setRemindPaid(!remindPaid)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              remindPaid ? "bg-sky-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                remindPaid ? "right-0.5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Menu List */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-md p-2 border border-white/90 shadow-[0_6px_20px_rgba(147,197,253,0.14)] space-y-1">
        <button
          type="button"
          onClick={() => onNavigate("landing")}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <PlayCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-slate-800">서비스 소개 다시 보기</h4>
              <p className="text-[11px] text-slate-400">RE.의 주요 기능과 이용 방법을 다시 확인해요.</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-slate-800">개인정보 및 데이터 안내</h4>
              <p className="text-[11px] text-slate-400">소중한 데이터를 안전하게 보호해요.</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-rose-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-rose-600">로그아웃</h4>
              <p className="text-[11px] text-rose-400">지금까지 함께해 주셔서 감사해요.</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-400" />
        </button>
      </div>

      <ReQuoteBanner message="도움이 필요하신가요? 언제든지 알려주세요. RE.가 함께할게요." />
    </div>
  );
}
