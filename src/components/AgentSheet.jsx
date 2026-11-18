import { useEffect, useRef, useState } from "react";
import { Loader2, SquarePen, X } from "lucide-react";
import { BottomSheet } from "./ui";
import { ActionCard } from "./agent/ActionCard";
import { ConsentSheet } from "./agent/ConsentCard";
import { Composer } from "./agent/Composer";
import { SuggestionList } from "./agent/SuggestionList";
import { buildAgentSuggestions } from "./agent/agentSuggestions";
import { AssistantText, ErrorRow, FollowUpChips, Note, ToolSummary, UserBubble } from "./agent/agentParts";
import {
  ActionResponse,
  AlertResponse,
  ServiceInfoResponse,
  SpendingResponse,
  TopCostResponse,
  UnusedResponse,
  UpcomingResponse,
} from "./agent/ResponseCards";

import {
  buildChatSnapshot,
  getAuthToken,
  grantChatConsent,
  readChatConsent,
  revokeChatConsent,
  streamChat,
  ChatError,
  normalizeActionHandlerResult,
  releaseActionLock,
} from "../lib/chatClient";
import { formatWon, normalizeWonText } from "../lib/dates";
import {
  clearChatHistory,
  getActiveOwnerPartition,
  loadChatHistory,
  readCancelHistory,
  readStoredValue,
  saveChatHistory,
  storageKeys,
  writeStoredValue,
} from "../lib/storage";
import {
  createMandate,
  decideApproval,
  mergeApproval,
  mergeMandates,
  resolveApproval,
  revokeMandate,
  runAgent,
} from "../lib/subscriptionAgent";
import { interpretWithAi } from "../lib/agentClient";
import { decideApprovalOnServer, fetchApprovals, mergeServerApprovals, recordApprovalRequest } from "../lib/approvalStore";
import { createMandateOnServer, fetchMandates, revokeMandateOnServer } from "../lib/mandateStore";
import { pullServerEvidence } from "../lib/evidenceStore";
import { confirmUserPresence } from "../lib/deviceAuth";

const DEVICE_AUTH_FAIL_TEXT = {
  not_enrolled: "휴대폰 잠금(지문·얼굴·PIN)을 먼저 설정해 주세요.",
  unavailable: "이 기기에서는 본인 확인을 쓸 수 없어요.",
  cancelled: "본인 확인을 취소했어요. 범위를 만들지 않았어요.",
};

const approvalsInMessages = (messages) => messages.flatMap((message) => {
  const response = message.response;
  if (!response) return [];
  if (response.type === "action" || response.type === "alert") return response.approval ? [response.approval] : [];
  if (response.type === "upcoming") return response.items.map((item) => item.approval);
  return [];
});

const toInsightContext = (insight) => {
  if (!insight) return null;
  return {
    insightId: insight.id,
    insightType: insight.kind,
    subscriptionId: insight.subscriptionId,
    insightText: insight.title + ": " + insight.message,
  };
};

// 스트림 오류는 답 끝에 "\n(메시지)" 로 붙는다. 화면에서는 본문과 오류 줄로 나눠 보여 준다.
const RATE_LIMIT_TEXT = "요청이 몰려 잠시 지연되고 있어요. 잠시 후 다시 시도해 주세요.";
const ERROR_TAIL = /\n\(([^()\n]+)\)$/;
const splitAssistantError = (text) => {
  const value = String(text || "");
  if (value === RATE_LIMIT_TEXT) return { body: "", error: value };
  const match = ERROR_TAIL.exec(value);
  return match ? { body: value.slice(0, match.index), error: match[1] } : { body: value, error: null };
};

