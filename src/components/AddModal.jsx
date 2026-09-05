import { useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, FileImage, Keyboard, LoaderCircle, MessageSquareText, ScanLine, UploadCloud } from "lucide-react";
import { BottomSheet, Button } from "./ui";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MANUAL_STEPS = ["서비스", "결제 금액", "결제 주기", "다음 결제일", "선택 정보"];

const readImageAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || "");
    resolve(result.includes(",") ? result.split(",")[1] : result);
  };
  reader.onerror = () => reject(new Error("이미지 파일을 읽지 못했습니다."));
  reader.readAsDataURL(file);
});

const callRecognitionApi = async (payload) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 35_000);
  try {
    const response = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("OCR API를 실행하지 못했습니다. 로컬에서는 Vite 개발 서버로 실행해 주세요.");
    }
    if (!response.ok || !result.ok) throw new Error(result.message || "결제 정보를 인식하지 못했습니다.");
    return result;
  } finally {
    window.clearTimeout(timer);
  }
};

const blankForm = (service = null) => ({
  id: service?.id,
  name: service?.name || "",
  monogram: service?.monogram || "",
  category: service?.category || "기타",
  plan: "",
  amount: "",
  dueDay: "",
  billingCycle: "매월",
  nextBillingDate: "",
  paymentMethod: "",
  cancelUrl: service?.cancelUrl || "",
  isTrial: false,
});

const inputClass = (missing) => `mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-[14px] text-black outline-none transition-shadow focus:border-black focus:shadow-[0_0_0_3px_rgba(0,0,0,.05)] ${missing ? "border-[#F59E0B]" : "border-[#E4E4E7]"}`;

