import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Check, Copy, ExternalLink, Loader2, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { BottomSheet, Button } from "./ui";
import { formatWon } from "../lib/dates";
import { readStoredValue, storageKeys, writeStoredValue } from "../lib/storage";
import { buildSuggestions, decideApproval, mergeApproval, resolveApproval, runAgent } from "../lib/subscriptionAgent";
import { interpretWithAi } from "../lib/agentClient";

const STATUS_TEXT = {
  approved: "허용함",
  approved_once: "이번만 허용함",
  declined: "거절함",
  expired: "시간이 지나 만료됨",
};

const openExternal = (url) => {
  if (!url) return;
  if (Capacitor.isNativePlatform()) {
    Browser.open({ url }).catch(() => window.open(url, "_blank", "noopener,noreferrer"));
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

function DecisionBadge({ status, decidedAt }) {
  const time = decidedAt ? new Date(decidedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "";
  const positive = status === "approved" || status === "approved_once";
  return (
    <div className={"mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold " + (positive ? "bg-[#E8F3FF] text-[#1B64DA]" : "bg-[#F2F4F6] text-[#6B7684]")}>
      {positive ? <Check size={14} /> : <X size={14} />}
      {STATUS_TEXT[status] || status}{time ? " · " + time : ""}
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

function RefundDraft({ refund, onToast }) {
  const [lang, setLang] = useState("ko");
  const draft = refund.draft[lang];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      onToast?.("환불 요청서를 복사했어요.");
    } catch {
      onToast?.("복사하지 못했어요. 길게 눌러 직접 복사해 주세요.");
    }
  };
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
            <button type="button" onClick={() => openExternal(response.policy.sourceUrl)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#3182F6]">
              <ExternalLink size={11} /> 출처: {response.policy.sourceLabel}
            </button>
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

function UpcomingResponse({ response, approvals, onDecide, onStartCancel }) {
  return (
    <div>
      <ToolTrace tools={response.toolsUsed} />
      <p className="text-[14px] font-semibold text-[#191F28]">{response.summary}</p>
      <div className="mt-2.5 space-y-2.5">
        {response.items.map((item) => {
          const approval = resolveApproval(approvals, item.approval);
          return (
            <div key={item.approval.id} className="rounded-2xl border border-[#E5E8EB] bg-white p-3.5" data-testid="agent-renewal-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-[#191F28]">{item.serviceName} <span className="font-medium text-[#8B95A1]">{item.plan}</span></p>
                  <p className="mt-0.5 text-[12px] text-[#6B7684]">{item.dateLabel} 결제 · {item.payment}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[14px] font-extrabold text-[#191F28]">{formatWon(item.amount)}</p>
                  <span className="text-[11px] font-bold text-[#F04452]">{item.dDay}</span>
                </div>
              </div>
              {approval.status === "pending" ? (
                <div className="mt-3 flex gap-2">
                  <Button size="compact" variant="secondary" className="flex-1" onClick={() => onDecide(approval, "allow_once")}>이번만 허용</Button>
                  <Button size="compact" variant="outline" className="flex-1" onClick={() => { onDecide(approval, "deny"); onStartCancel(item.subscriptionId); }}>거절하고 해지</Button>
                </div>
              ) : (
                <DecisionBadge status={approval.status} decidedAt={approval.decidedAt} />
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

export function AgentSheet({ subscriptions, messages, onMessagesChange, onClose, onStartCancel, onToast }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState(() => readStoredValue(storageKeys.agentApprovals, {}));
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const saveApprovals = (next) => {
    setApprovals(next);
    writeStoredValue(storageKeys.agentApprovals, next);
  };

  const send = async (raw) => {
    const text = String(raw || "").trim();
    if (!text || loading) return;
    setInput("");
    const history = [...messages, { id: "u-" + Date.now(), role: "user", text }];
    onMessagesChange(history);
    setLoading(true);
    let response = runAgent({ text, subscriptions });
    if (response.type === "unknown" || response.type === "clarify") {
      const interpretation = await interpretWithAi(text, subscriptions);
      if (interpretation) response = runAgent({ text, subscriptions, interpretation });
    }
    setLoading(false);
    onMessagesChange([...history, { id: "a-" + Date.now(), role: "agent", response }]);
  };

  const decide = (request, decision) => {
    const current = resolveApproval(approvals, request);
    const result = decideApproval(current, decision);
    saveApprovals(mergeApproval(approvals, result.request));
    if (!result.ok && result.reason === "already_decided") onToast?.("이미 결정한 요청이에요.");
    if (!result.ok && result.reason === "expired") onToast?.("승인 시간이 지났어요. 다시 요청해 주세요.");
  };

  const clarify = (response, option) => {
    const verb = response.intent === "cancel_refund" ? "해지하고 환불 받아줘" : response.intent === "refund" ? "환불 받아줘" : "해지해줘";
    send(option.name + " " + verb);
  };

  const suggestions = buildSuggestions(subscriptions);

  return (
    <BottomSheet onClose={onClose} label="꾸독에게 시키기">
      <div className="flex min-h-[60vh] flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#191F28] text-white"><Sparkles size={17} /></span>
            <div>
              <h2 className="text-[17px] font-extrabold tracking-tight text-[#191F28]">꾸독에게 시키기</h2>
              <p className="text-[11px] font-medium text-[#8B95A1]">해지·환불·결제 예정을 대신 챙겨요. 실행 전엔 꼭 물어볼게요.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-[#8B95A1] hover:bg-[#F2F4F6]" aria-label="닫기"><X size={18} /></button>
        </div>

        <div className="mt-4 flex-1 space-y-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="rounded-2xl bg-[#F9FAFB] p-4">
              <p className="text-[13px] font-semibold text-[#333D4B]">이렇게 말해 보세요</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => send(suggestion)} className="rounded-full border border-[#E5E8EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#333D4B] hover:border-[#191F28]">
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[80%] rounded-2xl rounded-br-md bg-[#191F28] px-3.5 py-2.5 text-[14px] font-medium text-white">{message.text}</p>
              </div>
            ) : (
              <div key={message.id} className="max-w-full">
                {message.response.type === "action" && (
                  <ActionResponse
                    response={message.response}
                    approval={resolveApproval(approvals, message.response.approval)}
                    onDecide={decide}
                    onStartCancel={onStartCancel}
                    onToast={onToast}
                  />
                )}
                {message.response.type === "upcoming" && (
                  <UpcomingResponse response={message.response} approvals={approvals} onDecide={decide} onStartCancel={onStartCancel} />
                )}
                {(message.response.type === "unknown" || message.response.type === "clarify") && (
                  <div>
                    <p className="text-[14px] font-medium text-[#333D4B]">{message.response.message}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.response.type === "clarify"
                        ? message.response.options.map((option) => (
                          <button key={option.id} type="button" onClick={() => clarify(message.response, option)} className="rounded-full border border-[#E5E8EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#333D4B]">{option.name}</button>
                        ))
                        : message.response.suggestions.map((suggestion) => (
                          <button key={suggestion} type="button" onClick={() => send(suggestion)} className="rounded-full border border-[#E5E8EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#333D4B]">{suggestion}</button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#8B95A1]"><Loader2 size={14} className="animate-spin" /> 구독 정보를 확인하고 있어요</div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="sticky bottom-0 mt-4 flex items-center gap-2 bg-white pt-2"
          onSubmit={(event) => { event.preventDefault(); send(input); }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="예: 넷플릭스 해지하고 환불 받아줘"
            aria-label="꾸독에게 요청하기"
            className="min-h-[46px] flex-1 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3.5 text-[14px] text-[#191F28] outline-none focus:border-[#191F28]"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || loading} aria-label="보내기"><Send size={17} /></Button>
        </form>
      </div>
    </BottomSheet>
  );
}
