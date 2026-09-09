import { useState, useMemo } from "react";
import { Check, ChevronRight, ArrowLeft, X, CheckCircle2 } from "lucide-react";
import { BottomSheet, Button, IconButton, ServiceMark, CategoryBadge, CATEGORY_PHILOSOPHY } from "./ui";
import { formatWon } from "../lib/dates";

const COMMON_PAYMENTS = ["신용/체크카드", "신한카드", "현대카드", "KB국민카드", "삼성카드", "카카오페이", "네이버페이", "토스페이", "기타"];

function ServiceDirectConfigModal({ service, currentConfig, onSave, onRemove, onClose }) {
  const plans = service.availablePlans || [{ plan: service.plan || "기본", amount: service.amount }];
  const [selectedPlan, setSelectedPlan] = useState(() => currentConfig?.plan || service.plan || "기본");
  const [amount, setAmount] = useState(() => currentConfig?.amount !== undefined ? currentConfig.amount : service.amount);
  const [dueDay, setDueDay] = useState(() => currentConfig?.dueDay || service.dueDay || 1);
  const [paymentMethod, setPaymentMethod] = useState(() => currentConfig?.paymentMethod || service.paymentMethod || "신한카드");

  const handlePlanSelect = (p) => {
    setSelectedPlan(p.plan);
    setAmount(p.amount);
  };

  const handleSave = () => {
    onSave({
      ...service,
      plan: selectedPlan,
      amount: Number(amount) || 0,
      dueDay: Math.max(1, Math.min(31, Number(dueDay) || 1)),
      paymentMethod,
      billingCycle: "매월",
    });
    onClose();
  };

  const isAlreadyRegistered = Boolean(currentConfig);

  return (
    <BottomSheet onClose={onClose} label={`${service.name} 직접 설정`}>
      <div className="overflow-y-auto max-h-[78vh] pb-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-3">
            <ServiceMark serviceId={service.id} name={service.name} className="h-11 w-11 rounded-2xl" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-fg-primary tracking-tight">{service.name}</h2>
                <CategoryBadge category={service.category} />
              </div>
              <p className="mt-0.5 text-[12px] text-fg-muted">구독 정보를 직접 확인하고 맞춤 설정하세요</p>
            </div>
          </div>
          <IconButton size="small" variant="ghost" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </IconButton>
        </div>

        <div className="mt-4">
          <label className="block text-[13px] font-bold text-fg-primary mb-2">요금제 (플랜)</label>
          <div className="flex flex-wrap gap-2">
            {plans.map((p) => {
              const isSelected = selectedPlan === p.plan;
              return (
                <button
                  key={p.plan}
                  type="button"
                  onClick={() => handlePlanSelect(p)}
                  className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition-all ${
                    isSelected
                      ? "border-surface-inverse bg-surface-inverse text-white shadow-xs"
                      : "border-border-subtle bg-surface-default text-fg-secondary hover:bg-surface-inset"
                  }`}
                >
                  <span>{p.plan}</span>
                  <span className="ml-1.5 opacity-80">({formatWon(p.amount)})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-[13px] font-bold text-fg-primary mb-1.5">월 결제 금액</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-border-subtle bg-surface-inset px-3.5 py-2.5 text-[14px] font-bold text-fg-primary outline-none focus:border-border-focus focus:bg-surface-default"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-fg-muted">
              {formatWon(Number(amount) || 0)}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-bold text-fg-primary mb-1.5">매월 결제일</label>
            <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-inset px-3 py-2">
              <span className="text-[13px] font-medium text-fg-muted">매월</span>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
                className="w-12 text-center text-[14px] font-bold text-fg-primary bg-transparent outline-none"
              />
              <span className="text-[13px] font-semibold text-fg-primary">일</span>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-fg-primary mb-1.5">결제 수단</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-surface-inset px-3 py-2.5 text-[13px] font-semibold text-fg-primary outline-none focus:border-border-focus"
            >
              {COMMON_PAYMENTS.map((pm) => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Button fullWidth variant="brand" size="large" onClick={handleSave}>
            {isAlreadyRegistered ? "수정 저장하기" : "이 구독 등록하기"}
          </Button>
          {isAlreadyRegistered && (
            <Button fullWidth variant="ghost" size="default" onClick={() => { onRemove(service.id); onClose(); }}>
              선택 등록 취소하기
            </Button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

export function OnboardingScreen({ catalog = [], selectedIds = [], onToggle, onFinish, onSkip }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [configuringService, setConfiguringService] = useState(null);
  const [customConfigs, setCustomConfigs] = useState({});

  // Unique categories list
  const categoryList = useMemo(() => {
    const list = Array.from(new Set(catalog.map((s) => s.category).filter(Boolean)));
    return list.length > 0 ? list : ["OTT", "음악", "쇼핑", "생산성"];
  }, [catalog]);

  // Services in current active category
  const activeCategoryServices = useMemo(() => {
    if (!activeCategory) return [];
    return catalog.filter((s) => s.category === activeCategory);
  }, [catalog, activeCategory]);

  // Get full selected objects combined with any user customization
  const customizedSelectedList = useMemo(() => {
    return catalog
      .filter((service) => selectedIds.includes(service.id))
      .map((service) => {
        const custom = customConfigs[service.id] || {};
        return {
          ...service,
          plan: custom.plan !== undefined ? custom.plan : service.plan,
          amount: custom.amount !== undefined ? custom.amount : service.amount,
          dueDay: custom.dueDay !== undefined ? custom.dueDay : service.dueDay,
          paymentMethod: custom.paymentMethod !== undefined ? custom.paymentMethod : (service.paymentMethod || "신용/체크카드"),
        };
      });
  }, [catalog, selectedIds, customConfigs]);

  const monthlyTotal = useMemo(() => {
    return customizedSelectedList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [customizedSelectedList]);

  const handleSaveConfig = (configuredItem) => {
    setCustomConfigs((prev) => ({
      ...prev,
      [configuredItem.id]: {
        plan: configuredItem.plan,
        amount: configuredItem.amount,
        dueDay: configuredItem.dueDay,
        paymentMethod: configuredItem.paymentMethod,
      },
    }));
    if (!selectedIds.includes(configuredItem.id)) {
      onToggle(configuredItem.id);
    }
  };

  const handleRemoveService = (serviceId) => {
    setCustomConfigs((prev) => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
    if (selectedIds.includes(serviceId)) {
      onToggle(serviceId);
    }
  };

  const handleFinalSubmit = () => {
    onFinish(customizedSelectedList);
  };

  return (
    <main className="min-h-screen pb-36 bg-surface-base">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface-default/95 px-5 pb-3.5 pt-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          {activeCategory ? (
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-fg-secondary hover:text-fg-primary transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              카테고리 목록
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-2.5 py-1 text-[11px] font-bold text-fg-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-surface-brand" />
              빠른 구독 등록
            </span>
          )}
          <button
            type="button"
            onClick={onSkip}
            className="text-[13px] font-medium text-fg-subtle underline underline-offset-4 hover:text-fg-primary transition-colors cursor-pointer"
          >
            건너뛰기
          </button>
        </div>
      </header>

      {/* 1. 카테고리 허브 화면 (이모지/이미지 제거, 깔끔한 타이포그래피 & 철학 테마 배지) */}
      {!activeCategory && (
        <div className="animate-in fade-in duration-200">
          <section className="px-5 pt-6">
            <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-fg-primary">
              구독 카테고리
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
              원하는 분야를 선택해 가로형 카드로 간편하게 등록하세요.
            </p>
          </section>

          {/* Category Cards List */}
          <section className="mt-5 space-y-3 px-5" aria-label="카테고리 목록">
            {categoryList.map((cat) => {
              const countInCat = catalog.filter((s) => s.category === cat && selectedIds.includes(s.id)).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat);
                    if (typeof window !== "undefined") {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className={`group flex w-full items-center justify-between rounded-2xl border p-5 text-left transition-all active:scale-[0.99] cursor-pointer ${
                    countInCat > 0
                      ? "border-surface-brand bg-surface-default shadow-sm ring-1 ring-surface-brand/20"
                      : "border-border-subtle bg-surface-default shadow-2xs hover:border-border-default hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-[18px] font-bold text-fg-primary tracking-tight">{cat}</h3>
                    {countInCat > 0 && (
                      <span className="rounded-full bg-surface-brand px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs">
                        {countInCat}개 등록됨
                      </span>
                    )}
                  </div>
                  <ChevronRight size={20} className="text-fg-subtle group-hover:text-fg-primary transition-colors" />
                </button>
              );
            })}
          </section>
        </div>
      )}

      {/* 2. 특정 카테고리 세부 서비스 선택 (16:9 와이드 가로형 시네마틱 배너 카드 + 직접선택 UI) */}
      {activeCategory && (
        <div className="animate-in fade-in duration-200">
          <section className="px-5 pt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-brand">
              {activeCategory} · {CATEGORY_PHILOSOPHY[activeCategory]?.theme || "선택"}
            </p>
            <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-fg-primary">
              서비스 선택 & 빠른 등록
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
              카드를 탭하면 요금제와 결제일을 바로 지정하여 등록할 수 있어요.
            </p>
          </section>

          {/* 16:9 와이드 가로형 서비스 배너 카드 목록 */}
          <section className="mt-5 space-y-4 px-5" aria-label="와이드 배너 서비스 목록">
            {activeCategoryServices.map((service) => {
              const isRegistered = selectedIds.includes(service.id);
              const custom = customConfigs[service.id];
              const bannerUrl = `/assets/banners/${service.id}.svg`;
              const displayPlan = custom?.plan || service.plan || "기본 플랜";
              const displayAmount = custom?.amount !== undefined ? custom.amount : service.amount;
              const displayDue = custom?.dueDay || service.dueDay || 1;

              return (
                <article
                  key={service.id}
                  onClick={() => setConfiguringService(service)}
                  className={`overflow-hidden rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
                    isRegistered
                      ? "border-surface-brand shadow-md ring-2 ring-surface-brand/20 bg-surface-default"
                      : "border-border-subtle bg-surface-default shadow-2xs hover:border-border-default hover:shadow-xs"
                  }`}
                >
                  {/* 16:9 와이드 가로형 공식 배너 (첨부 이미지 규격 반영) */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-black flex items-center justify-center">
                    <img
                      src={bannerUrl}
                      alt={service.name}
                      className="h-full w-full object-cover select-none pointer-events-none"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    {/* 상태 오버레이 배지 */}
                    {isRegistered && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-surface-brand px-3 py-1 text-[11px] font-bold text-white shadow-md">
                        <Check size={13} strokeWidth={3} />
                        <span>등록 완료</span>
                      </div>
                    )}
                  </div>

                  {/* 카드 하단 정보 바 */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[16px] font-bold text-fg-primary tracking-tight">{service.name}</h3>
                        <CategoryBadge category={service.category} />
                      </div>
                      <p className="mt-0.5 text-[13px] font-medium text-fg-muted">
                        {displayPlan} · 월 {formatWon(displayAmount)}
                      </p>
                    </div>

                    <div>
                      {isRegistered ? (
                        <span className="rounded-xl border border-surface-brand/30 bg-palette-eucalyptus-green-50 px-3 py-1.5 text-[12px] font-bold text-surface-brand">
                          매월 {displayDue}일 결제
                        </span>
                      ) : (
                        <span className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1.5 text-[12px] font-semibold text-fg-secondary hover:bg-border-subtle">
                          + 직접 설정
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <div className="mt-6 px-5">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="w-full rounded-xl border border-border-subtle bg-surface-default py-3 text-[13px] font-semibold text-fg-secondary hover:bg-surface-inset transition-colors cursor-pointer"
            >
              다른 카테고리 둘러보기
            </button>
          </div>
        </div>
      )}

      {/* 직접 설정 Bottom Sheet Modal */}
      {configuringService && (
        <ServiceDirectConfigModal
          service={configuringService}
          currentConfig={customConfigs[configuringService.id]}
          onSave={handleSaveConfig}
          onRemove={handleRemoveService}
          onClose={() => setConfiguringService(null)}
        />
      )}

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[420px] -translate-x-1/2 border-x border-t border-border-subtle bg-surface-default/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5 shadow-lg backdrop-blur-md">
        <div className="mb-2.5 flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-fg-muted">
              <strong className="font-bold text-fg-primary">{customizedSelectedList.length}개</strong> 구독 등록됨
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-fg-subtle block">예상 월 지출 합계</span>
            <span className="text-[15px] font-extrabold text-fg-primary">{formatWon(monthlyTotal)}</span>
          </div>
        </div>

        <Button
          fullWidth
          size="large"
          variant="brand"
          disabled={customizedSelectedList.length === 0}
          onClick={handleFinalSubmit}
        >
          <CheckCircle2 size={18} className="mr-1" />
          {customizedSelectedList.length > 0
            ? `선택한 ${customizedSelectedList.length}개로 시작하기`
            : "구독 서비스를 선택해 주세요"}
        </Button>
      </div>
    </main>
  );
}
