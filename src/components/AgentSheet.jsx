import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { AlertTriangle, Check, CloudUpload, Copy, ExternalLink, FileText, Fingerprint, Loader2, Send, Square, Trash2, ShieldCheck, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";
import { BottomSheet, Button } from "./ui";
import { ActionCard } from "./agent/ActionCard";
import { ConsentCard } from "./agent/ConsentCard";
import {
  buildChatSnapshot,
  clearChatHistory,
  getAuthToken,
  grantChatConsent,
  loadChatHistory,
  readChatConsent,
  revokeChatConsent,
  saveChatHistory,
  streamChat,
  ChatError,
} from "../lib/chatClient";
import { formatWon } from "../lib/dates";
import { readEvidenceCases, readStoredValue, storageKeys, writeStoredValue } from "../lib/storage";
import {
  appendDecisionToCase,
  createEvidenceCase,
  createMandate,
  decideApproval,
  formatEvidenceSummary,
  isMandateActive,
  mergeApproval,
  mergeMandates,
  resolveApproval,
  revokeMandate,
  runAgent,
} from "../lib/subscriptionAgent";
import { interpretWithAi } from "../lib/agentClient";
import { decideApprovalOnServer, fetchApprovals, mergeServerApprovals, recordApprovalRequest } from "../lib/approvalStore";
import { createMandateOnServer, fetchMandates, revokeMandateOnServer } from "../lib/mandateStore";
import { grantEvidenceConsent, persistEvidenceCase, pullServerEvidence, readEvidenceConsent } from "../lib/evidenceStore";
import { canUseDeviceAuth, confirmUserPresence } from "../lib/deviceAuth";
import { ComplaintDrafts } from "./ComplaintDrafts";
import { findCancelProof } from "../lib/cancelProof";

const STATUS_TEXT = {
  approved: "허용함",
  approved_once: "이번만 허용함",
  approved_mandate: "항상 허용 범위 안이라 자동으로 허용함",
  declined: "거절함",
  expired: "시간이 지나 만료됨",
};

const DEVICE_AUTH_FAIL_TEXT = {
  not_enrolled: "휴대폰 잠금(지문·얼굴·PIN)을 먼저 설정해 주세요.",
  unavailable: "이 기기에서는 본인 확인을 쓸 수 없어요.",
  cancelled: "본인 확인을 취소했어요. 범위를 만들지 않았어요.",
};

const isExpiredPending = (approval, now = Date.now()) =>
  approval?.status === "pending" && new Date(approval.dueAt).getTime() < now;

const approvalsInMessages = (messages) => messages.flatMap((message) => {
  const response = message.response;
  if (!response) return [];
  if (response.type === "action" || response.type === "alert") return response.approval ? [response.approval] : [];
  if (response.type === "upcoming") return response.items.map((item) => item.approval);
  return [];
});

const copyText = async (value, onToast, successMessage) => {
  try {
    await navigator.clipboard.writeText(value);
    onToast?.(successMessage);
  } catch {
    onToast?.("복사하지 못했어요. 길게 눌러 직접 복사해 주세요.");
  }
};

const openExternal = (url) => {
  if (!url) return;
  if (Capacitor.isNativePlatform()) {
    Browser.open({ url }).catch(() => window.open(url, "_blank", "noopener,noreferrer"));
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const ALERT_STATUS_TEXT = {
  approved_once: "새 금액으로 계속 쓰기로 했어요",
  declined: "해지하기로 했어요",
};

function DecisionBadge({ status, decidedAt, labels = STATUS_TEXT }) {
  const time = decidedAt ? new Date(decidedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "";
  const positive = status === "approved" || status === "approved_once" || status === "approved_mandate";
  return (
    <div className={"mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold " + (positive ? "bg-[#E8F3FF] text-[#1B64DA]" : "bg-[#F2F4F6] text-[#6B7684]")}>
      {positive ? <Check size={14} /> : <X size={14} />}
      {labels[status] || STATUS_TEXT[status] || status}{time ? " · " + time : ""}
    </div>
  );
}

function ToolTrace({ tools }) {
  if (!tools?.length) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {tools.map((tool) => (
        <span key={tool} className="inline-flex items-center gap-1 rounded-full bg-[#F2F4F6] px-2 py-0.5 text-[10px] font-semibold text-[#6B7684]">
          <Check size={10} /> {tool}
        </span>
      ))}
    </div>
  );
}

function SpendingResponse({ response }) {
  return (
    <div className="rounded-2xl border border-[#E5E8EB] bg-white p-4">
      <ToolTrace tools={response.toolsUsed} />
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#E8F3FF] text-[#1B64DA]"><TrendingUp size={16} /></span>
        <div>
          <p className="text-[14px] font-extrabold text-[#191F28]">월 총 {formatWon(response.monthly)}</p>
          <p className="text-[11px] font-medium text-[#8B95A1]">활성 구독 {response.count}개 기준</p>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-[#333D4B]">{response.summary}</p>
      <div className="mt-3 rounded-xl bg-[#F9FAFB] p-3 text-[12px] text-[#4E5968]">
        <div className="flex justify-between py-1 border-b border-[#F2F4F6]">
          <span>월 지출 합계</span>
          <span className="font-bold text-[#191F28]">{formatWon(response.monthly)}</span>
        </div>
        <div className="flex justify-between py-1 pt-1.5">
          <span>연간 예상 지출</span>
          <span className="font-bold text-[#191F28]">{formatWon(response.yearly)}</span>
        </div>
      </div>
    </div>
  );
}

function TopCostResponse({ response, onStartCancel }) {
  return (
    <div className="rounded-2xl border border-[#E5E8EB] bg-white p-4">
      <ToolTrace tools={response.toolsUsed} />
      <p className="text-[14px] font-extrabold text-[#191F28]">{response.summary}</p>
      <div className="mt-3 space-y-2">
        {response.items.map((item, idx) => (
          <div key={item.subscriptionId || idx} className="flex items-center justify-between rounded-xl bg-[#F9FAFB] p-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#E5E8EB] text-[11px] font-black text-[#4E5968]">
                {idx + 1}
              </span>
              <div>
                <p className="text-[13px] font-bold text-[#191F28]">{item.name}</p>
                <p className="text-[11px] text-[#8B95A1]">
                  {item.billingCycle === "매년" ? "연 " + formatWon(item.amount) + " (월 환산 " + formatWon(item.monthlyEquivalent) + ")" : item.plan || "월 결제"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-extrabold text-[#191F28]">{formatWon(item.monthlyEquivalent)}/월</span>
              {onStartCancel && (
                <button
                  type="button"
                  onClick={() => onStartCancel(item.subscriptionId)}
                  className="rounded-lg border border-[#E5E8EB] bg-white px-2 py-1 text-[11px] font-semibold text-[#6B7684] hover:border-[#191F28]"
                >
                  해지
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UnusedResponse({ response, onStartCancel }) {
  return (
    <div className="rounded-2xl border border-[#E5E8EB] bg-white p-4">
      <ToolTrace tools={response.toolsUsed} />
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FFF1F0] text-[#E03131]">
          <TrendingDown size={16} />
        </span>
        <p className="text-[14px] font-extrabold text-[#191F28]">안 쓰는 구독 점검</p>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-[#333D4B]">{response.summary}</p>
      {response.items?.length > 0 && (
        <div className="mt-3 space-y-2">
          {response.items.map((item) => (
            <div key={item.subscriptionId} className="flex items-center justify-between rounded-xl bg-[#F9FAFB] p-3">
              <div>
                <p className="text-[13px] font-bold text-[#191F28]">{item.name}</p>
                <p className="text-[11px] font-medium text-[#E03131]">{item.streak}달 연속 '거의 안 씀'</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-extrabold text-[#191F28]">{formatWon(item.amount)}</span>
                {onStartCancel && (
                  <button
                    type="button"
                    onClick={() => onStartCancel(item.subscriptionId)}
                    className="rounded-lg bg-[#191F28] px-2.5 py-1 text-[11px] font-semibold text-white"
                  >
                    해지하기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceInfoResponse({ response, onStartCancel }) {
  return (
    <div className="rounded-2xl border border-[#E5E8EB] bg-white p-4">
      <ToolTrace tools={response.toolsUsed} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[15px] font-extrabold text-[#191F28]">{response.serviceName}</p>
          {response.plan && <p className="text-[11px] font-medium text-[#8B95A1]">{response.plan}</p>}
        </div>
        <span className="text-[15px] font-black text-[#191F28]">{formatWon(response.amount)}</span>
      </div>
      <div className="mt-3 rounded-xl bg-[#F9FAFB] p-3 text-[12px] text-[#4E5968] space-y-1.5">
        <div className="flex justify-between">
          <span>결제 주기</span>
          <span className="font-semibold text-[#191F28]">{response.billingCycle}</span>
        </div>
        <div className="flex justify-between">
          <span>다음 결제일</span>
          <span className="font-semibold text-[#191F28]">{response.nextPaymentDate}</span>
        </div>
        <div className="flex justify-between">
          <span>결제 수단</span>
          <span className="font-semibold text-[#191F28]">{response.paymentMethod}</span>
        </div>
      </div>
      {onStartCancel && (
        <Button size="compact" variant="outline" fullWidth className="mt-3" onClick={() => onStartCancel(response.subscriptionId)}>
          {response.serviceName} 해지 진행
        </Button>
      )}
    </div>
  );
}

function RefundDraft({ refund, onToast }) {
  const [lang, setLang] = useState("ko");
  const draft = refund.draft[lang];
  const copy = () => copyText(draft, onToast, "환불 요청서를 복사했어요.");
  return (
    <div className="mt-3 rounded-2xl border border-[#E5E8EB] bg-white p-3.5">
      <div className="flex items-center justify-between">
        <strong className="text-[13px] font-bold text-[#191F28]">환불 요청서 ({refund.requestTo} 제출용)</strong>
        <div className="flex rounded-lg bg-[#F2F4F6] p-0.5 text-[11px] font-bold">
          {["ko", "en"].map((code) => (
            <button key={code} type="button" onClick={() => setLang(code)} className={"rounded-md px-2 py-0.5 " + (lang === code ? "bg-white text-[#191F28] shadow-xs" : "text-[#8B95A1]")}>
              {code === "ko" ? "한국어" : "English"}
            </button>
          ))}
        </div>
      </div>
      <pre className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap rounded-xl bg-[#F9FAFB] p-3 font-sans text-[12px] leading-relaxed text-[#333D4B]">{draft}</pre>
      <p className="mt-2 text-[11px] leading-relaxed text-[#8B95A1]">{refund.note} 카드번호는 끝 4자리만 넣었어요.</p>
      <div className="mt-2.5 flex gap-2">
        <Button size="compact" variant="secondary" className="flex-1" onClick={copy} prefixIcon={<Copy size={14} />}>복사</Button>
        {refund.url && (
          <Button size="compact" variant="outline" className="flex-1" onClick={() => openExternal(refund.url)} prefixIcon={<ExternalLink size={14} />}>
            {refund.urlLabel || "요청 페이지 열기"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ActionResponse({ response, approval, onDecide, onStartCancel, onToast }) {
  const decided = approval.status !== "pending";
  const allowed = approval.status === "approved";
  return (
    <div>
      <ToolTrace tools={response.toolsUsed} />
      <div className="rounded-2xl bg-[#F9FAFB] p-3.5">
        <p className="text-[12px] font-bold text-[#4E5968]">확인한 것</p>
        <dl className="mt-2 space-y-1.5">
          {response.findings.map((item) => (
            <div key={item.label} className="flex gap-2 text-[12px] leading-relaxed">
              <dt className="w-[68px] shrink-0 font-semibold text-[#8B95A1]">{item.label}</dt>
              <dd className="font-medium text-[#333D4B]">{item.value}</dd>
            </div>
          ))}
        </dl>
        {response.wantsRefund && (
          response.policy ? (
            <div className="mt-2">
              <p className="text-[12px] leading-relaxed text-[#333D4B]">{response.policy.summary}</p>
              <button type="button" onClick={() => openExternal(response.policy.sourceUrl)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#3182F6]">
                <ExternalLink size={11} /> 출처: {response.policy.sourceLabel}{response.policy.verifiedAt ? " · " + response.policy.verifiedAt + " 확인" : ""}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-[#8B95A1]">이 서비스의 공식 환불 정책은 아직 꾸독이 확인하지 못했어요. 최종 결정은 서비스 회사가 해요.</p>
          )
        )}
      </div>

      <div className="mt-3 rounded-2xl border-2 border-[#191F28] bg-white p-4" data-testid="agent-approval-card">
        <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#3182F6]"><ShieldCheck size={14} /> 승인 요청</div>
        <p className="mt-1.5 text-[15px] font-extrabold text-[#191F28]">이렇게 진행할까요?</p>
        <ol className="mt-2 space-y-1">
          {response.steps.map((step, index) => (
            <li key={step} className="text-[13px] font-medium text-[#333D4B]">{index + 1}. {step}</li>
          ))}
        </ol>
        <p className="mt-2.5 text-[11px] leading-relaxed text-[#8B95A1]">로그인과 마지막 해지 확정은 직접 눌러 주세요. 꾸독은 비밀번호와 카드번호를 받지 않아요.</p>
        {decided ? (
          <DecisionBadge status={approval.status} decidedAt={approval.decidedAt} />
        ) : (
          <div className="mt-3 flex gap-2">
            <Button size="compact" variant="secondary" className="flex-1" onClick={() => onDecide(approval, "deny")}>그만두기</Button>
            <Button size="compact" className="flex-[2]" onClick={() => onDecide(approval, "allow")}>허용하고 진행</Button>
          </div>
        )}
      </div>

      {allowed && (
        <div className="mt-1">
          {response.wantsRefund && response.refund && <RefundDraft refund={response.refund} onToast={onToast} />}
          {response.wantsCancel && (
            <Button size="default" fullWidth className="mt-3" onClick={() => onStartCancel(response.subscriptionId, { autoOpen: true })}>
              {response.hasCancelUrl ? response.serviceName + " 해지 페이지 열기" : response.serviceName + " 해지 안내 보기"}
            </Button>
          )}
        </div>
      )}
      {approval.status === "declined" && <p className="mt-2 text-[12px] text-[#6B7684]">그만뒀어요. 필요하면 언제든 다시 말해 주세요.</p>}
      {approval.status === "expired" && <p className="mt-2 text-[12px] text-[#6B7684]">승인 시간이 지났어요. 다시 요청해 주세요.</p>}
    </div>
  );
}

function MandateConfirm({ item, busy, onCancel, onConfirm }) {
  return (
    <div className="mt-3 rounded-xl bg-[#F2F8FF] p-3" data-testid="agent-mandate-confirm">
      <p className="text-[12px] font-bold text-[#191F28]">{item.serviceName} 갱신이 {formatWon(item.amount)} 이하이면 앞으로 묻지 않고 허용으로 기록해요.</p>
      <ul className="mt-1.5 space-y-0.5 text-[11px] leading-relaxed text-[#4E5968]">
        <li>· 금액이 오르거나 무료체험이 끝나면 다시 물어봐요.</li>
        <li>· 1년 뒤 끝나고, 언제든 해제할 수 있어요.</li>
        <li>· 꾸독은 결제를 막지 않아요. 원하지 않으면 해지해야 멈춰요.</li>
      </ul>
      <div className="mt-2.5 flex gap-2">
        <Button size="compact" variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>취소</Button>
        <Button size="compact" className="flex-[2]" onClick={onConfirm} disabled={busy} prefixIcon={canUseDeviceAuth() ? <Fingerprint size={14} /> : null}>
          {canUseDeviceAuth() ? "본인 확인하고 허용" : "확인하고 허용"}
        </Button>
      </div>
    </div>
  );
}

function UpcomingResponse({ response, approvals, mandates, onDecide, onStartCancel, onCreateMandate, onRevokeMandate }) {
  const [confirmingId, setConfirmingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const confirmMandate = async (item) => {
    setBusy(true);
    const created = await onCreateMandate(item);
    setBusy(false);
    if (created) setConfirmingId(null);
  };
  return (
    <div>
      <ToolTrace tools={response.toolsUsed} />
      <p className="text-[14px] font-semibold text-[#191F28]">{response.summary}</p>
      <div className="mt-2.5 space-y-2.5">
        {response.items.map((item) => {
          const stored = resolveApproval(approvals, item.approval);
          const approval = isExpiredPending(stored) ? { ...stored, status: "expired" } : stored;
          const mandate = mandates[item.subscriptionId];
          const mandateActive = isMandateActive(mandate);
          return (
            <div key={item.approval.id} className="rounded-2xl border border-[#E5E8EB] bg-white p-3.5" data-testid="agent-renewal-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {item.isTrial && (
                    <span className="mb-1 inline-block rounded-md bg-[#FFF0F0] px-1.5 py-0.5 text-[10px] font-bold text-[#F04452]">무료체험 종료 → 유료 전환</span>
                  )}
                  <p className="truncate text-[14px] font-bold text-[#191F28]">{item.serviceName} <span className="font-medium text-[#8B95A1]">{item.plan}</span></p>
                  <p className="mt-0.5 text-[12px] text-[#6B7684]">{item.dateLabel} 결제 · {item.payment}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[14px] font-extrabold text-[#191F28]">{formatWon(item.amount)}</p>
                  <span className="text-[11px] font-bold text-[#F04452]">{item.dDay}</span>
                </div>
              </div>
              {approval.status === "pending" ? (
                confirmingId === approval.id ? (
                  <MandateConfirm item={item} busy={busy} onCancel={() => setConfirmingId(null)} onConfirm={() => confirmMandate(item)} />
                ) : (
                  <>
                    <div className="mt-3 flex gap-2">
                      <Button size="compact" variant="secondary" className="flex-1" onClick={() => onDecide(approval, "allow_once")}>{item.isTrial ? "유료로 계속 쓰기" : "이번만 허용"}</Button>
                      <Button size="compact" variant="outline" className="flex-1" onClick={() => { onDecide(approval, "deny"); onStartCancel(item.subscriptionId); }}>거절하고 해지</Button>
                    </div>
                    {!item.isTrial && (
                      <button type="button" onClick={() => setConfirmingId(approval.id)} className="mt-2 w-full rounded-xl py-1.5 text-[12px] font-bold text-[#3182F6] hover:bg-[#F2F8FF]">
                        이 금액 이하면 항상 허용
                      </button>
                    )}
                  </>
                )
              ) : (
                <>
                  <DecisionBadge status={approval.status} decidedAt={approval.decidedAt} />
                  {approval.status === "approved_mandate" && mandateActive && (
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#6B7684]">
                      <span>항상 허용 · {formatWon(mandate.maxAmount)} 이하 · {new Date(mandate.expiresAt).toLocaleDateString("ko-KR")}까지</span>
                      <button type="button" onClick={() => onRevokeMandate(item.subscriptionId)} className="shrink-0 font-bold text-[#F04452]">해제</button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      {response.items.length > 0 && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-[#8B95A1]">꾸독은 결제를 직접 막을 수 없어요. 원하지 않는 결제는 해지해야 멈춰요.</p>
      )}
    </div>
  );
}

function EvidenceConsent({ userId, onToast }) {
  const [consented, setConsented] = useState(() => Boolean(readEvidenceConsent(userId)));
  const [busy, setBusy] = useState(false);
  if (!userId) return <p className="mt-2 text-[11px] leading-relaxed text-[#8B95A1]">증빙은 이 기기에만 저장돼요. 로그인하면 계정에 보관할 수 있어요.</p>;
  if (consented) {
    return <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#1B64DA]"><Check size={12} /> 계정에 보관 중 · 만든 날부터 1년 뒤 자동 삭제</p>;
  }
  const grant = async () => {
    setBusy(true);
    const ok = await grantEvidenceConsent(userId);
    setBusy(false);
    setConsented(true);
    onToast?.(ok ? "증빙을 계정에 보관했어요. 내 계정 관리에서 언제든 지울 수 있어요." : "보관에 동의했어요. 일부 증빙은 연결되면 다시 올릴게요.");
  };
  return (
    <div className="mt-3 rounded-xl border border-[#E5E8EB] bg-white p-3" data-testid="agent-evidence-consent">
      <p className="text-[12px] font-bold text-[#191F28]">증빙을 내 계정에 보관할까요? (선택)</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#6B7684]">
        서비스명, 결제 금액·일시, 결제수단 이름과 카드 끝 4자리, 해지 일시, 꾸독 승인 기록을 보관해요. 휴대폰을 바꿔도 남고, 만든 날부터 1년 뒤 자동으로 지워져요. 내 계정 관리에서 언제든 지울 수 있어요.
      </p>
      <Button size="compact" variant="outline" fullWidth className="mt-2" onClick={grant} disabled={busy} prefixIcon={<CloudUpload size={14} />}>동의하고 계정에 보관</Button>
    </div>
  );
}

function AlertResponse({ response, approval, onDecide, onStartCancel, onUpdateAmount, onToast, userId }) {
  const [cancelProof, setCancelProof] = useState(null);
  useEffect(() => {
    if (response.kind === "charged_after_cancel") {
      findCancelProof({
        subscriptionId: response.cancelRecordSubscriptionId || response.subscriptionId,
        serviceId: response.serviceId,
        serviceName: response.serviceName,
      }).then((found) => {
        setCancelProof(found || null);
      });
    }
  }, [response.kind, response.cancelRecordSubscriptionId, response.subscriptionId, response.serviceId, response.serviceName]);
  const decidable = Boolean(approval && response.subscriptionId);
  const currentCase = () => {
    const base = readEvidenceCases()[createEvidenceCase(response).id] || createEvidenceCase(response);
    return appendDecisionToCase(base, approval);
  };
  // 경고 카드에서 결정하면 그 결정을 증빙 사건에 붙인다.
  const decidedStatus = approval?.status;
  useEffect(() => {
    if (!decidedStatus || decidedStatus === "pending") return;
    persistEvidenceCase(userId, currentCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decidedStatus, userId]);
  const copyEvidence = () => {
    const withDecision = currentCase();
    persistEvidenceCase(userId, withDecision);
    copyText(formatEvidenceSummary(withDecision), onToast, "증빙 기록을 복사했어요. 신고나 환불 요청에 붙여 넣으세요.");
  };
  return (
    <div>
      <ToolTrace tools={response.toolsUsed} />
      <div className="rounded-2xl border-2 border-[#F04452] bg-[#FFF8F8] p-4" data-testid="agent-alert-card">
        <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#F04452]"><AlertTriangle size={14} /> 결제 경고</div>
        <p className="mt-1.5 text-[15px] font-extrabold text-[#191F28]">{response.title}</p>
        <dl className="mt-2 space-y-1.5">
          {response.findings.map((item) => (
            <div key={item.label} className="flex gap-2 text-[12px] leading-relaxed">
              <dt className="w-[68px] shrink-0 font-semibold text-[#8B95A1]">{item.label}</dt>
              <dd className="font-medium text-[#333D4B]">{item.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2.5 text-[11px] leading-relaxed text-[#6B7684]">{response.notice}</p>
        {decidable && (
          approval.status === "pending" ? (
            <div className="mt-3 flex gap-2">
              <Button size="compact" variant="outline" className="flex-1" onClick={() => { onDecide(approval, "deny"); onStartCancel(response.subscriptionId); }}>해지하기</Button>
              <Button size="compact" variant="secondary" className="flex-1" onClick={() => { onDecide(approval, "allow_once"); onUpdateAmount?.(response); }}>
                {response.kind === "trial_conversion" ? "유료로 계속 쓰기" : "새 금액으로 계속 쓰기"}
              </Button>
            </div>
          ) : (
            <DecisionBadge status={approval.status} decidedAt={approval.decidedAt} labels={ALERT_STATUS_TEXT} />
          )
        )}
      </div>
      {response.kind !== "charged_after_cancel" && response.refund && (
        <RefundDraft refund={response.refund} onToast={onToast} />
      )}
      {response.kind === "charged_after_cancel" && (
        <ComplaintDrafts caseInfo={response} proof={cancelProof} refund={response.refund} onToast={onToast} />
      )}
      <Button size="compact" variant="secondary" fullWidth className="mt-3" onClick={copyEvidence} prefixIcon={<FileText size={14} />}>증빙 기록 복사</Button>
      <EvidenceConsent userId={userId} onToast={onToast} />
      <p className="mt-2 text-[11px] leading-relaxed text-[#8B95A1]">꾸독은 이미 된 결제를 취소할 수 없어요. 환불은 서비스 회사나 카드사에 직접 요청해야 해요.</p>
    </div>
  );
}

export function AgentSheet({
  subscriptions,
  messages,
  onMessagesChange,
  onClose,
  onStartCancel,
  onUpdateAmount,
  onToast,
  userId = null,
  usageAnswers = null,
  initialInsight = null,
  onAddSubscription,
  onUpdateSubscription,
  onSetAlerts,
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [consentGranted, setConsentGranted] = useState(() => readChatConsent(userId));
  const [showConsentPrompt, setShowConsentPrompt] = useState(false);
  const [pendingUserText, setPendingUserText] = useState("");
  const [context, setContext] = useState({ lastSubscriptionId: null, lastIntent: null });
  const [activeInsight, setActiveInsight] = useState(initialInsight);

  const [approvals, setApprovals] = useState(() => readStoredValue(storageKeys.agentApprovals, {}));
  const [mandates, setMandates] = useState(() => readStoredValue(storageKeys.agentMandates, {}));

  const endRef = useRef(null);
  const abortControllerRef = useRef(null);
  const approvalsRef = useRef(approvals);
  const mandatesRef = useRef(mandates);
  const recordedRef = useRef(new Set()); const executingActionIdsRef = useRef(new Set()); const prevUserIdRef = useRef(userId);

  // Sync consent state when userId changes
  useEffect(() => {
    setConsentGranted(readChatConsent(userId));
  }, [userId]);


  // Load chat history if messages is empty on mount
  useEffect(() => {
    if (prevUserIdRef.current !== userId) { prevUserIdRef.current = userId; const saved = loadChatHistory(userId); onMessagesChange(saved); } else if (!messages || messages.length === 0) { const saved = loadChatHistory(userId); if (saved.length > 0) { onMessagesChange(saved); } }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ����Ʈ �� ����� ���� �������� ��ȭ �̷��� �����ϱ� ���� messages/onMessagesChange ������� ������
  }, [userId]);

  // Handle initialInsight if provided
  useEffect(() => {
    if (!initialInsight) return;
    setActiveInsight(initialInsight);
    const insightId = "insight-" + initialInsight.id;
    onMessagesChange((curr) => {
      const exists = curr.some((m) => m.id === insightId || m.insightId === initialInsight.id);
      if (exists) return curr;
      const insightMsg = {
        id: insightId,
        role: "assistant",
        text: initialInsight.title + "\n" + initialInsight.message,
        quickReplies: initialInsight.quickReplies || [],
        insightId: initialInsight.id,
        insightText: initialInsight.title + ": " + initialInsight.message,
      };
      return [insightMsg, ...curr];
    });
  }, [initialInsight, onMessagesChange]);

  // Persist messages whenever they change
  useEffect(() => {
    if (messages && messages.length > 0) {
      saveChatHistory(userId, messages);
    }
  }, [messages, userId]);

  // Reset context when messages are cleared
  useEffect(() => {
    if (messages.length === 0) {
      setContext({ lastSubscriptionId: null, lastIntent: null });
    }
  }, [messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, isStreaming]);

  const saveApprovals = (next) => {
    approvalsRef.current = next;
    setApprovals(next);
    writeStoredValue(storageKeys.agentApprovals, next);
  };

  const saveMandates = (next) => {
    mandatesRef.current = next;
    setMandates(next);
    writeStoredValue(storageKeys.agentMandates, next);
  };

  // Sync approvals and mandates from server if logged in
  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    fetchApprovals(userId).then((rows) => {
      if (active && rows.length) saveApprovals(mergeServerApprovals(approvalsRef.current, rows));
    });
    fetchMandates(userId).then((rows) => {
      if (active && rows.length) saveMandates(mergeMandates(mandatesRef.current, rows));
    });
    pullServerEvidence(userId);
    return () => { active = false; };
  }, [userId]);

  // Record approvals in messages
  useEffect(() => {
    if (!userId) return;
    for (const request of approvalsInMessages(messages)) {
      if (recordedRef.current.has(request.id)) continue;
      recordedRef.current.add(request.id);
      recordApprovalRequest(userId, request);
    }
  }, [messages, userId]);

  const handleClearChat = () => {
    clearChatHistory(userId);
    onMessagesChange([]);
    setContext({ lastSubscriptionId: null, lastIntent: null });
    setActiveInsight(null);
    onToast?.("대화를 모두 지웠어요.");
  };

  const handleRevokeConsent = () => {
    revokeChatConsent(userId);
    setConsentGranted(false);
    onToast?.("AI 데이터 전송을 껐어요. 간단 모드로 전환됩니다.");
  };

  const handleAcceptConsent = () => {
    grantChatConsent(userId);
    setConsentGranted(true);
    setShowConsentPrompt(false);
    if (pendingUserText) {
      const textToRun = pendingUserText;
      setPendingUserText("");
      executeSend(textToRun, true);
    }
  };


  const handleDeclineConsent = () => {
    setShowConsentPrompt(false);
    if (pendingUserText) {
      const textToRun = pendingUserText;
      setPendingUserText("");
      executeLocalAgent(textToRun);
    }
  };

  // Stop streaming response
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setLoading(false);
  };

  // Local fallback runner
  const executeLocalAgent = async (text, assistantMsgId = null, baseHistory = null) => {
    setLoading(true);
    const effectiveHistory = baseHistory || [...messages, { id: "u-" + Date.now(), role: "user", text }];
    if (!baseHistory) {
      onMessagesChange(effectiveHistory);
    }

    const effectiveUsageAnswers = usageAnswers || readStoredValue(storageKeys.usageAnswers, {});
    let response = runAgent({ text, subscriptions, context, usageAnswers: effectiveUsageAnswers });
    if (response.type === "unknown" || response.type === "clarify") {
      const isConsented = readChatConsent(userId);
      if (isConsented) {
        const interpretation = await interpretWithAi(text, subscriptions, userId);
        if (interpretation) {
          response = runAgent({ text, subscriptions, interpretation, context, usageAnswers: effectiveUsageAnswers });
        }
      }
    }


    const newSubId = response.subscriptionId || (response.subscription ? (response.subscription.subscriptionId || response.subscription.id) : null);
    const newIntent = response.intent && response.intent !== "unknown" ? response.intent : null;
    if (newSubId || newIntent) {
      setContext((prev) => ({
        lastSubscriptionId: newSubId || prev.lastSubscriptionId,
        lastIntent: newIntent || prev.lastIntent,
      }));
    }

    setLoading(false);
    const newMsg = {
      id: assistantMsgId || "a-" + Date.now(),
      role: "agent",
      response,
      fallbackNote: Boolean(assistantMsgId),
    };

    onMessagesChange((curr) => {
      if (assistantMsgId) {
        return curr.map((m) => (m.id === assistantMsgId ? newMsg : m));
      }
      return [...curr, newMsg];
    });
  };

  // Main send dispatcher
  const send = async (raw) => {
    const text = String(raw || "").trim();
    if (!text || loading || isStreaming) return;
    setInput("");

    const token = userId ? await getAuthToken() : null;
    const hasSession = Boolean(userId && token);

    if (hasSession && !consentGranted) {
      setPendingUserText(text);
      setShowConsentPrompt(true);
      return;
    }

    if (hasSession && consentGranted) {
      executeSend(text, true);
    } else {
      executeLocalAgent(text);
    }
  };

  const executeSend = async (text, useStream = true) => {
    const history = [...messages, { id: "u-" + Date.now(), role: "user", text }];
    onMessagesChange(history);

    if (!useStream) {
      executeLocalAgent(text, null, history);
      return;
    }

    const assistantMsgId = "a-" + Date.now();
    const placeholderMsg = {
      id: assistantMsgId,
      role: "assistant",
      text: "",
      tools: [],
      actions: [],
      isStreaming: true,
    };

    onMessagesChange([...history, placeholderMsg]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const effectiveUsageAnswers = usageAnswers || readStoredValue(storageKeys.usageAnswers, {});
    const snapshot = buildChatSnapshot(subscriptions, new Date(), effectiveUsageAnswers);

    let chatContext = null;
    if (activeInsight) {
      chatContext = {
        insightId: activeInsight.id,
        insightText: activeInsight.title + ": " + activeInsight.message,
      };
      setActiveInsight(null);
    }

    let accumulatedText = "";
    const accumulatedTools = [];
    const accumulatedActions = [];

    try {
      await streamChat({
        messages: history,
        snapshot,
        context: chatContext,
        signal: abortController.signal,
        onEvent: ({ event, data }) => {
          if (event === "tool") {
            accumulatedTools.push({ name: data.name, label: data.label || data.name });
            onMessagesChange((curr) =>
              curr.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, tools: [...accumulatedTools] }
                  : m
              )
            );
          } else if (event === "delta") {
            if (data?.text) {
              accumulatedText += data.text;
              onMessagesChange((curr) =>
                curr.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, text: accumulatedText }
                    : m
                )
              );
            }
          } else if (event === "action") {
            if (data && data.type) {
              let capturedBefore = null;
              if (data.type === "update_subscription" || data.type === "open_cancel") {
                const subId = data.payload?.subscriptionId;
                const found = subscriptions.find((s) => (s.subscriptionId || s.id) === subId || s.id === subId);
                if (found) {
                  capturedBefore = {
                    id: found.subscriptionId || found.id,
                    name: found.name,
                    amount: found.amount ?? found.grossAmount,
                    billingCycle: found.billingCycle || "매월",
                    nextChargeDate: found.nextBillingDate || found.nextChargeDate || null,
                    billingDay: found.dueDay ?? found.billingDay ?? null,
                    plan: found.plan || null,
                    paymentMethod: found.paymentMethod || null,
                    alertD3: Boolean(found.alertD3),
                    alertD1: Boolean(found.alertD1),
                  };
                }
              } else if (data.type === "set_alerts") {
                if (data.payload?.subscriptionId === "all") {
                  capturedBefore = {
                    subscriptionId: "all",
                  };
                } else {
                  const subId = data.payload?.subscriptionId;
                  const found = subscriptions.find((s) => (s.subscriptionId || s.id) === subId || s.id === subId);
                  if (found) {
                    capturedBefore = {
                      id: found.subscriptionId || found.id,
                      name: found.name,
                      alertD3: Boolean(found.alertD3),
                      alertD1: Boolean(found.alertD1),
                    };
                  }
                }
              }

              accumulatedActions.push({
                ...data,
                before: capturedBefore ?? data.before ?? null,
                status: "pending",
              });
              onMessagesChange((curr) =>
                curr.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, actions: [...accumulatedActions] }
                    : m
                )
              );
            }
          } else if (event === "done") {
            onMessagesChange((curr) =>
              curr.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, isStreaming: false }
                  : m
              )
            );
          } else if (event === "error") {
            if (accumulatedText.length === 0 && accumulatedActions.length === 0) {
              throw new ChatError(data.message || "오류가 발생했습니다.", { code: data.code || "SERVER_ERROR" });
            } else {
              accumulatedText += "\n(" + (data.message || "오류가 발생했습니다.") + ")";
              onMessagesChange((curr) =>
                curr.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, text: accumulatedText, isStreaming: false }
                    : m
                )
              );
            }
          }
        },
      });

      setIsStreaming(false);
      abortControllerRef.current = null;
    } catch (err) {
      setIsStreaming(false);
      abortControllerRef.current = null;

      if (err.name === "AbortError" || abortController.signal.aborted) {
        onMessagesChange((curr) =>
          curr.map((m) =>
            m.id === assistantMsgId
              ? { ...m, isStreaming: false }
              : m
          )
        );
        return;
      }

      if (err.code === "RATE_LIMITED" || err.status === 429) {
        onMessagesChange((curr) =>
          curr.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: "요청이 몰려 잠시 지연되고 있어요. 잠시 후 다시 시도해 주세요.",
                  isStreaming: false,
                }
              : m
          )
        );
        return;
      }

      if (accumulatedText.length > 0 || accumulatedActions.length > 0) { onMessagesChange((curr) => curr.map((m) => m.id === assistantMsgId ? { ...m, text: accumulatedText + "\n(연결이 끊겨 답변이 중단되었어요.)", isStreaming: false } : m)); return; } executeLocalAgent(text, assistantMsgId, history);
    }
  };

  // Action card confirmation handler
  const handleConfirmAction = async (action) => {
    const { id, type, payload, summary } = action; if (!id || executingActionIdsRef.current.has(id)) return; executingActionIdsRef.current.add(id); const isValidDate = (str) => typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str + "T00:00:00Z").getTime()); const isValidDay = (d) => Number.isInteger(Number(d)) && Number(d) >= 1 && Number(d) <= 31;

    try {
      if (type === "add_subscription") {
        if (!payload.name || payload.name.trim() === "") {
          onToast?.("구독 이름이 필요해요.");
          return;
        }
        const numericAmount = Number(payload.amount);
        if (Number.isNaN(numericAmount) || numericAmount < 0) { onToast?.("유효한 금액이 필요해요."); return; } if (payload.billingDay !== undefined && !isValidDay(payload.billingDay)) { onToast?.("결제일은 1~31일 사이여야 해요."); return; } if (payload.nextChargeDate !== undefined && !isValidDate(payload.nextChargeDate)) { onToast?.("결제일 형식이 올바르지 않아요."); return; }
        const success = await onAddSubscription?.(payload);
        if (success === false) return;
      } else if (type === "update_subscription") {
        const subId = payload.subscriptionId;
        const exists = subscriptions.some((s) => (s.subscriptionId || s.id) === subId || s.id === subId);
        if (!exists) {
          onToast?.("해당 구독을 찾을 수 없어요.");
          return;
        }
        const changes = payload.changes || {}; if (changes.amount !== undefined) { const num = Number(changes.amount); if (Number.isNaN(num) || num < 0) { onToast?.("유효한 금액이 필요해요."); return; } } if (changes.billingDay !== undefined && !isValidDay(changes.billingDay)) { onToast?.("결제일은 1~31일 사이여야 해요."); return; } if (changes.nextChargeDate !== undefined && changes.nextChargeDate !== null && !isValidDate(changes.nextChargeDate)) { onToast?.("결제일 형식이 올바르지 않아요."); return; } const target = subscriptions.find((s) => (s.subscriptionId || s.id) === subId || s.id === subId); await onUpdateSubscription?.(target?.subscriptionId || subId, changes);
      } else if (type === "set_alerts") {
        if (payload.subscriptionId !== "all") { const exists = subscriptions.some((s) => (s.subscriptionId || s.id) === payload.subscriptionId || s.id === payload.subscriptionId); if (!exists) { onToast?.("해당 구독을 찾을 수 없어요."); return; } } await onSetAlerts?.(payload.subscriptionId, { alertD3: payload.alertD3, alertD1: payload.alertD1 });
      } else if (type === "open_cancel") {
        const target = subscriptions.find((s) => (s.subscriptionId || s.id) === payload.subscriptionId || s.id === payload.subscriptionId); if (!target) { onToast?.("해당 구독을 찾을 수 없어요."); return; } onStartCancel?.(target.subscriptionId || target.id);
      }

      // Mark action done
      onMessagesChange((curr) => {
        const updated = curr.map((m) => {
          if (!m.actions) return m;
          executingActionIdsRef.current.delete(id); const nextActions = m.actions.map((act) => act.id === id ? { ...act, status: "executed", done: true } : act);
          return { ...m, actions: nextActions };
        });
        const summaryText = summary || (
          type === "add_subscription" ? (payload.name + " 구독 추가") :
          type === "update_subscription" ? "구독 정보 수정" :
          type === "set_alerts" ? "알림 설정" : "해지 진행"
        );
        return [
          ...updated,
          {
            id: "a-done-" + Date.now(),
            role: "assistant",
            text: summaryText + " 작업을 반영했어요.",
          },
        ];
      });
      onToast?.("요청하신 작업을 반영했어요.");
    } catch {
      executingActionIdsRef.current.delete(id); onToast?.("작업 처리 중 오류가 발생했습니다.");
    }
  };

  // Action card cancel handler
  const handleCancelAction = (action) => {
    const { id, summary, type, payload } = action;
    onMessagesChange((curr) => {
      const updated = curr.map((m) => {
        if (!m.actions) return m;
        const nextActions = m.actions.map((act) =>
          act.id === id ? { ...act, status: "cancelled" } : act
        );
        return { ...m, actions: nextActions };
      });
      const summaryText = summary || (
        type === "add_subscription" ? ((payload?.name || "구독") + " 추가") : "요청하신 작업"
      );
      return [
        ...updated,
        {
          id: "a-cancel-" + Date.now(),
          role: "assistant",
          text: summaryText + " 작업을 취소했어요.",
        },
      ];
    });
  };

  const decide = async (request, decision) => {
    const current = resolveApproval(approvalsRef.current, request);
    const result = decideApproval(current, decision, new Date(), mandatesRef.current);
    saveApprovals(mergeApproval(approvalsRef.current, result.request));
    if (!result.ok && result.reason === "already_decided") onToast?.("이미 결정한 요청이에요.");
    if (!result.ok && result.reason === "expired") onToast?.("승인 시간이 지났어요. 다시 요청해 주세요.");
    if (!result.ok || !userId) return;
    const row = await decideApprovalOnServer(userId, current, decision);
    if (row) saveApprovals(mergeServerApprovals(approvalsRef.current, [row]));
  };

  const createMandateFor = async (item) => {
    const auth = await confirmUserPresence("꾸독 항상 허용 범위를 만듭니다.");
    if (!auth.ok) {
      onToast?.(DEVICE_AUTH_FAIL_TEXT[auth.reason] || "본인 확인에 실패했어요.");
      return false;
    }
    const local = createMandate({
      subscriptionId: item.subscriptionId,
      serviceName: item.serviceName,
      maxAmount: item.amount,
      verifiedWith: auth.method,
    });
    if (!local) {
      onToast?.("금액 정보가 없어 범위를 만들 수 없어요.");
      return false;
    }
    const mandate = userId ? await createMandateOnServer(userId, local) : local;
    if (!mandate) {
      onToast?.("범위를 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
      return false;
    }
    saveMandates({ ...mandatesRef.current, [mandate.subscriptionId]: mandate });
    await decide(item.approval, "allow_mandate");
    onToast?.(item.serviceName + " 갱신은 " + formatWon(mandate.maxAmount) + " 이하면 앞으로 자동으로 허용해요.");
    return true;
  };

  const revokeMandateFor = async (subscriptionId) => {
    saveMandates(revokeMandate(mandatesRef.current, subscriptionId));
    if (userId) await revokeMandateOnServer(userId, subscriptionId);
    onToast?.("항상 허용을 해제했어요. 다음 결제부터 다시 물어볼게요.");
  };

  const clarify = (response, option) => {
    const verb = response.intent === "cancel_refund"
      ? "해지하고 환불 받아줘"
      : response.intent === "refund"
      ? "환불 받아줘"
      : response.intent === "service_info"
      ? "얼마야?"
      : "해지해줘";
    send(option.name + " " + verb);
  };

  const defaultSuggestions = [
    "넷플릭스랑 디즈니 합치면 얼마야?",
    "다음 주에 나갈 돈 알려줘",
    "유튜브 프리미엄 금액 바꿔줘",
    "한 달 총 지출 얼마야?",
    "안 쓰는 구독 있어?",
    (subscriptions[0]?.name || "넷플릭스") + " 해지하고 환불 받아줘",
  ];

  return (
    <BottomSheet onClose={onClose} label="꾸독에게 시키기">
      <div className="flex min-h-[60vh] flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#191F28] text-white">
              <Sparkles size={17} />
            </span>
            <div>
              <h2 className="text-[17px] font-extrabold tracking-tight text-[#191F28]">꾸독에게 시키기</h2>
              <p className="text-[11px] font-medium text-[#8B95A1]">해지·환불·결제 예정을 대신 챙겨요. 실행 전엔 꼭 물어볼게요.</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {consentGranted && (
              <button
                type="button"
                onClick={handleRevokeConsent}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#8B95A1] hover:bg-[#F2F4F6] hover:text-[#191F28]"
                title="AI 데이터 전송 끄기"
              >
                AI 데이터 전송 끄기
              </button>
            )}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="grid h-9 w-9 place-items-center rounded-lg text-[#8B95A1] hover:bg-[#F2F4F6] hover:text-[#191F28]"
                aria-label="대화 지우기"
                title="대화 지우기"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-lg text-[#8B95A1] hover:bg-[#F2F4F6]"
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message body */}
        <div className="mt-4 flex-1 space-y-4" aria-live="polite">
          {showConsentPrompt && (
            <ConsentCard
              onAccept={handleAcceptConsent}
              onDecline={handleDeclineConsent}
            />
          )}

          {messages.length === 0 && !showConsentPrompt && (
            <div className="rounded-2xl bg-[#F9FAFB] p-4">
              <p className="text-[13px] font-semibold text-[#333D4B]">이렇게 말해 보세요</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {defaultSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-full border border-[#E5E8EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#333D4B] hover:border-[#191F28]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[80%] rounded-2xl rounded-br-md bg-[#191F28] px-3.5 py-2.5 text-[14px] font-medium text-white">
                    {message.text}
                  </p>
                </div>
              );
            }

            if (message.role === "assistant") {
              return (
                <div key={message.id} className="max-w-full space-y-2">
                  {/* Tool chips */}
                  {message.tools && message.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {message.tools.map((t, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-full bg-[#F2F4F6] px-2 py-0.5 text-[11px] font-semibold text-[#6B7684]"
                        >
                          <Check size={11} className="text-[#3182F6]" />
                          {t.label || t.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Text content */}
                  {message.text && (
                    <div className="rounded-2xl bg-[#F9FAFB] p-3.5 text-[14px] leading-relaxed text-[#333D4B] whitespace-pre-wrap">
                      {message.text}
                      {message.isStreaming && (
                        <span className="inline-block h-3.5 w-1.5 ml-0.5 bg-[#191F28] animate-pulse align-middle" />
                      )}
                    </div>
                  )}

                  {/* Quick replies from insight */}
                  {message.quickReplies && message.quickReplies.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.quickReplies.map((reply) => (
                        <button
                          key={reply}
                          type="button"
                          onClick={() => send(reply)}
                          className="rounded-full border border-[#E5E8EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#333D4B] hover:border-[#191F28]"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action cards */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="space-y-3">
                      {message.actions.map((act) => (
                        <ActionCard
                          key={act.id}
                          action={act}
                          subscriptions={subscriptions}
                          onConfirm={handleConfirmAction}
                          onCancel={handleCancelAction}
                        />
                      ))}
                    </div>
                  )}

                  {/* Fallback indicator */}
                  {message.fallbackNote && (
                    <p className="text-[11px] text-[#8B95A1]">간단 모드로 답했어요.</p>
                  )}
                </div>
              );
            }

            // Existing role === "agent" responses
            return (
              <div key={message.id} className="max-w-full">
                {message.fallbackNote && (
                  <p className="mb-1 text-[11px] text-[#8B95A1]">간단 모드로 답했어요.</p>
                )}
                {message.response?.type === "action" && (
                  <ActionResponse
                    response={message.response}
                    approval={resolveApproval(approvals, message.response.approval)}
                    onDecide={decide}
                    onStartCancel={onStartCancel}
                    onToast={onToast}
                  />
                )}
                {message.response?.type === "upcoming" && (
                  <UpcomingResponse
                    response={message.response}
                    approvals={approvals}
                    mandates={mandates}
                    onDecide={decide}
                    onStartCancel={onStartCancel}
                    onCreateMandate={createMandateFor}
                    onRevokeMandate={revokeMandateFor}
                  />
                )}
                {message.response?.type === "spending" && (
                  <SpendingResponse response={message.response} />
                )}
                {message.response?.type === "top_cost" && (
                  <TopCostResponse response={message.response} onStartCancel={onStartCancel} />
                )}
                {message.response?.type === "unused" && (
                  <UnusedResponse response={message.response} onStartCancel={onStartCancel} />
                )}
                {message.response?.type === "service_info" && (
                  <ServiceInfoResponse response={message.response} onStartCancel={onStartCancel} />
                )}
                {message.response?.type === "alert" && (
                  <AlertResponse
                    response={message.response}
                    approval={message.response.approval ? resolveApproval(approvals, message.response.approval) : null}
                    onDecide={decide}
                    onStartCancel={onStartCancel}
                    onUpdateAmount={onUpdateAmount}
                    onToast={onToast}
                    userId={userId}
                  />
                )}
                {(message.response?.type === "unknown" || message.response?.type === "clarify") && (
                  <div>
                    <p className="text-[14px] font-medium text-[#333D4B]">{message.response.message}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.response.type === "clarify"
                        ? message.response.options.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => clarify(message.response, option)}
                              className="rounded-full border border-[#E5E8EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#333D4B]"
                            >
                              {option.name}
                            </button>
                          ))
                        : message.response.suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => send(suggestion)}
                              className="rounded-full border border-[#E5E8EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#333D4B]"
                            >
                              {suggestion}
                            </button>
                          ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#8B95A1]">
              <Loader2 size={14} className="animate-spin" /> 구독 정보를 확인하고 있어요
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input form */}
        <form
          className="sticky bottom-0 mt-4 flex items-center gap-2 bg-white pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            disabled={isStreaming}
            onChange={(event) => setInput(event.target.value)}
            placeholder="예: 넷플릭스랑 디즈니 합치면 얼마야?"
            aria-label="꾸독에게 요청하기"
            className="min-h-[46px] flex-1 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3.5 text-[14px] text-[#191F28] outline-none focus:border-[#191F28] disabled:bg-[#F2F4F6] disabled:text-[#8B95A1]"
          />
          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={handleStop}
              aria-label="생성 중지"
              title="생성 중지"
            >
              <Square size={14} className="fill-current text-[#191F28]" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || loading}
              aria-label="보내기"
            >
              <Send size={17} />
            </Button>
          )}
        </form>
      </div>
    </BottomSheet>
  );
}