const DONE_FOLLOW_UPS = ["다음 주에 나갈 돈 알려줘", "한 달 구독료 얼마 나가?"];


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
  const chatPartition = getActiveOwnerPartition();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [consentGranted, setConsentGranted] = useState(() => readChatConsent(chatPartition));
  const [showConsentPrompt, setShowConsentPrompt] = useState(false);
  const [pendingUserText, setPendingUserText] = useState("");
  const [pendingInsightContext, setPendingInsightContext] = useState(null);
  const [context, setContext] = useState({ lastSubscriptionId: null, lastIntent: null });
  const [activeInsight, setActiveInsight] = useState(initialInsight);
  const [historyLoadedForUserId, setHistoryLoadedForUserId] = useState(null);

  const [approvals, setApprovals] = useState(() => readStoredValue(storageKeys.agentApprovals, {}));
  const [mandates, setMandates] = useState(() => readStoredValue(storageKeys.agentMandates, {}));

  const endRef = useRef(null);
  const abortControllerRef = useRef(null);
  const approvalsRef = useRef(approvals);
  const mandatesRef = useRef(mandates);
  const recordedRef = useRef(new Set()); const executingActionIdsRef = useRef(new Set()); const prevUserIdRef = useRef(userId);

  // Sync consent state when userId changes
  useEffect(() => {
    setConsentGranted(readChatConsent(chatPartition));
  }, [chatPartition, userId]);


  // Load chat history if messages is empty on mount
  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      prevUserIdRef.current = userId;
      onMessagesChange(loadChatHistory(chatPartition));
    } else if (!messages || messages.length === 0) {
      const saved = loadChatHistory(chatPartition);
      if (saved.length > 0) onMessagesChange(saved);
    }
    setHistoryLoadedForUserId(userId);
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
        insightContext: toInsightContext(initialInsight),
        insightId: initialInsight.id,
        insightText: initialInsight.title + ": " + initialInsight.message,
      };
      return [insightMsg, ...curr];
    });
  }, [initialInsight, onMessagesChange]);

  // Persist messages whenever they change
  useEffect(() => {
    // 계정 변경 직후 이전 사용자의 messages를 새 userId로 저장하지 않는다.
    if (messages && messages.length > 0 && historyLoadedForUserId === userId) {
      saveChatHistory(messages, chatPartition);
    }
  }, [chatPartition, historyLoadedForUserId, messages, userId]);

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
    clearChatHistory(chatPartition);
    onMessagesChange([]);
    setContext({ lastSubscriptionId: null, lastIntent: null });
    setActiveInsight(null);
    onToast?.("대화를 모두 지웠어요.");
  };

  const handleRevokeConsent = () => {
    revokeChatConsent(chatPartition);
    setConsentGranted(false);
    onToast?.("AI 데이터 전송을 껐어요. 간단 모드로 전환됩니다.");
  };

  const handleAcceptConsent = () => {
    grantChatConsent(chatPartition);
    setConsentGranted(true);
    setShowConsentPrompt(false);
    if (pendingUserText) {
      const textToRun = pendingUserText;
      setPendingUserText("");
      const contextToRun = pendingInsightContext;
      setPendingInsightContext(null);
      executeSend(textToRun, true, contextToRun);
    }
  };


  const handleDeclineConsent = () => {
    setShowConsentPrompt(false);
    if (pendingUserText) {
      const textToRun = pendingUserText;
      setPendingUserText("");
      setPendingInsightContext(null);
      executeLocalAgent(textToRun, null, null, pendingInsightContext);
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
  const executeLocalAgent = async (text, assistantMsgId = null, baseHistory = null, insightContext = null) => {
    setLoading(true);
    const effectiveHistory = baseHistory || [...messages, { id: "u-" + Date.now(), role: "user", text }];
    if (!baseHistory) {
      onMessagesChange(effectiveHistory);
    }

    const effectiveUsageAnswers = usageAnswers || readStoredValue(storageKeys.usageAnswers, {});
    const localContext = insightContext?.subscriptionId
      ? { ...context, lastSubscriptionId: insightContext.subscriptionId }
      : context;
    const targetSub = insightContext?.subscriptionId
      ? subscriptions.find((s) => (s.subscriptionId || s.id) === insightContext.subscriptionId || s.id === insightContext.subscriptionId)
      : null;
    const localText = targetSub?.name && !text.includes(targetSub.name) ? targetSub.name + " " + text : text;
    let response = runAgent({ text: localText, subscriptions, context: localContext, usageAnswers: effectiveUsageAnswers });
    if (response.type === "unknown" || response.type === "clarify") {
      const isConsented = readChatConsent(chatPartition);
      if (isConsented) {
        const interpretation = await interpretWithAi(
          localText,
          subscriptions,
          userId,
          () => isConsented
        );
        if (interpretation) {
          response = runAgent({ text: localText, subscriptions, interpretation, context: localContext, usageAnswers: effectiveUsageAnswers });
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
  const send = async (raw, insightContext = null) => {
    const text = String(raw || "").trim();
    if (!text || loading || isStreaming) return;
    setInput("");

    const token = userId ? await getAuthToken() : null;
    const hasSession = Boolean(userId && token);

    if (hasSession && !consentGranted) {
      setPendingUserText(text);
      setPendingInsightContext(insightContext);
      setShowConsentPrompt(true);
      return;
    }

    if (hasSession && consentGranted) {
      executeSend(text, true, insightContext);
    } else {
      executeLocalAgent(text, null, null, insightContext);
    }
  };

  const executeSend = async (text, useStream = true, insightContext = null) => {
    const history = [...messages, { id: "u-" + Date.now(), role: "user", text }];
    onMessagesChange(history);

    if (!useStream) {
      executeLocalAgent(text, null, history, insightContext);
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

    let chatContext = insightContext || toInsightContext(activeInsight);
    if (chatContext) {
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

      if (accumulatedText.length > 0 || accumulatedActions.length > 0) { onMessagesChange((curr) => curr.map((m) => m.id === assistantMsgId ? { ...m, text: accumulatedText + "\n(연결이 끊겨 답변이 중단되었어요.)", isStreaming: false } : m)); return; } executeLocalAgent(text, assistantMsgId, history, chatContext);
    }
  };

  // Action card confirmation handler
  const handleConfirmAction = async (action) => {
    const { id, type, payload = {}, summary } = action;
    if (!id || executingActionIdsRef.current.has(id)) return;
    executingActionIdsRef.current.add(id);

    const isValidDate = (str) => typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str + "T00:00:00Z").getTime());
    const isValidDay = (d) => Number.isInteger(Number(d)) && Number(d) >= 1 && Number(d) <= 31;
    const showFailure = (message) => onToast?.(message);

    try {
      if (type === "add_subscription") {
        if (!payload.name || payload.name.trim() === "") {
          showFailure("구독 이름이 필요해요.");
          return;
        }
        const numericAmount = Number(payload.amount);
        if (Number.isNaN(numericAmount) || numericAmount < 0) {
          showFailure("유효한 금액이 필요해요.");
          return;
        }
        if (payload.billingDay !== undefined && !isValidDay(payload.billingDay)) {
          showFailure("결제일은 1~31일 사이여야 해요.");
          return;
        }
        if (payload.nextChargeDate !== undefined && !isValidDate(payload.nextChargeDate)) {
          showFailure("결제일 형식이 올바르지 않아요.");
          return;
        }
        if (typeof onAddSubscription !== "function") {
          showFailure("구독 추가 기능을 사용할 수 없어요.");
          return;
        }
        const outcome = normalizeActionHandlerResult(
          await onAddSubscription(payload),
          "구독을 추가하지 못했어요. 다시 시도해 주세요."
        );
        if (!outcome.ok) {
          showFailure(outcome.error);
          return;
        }
      } else if (type === "update_subscription") {
        const subId = payload.subscriptionId;
        const exists = subscriptions.some((s) => (s.subscriptionId || s.id) === subId || s.id === subId);
        if (!exists) {
          showFailure("해당 구독을 찾을 수 없어요.");
          return;
        }
        const changes = payload.changes || {};
        if (changes.amount !== undefined) {
          const num = Number(changes.amount);
          if (Number.isNaN(num) || num < 0) {
            showFailure("유효한 금액이 필요해요.");
            return;
          }
        }
        if (changes.billingDay !== undefined && !isValidDay(changes.billingDay)) {
          showFailure("결제일은 1~31일 사이여야 해요.");
          return;
        }
        if (changes.nextChargeDate !== undefined && changes.nextChargeDate !== null && !isValidDate(changes.nextChargeDate)) {
          showFailure("결제일 형식이 올바르지 않아요.");
          return;
        }
        if (typeof onUpdateSubscription !== "function") {
          showFailure("구독 수정 기능을 사용할 수 없어요.");
          return;
        }
        const target = subscriptions.find((s) => (s.subscriptionId || s.id) === subId || s.id === subId);
        const outcome = normalizeActionHandlerResult(
          await onUpdateSubscription(target?.subscriptionId || subId, changes),
          "구독 정보를 수정하지 못했어요. 다시 시도해 주세요."
        );
        if (!outcome.ok) {
          showFailure(outcome.error);
          return;
        }
      } else if (type === "set_alerts") {
        if (payload.subscriptionId !== "all") {
          const exists = subscriptions.some((s) => (s.subscriptionId || s.id) === payload.subscriptionId || s.id === payload.subscriptionId);
          if (!exists) {
            showFailure("해당 구독을 찾을 수 없어요.");
            return;
          }
        }
        if (typeof onSetAlerts !== "function") {
          showFailure("알림 설정 기능을 사용할 수 없어요.");
          return;
        }
        const outcome = normalizeActionHandlerResult(
          await onSetAlerts(payload.subscriptionId, { alertD3: payload.alertD3, alertD1: payload.alertD1 }),
          "알림 설정을 변경하지 못했어요. 다시 시도해 주세요."
        );
        if (!outcome.ok) {
          showFailure(outcome.error);
          return;
        }
      } else if (type === "open_cancel") {
        const target = subscriptions.find((s) => (s.subscriptionId || s.id) === payload.subscriptionId || s.id === payload.subscriptionId);
        if (!target) {
          showFailure("해당 구독을 찾을 수 없어요.");
          return;
        }
        if (typeof onStartCancel !== "function") {
          showFailure("해지 안내를 열 수 없어요. 다시 시도해 주세요.");
          return;
        }
        onStartCancel(target.subscriptionId || target.id);
      } else {
        showFailure("지원하지 않는 작업이에요.");
        return;
      }

      // Mark action done
      onMessagesChange((curr) => {
        const updated = curr.map((m) => {
          if (!m.actions) return m;
          const nextActions = m.actions.map((act) => act.id === id ? { ...act, status: "executed", done: true } : act);
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
      showFailure("작업 처리 중 오류가 발생했습니다.");
    } finally {
      // Every failure path must release the card so the user can retry it.
      releaseActionLock(executingActionIdsRef.current, id);
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

  // 아래는 표현 전용 상태다. 대화·실행 로직은 위 핸들러가 그대로 맡는다.
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const suggestions = messages.length === 0
    ? buildAgentSuggestions({ subscriptions, cancelHistory: readCancelHistory() })
    : null;
  const busy = loading || isStreaming;
  const lastMessageId = messages.length ? messages[messages.length - 1].id : null;
  const retryFor = (index) => {
    const previousUser = messages.slice(0, index).reverse().find((m) => m.role === "user");
    return previousUser ? () => send(previousUser.text) : null;
  };

  return (
    <BottomSheet onClose={onClose} label="꾸독에게 맡기기" layout="chat">
      {/* 고정 머리말 */}
      <div className="flex h-12 shrink-0 items-center pl-5 pr-2">
        <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold tracking-[-0.03em] text-ink">꾸독에게 맡기기</h2>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearChat}
            className="grid h-11 w-11 place-items-center rounded-xl text-ink-muted hover:bg-gray-100"
            aria-label="새 대화"
            title="새 대화"
          >
            <SquarePen size={21} strokeWidth={1.7} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 place-items-center rounded-xl text-ink-muted hover:bg-gray-100"
          aria-label="닫기"
        >
          <X size={22} strokeWidth={1.8} />
        </button>
      </div>

      {!online && (
        <p className="shrink-0 bg-gray-100 px-5 py-2.5 text-[13px] text-ink-muted" role="status" data-testid="agent-offline">
          인터넷에 연결되어 있지 않아요 · 간단 모드로 답해요
        </p>
      )}

      {/* 대화만 스크롤한다 */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-4 pt-1" aria-live="polite">
        {consentGranted && (
          <div className="mb-2 flex justify-center">
            <button
              type="button"
              onClick={handleRevokeConsent}
              className="min-h-[32px] rounded-lg px-2 text-[13px] text-ink-tertiary hover:text-ink-muted"
              title="AI 데이터 전송 끄기"
            >
              AI로 답하는 중 · AI 데이터 전송 끄기
            </button>
          </div>
        )}

        {suggestions && (
          <SuggestionList
            tasks={suggestions.tasks}
            prompts={suggestions.prompts}
            hasSubscriptions={suggestions.hasSubscriptions}
            onSelect={(prompt) => send(prompt)}
          />
        )}

        <div className="space-y-6">
          {messages.map((message, index) => {
            if (message.role === "user") {
              return <UserBubble key={message.id} text={message.text} />;
            }

            if (message.role === "assistant") {
              const { body, error } = splitAssistantError(message.text);
              const showDoneChips = String(message.id).startsWith("a-done-") && message.id === lastMessageId;
              return (
                <div key={message.id} className="max-w-full">
                  <ToolSummary tools={message.tools || []} working={Boolean(message.isStreaming && !message.text)} />
                  {message.isStreaming && !message.text && !(message.tools && message.tools.length) && (
                    <p className="flex items-center gap-2 text-[13px] text-ink-tertiary">
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" /> 답을 준비하고 있어요
                    </p>
                  )}
                  {body && <AssistantText streaming={Boolean(message.isStreaming)}>{normalizeWonText(body)}</AssistantText>}
                  {error && <ErrorRow message={error} bare={!body} onRetry={retryFor(index)} disabled={busy} />}

                  {message.quickReplies && message.quickReplies.length > 0 && (
                    <div className="mt-3">
                      <FollowUpChips
                        items={message.quickReplies}
                        disabled={busy}
                        onSelect={(reply) => send(reply, message.insightContext || null)}
                      />
                    </div>
                  )}

                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 space-y-3">
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

                  {showDoneChips && (
                    <div className="mt-3">
                      <FollowUpChips items={DONE_FOLLOW_UPS} disabled={busy} onSelect={(item) => send(item)} />
                    </div>
                  )}

                  {message.fallbackNote && <Note className="mt-1.5">간단 모드로 답했어요.</Note>}
                </div>
              );
            }

            // 로컬 규칙 엔진(role === "agent") 응답
            const response = message.response;
            return (
              <div key={message.id} className="max-w-full">
                {message.fallbackNote && <Note className="mb-1.5">간단 모드로 답했어요.</Note>}
                {response?.type === "action" && (
                  <ActionResponse
                    response={response}
                    approval={resolveApproval(approvals, response.approval)}
                    subscriptions={subscriptions}
                    onDecide={decide}
                    onStartCancel={onStartCancel}
                    onToast={onToast}
                  />
                )}
                {response?.type === "upcoming" && (
                  <UpcomingResponse
                    response={response}
                    approvals={approvals}
                    mandates={mandates}
                    subscriptions={subscriptions}
                    onDecide={decide}
                    onStartCancel={onStartCancel}
                    onCreateMandate={createMandateFor}
                    onRevokeMandate={revokeMandateFor}
                  />
                )}
                {response?.type === "spending" && <SpendingResponse response={response} />}
                {response?.type === "top_cost" && (
                  <TopCostResponse response={response} subscriptions={subscriptions} onStartCancel={onStartCancel} />
                )}
                {response?.type === "unused" && (
                  <UnusedResponse response={response} subscriptions={subscriptions} onStartCancel={onStartCancel} />
                )}
                {response?.type === "service_info" && (
                  <ServiceInfoResponse response={response} subscriptions={subscriptions} onStartCancel={onStartCancel} />
                )}
                {response?.type === "alert" && (
                  <AlertResponse
                    response={response}
                    approval={response.approval ? resolveApproval(approvals, response.approval) : null}
                    subscriptions={subscriptions}
                    onDecide={decide}
                    onStartCancel={onStartCancel}
                    onUpdateAmount={onUpdateAmount}
                    onToast={onToast}
                    userId={userId}
                  />
                )}
                {(response?.type === "unknown" || response?.type === "clarify") && (
                  <div>
                    <AssistantText>{normalizeWonText(response.message)}</AssistantText>
                    <div className="mt-3">
                      {response.type === "clarify" ? (
                        <FollowUpChips
                          items={response.options.map((option) => ({ label: option.name, option }))}
                          disabled={busy}
                          onSelect={(item) => clarify(response, item.option)}
                        />
                      ) : (
                        <FollowUpChips items={response.suggestions} disabled={busy} onSelect={(suggestion) => send(suggestion)} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <p className="flex items-center gap-2 text-[13px] text-ink-tertiary">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" /> 구독 정보를 확인하고 있어요
            </p>
          )}
        </div>
        <div ref={endRef} />
      </div>

      {/* 고정 입력창: 시트가 키보드만큼 줄어 항상 키보드 위에 붙는다 */}
      <Composer value={input} onChange={setInput} onSubmit={send} onStop={handleStop} streaming={isStreaming} busy={loading} />

      {showConsentPrompt && <ConsentSheet onAccept={handleAcceptConsent} onDecline={handleDeclineConsent} />}
    </BottomSheet>
  );
}

