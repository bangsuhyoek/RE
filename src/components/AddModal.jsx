import { API_BASE_URL, getApiEndpoint, isNativePlatform } from "../lib/apiBase";
import { recognizeDirectly, isDirectGeminiAvailable } from "../lib/geminiOcr";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileImage,
  LoaderCircle,
  MessageSquareText,
  Pencil,
  ScanLine,
  SlidersHorizontal,
  UploadCloud,
  X,
} from "lucide-react";
import {
  BottomSheet,
  Button,
  SegmentedControl,
  ActionChip,
  PaymentIcon,
  PAYMENT_PRESETS,
  PaymentMethodTriggerField,
  ToggleSwitch,
  CATEGORY_PHILOSOPHY,
} from "./ui";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const readImageAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("이미지 파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });

const callRecognitionApi = async (payload) => {
  if (payload?.text) {
    return recognizeDirectly(payload);
  }

  if (!API_BASE_URL) {
    if (isDirectGeminiAvailable()) {
      return recognizeDirectly(payload);
    }
    throw new Error(
      "AI 영수증 인식을 위해 백엔드 서버 주소(VITE_API_BASE_URL) 또는 GEMINI_API_KEY 설정이 필요합니다."
    );
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 35_000);
  try {
    const response = await fetch(getApiEndpoint("/api/ocr"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let result;
    try {
      result = await response.json();
    } catch {
      if (isDirectGeminiAvailable()) {
        return await recognizeDirectly(payload);
      }
      throw new Error("서버 응답을 처리하지 못했습니다. 백엔드 서버 상태를 확인해 주세요.");
    }
    if (!response.ok || !result.ok) throw new Error(result.message || "결제 정보를 인식하지 못했습니다.");
    return result;
  } catch (error) {
    if (isDirectGeminiAvailable() && (error.name === "AbortError" || (error instanceof TypeError && error.message?.includes("fetch")))) {
      return recognizeDirectly(payload);
    }
    if (error.name === "AbortError") {
      throw new Error("요청 시간이 초과되었습니다. 네트워크 상태를 확인한 후 다시 시도해 주세요.");
    }
    if (error instanceof TypeError && error.message && error.message.includes("fetch")) {
      throw new Error("AI 서버에 연결할 수 없습니다. 인터넷 연결 및 백엔드 서버 주소를 확인해 주세요.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
};

const CATEGORIES = ["OTT", "음악", "쇼핑", "생산성", "도서", "클라우드", "게임", "기타"];

const inputClass = (missing) =>
  `w-full rounded-xl border bg-white px-3.5 py-3 text-[14px] text-[#191F28] outline-none transition-colors focus:border-[#191F28] ${
    missing ? "border-[#FF4D4D] bg-[#FFF5F5]" : "border-[#E5E8EB] focus:bg-white"
  }`;

export function AddModal({ catalog = [], subscriptions = [], initialMode = "manual", initialData = null, onClose, onAdd }) {
  // Main mode: "manual" (수동 직접 입력) or "ai" (AI 영수증/문자 인식)
  const [mainMode, setMainMode] = useState(initialMode === "quick-detect" ? "manual" : initialMode);

  // Manual Form State
  const [manualForm, setManualForm] = useState(() => ({
    name: initialData?.name || "",
    category: initialData?.category || "OTT",
    plan: initialData?.plan || "",
    amount: initialData?.amount ? String(initialData.amount) : "",
    dueDay: initialData?.dueDay || new Date().getDate(),
    billingCycle: initialData?.billingCycle || "매월",
    paymentMethod: initialData?.paymentMethod || "",
    isTrial: Boolean(initialData?.isTrial),
    memo: initialData?.memo || "",
    monogram: initialData?.monogram || "",
    cancelUrl: initialData?.cancelUrl || "",
  }));

  const [showDetails, setShowDetails] = useState(() => {
    return Boolean(initialData?.plan || initialData?.memo || initialData?.isTrial);
  });
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.plan || initialData.memo || initialData.isTrial) {
        setShowDetails(true);
      }
      setManualForm((curr) => ({
        ...curr,
        name: initialData.name ?? curr.name,
        category: initialData.category || curr.category || "OTT",
        plan: initialData.plan ?? curr.plan,
        amount: initialData.amount ? String(initialData.amount) : curr.amount,
        dueDay: initialData.dueDay || curr.dueDay || new Date().getDate(),
        billingCycle: initialData.billingCycle || curr.billingCycle || "매월",
        paymentMethod: initialData.paymentMethod !== undefined ? initialData.paymentMethod : (curr.paymentMethod || ""),
        isTrial: initialData.isTrial !== undefined ? Boolean(initialData.isTrial) : curr.isTrial,
        memo: initialData.memo !== undefined ? initialData.memo : curr.memo,
        monogram: initialData.monogram || curr.monogram,
        cancelUrl: initialData.cancelUrl || curr.cancelUrl,
      }));
    }
  }, [initialData]);

  // AI OCR Form State
  const [aiTab, setAiTab] = useState("image");
  const [file, setFile] = useState(null);
  const [sms, setSms] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [aiForm, setAiForm] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const fileInputRef = useRef(null);

  // 1. Manual Form Handlers
  const updateManual = (key, value) => {
    setManualForm((curr) => ({ ...curr, [key]: value }));
    setError("");
  };

  const handleNameChange = (val) => {
    updateManual("name", val);
    if (val && val.trim()) {
      const q = val.trim().toLowerCase();
      const match = catalog.find(
        (c) => c.name.toLowerCase() === q || c.id.toLowerCase() === q
      );
      if (match && match.category) {
        updateManual("category", match.category);
      }
    }
  };

  // 자주 찾는 구독 빠른 선택: 요금제와 결제 금액은 채우지 않고 서비스명, 카테고리 등 기본 정보만 채움 (결제수단은 사용자 기존값 유지)
  const applyPreset = (service) => {
    setManualForm((curr) => ({
      ...curr,
      name: service.name,
      category: service.category || "기타",
      plan: "", // 요금제는 사용자가 직접 입력하도록 비움
      amount: "", // 결제 금액은 사용자가 직접 입력하도록 비움
      dueDay: curr.dueDay || new Date().getDate(),
      monogram: service.monogram || service.name.slice(0, 1).toUpperCase(),
      cancelUrl: service.cancelUrl || "",
      paymentMethod: curr.paymentMethod || "",
    }));
    setError("");
  };

  const saveManual = () => {
    if (!manualForm.name.trim()) {
      setError("서비스명을 입력해 주세요.");
      return;
    }
    const trimmedAmount = String(manualForm.amount ?? "").trim();
    const amountNum = Number(trimmedAmount);
    if (trimmedAmount === "" || isNaN(amountNum) || amountNum < 0) {
      setError("결제 금액을 올바르게 입력해 주세요.");
      return;
    }
    const dueDayNum = Number(manualForm.dueDay);
    if (!dueDayNum || dueDayNum < 1 || dueDayNum > 31) {
      setError("결제일을 1~31일 사이로 입력해 주세요.");
      return;
    }
    if (!manualForm.paymentMethod?.trim()) {
      setError("결제 수단을 선택해 주세요.");
      return;
    }
    const matched = catalog.find(
      (s) => s.name.toLowerCase() === manualForm.name.trim().toLowerCase()
    );

    const payload = {
      ...manualForm,
      name: manualForm.name.trim(),
      plan: manualForm.plan.trim() || "기본 플랜",
      amount: amountNum,
      dueDay: dueDayNum,
      monogram: manualForm.monogram || matched?.monogram || manualForm.name.trim().slice(0, 1).toUpperCase(),
      cancelUrl: manualForm.cancelUrl || matched?.cancelUrl || "https://google.com",
      category: manualForm.category || matched?.category || "기타",
      paymentMethod: manualForm.paymentMethod.trim(),
      memo: manualForm.memo.trim(),
    };
    const added = onAdd(payload);
    if (added !== false) onClose();
  };

  // 2. AI Mode Handlers
  const validateAiSource = () => {
    if (aiTab === "sms") {
      if (!sms.trim()) return "결제 문자를 붙여넣어 주세요.";
      return "";
    }
    if (!file) return "영수증 또는 결제 화면 이미지를 선택해 주세요.";
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "JPG, PNG, WEBP 이미지만 사용할 수 있습니다.";
    if (file.size > MAX_IMAGE_BYTES) return "이미지는 8MB 이하만 사용할 수 있습니다.";
    return "";
  };

  const startAiScan = async () => {
    const validationMessage = validateAiSource();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setWarnings([]);
    setScanning(true);
    try {
      const payload =
        aiTab === "image"
          ? { imageBase64: await readImageAsBase64(file), mimeType: file.type }
          : { text: sms.trim() };
      const result = await callRecognitionApi(payload);
      const recognized = result.data;
      const matched = catalog.find(
        (service) =>
          service.id === recognized.serviceId || service.name.toLowerCase() === recognized.name.toLowerCase()
      );

      setAiForm({
        name: recognized.name,
        monogram: matched?.monogram || recognized.name?.trim().slice(0, 1).toUpperCase() || "?",
        category: matched?.category || "기타",
        plan: recognized.plan,
        amount: recognized.amount,
        dueDay: recognized.dueDay,
        billingCycle: recognized.billingCycle || "매월",
        paymentMethod: recognized.paymentMethod || "",
        cancelUrl: matched?.cancelUrl || "",
        isTrial: false,
      });
      setWarnings(result.warnings || []);
    } catch (recognitionError) {
      const message =
        recognitionError?.name === "AbortError"
          ? "이미지 인식 시간이 초과되었습니다. 다시 시도해 주세요."
          : recognitionError?.message || "결제 정보를 인식하지 못했습니다.";
      setError(message);
    } finally {
      setScanning(false);
    }
  };

  const saveAi = () => {
    if (!aiForm?.name || !aiForm.plan || !Number(aiForm.amount) || !Number(aiForm.dueDay)) {
      setError("서비스명, 요금제, 결제 금액, 결제일을 확인해 주세요.");
      return;
    }
    const amount = Number(aiForm.amount);
    const dueDay = Number(aiForm.dueDay);
    if (amount <= 0 || dueDay < 1 || dueDay > 31) {
      setError("결제 금액과 결제일을 올바르게 입력해 주세요.");
      return;
    }
    if (!aiForm.paymentMethod?.trim()) {
      setError("결제 수단을 선택해 주세요.");
      return;
    }
    const added = onAdd({ ...aiForm, amount, dueDay });
    if (added !== false) onClose();
  };

  return (
    <BottomSheet onClose={onClose} label="구독 추가하기">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#191F28]">구독 추가하기</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full text-[#868B94] hover:bg-[#F2F4F6] hover:text-[#191F28] transition-colors"
          aria-label="닫기"
        >
          <X size={20} />
        </button>
      </div>
      <p className="mt-1 text-[13px] leading-5 text-[#868B94]">
        {mainMode === "manual"
          ? "서비스 정보와 결제일을 직접 입력해 등록하세요."
          : "영수증 사진이나 결제 문자를 분석해 자동으로 채워드려요."}
      </p>

      {/* Main Mode Toggle: 직접 입력 vs AI 영수증 인식 (흑백 모노크롬) */}
      <SegmentedControl
        className="mt-4"
        value={mainMode}
        onChange={(next) => {
          setMainMode(next);
          setError("");
        }}
        options={[
          { value: "manual", label: "직접 입력", icon: <Pencil size={15} /> },
          { value: "ai", label: "AI 영수증 인식", icon: <ScanLine size={15} /> },
        ]}
      />

      {/* 1. 수동 직접 입력 모드 (흑백 모노크롬, 사진 블록 제거, 빠른 선택 시 요금제/금액 비움) */}
      {mainMode === "manual" && (
        <section className="mt-5 space-y-4">
          {initialData?.autoDetected && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-[13px] shadow-sm">
                ⚡
              </span>
              <div className="flex-1">
                <p className="font-semibold text-emerald-900">결제 알림에서 자동 감지된 구독 정보입니다</p>
                <p className="mt-0.5 text-[11px] text-emerald-700/80">내용을 확인하고 하단의 등록 완료 버튼을 눌러주세요.</p>
              </div>
            </div>
          )}
          {/* Popular Services Quick Presets */}
          {catalog.length > 0 && (
            <div>
              <span className="block text-[12px] font-semibold text-[#868B94]">자주 찾는 구독 빠른 선택</span>
              <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {catalog.slice(0, 8).map((preset) => {
                  const isSelected = manualForm.name.toLowerCase() === preset.name.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all active:scale-95 ${
                        isSelected
                          ? "border-[#191F28] bg-[#191F28] text-white shadow-xs"
                          : "border-[#E5E8EB] bg-[#F7F8F9] text-[#4E5968] hover:border-[#D1D6DB] hover:bg-white"
                      }`}
                    >
                      <span className={`grid h-4.5 w-4.5 place-items-center rounded-full text-[10px] font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-[#E5E8EB] text-[#191F28]"
                      }`}>
                        {preset.monogram || preset.name.slice(0, 1)}
                      </span>
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3.5 pt-1">
            {/* 서비스명 */}
            <div>
              <label className="block text-[13px] font-semibold text-[#191F28]">
                서비스명 <span className="text-[#FF4D4D] font-bold ml-0.5">*</span>
              </label>
              <div className="relative mt-1.5 flex items-center">
                <input
                  value={manualForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`${inputClass(!manualForm.name && error)} pr-10`}
                  placeholder="예: 넷플릭스, 유튜브 프리미엄, 쿠팡 와우"
                />
                {manualForm.name && (
                  <button
                    type="button"
                    onClick={() => updateManual("name", "")}
                    className="absolute right-3 grid h-6 w-6 place-items-center rounded-full bg-[#F2F4F6] text-[#868B94] hover:bg-[#E5E8EB] hover:text-[#191F28] transition-all active:scale-95"
                    aria-label="서비스명 지우기"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {/* 카테고리 간편 배지 */}
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#868B94]">카테고리:</span>
                  <button
                    type="button"
                    onClick={() => setShowCategoryPicker((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-md bg-[#F2F4F6] px-2 py-0.5 text-[11px] font-bold text-[#4E5968] hover:bg-[#E5E8EB] transition-colors"
                  >
                    <span>{manualForm.category || "기타"}</span>
                    <ChevronDown size={11} className={`transition-transform ${showCategoryPicker ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>
              {showCategoryPicker && (
                <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] p-2 animate-in fade-in duration-150">
                  {CATEGORIES.map((cat) => (
                    <ActionChip
                      key={cat}
                      selected={manualForm.category === cat}
                      onClick={() => {
                        updateManual("category", cat);
                        setShowCategoryPicker(false);
                      }}
                      size="small"
                    >
                      {cat}
                    </ActionChip>
                  ))}
                </div>
              )}
            </div>

            {/* 통합 결제 금액 & 결제일 카드 */}
            <div className="rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-[#191F28]">
                  결제 금액 <span className="text-[#FF4D4D] font-bold ml-0.5">*</span>
                </label>
                <div className="relative w-40">
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={manualForm.amount}
                    onChange={(e) => updateManual("amount", e.target.value)}
                    className={`${inputClass(
                      (String(manualForm.amount ?? "").trim() === "" ||
                        isNaN(Number(manualForm.amount)) ||
                        Number(manualForm.amount) < 0) &&
                        Boolean(error)
                    )} pr-8 text-right font-bold text-[15px]`}
                    placeholder="0"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#4E5968]">
                    원
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#E5E8EB]/70 pt-2.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-[13px] font-bold text-[#191F28]">결제 주기 / 일</label>
                  <span className="text-[#FF4D4D] font-bold">*</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <select
                      value={manualForm.billingCycle}
                      onChange={(e) => updateManual("billingCycle", e.target.value)}
                      className="appearance-none rounded-xl border border-[#E5E8EB] bg-white px-2.5 py-1.5 pr-7 text-[13px] font-semibold text-[#191F28] outline-none"
                    >
                      <option value="매월">매월</option>
                      <option value="매년">매년</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      inputMode="numeric"
                      value={manualForm.dueDay}
                      onChange={(e) => updateManual("dueDay", e.target.value)}
                      className={`${inputClass((!manualForm.dueDay || manualForm.dueDay < 1 || manualForm.dueDay > 31) && error)} w-14 px-2 py-1.5 text-center font-bold text-[13px]`}
                      placeholder="15"
                    />
                    <span className="ml-1 text-[13px] font-semibold text-[#191F28]">일</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 결제 수단 */}
            <div>
              <label className="block text-[13px] font-semibold text-[#191F28] mb-1.5">
                결제 수단 <span className="text-[#FF4D4D] font-bold ml-0.5">*</span>
              </label>
              <PaymentMethodTriggerField
                value={manualForm.paymentMethod}
                onChange={(val) => {
                  updateManual("paymentMethod", val);
                  if (val && error === "결제 수단을 선택해 주세요.") setError("");
                }}
                error={!manualForm.paymentMethod?.trim() && Boolean(error)}
                subscriptions={subscriptions}
              />
            </div>

            {/* 세부 옵션 접이식 (요금제, 무료체험, 메모) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDetails((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-[#E5E8EB] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB] transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal size={14} />
                  {showDetails ? "세부 정보 닫기" : "세부 정보 더보기 (요금제, 무료체험, 메모)"}
                </span>
                <ChevronDown size={15} className={`transition-transform duration-200 ${showDetails ? "rotate-180" : ""}`} />
              </button>

              {showDetails && (
                <div className="mt-3 space-y-3 rounded-2xl border border-[#E5E8EB] bg-[#FAFAFA] p-3.5 animate-in fade-in duration-150">
                  {/* 요금제 */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#4E5968]">
                      요금제 / 플랜 <span className="text-[11px] font-normal text-[#868B94]">(선택)</span>
                    </label>
                    <input
                      value={manualForm.plan}
                      onChange={(e) => updateManual("plan", e.target.value)}
                      className={`${inputClass(false)} mt-1 bg-white`}
                      placeholder="예: 프리미엄, 스탠다드, 개인 멤버십"
                    />
                  </div>

                  {/* 무료 체험 여부 토글 */}
                  <div className="flex items-center justify-between rounded-xl border border-[#E5E8EB] bg-white p-3">
                    <div>
                      <strong className="block text-[12px] font-bold text-[#191F28]">현재 무료 체험 중</strong>
                      <span className="text-[11px] text-[#868B94]">종료 전 사전 알림을 보내드려요</span>
                    </div>
                    <ToggleSwitch
                      checked={manualForm.isTrial}
                      onChange={(checked) => {
                        setManualForm((curr) => ({
                          ...curr,
                          isTrial: checked,
                          amount: checked ? "0" : (curr.amount === "0" ? "" : curr.amount),
                        }));
                        setError("");
                      }}
                      label="무료 체험 여부"
                    />
                  </div>

                  {/* 메모 / 비고 */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#4E5968]">
                      메모 <span className="text-[11px] font-normal text-[#868B94]">(선택)</span>
                    </label>
                    <textarea
                      value={manualForm.memo}
                      onChange={(e) => updateManual("memo", e.target.value)}
                      placeholder="예: 3개월 프로모션 적용 중, 가족과 계정 공유"
                      rows={2}
                      className="mt-1 w-full resize-none rounded-xl border border-[#E5E8EB] bg-white p-3 text-[13px] text-[#191F28] outline-none placeholder:text-[#8B95A1] focus:border-[#191F28] transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-[12px] leading-5 text-[#FF4D4D]">{error}</p>}

          {/* ActionButton (흑백 모노크롬 Primary) */}
          <Button
            size="large"
            variant="primary"
            fullWidth
            onClick={saveManual}
            className="mt-6"
          >
            구독 추가하기
          </Button>
        </section>
      )}

      {/* 2. AI 영수증/문자 인식 모드 (영수증 이미지와 결제 문자 간 176px 고정 높이 일치) */}
      {mainMode === "ai" && (
        <div className="mt-4">
          <SegmentedControl
            value={aiTab}
            onChange={(t) => {
              setAiTab(t);
              setError("");
              setAiForm(null);
            }}
            options={[
              { value: "image", label: "영수증 이미지", icon: <FileImage size={15} /> },
              { value: "sms", label: "결제 문자", icon: <MessageSquareText size={15} /> },
            ]}
          />

          {!aiForm && (
            <div className="mt-4">
              {/* 높이 176px 고정 (h-[176px])으로 탭 전환 시 높낮이 불일치 방지 */}
              {aiTab === "image" ? (
                <button
                  type="button"
                  disabled={scanning}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-[176px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                    scanning
                      ? "scanner-shimmer border-[#191F28] bg-white"
                      : "border-[#E5E8EB] bg-[#F9FAFB] hover:border-[#191F28]"
                  }`}
                >
                  {scanning ? (
                    <LoaderCircle className="mx-auto animate-spin text-[#191F28]" size={28} />
                  ) : (
                    <UploadCloud className="mx-auto text-[#8B95A1]" size={28} />
                  )}
                  <strong className="mt-3 block text-[14px] font-bold text-[#191F28]">
                    {scanning ? "영수증을 분석하고 있어요" : file ? file.name : "영수증 또는 결제 화면을 올려주세요"}
                  </strong>
                  <span className="mt-1 block text-[12px] text-[#6B7684]">
                    {scanning ? "서비스명 · 금액 · 결제일을 읽는 중" : "JPG, PNG, WEBP · 최대 8MB"}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] || null);
                      setError("");
                    }}
                  />
                </button>
              ) : (
                <label
                  className={`block w-full h-[176px] flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    scanning
                      ? "scanner-shimmer border-[#191F28] bg-white"
                      : "border-[#E5E8EB] bg-[#F9FAFB] focus-within:border-[#191F28] focus-within:bg-white"
                  }`}
                >
                  <span className="block text-[13px] font-bold text-[#191F28]">결제 문자 붙여넣기</span>
                  <textarea
                    disabled={scanning}
                    value={sms}
                    onChange={(event) => {
                      setSms(event.target.value);
                      setError("");
                    }}
                    placeholder="예: 상품명 티빙 / 13,500원 결제완료 / 09월 10일"
                    className="no-focus-ring w-full flex-1 resize-none bg-transparent pt-1 text-[14px] leading-6 text-[#191F28] outline-none placeholder:text-[#8B95A1] focus:outline-none"
                  />
                  <span className="block text-[11px] text-[#868B94] text-right">금액 및 날짜를 포함해 주세요</span>
                </label>
              )}
              {error && <p className="mt-2 text-[12px] leading-5 text-[#FF4D4D]">{error}</p>}
              <Button
                size="large"
                variant="primary"
                fullWidth
                className="mt-4"
                disabled={scanning}
                loading={scanning}
                onClick={startAiScan}
                prefixIcon={!scanning && <ScanLine size={18} />}
              >
                스마트 인식 시작
              </Button>
            </div>
          )}

          {aiForm && (
            <section className="field-enter mt-5">
              {warnings.length ? (
                <div className="mb-4 rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] p-4 text-[12px] text-[#4E5968]">
                  <div className="flex items-center gap-2 font-bold text-[#191F28]">
                    <AlertTriangle size={16} />일부 정보는 직접 확인해 주세요.
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 leading-5">
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] p-3.5 text-[12px] font-semibold text-[#191F28]">
                  <CheckCircle2 size={16} />결제 내역을 인식했어요. 저장 전에 확인해 주세요.
                </div>
              )}
              <div className="space-y-3">
                <label className="block text-[12px] font-semibold text-[#6B7684]">
                  서비스명
                  <input
                    value={aiForm.name}
                    onChange={(event) => setAiForm((curr) => ({ ...curr, name: event.target.value }))}
                    className={inputClass(!aiForm.name)}
                    placeholder="서비스명을 입력해 주세요"
                  />
                </label>
                <label className="block text-[12px] font-semibold text-[#6B7684]">
                  요금제
                  <input
                    value={aiForm.plan}
                    onChange={(event) => setAiForm((curr) => ({ ...curr, plan: event.target.value }))}
                    className={inputClass(!aiForm.plan)}
                    placeholder="확인된 요금제를 입력해 주세요"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[12px] font-medium text-[#71717A]">
                    결제 금액
                    <input
                      type="number"
                      min="1"
                      value={aiForm.amount}
                      onChange={(event) => setAiForm((curr) => ({ ...curr, amount: event.target.value }))}
                      className={inputClass(!Number(aiForm.amount))}
                      placeholder="0"
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-[#71717A]">
                    결제일
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={aiForm.dueDay}
                      onChange={(event) => setAiForm((curr) => ({ ...curr, dueDay: event.target.value }))}
                      className={inputClass(!Number(aiForm.dueDay))}
                      placeholder="1~31"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[12px] font-medium text-[#71717A]">
                    결제 주기
                    <select
                      value={aiForm.billingCycle}
                      onChange={(event) => setAiForm((curr) => ({ ...curr, billingCycle: event.target.value }))}
                      className={inputClass(false)}
                    >
                      <option>매월</option>
                      <option>매년</option>
                    </select>
                  </label>
                </div>
                <div className="mt-3">
                  <label className="block text-[12px] font-medium text-[#71717A] mb-1.5">
                    결제 수단 <span className="text-[#FF4D4D] font-bold ml-0.5">*</span>
                  </label>
                  <PaymentMethodTriggerField
                    value={aiForm.paymentMethod}
                    onChange={(val) => {
                      setAiForm((curr) => ({ ...curr, paymentMethod: val }));
                      if (val && error === "결제 수단을 선택해 주세요.") setError("");
                    }}
                    error={!aiForm.paymentMethod?.trim() && Boolean(error)}
                    subscriptions={subscriptions}
                  />
                </div>
              </div>
              {error && <p className="mt-2 text-[12px] leading-5 text-[#FF4D4D]">{error}</p>}
              <p className="mt-3 text-[11px] leading-4 text-[#8B95A1]">
                이미지는 OCR 처리에만 사용되며 꾸독에는 원본과 OCR 원문을 저장하지 않습니다. 확인한 구독 정보만 저장합니다.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <Button size="large" variant="secondary" onClick={() => setAiForm(null)}>
                  다시 인식하기
                </Button>
                <Button size="large" variant="primary" onClick={saveAi}>
                  내 구독에 추가
                </Button>
              </div>
            </section>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