const parseDate = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export function AddModal({ catalog = [], initialService = null, onClose, onAdd }) {
  const [tab, setTab] = useState(initialService ? "manual" : "image");
  const [file, setFile] = useState(null);
  const [sms, setSms] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialService ? blankForm(initialService) : null);
  const [warnings, setWarnings] = useState([]);
  const [manualStep, setManualStep] = useState(0);
  const fileInput = useRef(null);

  const validateSource = () => {
    if (tab === "sms") {
      if (!sms.trim()) return "결제 문자를 붙여넣어 주세요.";
      return "";
    }
    if (!file) return "영수증 또는 결제 화면 이미지를 선택해 주세요.";
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "JPG, PNG, WEBP 이미지만 사용할 수 있습니다.";
    if (file.size > MAX_IMAGE_BYTES) return "이미지는 8MB 이하만 사용할 수 있습니다.";
    return "";
  };

  const startScan = async () => {
    const validationMessage = validateSource();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setWarnings([]);
    setScanning(true);
    try {
      const payload = tab === "image"
        ? { imageBase64: await readImageAsBase64(file), mimeType: file.type }
        : { text: sms.trim() };
      const result = await callRecognitionApi(payload);
      const recognized = result.data || {};
      const matched = catalog.find((service) => service.id === recognized.serviceId || service.name.toLowerCase() === String(recognized.name || "").toLowerCase());

      setForm({
        id: matched?.id || recognized.serviceId || undefined,
        name: recognized.name || matched?.name || "",
        monogram: matched?.monogram || recognized.name?.trim().slice(0, 1).toUpperCase() || "?",
        category: matched?.category || "기타",
        plan: recognized.plan || "",
        amount: recognized.amount || "",
        dueDay: recognized.dueDay || "",
        billingCycle: recognized.billingCycle || "매월",
        nextBillingDate: recognized.nextBillingDate || "",
        paymentMethod: recognized.paymentMethod || "",
        cancelUrl: matched?.cancelUrl || "",
        isTrial: false,
      });
      setWarnings(result.warnings || []);
    } catch (recognitionError) {
      const message = recognitionError?.name === "AbortError"
        ? "이미지 인식 시간이 초과되었습니다. 다시 시도해 주세요."
        : recognitionError?.message || "결제 정보를 인식하지 못했습니다.";
      setError(message);
    } finally {
      setScanning(false);
    }
  };

  const save = () => {
    const amount = Number(form?.amount);
    const nextBillingDate = String(form?.nextBillingDate || "").trim();
    const parsedDate = parseDate(nextBillingDate);
    const dueDay = parsedDate ? parsedDate.getDate() : Number(form?.dueDay);
    const plan = String(form?.plan || "").trim() || "요금제 미등록";

    if (!form?.name?.trim() || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(dueDay)) {
      setError("서비스명, 결제 금액, 결제일을 확인해 주세요.");
      return;
    }
    if (tab === "manual" && !parsedDate) {
      setError("다음 결제일을 확인해 주세요.");
      return;
    }
    if (form?.billingCycle === "매년" && !parsedDate) {
      setError("연간 구독은 다음 결제일을 날짜로 확인해 주세요.");
      return;
    }
    if (dueDay < 1 || dueDay > 31) {
      setError("결제일을 올바르게 입력해 주세요.");
      return;
    }

    const outcome = onAdd({ ...form, name: form.name.trim(), plan, amount, dueDay, nextBillingDate });
    if (outcome === true) onClose();
  };

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const resetRecognition = () => {
    setForm(tab === "manual" ? blankForm(initialService) : null);
    setManualStep(0);
    setWarnings([]);
    setError("");
  };

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setError("");
    setWarnings([]);
    setManualStep(0);
    setForm(nextTab === "manual" ? blankForm(initialService) : null);
  };

  const canContinueManual = (() => {
    if (!form) return false;
    if (manualStep === 0) return Boolean(form.name.trim());
    if (manualStep === 1) return Number(form.amount) > 0;
    if (manualStep === 2) return form.billingCycle === "매월" || form.billingCycle === "매년";
    if (manualStep === 3) return Boolean(parseDate(form.nextBillingDate));
    return true;
  })();

  const nextManualStep = () => {
    if (!canContinueManual) return;
    setError("");
    setManualStep((current) => Math.min(MANUAL_STEPS.length - 1, current + 1));
  };

  const previousManualStep = () => {
    setError("");
    setManualStep((current) => Math.max(0, current - 1));
  };

  const manualFlow = tab === "manual" && form && (
    <section className="field-enter mt-5">
      <div className="flex items-center justify-between text-[11px] font-semibold text-[#71717A]">
        <span>{MANUAL_STEPS[manualStep]}</span>
        <span>{manualStep + 1} / {MANUAL_STEPS.length}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F4F4F5]">
        <div className="h-full rounded-full bg-black transition-[width] duration-200" style={{ width: `${((manualStep + 1) / MANUAL_STEPS.length) * 100}%` }} />
      </div>

      {manualStep === 0 && (
        <div className="field-enter mt-5 space-y-3">
          <div><h3 className="text-[18px] font-semibold">어떤 구독인가요?</h3><p className="mt-1 text-[12px] text-[#71717A]">서비스를 먼저 확인할게요.</p></div>
          <label className="block text-[12px] font-medium text-[#71717A]">서비스명<input autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} className={inputClass(!form.name.trim())} placeholder="서비스명을 입력해 주세요" /></label>
          <label className="block text-[12px] font-medium text-[#71717A]">요금제 (선택)<input value={form.plan} onChange={(event) => update("plan", event.target.value)} className={inputClass(false)} placeholder="모르면 비워두어도 돼요" /></label>
        </div>
      )}

      {manualStep === 1 && (
        <div className="field-enter mt-5">
          <h3 className="text-[18px] font-semibold">얼마를 결제하나요?</h3><p className="mt-1 text-[12px] text-[#71717A]">실제 결제 금액을 입력해 주세요.</p>
          <label className="mt-4 block text-[12px] font-medium text-[#71717A]">결제 금액<input autoFocus type="number" min="1" inputMode="numeric" value={form.amount} onChange={(event) => update("amount", event.target.value)} className={inputClass(!Number(form.amount))} placeholder="0" /></label>
        </div>
      )}

      {manualStep === 2 && (
        <div className="field-enter mt-5">
          <h3 className="text-[18px] font-semibold">결제 주기를 알려주세요.</h3><p className="mt-1 text-[12px] text-[#71717A]">월 결제와 연 결제를 구분해요.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {["매월", "매년"].map((cycle) => <button key={cycle} type="button" onClick={() => update("billingCycle", cycle)} className={`rounded-2xl border p-4 text-[14px] font-semibold transition-colors ${form.billingCycle === cycle ? "border-black bg-black text-white" : "border-[#E4E4E7] bg-white text-[#71717A]"}`}>{cycle}</button>)}
          </div>
        </div>
      )}

      {manualStep === 3 && (
        <div className="field-enter mt-5">
          <h3 className="text-[18px] font-semibold">다음 결제일은 언제인가요?</h3><p className="mt-1 text-[12px] text-[#71717A]">연간 구독도 정확한 월을 기억할 수 있도록 날짜 전체를 확인해요.</p>
          <label className="mt-4 block text-[12px] font-medium text-[#71717A]">다음 결제일<input autoFocus type="date" value={form.nextBillingDate} onChange={(event) => update("nextBillingDate", event.target.value)} className={inputClass(!parseDate(form.nextBillingDate))} /></label>
        </div>
      )}

      {manualStep === 4 && (
        <div className="field-enter mt-5 space-y-3">
          <div><h3 className="text-[18px] font-semibold">마지막으로 확인할게요.</h3><p className="mt-1 text-[12px] text-[#71717A]">아래 정보는 선택 사항이에요.</p></div>
          <label className="block text-[12px] font-medium text-[#71717A]">결제 수단 (선택)<input value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} className={inputClass(false)} placeholder="예: 신용카드, 네이버페이" /></label>
          <label className="flex items-center justify-between rounded-xl border border-[#E4E4E7] bg-white px-3 py-3 text-[12px]">
            <span><strong className="block text-[13px]">무료 체험 중</strong><span className="mt-0.5 block text-[#71717A]">체험 종료 전 알림에 사용해요.</span></span>
            <input type="checkbox" checked={Boolean(form.isTrial)} onChange={(event) => update("isTrial", event.target.checked)} className="h-5 w-5" />
          </label>
          <div className="rounded-xl bg-[#FAFAFA] px-3 py-3 text-[12px] leading-5 text-[#71717A]">
            <strong className="block text-[13px] text-black">{form.name}</strong>
            <span>{form.plan.trim() || "요금제 미등록"} · {Number(form.amount || 0).toLocaleString("ko-KR")}원 · {form.billingCycle} · {form.nextBillingDate}</span>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-[12px] leading-5 text-[#EF4444]">{error}</p>}
      <div className={`mt-6 grid gap-2 ${manualStep > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
        {manualStep > 0 && <Button variant="secondary" onClick={previousManualStep}><ArrowLeft size={16} />이전</Button>}
        {manualStep < MANUAL_STEPS.length - 1 ? (
          <Button disabled={!canContinueManual} onClick={nextManualStep}>다음 <ChevronRight size={16} /></Button>
        ) : (
          <Button onClick={save}>등록 완료</Button>
        )}
      </div>
    </section>
  );

  const recognizedForm = tab !== "manual" && form && (
    <section className="field-enter mt-5">
      {warnings.length ? (
        <div className="mb-4 rounded-xl border border-[#F59E0B]/40 bg-[#FFFBEB] px-3 py-3 text-[12px] text-[#92400E]">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} />일부 정보는 직접 확인해 주세요.</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 leading-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2.5 text-[12px] text-[#047857]"><CheckCircle2 size={16} />결제 내역을 인식했어요. 저장 전에 확인해 주세요.</div>
      )}

      <div className="space-y-3">
        <label className="block text-[12px] font-medium text-[#71717A]">서비스명<input value={form.name} onChange={(event) => update("name", event.target.value)} className={inputClass(!form.name)} placeholder="서비스명을 입력해 주세요" /></label>
        <label className="block text-[12px] font-medium text-[#71717A]">요금제 (선택)<input value={form.plan} onChange={(event) => update("plan", event.target.value)} className={inputClass(false)} placeholder="모르면 비워두어도 돼요" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[12px] font-medium text-[#71717A]">결제 금액<input type="number" min="1" value={form.amount} onChange={(event) => update("amount", event.target.value)} className={inputClass(!Number(form.amount))} placeholder="0" /></label>
          <label className="block text-[12px] font-medium text-[#71717A]">결제일<input type="number" min="1" max="31" value={form.dueDay} onChange={(event) => update("dueDay", event.target.value)} className={inputClass(!Number(form.dueDay))} placeholder="1~31" /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[12px] font-medium text-[#71717A]">결제 주기<select value={form.billingCycle} onChange={(event) => update("billingCycle", event.target.value)} className={inputClass(false)}><option>매월</option><option>매년</option></select></label>
          <label className="block text-[12px] font-medium text-[#71717A]">결제 수단<input value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} className={inputClass(false)} placeholder="선택 입력" /></label>
        </div>
        <label className="block text-[12px] font-medium text-[#71717A]">다음 결제일 {form.billingCycle === "매년" ? "(연간 구독 필수)" : "(선택)"}<input type="date" value={form.nextBillingDate} onChange={(event) => update("nextBillingDate", event.target.value)} className={inputClass(form.billingCycle === "매년" && !form.nextBillingDate)} /></label>
        <label className="flex items-center justify-between rounded-xl border border-[#E4E4E7] bg-white px-3 py-3 text-[12px]">
          <span><strong className="block text-[13px]">무료 체험 중</strong><span className="mt-0.5 block text-[#71717A]">체험 종료 전 알림에 사용해요.</span></span>
          <input type="checkbox" checked={Boolean(form.isTrial)} onChange={(event) => update("isTrial", event.target.checked)} className="h-5 w-5" />
        </label>
      </div>

      {error && <p className="mt-2 text-[12px] leading-5 text-[#EF4444]">{error}</p>}
      <p className="mt-3 text-[11px] leading-4 text-[#A1A1AA]">이미지는 OCR 처리에만 사용되며 원본과 OCR 원문을 저장하지 않습니다. 확인한 구독 정보만 저장합니다.</p>
      <div className="mt-5 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={resetRecognition}>다시 인식하기</Button><Button onClick={save}>내 구독에 추가</Button></div>
    </section>
  );

  return (
    <BottomSheet onClose={onClose} label="구독 추가">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">ADD SUBSCRIPTION</p><h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">구독 정보를 확인해요</h2></div>
        <ScanLine size={22} />
      </div>
      <p className="mt-2 text-[13px] leading-5 text-[#71717A]">영수증 이미지, 결제 문자 또는 직접 입력으로 추가할 수 있어요.</p>

      <div className="mt-5 grid grid-cols-3 rounded-xl bg-[#F4F4F5] p-1">
        <button type="button" onClick={() => changeTab("image")} className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[11px] font-semibold transition-colors ${tab === "image" ? "bg-white text-black shadow-sm" : "text-[#71717A]"}`}><FileImage size={15} />이미지</button>
        <button type="button" onClick={() => changeTab("sms")} className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[11px] font-semibold transition-colors ${tab === "sms" ? "bg-white text-black shadow-sm" : "text-[#71717A]"}`}><MessageSquareText size={15} />결제 문자</button>
        <button type="button" onClick={() => changeTab("manual")} className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[11px] font-semibold transition-colors ${tab === "manual" ? "bg-white text-black shadow-sm" : "text-[#71717A]"}`}><Keyboard size={15} />직접 입력</button>
      </div>

      {!form && (
        <div className="mt-4">
          {tab === "image" ? (
            <button type="button" disabled={scanning} onClick={() => fileInput.current?.click()} className={`w-full rounded-xl border-2 border-dashed p-7 text-center transition-colors ${scanning ? "scanner-shimmer border-black bg-white" : "border-[#E4E4E7] bg-[#FAFAFA] hover:border-black"}`}>
              {scanning ? <LoaderCircle className="mx-auto animate-spin" size={25} /> : <UploadCloud className="mx-auto" size={25} />}
              <strong className="mt-3 block text-[14px]">{scanning ? "영수증을 분석하고 있어요" : file ? file.name : "영수증 또는 결제 화면을 올려주세요"}</strong>
              <span className="mt-1 block text-[12px] text-[#71717A]">{scanning ? "서비스명 · 금액 · 결제일을 읽는 중" : "JPG, PNG, WEBP · 최대 8MB"}</span>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { setFile(event.target.files?.[0] || null); setError(""); }} />
            </button>
          ) : (
            <label className={`block rounded-xl border-2 p-4 transition-colors ${scanning ? "scanner-shimmer border-black bg-white" : "border-[#E4E4E7] bg-[#FAFAFA] focus-within:border-black"}`}>
              <span className="mb-2 block text-[12px] font-semibold">결제 문자 붙여넣기</span>
              <textarea disabled={scanning} value={sms} onChange={(event) => { setSms(event.target.value); setError(""); }} placeholder="결제 문자를 붙여넣어 주세요" rows={4} className="no-focus-ring w-full resize-none bg-transparent text-[14px] leading-6 outline-none placeholder:text-[#A1A1AA]" />
            </label>
          )}
          {error && <p className="mt-2 text-[12px] leading-5 text-[#EF4444]">{error}</p>}
          <Button className="mt-4 w-full" disabled={scanning} onClick={startScan}>{scanning ? <><LoaderCircle size={17} className="animate-spin" />스마트 인식 중</> : <><ScanLine size={17} />스마트 인식 시작</>}</Button>
        </div>
      )}

      {manualFlow}
      {recognizedForm}
    </BottomSheet>
  );
}
