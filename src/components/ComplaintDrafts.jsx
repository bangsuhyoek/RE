import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Copy, ExternalLink, Info, ShieldAlert } from "lucide-react";
import { Button } from "./ui";
import { build1372Draft, buildFtcReportDraft, formatKSTDateTime } from "../lib/complaintDrafts";
import { buildRefundDraft } from "../lib/subscriptionAgent";

async function copyText(text, onToast, message) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      onToast?.(message);
      return;
    }
  } catch {
    // fallback
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    onToast?.(message);
  } catch {
    onToast?.("복사에 실패했어요. 본문을 직접 복사해 주세요.");
  }
}

/**
 * 해지 후 결제 대응 3종 초안 뷰어
 * - 1. 환불 요청문 (사업자 고객센터용 - buildRefundDraft)
 * - 2. 1372 소비자상담 신청서 (build1372Draft)
 * - 3. 공정거래위원회 신고서 초안 (buildFtcReportDraft)
 *
 * @param {Object} props
 * @param {Object} props.caseInfo - alert or evidenceCase (serviceName, amount, detectedAt, cancelledAt, paymentMethod 등)
 * @param {Object|null} [props.proof] - 로컬 저장된 cancelProof 객체
 * @param {Object|null} [props.refund] - response.refund 객체 (ko/en draft 및 requestTo/url)
 * @param {Function} [props.onToast]
 */
