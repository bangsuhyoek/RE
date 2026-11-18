import { useEffect, useState } from "react";
import { ChevronDown, CloudUpload, Copy, ExternalLink, FileText, Fingerprint } from "lucide-react";
import { ServiceLogo } from "../ui";
import { formatWon, normalizeWonText } from "../../lib/dates";
import { readEvidenceCases } from "../../lib/storage";
import {
  appendDecisionToCase,
  createEvidenceCase,
  formatEvidenceSummary,
  isMandateActive,
  resolveApproval,
} from "../../lib/subscriptionAgent";
import { grantEvidenceConsent, persistEvidenceCase, readEvidenceConsent } from "../../lib/evidenceStore";
import { canUseDeviceAuth } from "../../lib/deviceAuth";
import { findCancelProof } from "../../lib/cancelProof";
import { ComplaintDrafts } from "../ComplaintDrafts";
import { CardButton, ConfirmCard } from "./ConfirmCard";
import {
  AssistantText,
  Note,
  RowButton,
  SourceLine,
  ToolSummary,
  copyText,
  findSubscription,
  isUrgentDDay,
  openExternal,
} from "./agentParts";

const cx = (...parts) => parts.filter(Boolean).join(" ");

export const STATUS_TEXT = {
  approved: "허용함",
  approved_once: "이번만 허용함",
  approved_mandate: "항상 허용 범위 안이라 자동으로 허용함",
  declined: "거절함",
  expired: "시간이 지나 만료됨",
};

export const ALERT_STATUS_TEXT = {
  approved_once: "새 금액으로 계속 쓰기로 했어요",
  declined: "해지하기로 했어요",
};

export const isExpiredPending = (approval, now = Date.now()) =>
  approval?.status === "pending" && new Date(approval.dueAt).getTime() < now;

const decisionTime = (decidedAt) =>
  decidedAt ? new Date(decidedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "";

export function decisionText(status, decidedAt, labels = STATUS_TEXT) {
  const time = decisionTime(decidedAt);
  return (labels[status] || STATUS_TEXT[status] || status) + (time ? " · " + time : "");
}

// "신한카드 (끝자리 4521)" → "신한카드 4521". 좁은 보조 줄에서 잘리지 않게 줄인다.
const shortPayment = (text) => String(text || "").replace(/\s*\(끝자리\s*(\d{4})\)/g, " $1");
// "ChatGPT Plus" + "Plus" 처럼 이름이 요금제로 끝나면 요금제를 다시 붙이지 않는다.
const withPlan = (name, plan) => (plan && !String(name || "").endsWith(plan) ? name + " " + plan : name);

const logoFor = (subscriptions, id, fallbackName) => {
  const sub = findSubscription(subscriptions, id);
  return { serviceId: sub?.serviceId || sub?.id || null, name: sub?.name || fallbackName || "", monogram: sub?.monogram || null };
};

/** 목록 행: 로고 40 · 제목/보조 · 오른쪽 금액/보조. 시트 좌우 끝까지 닿게 -mx-5. */
function AnswerRow({ logo, title, subtitle, trailingTitle, trailingSubtitle, trailingTone, accessory = null, onClick, expanded, testId }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-expanded={onClick ? Boolean(expanded) : undefined}
      data-testid={testId}
      className={cx(
        "-mx-5 flex min-h-[64px] w-[calc(100%+2.5rem)] items-center gap-3.5 px-5 py-2.5 text-left",
        onClick && "transition-colors active:bg-gray-50",
      )}
    >
      {logo && <ServiceLogo serviceId={logo.serviceId} name={logo.name} monogram={logo.monogram} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-medium leading-[22px] text-ink">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-[13px] leading-[18px] text-ink-tertiary">{subtitle}</p>}
      </div>
      {(trailingTitle || trailingSubtitle) && (
        <div className="shrink-0 text-right">
          {trailingTitle && <p className="text-[16px] font-semibold leading-[22px] tabular-nums text-ink">{trailingTitle}</p>}
          {trailingSubtitle && (
            <p className={cx("mt-0.5 text-[13px] leading-[18px] tabular-nums", trailingTone === "danger" ? "font-semibold text-danger" : "text-ink-tertiary")}>
              {trailingSubtitle}
            </p>
          )}
        </div>
      )}
      {accessory}
      {onClick && (
        <ChevronDown size={16} className={cx("shrink-0 text-ink-subtle transition-transform", expanded && "rotate-180")} aria-hidden="true" />
      )}
    </Tag>
  );
}

