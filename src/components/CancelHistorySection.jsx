import { useEffect, useState, useCallback } from "react";
import { Camera, ChevronDown, ChevronUp, FileText, Trash2 } from "lucide-react";
import { Button, ServiceMark } from "./ui";
import { CancelProofCapture } from "./CancelProofCapture";
import { ComplaintDrafts } from "./ComplaintDrafts";
import { formatWon } from "../lib/dates";
import { formatKSTDateTime } from "../lib/complaintDrafts";
import { recordKey } from "../lib/cancelVerification";
import { deleteCancelProof, listCancelProofs } from "../lib/cancelProof";

function matchProofForRecord(record, proofs = []) {
  if (!record || !Array.isArray(proofs) || proofs.length === 0) return null;
  const subId = record.subscriptionId || record.id;
  if (subId) {
    const bySub = proofs.find((p) => p.subscriptionId === subId || p.recordId === subId || p.id === subId);
    if (bySub) return bySub;
  }
  const svcId = record.serviceId || record.id;
  if (svcId) {
    const bySvc = proofs.find((p) => p.serviceId === svcId);
    if (bySvc) return bySvc;
  }
  const normName = String(record.name || "").trim().toLowerCase().replace(/\s+/g, "");
  if (normName) {
    const byName = proofs.find(
      (p) => String(p.serviceName || "").trim().toLowerCase().replace(/\s+/g, "") === normName
    );
    if (byName) return byName;
  }
  return null;
}

function formatMonthDay(value) {
  const date = value ? new Date(value) : null;
  if (!date || isNaN(date.getTime())) return null;
  return (date.getMonth() + 1) + "월 " + date.getDate() + "일";
}

// 해지 기록의 확인 상태를 사용자 문장으로 바꾼다.
function getVerificationMeta(record) {
  const expectedLabel = formatMonthDay(record?.expectedChargeOn);

  switch (record?.verification) {
    case "verified":
      return {
        label: "해지 확인됨",
        desc: "결제 예정일이 지나도 결제가 없었어요.",
        dot: "bg-[#1A7F45]",
        text: "text-[#1A7F45]",
      };
    case "charged":
      return {
        label: "해지 후 결제됨",
        desc: "해지한 뒤에 결제가 있었어요. 아래 문구로 환불을 요청해 보세요.",
        dot: "bg-[#F04452]",
        text: "text-[#F04452]",
      };
    case "asking":
      return {
        label: "결제 여부 확인 필요",
        desc: "결제 예정일이 지났어요. 카드 문자에 결제가 있었는지 알려 주세요.",
        dot: "bg-[#F59E0B]",
        text: "text-[#B25E00]",
      };
    case "watching":
      return {
        label: expectedLabel ? expectedLabel + "까지 지켜보는 중" : "결제 여부 지켜보는 중",
        desc: expectedLabel
          ? expectedLabel + " 결제 예정일이 지나면 결제가 없었는지 여쭤볼게요."
          : "다음 결제 예정일이 지나면 결제가 없었는지 여쭤볼게요.",
        dot: "bg-[#3182F6]",
        text: "text-[#1B64DA]",
      };
    default:
      return {
        label: "해지 기록됨",
        desc: null,
        dot: "bg-[#B0B8C1]",
        text: "text-[#6B7684]",
      };
  }
}