export function ComplaintDrafts({ caseInfo, proof = null, refund = null, onToast }) {
  const [activeTab, setActiveTab] = useState("refund"); // "refund" | "ccn1372" | "ftc"
  const [lang, setLang] = useState("ko"); // for refund draft

  if (!caseInfo) return null;

  const serviceName = caseInfo.serviceName || caseInfo.name || "서비스";
  const amount = caseInfo.amount || 0;
  const chargedAt = caseInfo.detectedAt || caseInfo.chargedAt || new Date().toISOString();
  const cancelledAt = caseInfo.cancelledAt || proof?.cancelledAt || null;
  const paymentMethod = caseInfo.paymentMethod || "";

  // 1. 환불 요청문 초안
  const refundObj = refund || caseInfo.refund;
  const refundResult = refundObj?.draft || buildRefundDraft({
    subscription: {
      name: serviceName,
      amount,
      paymentMethod,
      serviceId: caseInfo.serviceId,
    },
    lastChargeDate: chargedAt ? new Date(chargedAt) : null,
    reason: {
      ko: (cancelledAt ? formatKSTDateTime(cancelledAt) : "이전에") + "에 해지 완료하였으나 이후 결제가 발생했습니다.",
      en: "I cancelled this subscription previously, but I was charged afterwards.",
    },
  });

  // 2. 1372 소비자상담 초안
  const ccnDraft = build1372Draft({
    serviceName,
    amount,
    cancelledAt,
    chargedAt,
    paymentMethod,
    proof,
  });

  // 3. 공정위 신고서 초안
  const ftcDraft = buildFtcReportDraft({
    serviceName,
    amount,
    cancelledAt,
    chargedAt,
    paymentMethod,
    proof,
  });

  const tabs = [
    { id: "refund", label: "환불 요청문" },
    { id: "ccn1372", label: "1372 상담 신청" },
    { id: "ftc", label: "공정위 신고 초안" },
  ];

  let currentContent = "";
  let currentTitle = "";
  let currentUrl = null;
  let currentUrlLabel = "";
  let currentTips = [];

  if (activeTab === "refund") {
    currentContent = refundResult?.[lang] || "";
    const requestTo = refundObj?.requestTo || (serviceName + " 고객센터");
    currentTitle = "환불 요청서 (" + requestTo + " 제출용)";
    currentUrl = refundObj?.url || caseInfo.refund?.url || caseInfo.supportUrl || null;
    currentUrlLabel = refundObj?.urlLabel || caseInfo.refund?.urlLabel || (serviceName + " 고객센터 바로가기");
    currentTips = [
      "서비스 고객센터 1:1 문의나 이메일 접수란에 복사한 내용을 붙여 넣으세요.",
      "해외 서비스인 경우 'EN' 탭을 눌러 영문 요청서로 복사할 수 있습니다.",
    ];
  } else if (activeTab === "ccn1372") {
    currentContent = ccnDraft.body;
    currentTitle = ccnDraft.title;
    currentUrl = ccnDraft.submitUrl;
    currentUrlLabel = ccnDraft.submitLabel;
    currentTips = ccnDraft.tips;
  } else if (activeTab === "ftc") {
    currentContent = ftcDraft.body;
    currentTitle = ftcDraft.title;
    currentUrl = ftcDraft.submitUrl;
    currentUrlLabel = ftcDraft.submitLabel;
    currentTips = ftcDraft.tips;
  }

  const handleCopy = () => {
    const successMsg =
      activeTab === "refund"
        ? "환불 요청서를 복사했어요."
        : activeTab === "ccn1372"
        ? "1372 소비자상담 내용을 복사했어요."
        : "공정거래위원회 신고서 초안을 복사했어요.";
    copyText(currentContent, onToast, successMsg);
  };

  const handleOpenSite = () => {
    if (currentUrl) {
      if (Capacitor.isNativePlatform()) {
        Browser.open({ url: currentUrl }).catch(() => window.open(currentUrl, "_blank", "noopener,noreferrer"));
      } else {
        window.open(currentUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  return (
    <div className="mt-3.5 rounded-2xl border border-[#E5E8EB] bg-white p-3.5 text-left shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#F2F4F6]">
        <div className="flex items-center gap-1.5">
          <ShieldAlert size={16} className="text-[#F04452]" />
          <strong className="text-[13px] font-bold text-[#191F28]">해지 후 결제 사후 대응 초안</strong>
        </div>
        {proof?.imageDataUrl && (
          <span className="rounded-md bg-[#E8F3FF] px-2 py-0.5 text-[10px] font-bold text-[#3182F6]">
            해지 캡처 증빙 보유
          </span>
        )}
      </div>

      {/* 탭 버튼 */}
      <div className="mt-2.5 flex rounded-xl bg-[#F2F4F6] p-1 text-[12px] font-bold">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              "flex-1 rounded-lg py-1.5 text-center transition " +
              (activeTab === tab.id
                ? "bg-white text-[#191F28] shadow-xs"
                : "text-[#8B95A1] hover:text-[#4E5968]")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 환불 탭 전용 언어 선택 */}
      {activeTab === "refund" && (
        <div className="mt-2 flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-[#6B7684]">{currentTitle}</span>
          <div className="flex rounded-lg bg-[#F2F4F6] p-0.5 text-[11px] font-bold">
            {["ko", "en"].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={
                  "rounded-md px-2 py-0.5 " +
                  (lang === code
                    ? "bg-white text-[#191F28] shadow-xs"
                    : "text-[#8B95A1]")
                }
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 텍스트 내용 */}
      <div className="mt-2">
        <textarea
          readOnly
          value={currentContent}
          rows={7}
          className="w-full rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] p-3 text-[12px] leading-relaxed text-[#333D4B] font-mono focus:outline-hidden resize-none select-all"
        />
      </div>

      {/* 액션 버튼 */}
      <div className="mt-2.5 flex gap-2">
        <Button
          size="compact"
          variant="secondary"
          className="flex-1"
          onClick={handleCopy}
          prefixIcon={<Copy size={13} />}
        >
          내용 복사하기
        </Button>
        {currentUrl && (
          <Button
            size="compact"
            variant="outline"
            className="flex-1"
            onClick={handleOpenSite}
            prefixIcon={<ExternalLink size={13} />}
          >
            제출 사이트 열기
          </Button>
        )}
      </div>

      {/* 안내 및 팁 */}
      {currentTips.length > 0 && (
        <div className="mt-2.5 rounded-xl bg-[#F9FAFB] p-2.5 text-[11px] text-[#6B7684]">
          <div className="flex items-center gap-1 font-semibold text-[#4E5968]">
            <Info size={12} />
            <span>작성 및 제출 팁</span>
          </div>
          <ul className="mt-1 list-disc list-inside space-y-0.5 pl-0.5">
            {currentTips.map((tip, idx) => (
              <li key={idx} className="leading-relaxed">{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 필수 면책 안내 */}
      <p className="mt-2 text-center text-[11px] text-[#8B95A1]">
        꾸독은 제출을 대리하지 않아요. 위 내용을 복사하여 해당 기관이나 서비스에 직접 접수해 주세요.
      </p>
    </div>
  );
}