export function SpendingResponse({ response }) {
  return (
    <div>
      <ToolSummary tools={response.toolsUsed} />
      <AssistantText>
        한 달 구독료는 <b className="font-semibold">{formatWon(response.monthly)}</b>이에요. 1년이면 <b className="font-semibold">{formatWon(response.yearly)}</b>이에요.
      </AssistantText>
      <Note className="mt-1.5">이용 중인 구독 {response.count}개 기준</Note>
    </div>
  );
}

export function TopCostResponse({ response, subscriptions = [], onStartCancel }) {
  return (
    <div>
      <ToolSummary tools={response.toolsUsed} />
      <AssistantText>{normalizeWonText(response.summary)}</AssistantText>
      <div className="mt-1">
        {response.items.map((item, idx) => (
          <AnswerRow
            key={item.subscriptionId || idx}
            logo={logoFor(subscriptions, item.subscriptionId, item.name)}
            title={item.name}
            subtitle={item.billingCycle === "매년" ? "연 " + formatWon(item.amount) + " (월 환산)" : (item.plan && !String(item.name).endsWith(item.plan) ? item.plan : "월 결제")}
            trailingTitle={"월 " + formatWon(item.monthlyEquivalent)}
            accessory={onStartCancel ? <RowButton onClick={() => onStartCancel(item.subscriptionId)}>해지</RowButton> : null}
          />
        ))}
      </div>
    </div>
  );
}

