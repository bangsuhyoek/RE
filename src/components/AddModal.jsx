import { useRef, useState } from "react";
import { CheckCircle2, FileImage, LoaderCircle, MessageSquareText, ScanLine, UploadCloud } from "lucide-react";
import { BottomSheet, Button } from "./ui";

const parseAmount = (value) => {
  const match = value.match(/([\d,]+)\s*원/);
  return match ? Number(match[1].replaceAll(",", "")) : null;
};

const parseDueDay = (value) => {
  const fullDate = value.match(/\d{1,2}\s*[\/.\-]\s*(\d{1,2})/);
  const dayOnly = value.match(/(\d{1,2})\s*일/);
  const day = fullDate?.[1] || dayOnly?.[1];
  return day ? Math.min(31, Math.max(1, Number(day))) : null;
};

export function AddModal({ catalog, onClose, onAdd }) {
  const [tab, setTab] = useState("image");
  const [file, setFile] = useState(null);
  const [sms, setSms] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const fileInput = useRef(null);

  const startScan = () => {
    const source = tab === "image" ? file?.name || "" : sms.trim();
    if (!source) {
      setError(tab === "image" ? "영수증 또는 결제 화면 이미지를 선택해 주세요." : "결제 문자를 붙여넣어 주세요.");
      return;
    }
    setError("");
    setScanning(true);
    window.setTimeout(() => {
      const normalized = source.toLowerCase();
      const match = catalog.find((service) => normalized.includes(service.name.toLowerCase()) || normalized.includes(service.id) || (service.id === "youtube" && normalized.includes("유튜브")) || (service.id === "netflix" && normalized.includes("넷플릭스")));
      const fallback = catalog.find((service) => service.id === "tving") || catalog[0];
      const service = match || fallback;
      setForm({
        name: service.name,
        monogram: service.monogram,
        category: service.category,
        plan: service.plan,
        amount: parseAmount(source) || service.amount,
        dueDay: parseDueDay(source) || service.dueDay,
        billingCycle: "매월",
        paymentMethod: service.paymentMethod,
        cancelUrl: service.cancelUrl,
        isTrial: false,
      });
      setScanning(false);
    }, 1000);
  };

  const save = () => {
    if (!form?.name || !form.amount || !form.dueDay) {
      setError("서비스명, 결제 금액, 결제일을 확인해 주세요.");
      return;
    }
    const added = onAdd({ ...form, amount: Number(form.amount), dueDay: Number(form.dueDay) });
    if (added) onClose();
  };

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <BottomSheet onClose={onClose} label="AI 스마트 구독 추가">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">AI Smart Add</p><h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">10초 만에 구독 추가하기</h2></div>
        <ScanLine size={22} />
      </div>
      <p className="mt-2 text-[13px] leading-5 text-[#71717A]">영수증 이미지나 카드 결제 문자를 인식해 필요한 정보를 채워드려요.</p>

      <div className="mt-5 grid grid-cols-2 rounded-xl bg-[#F4F4F5] p-1">
        <button type="button" onClick={() => { setTab("image"); setError(""); }} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-[12px] font-semibold transition-colors ${tab === "image" ? "bg-white text-black shadow-sm" : "text-[#71717A]"}`}><FileImage size={16} />영수증 이미지</button>
        <button type="button" onClick={() => { setTab("sms"); setError(""); }} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-[12px] font-semibold transition-colors ${tab === "sms" ? "bg-white text-black shadow-sm" : "text-[#71717A]"}`}><MessageSquareText size={16} />결제 문자</button>
      </div>

      {!form && (
        <div className="mt-4">
          {tab === "image" ? (
            <button type="button" onClick={() => fileInput.current?.click()} className={`w-full rounded-xl border-2 border-dashed p-7 text-center transition-colors ${scanning ? "scanner-shimmer border-black bg-white" : "border-[#E4E4E7] bg-[#FAFAFA] hover:border-black"}`}>
              {scanning ? <LoaderCircle className="mx-auto animate-spin" size={25} /> : <UploadCloud className="mx-auto" size={25} />}
              <strong className="mt-3 block text-[14px]">{scanning ? "영수증을 분석하고 있어요" : file ? file.name : "영수증 또는 결제 화면을 올려주세요"}</strong>
              <span className="mt-1 block text-[12px] text-[#71717A]">{scanning ? "서비스명 · 금액 · 결제일을 읽는 중" : "JPG, PNG 파일을 선택할 수 있어요"}</span>
              <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </button>
          ) : (
            <label className={`block rounded-xl border-2 p-4 transition-colors ${scanning ? "scanner-shimmer border-black bg-white" : "border-[#E4E4E7] bg-[#FAFAFA] focus-within:border-black"}`}>
              <span className="mb-2 block text-[12px] font-semibold">결제 문자 붙여넣기</span>
              <textarea value={sms} onChange={(event) => setSms(event.target.value)} placeholder="예: 13,500원 결제완료 티빙 09/10" rows={4} className="w-full resize-none bg-transparent text-[14px] leading-6 outline-none placeholder:text-[#A1A1AA]" />
            </label>
          )}
          {error && <p className="mt-2 text-[12px] text-[#EF4444]">{error}</p>}
          <Button className="mt-4 w-full" disabled={scanning} onClick={startScan}>{scanning ? <><LoaderCircle size={17} className="animate-spin" />스마트 인식 중</> : <><ScanLine size={17} />스마트 인식 시작</>}</Button>
        </div>
      )}

      {form && (
        <section className="field-enter mt-5">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2.5 text-[12px] text-[#047857]"><CheckCircle2 size={16} />AI가 결제 내역을 인식했어요. 저장 전에 확인해 주세요.</div>
          <div className="space-y-3">
            <label className="block text-[12px] font-medium text-[#71717A]">서비스명<input value={form.name} onChange={(event) => update("name", event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2.5 text-[14px] text-black outline-none focus:border-black" /></label>
            <label className="block text-[12px] font-medium text-[#71717A]">요금제<input value={form.plan} onChange={(event) => update("plan", event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2.5 text-[14px] text-black outline-none focus:border-black" /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-[12px] font-medium text-[#71717A]">결제 금액<input type="number" min="0" value={form.amount} onChange={(event) => update("amount", event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2.5 text-[14px] text-black outline-none focus:border-black" /></label><label className="block text-[12px] font-medium text-[#71717A]">결제일<input type="number" min="1" max="31" value={form.dueDay} onChange={(event) => update("dueDay", event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2.5 text-[14px] text-black outline-none focus:border-black" /></label></div>
            <div className="grid grid-cols-2 gap-3"><label className="block text-[12px] font-medium text-[#71717A]">결제 주기<select value={form.billingCycle} onChange={(event) => update("billingCycle", event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2.5 text-[14px] text-black outline-none focus:border-black"><option>매월</option><option>매년</option></select></label><label className="block text-[12px] font-medium text-[#71717A]">결제 수단<input value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2.5 text-[14px] text-black outline-none focus:border-black" /></label></div>
          </div>
          {error && <p className="mt-2 text-[12px] text-[#EF4444]">{error}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => { setForm(null); setError(""); }}>다시 인식하기</Button><Button onClick={save}>내 구독에 추가</Button></div>
        </section>
      )}
    </BottomSheet>
  );
}