export function CancelHistorySection({
  cancelHistory = [],
  savedAmount = 0,
  onAnswerCancel,
  onToast,
}) {
  const [proofs, setProofs] = useState([]);
  const [expandedProofKey, setExpandedProofKey] = useState(null);
  const [expandedDraftKey, setExpandedDraftKey] = useState(null);

  const reloadProofs = useCallback(() => {
    listCancelProofs()
      .then((list) => setProofs(Array.isArray(list) ? list : []))
      .catch(() => setProofs([]));
  }, []);

  useEffect(() => {
    reloadProofs();
  }, [reloadProofs, cancelHistory.length]);

  const handleDeleteProof = async (proofId) => {
    if (!proofId) return;
    await deleteCancelProof(proofId);
    reloadProofs();
    onToast?.("저장한 해지 화면을 삭제했어요.");
  };

  const monthlySavedTotal =
    savedAmount > 0 ? savedAmount : cancelHistory.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <section className="mt-4 space-y-3" aria-label="해지한 구독" data-testid="cancel-history-section">
      <div className="rounded-2xl bg-[#F9FAFB] px-4 py-4">
        <p className="text-[13px] font-medium text-[#6B7684]">해지로 아끼는 돈</p>
        <p className="mt-1 text-[22px] font-extrabold tracking-tight text-[#191F28]">매달 {formatWon(monthlySavedTotal)}</p>
        <p className="mt-0.5 text-[12px] text-[#8B95A1]">1년이면 {formatWon(monthlySavedTotal * 12)}</p>
      </div>

      {cancelHistory.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-[15px] font-bold text-[#191F28]">아직 해지한 구독이 없어요</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7684]">
            해지하면 다음 결제일까지 결제가 없는지 여기서 지켜볼게요.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {cancelHistory.map((record, idx) => {
            const key = recordKey(record) || "cancel-" + idx;
            const meta = getVerificationMeta(record);
            const matchedProof = matchProofForRecord(record, proofs);
            const isProofOpen = expandedProofKey === key;
            const needsDrafts = record.verification === "charged" || record.verification === "asking";
            const isDraftOpen = expandedDraftKey === key || record.verification === "charged";
            const cancelledLabel = formatMonthDay(record.cancelledAt);

            return (
              <li key={key} className="rounded-2xl border border-[#E5E8EB] bg-white p-4" data-testid="cancel-history-item">
                <div className="flex items-center gap-3">
                  <ServiceMark
                    serviceId={record.serviceId || record.id}
                    name={record.name}
                    className="h-10 w-10 shrink-0 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <strong className="truncate text-[15px] font-bold text-[#191F28]">{record.name}</strong>
                      <span className="shrink-0 text-[13px] font-semibold text-[#4E5968]">월 {formatWon(record.amount)}</span>
                    </div>
                    <p className={"mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold " + meta.text}>
                      <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + meta.dot} />
                      {meta.label}
                      {cancelledLabel && <span className="font-medium text-[#8B95A1]">· {cancelledLabel} 해지</span>}
                    </p>
                  </div>
                </div>

                {meta.desc && <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#6B7684]">{meta.desc}</p>}

                {record.verification === "asking" && onAnswerCancel && (
                  <div className="mt-3 flex gap-2">
                    <Button size="compact" className="flex-1" onClick={() => onAnswerCancel(record, "no_charge")}>
                      결제 없었어요
                    </Button>
                    <Button size="compact" variant="secondary" className="flex-1" onClick={() => onAnswerCancel(record, "charged")}>
                      결제됐어요
                    </Button>
                  </div>
                )}

                <div className="mt-3 flex gap-2 border-t border-[#F2F4F6] pt-3">
                  <button
                    type="button"
                    onClick={() => setExpandedProofKey(isProofOpen ? null : key)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#F2F4F6] px-3 py-2 text-[12px] font-bold text-[#333D4B] transition-colors hover:bg-[#E5E8EB]"
                  >
                    <Camera size={13} />
                    <span>{matchedProof ? "해지 화면 보기" : "해지 화면 저장"}</span>
                    {isProofOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {needsDrafts && (
                    <button
                      type="button"
                      onClick={() => setExpandedDraftKey(expandedDraftKey === key ? null : key)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#F2F4F6] px-3 py-2 text-[12px] font-bold text-[#333D4B] transition-colors hover:bg-[#E5E8EB]"
                    >
                      <FileText size={13} />
                      <span>환불 요청 문구</span>
                      {isDraftOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}
                </div>

                {isProofOpen && (
                  <div className="mt-3">
                    {matchedProof ? (
                      <div className="rounded-2xl bg-[#F9FAFB] p-3.5 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-[#4E5968]">
                            {formatKSTDateTime(matchedProof.cancelledAt || matchedProof.createdAt)}에 저장
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteProof(matchedProof.id)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#8B95A1] hover:bg-white hover:text-[#F04452]"
                          >
                            <Trash2 size={12} /> 삭제
                          </button>
                        </div>
                        {matchedProof.note && <p className="mt-1 text-[12px] text-[#6B7684]">{matchedProof.note}</p>}
                        {matchedProof.imageDataUrl && (
                          <div className="mt-2.5 overflow-hidden rounded-xl border border-[#E5E8EB] bg-white">
                            <img
                              src={matchedProof.imageDataUrl}
                              alt={record.name + " 해지 화면"}
                              className="max-h-56 w-full object-contain"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <CancelProofCapture
                        record={{
                          recordId: record.subscriptionId || record.id,
                          subscriptionId: record.subscriptionId || record.id,
                          serviceId: record.serviceId || record.id,
                          serviceName: record.name,
                          amount: record.amount,
                          cancelledAt: record.cancelledAt,
                        }}
                        onSaved={() => {
                          reloadProofs();
                          onToast?.("해지 화면을 기기에 저장했어요.");
                        }}
                      />
                    )}
                  </div>
                )}

                {needsDrafts && isDraftOpen && (
                  <ComplaintDrafts
                    caseInfo={{
                      serviceName: record.name,
                      serviceId: record.serviceId || record.id,
                      amount: record.amount,
                      paymentMethod: record.paymentMethod,
                      cancelledAt: record.cancelledAt,
                      chargedAt: record.chargedAt || new Date().toISOString(),
                      supportUrl: record.supportUrl,
                    }}
                    proof={matchedProof}
                    onToast={onToast}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