export function UnusedResponse({ response, subscriptions = [], onStartCancel }) {
  return (
    <div>
      <ToolSummary tools={response.toolsUsed} />
      <AssistantText>{normalizeWonText(response.summary)}</AssistantText>
      {response.items?.length > 0 && (
        <div className="mt-1">
          {response.items.map((item) => (
            <AnswerRow
              key={item.subscriptionId}
              logo={logoFor(subscriptions, item.subscriptionId, item.name)}
              title={item.name}
              subtitle={item.streak + "달 연속 '거의 안 씀'"}
              trailingTitle={formatWon(item.amount)}
              accessory={onStartCancel ? <RowButton onClick={() => onStartCancel(item.subscriptionId)}>해지</RowButton> : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ServiceInfoResponse({ response, subscriptions = [], onStartCancel }) {
  const logo = logoFor(subscriptions, response.subscriptionId, response.serviceName);
  return (
    <div>
      <ToolSummary tools={response.toolsUsed} />
      <ConfirmCard
        serviceId={logo.serviceId}
        name={logo.name}
        monogram={logo.monogram}
        title={response.serviceName}
        subtitle={response.plan || null}
        rows={[
          { label: "금액", value: formatWon(response.amount) },
          { label: "결제 주기", value: response.billingCycle },
          { label: "다음 결제일", value: response.nextPaymentDate },
          { label: "결제 수단", value: response.paymentMethod },
        ]}
        primary={onStartCancel ? { label: response.serviceName + " 해지하기", tone: "outline", onClick: () => onStartCancel(response.subscriptionId) } : null}
      />
    </div>
  );
}

export function RefundDraft({ refund, onToast }) {
  const [lang, setLang] = useState("ko");
  const draft = refund.draft[lang];
  const copy = () => copyText(draft, onToast, "환불 요청서를 복사했어요.");
  return (
    <section className="rounded-2xl border border-gray-200 bg-white px-[18px] pb-4 pt-[18px]" data-testid="agent-refund-draft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold leading-[24px] text-ink">환불 요청서</h3>
          <p className="mt-0.5 truncate text-[13px] text-ink-tertiary">{refund.requestTo} 제출용</p>
        </div>
        <div className="flex shrink-0 rounded-lg bg-gray-100 p-0.5 text-[13px] font-semibold" role="group" aria-label="요청서 언어">
          {["ko", "en"].map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={lang === code}
              onClick={() => setLang(code)}
              className={"min-h-[32px] rounded-md px-2.5 " + (lang === code ? "bg-white text-ink" : "text-ink-tertiary")}
            >
              {code === "ko" ? "한국어" : "English"}
            </button>
          ))}
        </div>
      </div>
      <pre className="mt-3 max-h-44 overflow-y-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-3 font-sans text-[13px] leading-[20px] text-ink-secondary">{draft}</pre>
      <Note className="mt-2">{refund.note} 카드번호는 끝 4자리만 넣었어요.</Note>
      <div className="mt-3 flex gap-2">
        <CardButton compact tone="secondary" className="flex-1" onClick={copy}><Copy size={15} aria-hidden="true" />복사</CardButton>
        {refund.url && (
          <CardButton compact tone="outline" className="flex-1" onClick={() => openExternal(refund.url)}>
            <ExternalLink size={15} aria-hidden="true" />
            <span className="truncate">{refund.urlLabel || "요청 페이지 열기"}</span>
          </CardButton>
        )}
      </div>
    </section>
  );
}

export function ActionResponse({ response, approval, subscriptions = [], onDecide, onStartCancel, onToast }) {
  const decided = approval.status !== "pending";
  const allowed = approval.status === "approved";
  const logo = logoFor(subscriptions, response.subscriptionId, response.serviceName);
  const [first, ...restFindings] = response.findings || [];
  const verb = response.wantsCancel && response.wantsRefund ? "해지·환불" : response.wantsCancel ? "해지" : "환불 요청";
  const steps = (response.steps || []).map((label, idx) => ({
    label,
    state: allowed ? (idx === 0 ? "now" : "next") : "next",
  }));
  if (allowed) steps.unshift({ label: "결제 정보와 경로 확인", state: "done" });

  let subtitle = first?.value ? shortPayment(first.value) : null;
  if (decided) subtitle = approval.status === "approved" ? decisionText("approved", approval.decidedAt).replace("허용함", "진행을 허용했어요") : decisionText(approval.status, approval.decidedAt);

  return (
    <div className="space-y-3">
      <div>
        <ToolSummary tools={response.toolsUsed} />
        {response.wantsRefund && (
          response.policy ? (
            <div>
              <AssistantText>{response.policy.summary}</AssistantText>
              <SourceLine label={"출처: " + response.policy.sourceLabel} verifiedAt={response.policy.verifiedAt} url={response.policy.sourceUrl} />
            </div>
          ) : (
            <AssistantText>이 서비스의 공식 환불 정책은 아직 꾸독이 확인하지 못했어요. 최종 결정은 서비스 회사가 해요.</AssistantText>
          )
        )}
      </div>

      <ConfirmCard
        testId="agent-approval-card"
        serviceId={logo.serviceId}
        name={logo.name}
        monogram={logo.monogram}
        title={(allowed ? response.serviceName + " " + verb + " 진행 중" : response.serviceName + " " + verb)}
        subtitle={subtitle}
        rows={allowed ? [] : restFindings.map((item) => ({ label: item.label, value: item.value }))}
        steps={approval.status === "declined" || approval.status === "expired" ? [] : steps}
        note={decided ? null : "로그인과 마지막 해지 확정은 직접 눌러 주세요. 꾸독은 비밀번호와 카드번호를 받지 않아요."}
        secondary={decided ? null : { label: "그만두기", onClick: () => onDecide(approval, "deny") }}
        primary={
          decided
            ? allowed && response.wantsCancel
              ? {
                  label: response.hasCancelUrl ? response.serviceName + " 해지 페이지 열기" : response.serviceName + " 해지 안내 보기",
                  onClick: () => onStartCancel(response.subscriptionId, { autoOpen: true }),
                }
              : null
            : { label: "진행할게요", onClick: () => onDecide(approval, "allow") }
        }
      />

      {allowed && response.wantsRefund && response.refund && <RefundDraft refund={response.refund} onToast={onToast} />}
      {approval.status === "declined" && <Note>그만뒀어요. 필요하면 언제든 다시 말해 주세요.</Note>}
      {approval.status === "expired" && <Note>승인 시간이 지났어요. 다시 요청해 주세요.</Note>}
    </div>
  );
}

function MandateConfirm({ item, busy, onCancel, onConfirm }) {
  return (
    <div className="mt-3" data-testid="agent-mandate-confirm">
      <p className="break-keep text-[14px] font-semibold leading-[21px] text-ink">{item.serviceName} 갱신이 {formatWon(item.amount)} 이하이면 앞으로 묻지 않고 허용으로 기록해요.</p>
      <ul className="mt-1.5 space-y-0.5 text-[13px] leading-[19px] text-ink-muted">
        <li>· 금액이 오르거나 무료체험이 끝나면 다시 물어봐요.</li>
        <li>· 1년 뒤 끝나고, 언제든 해제할 수 있어요.</li>
        <li>· 꾸독은 결제를 막지 않아요. 원하지 않으면 해지해야 멈춰요.</li>
      </ul>
      <div className="mt-3 flex gap-2">
        <CardButton compact tone="secondary" className="flex-1" onClick={onCancel} disabled={busy}>취소</CardButton>
        <CardButton compact tone="primary" className="flex-[1.6]" onClick={onConfirm} disabled={busy}>
          {canUseDeviceAuth() ? <Fingerprint size={15} aria-hidden="true" /> : null}
          {canUseDeviceAuth() ? "본인 확인하고 허용" : "확인하고 허용"}
        </CardButton>
      </div>
    </div>
  );
}

export function UpcomingResponse({ response, approvals, mandates, subscriptions = [], onDecide, onStartCancel, onCreateMandate, onRevokeMandate }) {
  const [confirmingId, setConfirmingId] = useState(null);
  const [busy, setBusy] = useState(false);
  // 결정이 필요한 행만 펼친다. 처음엔 3일 안에 결제되는 첫 행(알림에서 온 1건이면 그 행)을 펼쳐 둔다.
  const [expandedId, setExpandedId] = useState(() => {
    const pending = response.items.filter((item) => {
      const stored = resolveApproval(approvals, item.approval);
      return stored.status === "pending" && !isExpiredPending(stored);
    });
    if (response.items.length === 1 && pending.length === 1) return pending[0].approval.id;
    const urgent = pending.find((item) => isUrgentDDay(item.dDay));
    return urgent ? urgent.approval.id : null;
  });
  const confirmMandate = async (item) => {
    setBusy(true);
    const created = await onCreateMandate(item);
    setBusy(false);
    if (created) setConfirmingId(null);
  };
  return (
    <div>
      <ToolSummary tools={response.toolsUsed} />
      <AssistantText>{normalizeWonText(response.summary)}</AssistantText>
      <div className="mt-1">
        {response.items.map((item) => {
          const stored = resolveApproval(approvals, item.approval);
          const approval = isExpiredPending(stored) ? { ...stored, status: "expired" } : stored;
          const mandate = mandates[item.subscriptionId];
          const mandateActive = isMandateActive(mandate);
          const pending = approval.status === "pending";
          const expanded = pending && expandedId === approval.id;
          const logo = logoFor(subscriptions, item.subscriptionId, item.serviceName);
          const status = pending ? (item.isTrial ? "무료체험 끝나고 유료 전환" : shortPayment(item.payment)) : decisionText(approval.status, approval.decidedAt);
          return (
            <div key={item.approval.id} data-testid="agent-renewal-card">
              <AnswerRow
                logo={logo}
                title={withPlan(item.serviceName, item.plan)}
                subtitle={item.dateLabel + " · " + status}
                trailingTitle={formatWon(item.amount)}
                trailingSubtitle={item.dDay}
                trailingTone={isUrgentDDay(item.dDay) ? "danger" : "muted"}
                onClick={pending ? () => setExpandedId(expanded ? null : approval.id) : undefined}
                expanded={expanded}
              />
              {expanded && (
                <div className="mb-2 rounded-[14px] bg-gray-50 px-3.5 pb-3.5 pt-3">
                  {confirmingId === approval.id ? (
                    <MandateConfirm item={item} busy={busy} onCancel={() => setConfirmingId(null)} onConfirm={() => confirmMandate(item)} />
                  ) : (
                    <>
                      <p className="break-keep text-[14px] leading-[21px] text-ink-muted">
                        {item.isTrial ? "무료체험이 끝나고 유료로 바뀌어요. 계속 쓸까요?" : "이번 결제를 어떻게 할까요?"}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <CardButton compact tone="secondary" className="flex-1" onClick={() => onDecide(approval, "allow_once")}>
                          {item.isTrial ? "유료로 계속 쓰기" : "이번만 허용"}
                        </CardButton>
                        <CardButton compact tone="outline" className="flex-1" onClick={() => { onDecide(approval, "deny"); onStartCancel(item.subscriptionId); }}>
                          거절하고 해지
                        </CardButton>
                      </div>
                      {!item.isTrial && (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(approval.id)}
                          className="mt-1.5 min-h-[36px] w-full text-center text-[13px] font-medium text-ink-muted"
                        >
                          이 금액 이하면 항상 허용
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
              {approval.status === "approved_mandate" && mandateActive && (
                <div className="mb-2 flex items-center justify-between gap-2 text-[13px] text-ink-tertiary">
                  <span>항상 허용 · {formatWon(mandate.maxAmount)} 이하 · {new Date(mandate.expiresAt).toLocaleDateString("ko-KR")}까지</span>
                  <button type="button" onClick={() => onRevokeMandate(item.subscriptionId)} className="min-h-[32px] shrink-0 px-1 font-semibold text-ink">해제</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {response.items.length > 0 && (
        <Note className="mt-2">꾸독은 결제를 직접 막을 수 없어요. 원하지 않는 결제는 해지해야 멈춰요.</Note>
      )}
    </div>
  );
}

function EvidenceConsent({ userId, onToast }) {
  const [consented, setConsented] = useState(() => Boolean(readEvidenceConsent(userId)));
  const [busy, setBusy] = useState(false);
  if (!userId) return <Note>증빙은 이 기기에만 저장돼요. 로그인하면 계정에 보관할 수 있어요.</Note>;
  if (consented) {
    return <Note>계정에 보관 중 · 만든 날부터 1년 뒤 자동 삭제</Note>;
  }
  const grant = async () => {
    setBusy(true);
    const ok = await grantEvidenceConsent(userId);
    setBusy(false);
    setConsented(true);
    onToast?.(ok ? "증빙을 계정에 보관했어요. 내 계정 관리에서 언제든 지울 수 있어요." : "보관에 동의했어요. 일부 증빙은 연결되면 다시 올릴게요.");
  };
  return (
    <section className="rounded-2xl border border-gray-200 bg-white px-[18px] pb-4 pt-4" data-testid="agent-evidence-consent">
      <p className="text-[15px] font-semibold text-ink">증빙을 내 계정에 보관할까요? (선택)</p>
      <Note className="mt-1">
        서비스명, 결제 금액·일시, 결제수단 이름과 카드 끝 4자리, 해지 일시, 꾸독 승인 기록을 보관해요. 휴대폰을 바꿔도 남고, 만든 날부터 1년 뒤 자동으로 지워져요. 내 계정 관리에서 언제든 지울 수 있어요.
      </Note>
      <CardButton compact tone="outline" className="mt-3 w-full" onClick={grant} disabled={busy}>
        <CloudUpload size={15} aria-hidden="true" />동의하고 계정에 보관
      </CardButton>
    </section>
  );
}

export function AlertResponse({ response, approval, subscriptions = [], onDecide, onStartCancel, onUpdateAmount, onToast, userId }) {
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
  const sub = findSubscription(subscriptions, response.subscriptionId);
  const pending = decidable && approval.status === "pending";
  return (
    <div className="space-y-3">
      <ToolSummary tools={response.toolsUsed} />
      <ConfirmCard
        testId="agent-alert-card"
        eyebrow="결제 경고"
        eyebrowTone="danger"
        serviceId={sub?.serviceId || sub?.id || response.serviceId || null}
        name={sub?.name || response.serviceName || ""}
        title={normalizeWonText(response.title)}
        subtitle={decidable && !pending ? decisionText(approval.status, approval.decidedAt, ALERT_STATUS_TEXT) : null}
        rows={(response.findings || []).map((item) => ({ label: item.label, value: item.value }))}
        note={response.notice}
        secondary={pending ? { label: "해지하기", tone: "outline", onClick: () => { onDecide(approval, "deny"); onStartCancel(response.subscriptionId); } } : null}
        primary={pending ? {
          label: response.kind === "trial_conversion" ? "유료로 계속 쓰기" : "새 금액으로 계속 쓰기",
          tone: "secondary",
          onClick: () => { onDecide(approval, "allow_once"); onUpdateAmount?.(response); },
        } : null}
      />
      {response.kind !== "charged_after_cancel" && response.refund && (
        <RefundDraft refund={response.refund} onToast={onToast} />
      )}
      {response.kind === "charged_after_cancel" && (
        <ComplaintDrafts caseInfo={response} proof={cancelProof} refund={response.refund} onToast={onToast} />
      )}
      <CardButton compact tone="secondary" className="w-full" onClick={copyEvidence}>
        <FileText size={15} aria-hidden="true" />증빙 기록 복사
      </CardButton>
      <EvidenceConsent userId={userId} onToast={onToast} />
      <Note>꾸독은 이미 된 결제를 취소할 수 없어요. 환불은 서비스 회사나 카드사에 직접 요청해야 해요.</Note>
    </div>
  );
}

