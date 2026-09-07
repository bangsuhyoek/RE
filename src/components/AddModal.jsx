import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileImage, LoaderCircle, MessageSquareText, ScanLine, UploadCloud } from "lucide-react";
import { BottomSheet, Button, SegmentedControl } from "./ui";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
      throw new Error("OCR API를 실행하지 못했습니다. 로컬에서는 Vercel 개발 서버로 실행해 주세요.");
    }
    if (!response.ok || !result.ok) throw new Error(result.message || "결제 정보를 인식하지 못했습니다.");
    return result;
  } finally {
    window.clearTimeout(timer);
  }
};

const inputClass = (missing) => `mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition-colors focus:border-[#191F28] ${missing ? "border-[#FF6F0F] bg-[#FFF9F2]" : "border-[#E5E8EB] focus:bg-white"}`;

export function AddModal({ catalog, onClose, onAdd }) {
  const [tab, setTab] = useState("image");
  const [file, setFile] = useState(null);
  const [sms, setSms] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [warnings, setWarnings] = useState([]);
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
      const recognized = result.data;
      const matched = catalog.find((service) => service.id === recognized.serviceId || service.name.toLowerCase() === recognized.name.toLowerCase());

      setForm({
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
      const message = recognitionError?.name === "AbortError"
        ? "이미지 인식 시간이 초과되었습니다. 다시 시도해 주세요."
        : recognitionError?.message || "결제 정보를 인식하지 못했습니다.";
      setError(message);
    } finally {
      setScanning(false);
    }
  };

  const save = () => {
    if (!form?.name || !form.plan || !Number(form.amount) || !Number(form.dueDay)) {
      setError("서비스명, 요금제, 결제 금액, 결제일을 확인해 주세요.");
      return;
    }
    const amount = Number(form.amount);
    const dueDay = Number(form.dueDay);
    if (amount <= 0 || dueDay < 1 || dueDay > 31) {
      setError("결제 금액과 결제일을 올바르게 입력해 주세요.");
      return;
    }
    const added = onAdd({ ...form, amount, dueDay });
    if (added) onClose();
  };

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const resetRecognition = () => {
    setForm(null);
    setWarnings([]);
    setError("");
  };

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setError("");
    setWarnings([]);
    setForm(null);
  };

  return (
    <BottomSheet onClose={onClose} label="AI 스마트 구독 추가">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">AI Smart Add</p><h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">10초 만에 구독 추가하기</h2></div>
        <ScanLine size={22} />
      </div>
      <p className="mt-2 text-[13px] leading-5 text-[#71717A]">영수증 이미지나 카드 결제 문자를 인식해 필요한 정보를 채워드려요.</p>

      <SegmentedControl
        className="mt-5"
        value={tab}
        onChange={changeTab}
        options={[
          { value: "image", label: "영수증 이미지", icon: <FileImage size={16} /> },
          { value: "sms", label: "결제 문자", icon: <MessageSquareText size={16} /> },
        ]}
      />

      {!form && (
        <div className="mt-4">
          {tab === "image" ? (
            <button type="button" disabled={scanning} onClick={() => fileInput.current?.click()} className={`w-full rounded-2xl border-2 border-dashed p-7 text-center transition-all ${scanning ? "scanner-shimmer border-[#191F28] bg-white" : "border-[#E5E8EB] bg-[#F9FAFB] hover:border-[#191F28]"}`}>
              {scanning ? <LoaderCircle className="mx-auto animate-spin text-[#191F28]" size={26} /> : <UploadCloud className="mx-auto text-[#8B95A1]" size={26} />}
              <strong className="mt-3 block text-[14px] font-bold text-[#191F28]">{scanning ? "영수증을 분석하고 있어요" : file ? file.name : "영수증 또는 결제 화면을 올려주세요"}</strong>
              <span className="mt-1 block text-[12px] text-[#6B7684]">{scanning ? "서비스명 · 금액 · 결제일을 읽는 중" : "JPG, PNG, WEBP · 최대 8MB"}</span>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { setFile(event.target.files?.[0] || null); setError(""); }} />
            </button>
          ) : (
            <label className={`block rounded-2xl border p-4 transition-all ${scanning ? "scanner-shimmer border-[#191F28] bg-white" : "border-[#E5E8EB] bg-[#F9FAFB] focus-within:border-[#191F28] focus-within:bg-white"}`}>
              <span className="mb-2 block text-[12px] font-bold text-[#191F28]">결제 문자 붙여넣기</span>
              <textarea disabled={scanning} value={sms} onChange={(event) => { setSms(event.target.value); setError(""); }} placeholder="예: 상품명 티빙 / 13,500원 결제완료 / 09월 10일" rows={4} className="no-focus-ring w-full resize-none bg-transparent text-[14px] leading-6 text-[#191F28] outline-none placeholder:text-[#8B95A1] focus:outline-none focus-visible:!outline-none focus-visible:!ring-0" />
            </label>
          )}
          {error && <p className="mt-2 text-[12px] leading-5 text-[#FF4D4D]">{error}</p>}
          <Button size="large" fullWidth className="mt-4" disabled={scanning} loading={scanning} onClick={startScan} prefixIcon={!scanning && <ScanLine size={18} />}>스마트 인식 시작</Button>
        </div>
      )}

      {form && (
        <section className="field-enter mt-5">
          {warnings.length ? (
            <div className="mb-4 rounded-2xl border border-[#FFE8CC] bg-[#FFF9F2] p-4 text-[12px] text-[#D25400]">
              <div className="flex items-center gap-2 font-bold"><AlertTriangle size={16} />일부 정보는 직접 확인해 주세요.</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 leading-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-[#D3F9D8] bg-[#EBFBEE] p-3.5 text-[12px] font-semibold text-[#2B8A3E]"><CheckCircle2 size={16} />결제 내역을 인식했어요. 저장 전에 확인해 주세요.</div>
          )}
          <div className="space-y-3">
            <label className="block text-[12px] font-semibold text-[#6B7684]">서비스명<input value={form.name} onChange={(event) => update("name", event.target.value)} className={inputClass(!form.name)} placeholder="서비스명을 입력해 주세요" /></label>
            <label className="block text-[12px] font-semibold text-[#6B7684]">요금제<input value={form.plan} onChange={(event) => update("plan", event.target.value)} className={inputClass(!form.plan)} placeholder="확인된 요금제를 입력해 주세요" /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-[12px] font-medium text-[#71717A]">결제 금액<input type="number" min="1" value={form.amount} onChange={(event) => update("amount", event.target.value)} className={inputClass(!Number(form.amount))} placeholder="0" /></label><label className="block text-[12px] font-medium text-[#71717A]">결제일<input type="number" min="1" max="31" value={form.dueDay} onChange={(event) => update("dueDay", event.target.value)} className={inputClass(!Number(form.dueDay))} placeholder="1~31" /></label></div>
            <div className="grid grid-cols-2 gap-3"><label className="block text-[12px] font-medium text-[#71717A]">결제 주기<select value={form.billingCycle} onChange={(event) => update("billingCycle", event.target.value)} className={inputClass(false)}><option>매월</option><option>매년</option></select></label><label className="block text-[12px] font-medium text-[#71717A]">결제 수단<input value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} className={inputClass(false)} placeholder="선택 입력" /></label></div>
          </div>
          {error && <p className="mt-2 text-[12px] leading-5 text-[#FF4D4D]">{error}</p>}
          <p className="mt-3 text-[11px] leading-4 text-[#8B95A1]">이미지는 OCR 처리에만 사용되며 SubMate에는 원본과 OCR 원문을 저장하지 않습니다. 확인한 구독 정보만 저장합니다.</p>
          <div className="mt-6 grid grid-cols-2 gap-2.5"><Button size="large" variant="secondary" onClick={resetRecognition}>다시 인식하기</Button><Button size="large" onClick={save}>내 구독에 추가</Button></div>
        </section>
      )}
    </BottomSheet>
  );
}
