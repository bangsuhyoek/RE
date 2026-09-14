import { compact, receiptServiceCatalog } from "./src/receipt-parser.js";

const ROUTES = [
  "splash-logo",
  "splash-character",
  "landing",
  "login",
  "register",
  "home",
  "subscriptions",
  "subscription-detail",
  "calendar",
  "benefits",
  "notifications",
  "my-page",
];

const NAV_ACTIVE = {
  home: "home",
  subscriptions: "subscriptions",
  "subscription-detail": "subscriptions",
  calendar: "home",
  benefits: "benefits",
  notifications: "home",
  "my-page": "my-page",
};

const NAV_ROUTES = {
  home: "home",
  subscriptions: "subscriptions",
  calendar: "calendar",
  benefits: "benefits",
  "my-page": "my-page",
};

const SCREEN_LABELS = {
  "splash-logo": "Splash Logo",
  "splash-character": "Splash Character",
  landing: "Landing",
  login: "로그인",
  register: "회원가입",
  home: "홈",
  subscriptions: "내 구독",
  "subscription-detail": "구독 상세",
  calendar: "캘린더",
  benefits: "혜택",
  notifications: "알림",
  "my-page": "마이페이지",
};

const PROTECTED_ROUTES = new Set([
  "home",
  "subscriptions",
  "subscription-detail",
  "calendar",
  "benefits",
  "notifications",
  "my-page",
]);

const LIVE_DATA_ROUTES = new Set(PROTECTED_ROUTES);

const app = document.querySelector("#app");
const runtimeConfig = window.REConfig || {};
const toast = document.querySelector("#app-toast");
const billingAlertSheet = document.querySelector("#billing-alert-sheet");
const billingAlertDialog = billingAlertSheet?.querySelector('[role="dialog"]');
const billingAlertForm = billingAlertSheet?.querySelector("[data-billing-alert-form]");
const subscriptionEditorSheet = document.querySelector("#subscription-editor-sheet");
const subscriptionForm = subscriptionEditorSheet?.querySelector("[data-subscription-form]");
const passwordResetSheet = document.querySelector("#password-reset-sheet");
const passwordResetForm = passwordResetSheet?.querySelector("[data-password-reset-form]");
const passwordUpdateSheet = document.querySelector("#password-update-sheet");
const passwordUpdateForm = passwordUpdateSheet?.querySelector("[data-password-update-form]");
const accountSheet = document.querySelector("#account-sheet");
const accountDeleteForm = accountSheet?.querySelector("[data-account-delete-form]");
const cancellationChecklistSheet = document.querySelector("#cancellation-checklist-sheet");
const notificationDetailSheet = document.querySelector("#notification-detail-sheet");
const customReminderSheet = document.querySelector("#custom-reminder-sheet");
const customReminderForm = customReminderSheet?.querySelector("[data-custom-reminder-form]");
const landingPages = document.querySelector("[data-landing-pages]");
const screenSelect = document.querySelector("#qa-screen");
const stateSelect = document.querySelector("#qa-state");
const bottomNavTemplate = document.querySelector("#bottom-nav-template");
const initialParams = new URLSearchParams(window.location.search);
const qaMode = false;
const integrationTimeoutMs = Number.isFinite(runtimeConfig.integrationTimeoutMs)
  ? Math.max(3000, runtimeConfig.integrationTimeoutMs)
  : 15000;
const authRequired = !qaMode && runtimeConfig.auth?.required === true;
const liveDataMode = !qaMode && runtimeConfig.dataMode === "live";
const onboardingStorageKey = "re.onboarding.seen";
let sessionState = authRequired ? "unknown" : "authenticated";
let legalConsentRequired = false;
const liveScreenLoads = new Map();

if (qaMode) document.documentElement.classList.add("qa-mode");
if (liveDataMode) document.documentElement.classList.add("live-data-mode");
if (runtimeConfig.uiMode === "release") {
  document.documentElement.classList.add("release-mode");
  document.querySelectorAll("[data-base-only] input, [data-base-only] button, [data-base-only] select").forEach((control) => {
    control.disabled = true;
  });
}
app.dataset.build = runtimeConfig.build || "unconfigured";
app.dataset.environment = runtimeConfig.environment || "unconfigured";
app.dataset.dataMode = runtimeConfig.dataMode || "unconfigured";

let toastTimer;
let billingAlertTrigger;
let billingAlertInertScreen;
let genericSheetTrigger;
let genericSheetInertScreen;
let activeGenericSheet;

function onboardingSeen() {
  try { return window.localStorage.getItem(onboardingStorageKey) === "true"; }
  catch (_error) { return false; }
}

function markOnboardingSeen() {
  try { window.localStorage.setItem(onboardingStorageKey, "true"); }
  catch (_error) {}
}

function waitFor(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function withIntegrationTimeout(operation, label = "연결 요청") {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      const error = new Error(`${label} 시간이 초과됐습니다.`);
      error.code = "INTEGRATION_TIMEOUT";
      reject(error);
    }, integrationTimeoutMs);

    Promise.resolve(operation).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function isSessionError(error) {
  return ["UNAUTHENTICATED", "SESSION_EXPIRED", "INVALID_SESSION"].includes(error?.code);
}

function hideToast() {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.hidden = true;
  toast.textContent = "";
}

function showToast(message, tone = "info") {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.hidden = false;
  toastTimer = window.setTimeout(hideToast, 2000);
}

function setSheetStatus(message, tone = "info") {
  const status = billingAlertForm?.querySelector(".sheet-status");
  if (!status) return;
  status.hidden = !message;
  status.dataset.tone = tone;
  status.textContent = message;
}

function syncCustomAlertField() {
  if (!billingAlertForm) return;
  const selected = billingAlertForm.elements.namedItem("reminder");
  const customField = billingAlertForm.querySelector(".custom-alert-days");
  const customInput = billingAlertForm.elements.namedItem("custom-days");
  const isCustom = selected instanceof RadioNodeList && selected.value === "custom";
  if (customField) customField.hidden = !isCustom;
  if (customInput instanceof HTMLInputElement) customInput.required = isCustom;
}

function openBillingAlertSheet(trigger) {
  if (!billingAlertSheet || !billingAlertForm) return;
  billingAlertTrigger = trigger;
  billingAlertInertScreen = document.querySelector(".app-screen:not([hidden])");
  billingAlertInertScreen?.setAttribute("inert", "");
  trigger.setAttribute("aria-expanded", "true");
  const service = billingAlertForm.elements.namedItem("service");
  if (service instanceof HTMLInputElement) service.value = trigger.dataset.service || "";
  setSheetStatus("");
  syncCustomAlertField();
  billingAlertSheet.hidden = false;
  requestAnimationFrame(() => billingAlertForm.querySelector('input[name="reminder"]:checked')?.focus());
}

function closeBillingAlertSheet(restoreFocus = true) {
  if (!billingAlertSheet || billingAlertSheet.hidden) return;
  billingAlertSheet.hidden = true;
  billingAlertInertScreen?.removeAttribute("inert");
  billingAlertTrigger?.removeAttribute("aria-expanded");
  if (restoreFocus) billingAlertTrigger?.focus();
  billingAlertTrigger = undefined;
  billingAlertInertScreen = undefined;
}

function setLocalSheetStatus(form, message, tone = "info") {
  const status = form?.querySelector(".sheet-status");
  if (!status) return;
  status.hidden = !message;
  status.dataset.tone = tone;
  status.textContent = message;
}

function closeGenericSheet(restoreFocus = true) {
  if (!activeGenericSheet) return;
  activeGenericSheet.hidden = true;
  genericSheetInertScreen?.removeAttribute("inert");
  genericSheetTrigger?.removeAttribute("aria-expanded");
  if (restoreFocus) genericSheetTrigger?.focus();
  activeGenericSheet = undefined;
  genericSheetTrigger = undefined;
  genericSheetInertScreen = undefined;
}

function openGenericSheet(sheet, trigger, focusSelector = "input, button") {
  if (!sheet) return;
  if (billingAlertSheet && !billingAlertSheet.hidden) closeBillingAlertSheet(false);
  if (activeGenericSheet) closeGenericSheet(false);
  activeGenericSheet = sheet;
  genericSheetTrigger = trigger;
  genericSheetInertScreen = document.querySelector(".app-screen:not([hidden])");
  genericSheetInertScreen?.setAttribute("inert", "");
  trigger?.setAttribute("aria-expanded", "true");
  sheet.querySelectorAll(".sheet-status").forEach((status) => {
    status.hidden = true;
    status.textContent = "";
  });
  sheet.hidden = false;
  requestAnimationFrame(() => sheet.querySelector(focusSelector)?.focus());
}

function nextReminderDateTimeValue() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function syncEqualShare(force = false) {
  if (!subscriptionForm) return;
  const planType = subscriptionForm.elements.namedItem("plan-type");
  const amount = subscriptionForm.elements.namedItem("amount");
  const members = subscriptionForm.elements.namedItem("member-count");
  const myShare = subscriptionForm.elements.namedItem("my-share");
  const isShared = planType instanceof HTMLSelectElement && planType.value === "shared";
  if (!isShared || !(amount instanceof HTMLInputElement) || !(members instanceof HTMLInputElement) || !(myShare instanceof HTMLInputElement)) return;
  const shouldAuto = force || myShare.dataset.autoShare === "true" || myShare.value === "";
  const gross = Number(amount.value);
  const count = Math.max(2, Number(members.value) || 2);
  if (shouldAuto && Number.isFinite(gross) && gross >= 0) {
    myShare.value = String(Math.round(gross / count));
    myShare.dataset.autoShare = "true";
  }
}

function syncSharedPlanFields() {
  if (!subscriptionForm) return;
  const sharedFields = subscriptionForm.querySelector(".shared-plan-fields");
  const planType = subscriptionForm.elements.namedItem("plan-type");
  const isShared = planType instanceof HTMLSelectElement && planType.value === "shared";
  if (sharedFields) sharedFields.hidden = !isShared;
  ["member-count", "my-share"].forEach((name) => {
    const input = subscriptionForm.elements.namedItem(name);
    if (input instanceof HTMLInputElement) input.required = isShared;
  });
  const myShare = subscriptionForm.elements.namedItem("my-share");
  const grossAmount = subscriptionForm.elements.namedItem("amount");
  if (myShare instanceof HTMLInputElement) {
    const invalidShare = isShared && Number(myShare.value) > Number(grossAmount?.value || 0);
    myShare.setCustomValidity(invalidShare ? "내 부담 금액은 전체 결제 금액보다 클 수 없어요." : "");
  }
}

function matchKnownService(value) {
  const target = compact(value);
  if (!target) return null;
  return receiptServiceCatalog.find((service) => [service.name, ...(service.aliases || [])].some((alias) => compact(alias) === target)) || null;
}

function syncKnownService(value) {
  if (!subscriptionForm) return null;
  const match = matchKnownService(value);
  const serviceId = subscriptionForm.elements.namedItem("service-id");
  const category = subscriptionForm.elements.namedItem("category");
  if (serviceId instanceof HTMLInputElement) serviceId.value = match?.id || "";
  if (category instanceof HTMLInputElement) category.value = match?.category || "기타";
  return match;
}

function syncPromotionFields() {
  if (!subscriptionForm) return true;
  const endDate = subscriptionForm.elements.namedItem("promotion-ends-on");
  const nextPrice = subscriptionForm.elements.namedItem("price-after-promotion");
  const currentPrice = subscriptionForm.elements.namedItem("amount");
  if (!(endDate instanceof HTMLInputElement) || !(nextPrice instanceof HTMLInputElement)) return true;

  endDate.setCustomValidity("");
  nextPrice.setCustomValidity("");
  const hasEndDate = Boolean(endDate.value);
  const hasNextPrice = Boolean(nextPrice.value);
  if (hasEndDate !== hasNextPrice) {
    const message = "프로모션 종료일과 종료 후 결제 금액을 함께 입력해 주세요.";
    (hasEndDate ? nextPrice : endDate).setCustomValidity(message);
    return false;
  }
  if (!hasEndDate) return true;

  const today = new Date();
  const todayIso = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  if (endDate.value < todayIso) {
    endDate.setCustomValidity("오늘 이후의 프로모션 종료일을 선택해 주세요.");
    return false;
  }
  if (Number(nextPrice.value) <= Number(currentPrice?.value || 0)) {
    nextPrice.setCustomValidity("종료 후 결제 금액은 현재 결제 금액보다 커야 해요.");
    return false;
  }
  return true;
}

function subscriptionCoreFields() {
  if (!subscriptionForm) return {};
  return {
    service: subscriptionForm.elements.namedItem("service-name"),
    amount: subscriptionForm.elements.namedItem("amount"),
    billingDate: subscriptionForm.elements.namedItem("billing-date"),
    billingCycle: subscriptionForm.elements.namedItem("billing-cycle"),
    paymentMethod: subscriptionForm.elements.namedItem("payment-method"),
  };
}

function formatSubscriptionWon(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toLocaleString("ko-KR")}원` : "금액 확인 필요";
}

function subscriptionServiceMark(name) {
  const service = matchKnownService(name || "");
  const marks = {
    netflix: "N",
    youtube: "▶",
    spotify: "≋",
    disney: "D+",
    chatgpt: "AI",
    tving: "T",
    coupang: "C",
    naver: "N+",
  };
  if (service?.id && marks[service.id]) return marks[service.id];
  const compactName = String(name || "").trim();
  return compactName ? compactName.slice(0, 2).toUpperCase() : "R";
}

function subscriptionScheduleSummary() {
  const { billingDate, billingCycle } = subscriptionCoreFields();
  if (!(billingDate instanceof HTMLInputElement) || !billingDate.value) return "결제 일정 확인 필요";
  const parts = billingDate.value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return "결제 일정 확인 필요";
  const [, month, day] = parts;
  return billingCycle instanceof HTMLSelectElement && billingCycle.value === "annual"
    ? `매년 ${month}월 ${day}일 결제 예정`
    : `매월 ${day}일 결제 예정`;
}

function subscriptionCoreIsValid() {
  const { service, amount, billingDate } = subscriptionCoreFields();
  const hasService = service instanceof HTMLInputElement && Boolean(service.value.trim());
  const hasAmount = amount instanceof HTMLInputElement && amount.value !== "" && Number.isFinite(Number(amount.value)) && Number(amount.value) >= 0;
  const hasDate = billingDate instanceof HTMLInputElement && Boolean(billingDate.value);
  return hasService && hasAmount && hasDate;
}

function syncSubscriptionReview() {
  if (!subscriptionForm || !subscriptionEditorSheet) return;
  const { service, amount, paymentMethod } = subscriptionCoreFields();
  const serviceName = service instanceof HTMLInputElement ? service.value.trim() : "";
  const amountValue = amount instanceof HTMLInputElement ? amount.value : "";
  const paymentValue = paymentMethod instanceof HTMLInputElement ? paymentMethod.value.trim() : "";
  const mark = subscriptionServiceMark(serviceName);

  const reviewService = subscriptionForm.querySelector("[data-review-service]");
  const reviewAmount = subscriptionForm.querySelector("[data-review-amount]");
  const reviewSchedule = subscriptionForm.querySelector("[data-review-schedule]");
  const reviewPayment = subscriptionForm.querySelector("[data-review-payment]");
  const reviewBadge = subscriptionForm.querySelector("[data-review-payment-badge]");
  const reviewMark = subscriptionForm.querySelector("[data-review-mark]");
  const editMark = subscriptionForm.querySelector("[data-edit-service-mark]");
  if (reviewService) reviewService.textContent = serviceName || "서비스 확인 필요";
  if (reviewAmount) reviewAmount.textContent = amountValue !== "" ? formatSubscriptionWon(amountValue) : "금액 확인 필요";
  if (reviewSchedule) reviewSchedule.textContent = subscriptionScheduleSummary();
  if (reviewPayment) reviewPayment.textContent = paymentValue || "기록하지 않음";
  if (reviewBadge) reviewBadge.hidden = !paymentValue;
  if (reviewMark) reviewMark.textContent = mark;
  if (editMark) editMark.textContent = mark;

  const submit = subscriptionForm.querySelector("[data-subscription-submit]");
  const validityHint = subscriptionForm.querySelector("[data-subscription-validity-hint]");
  const activeView = subscriptionEditorSheet.dataset.addView || "entry";
  const viewCanSave = ["manual", "review", "edit", "edit-existing"].includes(activeView);
  const valid = subscriptionCoreIsValid();
  if (submit instanceof HTMLButtonElement) submit.disabled = viewCanSave && !valid;
  if (validityHint) validityHint.hidden = !viewCanSave || valid;
}

function setSubscriptionReviewStatus(needsReview = false) {
  const status = subscriptionForm?.querySelector("[data-review-status]");
  if (!status) return;
  status.classList.toggle("is-warning", needsReview);
  const icon = status.querySelector("span");
  const label = status.querySelector("strong");
  if (icon) icon.textContent = needsReview ? "!" : "✓";
  if (label) label.textContent = needsReview ? "일부 정보만 확인해 주세요" : "결제 정보를 찾았어요";
}

function setSubscriptionAddView(view, { needsReview = false } = {}) {
  if (!subscriptionForm || !subscriptionEditorSheet) return;
  subscriptionEditorSheet.dataset.addView = view;
  const isExisting = subscriptionEditorSheet.dataset.editingExisting === "true";
  const entry = subscriptionForm.querySelector("[data-subscription-entry-panel]");
  const candidate = subscriptionForm.querySelector("[data-subscription-candidate-panel]");
  const review = subscriptionForm.querySelector("[data-subscription-review-panel]");
  const edit = subscriptionForm.querySelector("[data-subscription-edit-fields]");
  const sharing = subscriptionForm.querySelector("[data-subscription-sharing]");
  const advanced = subscriptionForm.querySelector("[data-subscription-advanced]");
  const submitBar = subscriptionForm.querySelector("[data-subscription-submit-bar]");
  const editFinish = subscriptionForm.querySelector("[data-subscription-edit-finish]");
  const title = subscriptionEditorSheet.querySelector("#subscription-editor-title");
  const subtitle = subscriptionEditorSheet.querySelector("[data-subscription-editor-subtitle]");
  const submit = subscriptionForm.querySelector("[data-subscription-submit]");

  if (entry) entry.hidden = view !== "entry";
  if (candidate) candidate.hidden = view !== "candidate";
  if (review) review.hidden = view !== "review";
  if (edit) edit.hidden = !["manual", "edit", "edit-existing"].includes(view);
  const detailsVisible = ["manual", "review", "edit", "edit-existing"].includes(view);
  if (sharing) sharing.hidden = !detailsVisible;
  if (advanced) advanced.hidden = !detailsVisible;
  if (submitBar) submitBar.hidden = !detailsVisible;
  if (editFinish) editFinish.hidden = view !== "edit";

  if (view === "review") {
    setSubscriptionReviewStatus(needsReview || !subscriptionCoreIsValid());
    if (title) title.textContent = "구독 정보 확인";
    if (subtitle) subtitle.textContent = "찾은 내용을 확인하고 필요한 부분만 수정해 주세요.";
  } else if (view === "candidate") {
    if (title) title.textContent = "최근 결제에서 찾기";
    if (subtitle) subtitle.textContent = "구독으로 보이는 결제를 하나씩 확인할 수 있어요.";
  } else if (isExisting || view === "edit-existing") {
    if (title) title.textContent = "구독 수정";
    if (subtitle) subtitle.textContent = "바뀐 내용만 고쳐서 저장해 주세요.";
  } else {
    if (title) title.textContent = "구독 추가하기";
    if (subtitle) subtitle.textContent = view === "entry" ? "결제 내역을 불러오거나 직접 입력할 수 있어요." : "필요한 정보만 차근차근 입력해 주세요.";
  }
  if (submit) submit.textContent = isExisting ? "구독 정보 저장" : "내 구독에 추가";
  syncSubscriptionReview();
}

function openSubscriptionEditor(trigger, subscription = null) {
  if (!subscriptionForm || !subscriptionEditorSheet) return;
  subscriptionForm.reset();
  subscriptionEditorSheet.dataset.editingExisting = String(Boolean(subscription?.id));
  const values = {
    "subscription-id": subscription?.id || "",
    "service-id": subscription?.serviceId || "",
    category: subscription?.category || "기타",
    "source-type": subscription?.sourceType || "manual",
    "candidate-id": subscription?.candidateId || "",
    "existing-subscription-id": subscription?.existingSubscriptionId || "",
    "detected-at": subscription?.detectedAt || "",
    "service-name": subscription?.serviceName || "",
    "plan-name": subscription?.planName || "",
    amount: subscription?.grossAmount ?? subscription?.amount ?? "",
    "billing-date": subscription?.billingDate || "",
    "billing-cycle": subscription?.billingCycleValue || subscription?.billingCycle || "monthly",
    "payment-method": subscription?.paymentMethod || "",
    "plan-type": subscription?.planType || "personal",
    status: subscription?.status || "active",
    "reminder-days": subscription?.reminderDays?.[0] || 3,
    "promotion-ends-on": subscription?.promotionEndsOn || "",
    "price-after-promotion": subscription?.priceAfterPromotion ?? "",
    "member-count": subscription?.memberCount || 2,
    "my-share": subscription?.myShare ?? "",
    memo: subscription?.memo || "",
  };
  Object.entries(values).forEach(([name, value]) => {
    const field = subscriptionForm.elements.namedItem(name);
    if (field && "value" in field) field.value = String(value);
  });

  const sharingToggle = subscriptionForm.querySelector("[data-sharing-enabled]");
  if (sharingToggle instanceof HTMLInputElement) sharingToggle.checked = values["plan-type"] === "shared";
  const picker = subscriptionForm.querySelector("[data-service-picker]");
  if (picker) picker.hidden = true;
  const deleteZone = subscriptionForm.querySelector("[data-subscription-delete-zone]");
  if (deleteZone) deleteZone.hidden = !subscription?.id;
  const deleteConfirmation = subscriptionForm.elements.namedItem("subscription-delete-confirmed");
  if (deleteConfirmation instanceof HTMLInputElement) deleteConfirmation.checked = false;
  const decision = subscriptionForm.querySelector(".payment-decision");
  const amountChanged = Boolean(subscription?.existingSubscriptionId && Number(subscription?.existingAmount) !== Number(subscription?.amount));
  if (decision) decision.hidden = !amountChanged;
  decision?.querySelectorAll('input[name="payment-decision"]').forEach((input) => {
    input.required = amountChanged;
    input.checked = false;
  });
  syncSharedPlanFields();
  syncPromotionFields();
  const promotionFields = subscriptionForm.querySelector("[data-promotion-fields]");
  if (promotionFields instanceof HTMLDetailsElement) promotionFields.open = Boolean(subscription?.promotionEndsOn || subscription?.priceAfterPromotion);
  const advanced = subscriptionForm.querySelector("[data-subscription-advanced]");
  if (advanced instanceof HTMLDetailsElement) advanced.open = Boolean(subscription?.id && (subscription?.memo || subscription?.planName || subscription?.promotionEndsOn));

  const isDetected = Boolean(!subscription?.id && subscription && ["notification", "image"].includes(subscription?.sourceType));
  if (subscription?.id) setSubscriptionAddView("edit-existing");
  else if (isDetected) setSubscriptionAddView("review", { needsReview: Boolean(subscription?.needsReview) });
  else setSubscriptionAddView("entry");

  const focusSelector = subscription?.id ? '[name="service-name"]' : isDetected ? "[data-subscription-review-edit]" : "[data-receipt-upload-trigger]";
  openGenericSheet(subscriptionEditorSheet, trigger, focusSelector);
}

async function renderPaymentCandidates(preferredId = "") {
  const list = subscriptionForm?.querySelector("[data-candidate-list]");
  if (!list) return;
  list.replaceChildren();
  const handler = window.REIntegrations?.actions?.["check-payment-capture"];
  if (typeof handler !== "function") {
    list.append(Object.assign(document.createElement("p"), { textContent: "이 기기에서는 최근 결제를 확인할 수 없어요." }));
    return;
  }
  try {
    const result = await withIntegrationTimeout(handler({}), "최근 결제 확인");
    const candidates = Array.isArray(result?.candidates) ? result.candidates : [];
    if (!candidates.length) {
      list.append(Object.assign(document.createElement("p"), { textContent: result?.enabled ? "확인이 필요한 최근 결제가 없어요." : "먼저 결제 알림 접근을 켜 주세요." }));
      return;
    }
    candidates.sort((a, b) => Number(b.detectedAt) - Number(a.detectedAt)).forEach((candidate) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.selectCandidate = candidate.id;
      button.dataset.candidate = JSON.stringify(candidate);
      if (candidate.id === preferredId) button.classList.add("selected");
      const title = document.createElement("strong");
      title.textContent = candidate.serviceName || "확인이 필요한 구독";
      const detail = document.createElement("span");
      detail.textContent = `${Number(candidate.amount || 0).toLocaleString("ko-KR")}원 · 저장 전 확인`;
      button.append(title, detail);
      list.append(button);
    });
  } catch (_error) {
    list.append(Object.assign(document.createElement("p"), { textContent: "최근 결제를 불러오지 못했어요. 잠시 후 다시 확인해 주세요." }));
  }
}

function setAddMethod(method, refresh = true) {
  if (!subscriptionForm) return;
  const source = subscriptionForm.elements.namedItem("source-type");
  if (source instanceof HTMLInputElement) source.value = method === "image" ? "image" : method === "notification" ? "notification" : "manual";
  if (method === "notification") {
    setSubscriptionAddView("candidate");
    if (refresh) void renderPaymentCandidates();
  } else if (method === "manual") {
    setSubscriptionAddView("manual");
  } else {
    setSubscriptionAddView("entry");
    if (refresh) subscriptionForm.querySelector("[data-receipt-upload-trigger]")?.click();
  }
}

function dateFromDueDay(dueDay) {
  const now = new Date();
  const day = Math.max(1, Math.min(31, Number(dueDay) || now.getDate()));
  let date = new Date(now.getFullYear(), now.getMonth(), Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
  if (date < now) date = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(day, new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()));
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

async function openDetectedCandidate(candidate, trigger = null) {
  const detail = {
    ...candidate,
    id: "",
    candidateId: candidate.id || candidate.candidateId || "",
    sourceType: "notification",
    billingDate: dateFromDueDay(new Date(Number(candidate.detectedAt) || Date.now()).getDate()),
  };
  openSubscriptionEditor(trigger, detail);
  await renderPaymentCandidates(detail.candidateId);
}

async function recognizeSelectedReceipt(trigger = null) {
  if (!subscriptionForm) return;
  const fileInput = subscriptionForm.querySelector("[data-receipt-file]");
  const file = fileInput?.files?.[0];
  if (!file) {
    setLocalSheetStatus(subscriptionForm, "먼저 이미지를 선택해 주세요.", "warning");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    setLocalSheetStatus(subscriptionForm, "이미지는 8MB 이하 파일을 선택해 주세요.", "warning");
    if (fileInput instanceof HTMLInputElement) fileInput.value = "";
    return;
  }
  const handler = window.REIntegrations?.actions?.["recognize-receipt"];
  if (typeof handler !== "function") {
    setLocalSheetStatus(subscriptionForm, "이 기기에서는 이미지 인식을 사용할 수 없어요. 직접 입력해 주세요.", "warning");
    return;
  }
  const busyTargets = [trigger, subscriptionForm.querySelector("[data-receipt-upload-trigger]")].filter((target) => target instanceof HTMLButtonElement);
  busyTargets.forEach((button) => { button.disabled = true; button.setAttribute("aria-busy", "true"); });
  setLocalSheetStatus(subscriptionForm, "이미지에서 결제 정보를 살펴보고 있어요.");
  try {
    const result = await withIntegrationTimeout(handler({ file }), "이미지 인식");
    const parsed = result?.data || {};
    const values = {
      "service-id": parsed.serviceId,
      category: parsed.category,
      "service-name": parsed.name,
      "plan-name": parsed.plan,
      amount: parsed.amount,
      "billing-date": parsed.dueDay ? dateFromDueDay(parsed.dueDay) : "",
      "billing-cycle": parsed.billingCycle === "매년" ? "annual" : "monthly",
      "payment-method": parsed.paymentMethod,
      "source-type": "image",
    };
    Object.entries(values).forEach(([name, value]) => {
      const field = subscriptionForm.elements.namedItem(name);
      if (field && "value" in field && value !== undefined && value !== null) field.value = String(value);
    });
    syncKnownService(subscriptionForm.elements.namedItem("service-name")?.value || "");
    syncSharedPlanFields();
    syncPromotionFields();
    setSubscriptionAddView("review", { needsReview: Boolean(result?.needsReview) });
    const warning = result?.needsReview && Array.isArray(result?.warnings) && result.warnings.length
      ? ` ${result.warnings.join(" ")}`
      : "";
    setLocalSheetStatus(subscriptionForm, result?.needsReview ? `읽은 내용 중 확인할 부분이 있어요.${warning}` : "결제 정보를 불러왔어요. 저장 전에 한 번 확인해 주세요.", result?.needsReview ? "warning" : "success");
  } catch (error) {
    setLocalSheetStatus(subscriptionForm, error?.message || "이미지에서 정보를 읽지 못했어요.", "error");
  } finally {
    busyTargets.forEach((button) => { button.disabled = false; button.removeAttribute("aria-busy"); });
  }
}

document.addEventListener("pointerdown", (event) => {
  if (toast && !toast.hidden && !toast.contains(event.target)) hideToast();
}, true);

function getLegalDocument(documentName) {
  const current = runtimeConfig.legal?.[documentName];
  const legacyUrl = runtimeConfig.legal?.[`${documentName}Url`];
  return {
    url: typeof current?.url === "string" ? current.url : legacyUrl || "",
    version: typeof current?.version === "string" ? current.version : "",
    effectiveDate: typeof current?.effectiveDate === "string" ? current.effectiveDate : "",
  };
}

function resolveLegalUrl(documentName) {
  const value = getLegalDocument(documentName).url;
  if (!value) return null;
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "https:" || url.origin === window.location.origin ? url : null;
  } catch (_error) {
    return null;
  }
}

function getCompleteLegalDocument(documentName) {
  const documentConfig = getLegalDocument(documentName);
  const url = resolveLegalUrl(documentName);
  if (!url || !documentConfig.version.trim() || !documentConfig.effectiveDate.trim()) return null;
  return { ...documentConfig, url: url.href };
}

function openLegalDocument(documentName) {
  const url = resolveLegalUrl(documentName);
  if (!url) {
    showToast("법률 문서 주소가 아직 연결되지 않았어요.", "warning");
    return false;
  }
  if (url.origin === window.location.origin) window.location.assign(url.href);
  else window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

async function runIntegratedAction(control) {
  const action = control.dataset.action;
  const handler = window.REIntegrations?.actions?.[action];
  if (typeof handler !== "function") {
    showToast("이 기능을 지금은 이용할 수 없어요. 잠시 후 다시 확인해 주세요.");
    return;
  }

  if (control instanceof HTMLButtonElement) control.disabled = true;
  else control.setAttribute("aria-disabled", "true");
  control.setAttribute("aria-busy", "true");
  try {
    const result = await withIntegrationTimeout(handler({
      action,
      service: control.dataset.service || null,
      screen: app.dataset.screen,
    }), action);

    if (action === "logout") {
      if (result?.loggedOut !== true) {
        showToast("로그아웃을 마치지 못했어요. 다시 시도해 주세요.", "warning");
        return;
      }
      sessionState = "unauthenticated";
      legalConsentRequired = false;
      showToast(result?.message || "로그아웃했어요.", "success");
      setScreen("landing");
      return;
    }

    if (result?.ok !== true) {
      showToast(result?.message || "요청을 마치지 못했어요. 다시 시도해 주세요.", "warning");
      return;
    }
    if (result?.silent !== true) showToast(result?.message || "요청을 처리했어요.", "success");
    if (action === "open-subscription") {
      document.querySelector('.app-screen[data-screen="subscription-detail"]')?.removeAttribute("data-live-status");
    }
    if (result.route && ROUTES.includes(result.route)) {
      setScreen(result.route);
      if (result.reload === true && liveDataMode) void ensureLiveScreenData(result.route, true);
    }
  } catch (error) {
    if (isSessionError(error)) {
      sessionState = "unauthenticated";
      setScreen("login");
      showToast("로그인이 만료됐어요. 다시 로그인해주세요.", "warning");
      return;
    }
    showToast("요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.", "error");
  } finally {
    if (control instanceof HTMLButtonElement) control.disabled = false;
    else control.removeAttribute("aria-disabled");
    control.removeAttribute("aria-busy");
  }
}

const conciergeHandoffTimers = new Set();

const conciergeThinkFrames = Object.freeze([
  { src: "./assets/concierge/think/think_01.png", duration: 100 },
  { src: "./assets/concierge/think/think_02.png", duration: 90 },
  { src: "./assets/concierge/think/think_03.png", duration: 90 },
  { src: "./assets/concierge/think/think_04.png", duration: 100 },
  { src: "./assets/concierge/think/think_05.png", duration: 110 },
  { src: "./assets/concierge/think/think_06.png", duration: 120 },
  { src: "./assets/concierge/think/think_07.png", duration: 180 },
  { src: "./assets/concierge/think/think_08.png", duration: 420 },
]);

const conciergeThinkAppFrames = Object.freeze([
  { src: "./assets/concierge/think/think_app_01.png", duration: 120 },
  { src: "./assets/concierge/think/think_app_02.png", duration: 130 },
  { src: "./assets/concierge/think/think_app_03.png", duration: 130 },
  { src: "./assets/concierge/think/think_app_04.png", duration: 150 },
  { src: "./assets/concierge/think/think_app_05.png", duration: 300 },
]);

function clearConciergeHandoffTimers() {
  conciergeHandoffTimers.forEach((timer) => window.clearTimeout(timer));
  conciergeHandoffTimers.clear();
}

function conciergeHandoffAsset(name, fallback) {
  return window.REAssetUrls?.[name] || fallback;
}

function preloadConciergeFrames(frames) {
  frames.forEach(({ src }) => {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
  });
}

function queueConciergeFrameSequence(image, frames, startDelay = 0) {
  let elapsed = startDelay;
  frames.forEach(({ src, duration }, index) => {
    const timer = window.setTimeout(() => {
      conciergeHandoffTimers.delete(timer);
      image.src = src;
      image.dataset.motionFrame = String(index + 1);
    }, elapsed);
    conciergeHandoffTimers.add(timer);
    elapsed += duration;
  });
  return elapsed;
}

function showPaymentConciergeHandoff(candidate = {}) {
  clearConciergeHandoffTimers();
  document.querySelector(".re-concierge-handoff")?.remove();

  const amount = Number(candidate.amount);
  const existingAmount = candidate.existingAmount == null ? null : Number(candidate.existingAmount);
  const hasExisting = Boolean(candidate.existingSubscriptionId) && Number.isFinite(existingAmount);
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const mismatch = hasExisting && hasAmount && existingAmount !== amount;
  const serviceName = String(candidate.serviceName || "구독 서비스").trim() || "구독 서비스";
  const formatWon = (value) => `${Number(value || 0).toLocaleString("ko-KR")}원`;

  let state = "notice";
  let title = "새로운 구독 결제를 찾았어요";
  let body = hasAmount ? `${serviceName} · ${formatWon(amount)} 결제 내용을 함께 확인해볼까요?` : `${serviceName} 결제 내용을 함께 확인해볼까요?`;
  let continuationAsset = conciergeHandoffAsset("paymentFound", "./assets/raster/character-state-payment-found.webp");

  if (mismatch) {
    state = "think";
    title = "결제 금액이 달라졌어요";
    body = `${serviceName} · ${formatWon(existingAmount)} → ${formatWon(amount)}. 변경 내용을 함께 확인해볼까요?`;
    continuationAsset = conciergeThinkFrames[0].src;
  } else if (hasExisting) {
    state = "check";
    title = "결제 내역을 확인했어요";
    body = hasAmount ? `${serviceName} · ${formatWon(amount)} 저장 전에 한 번 확인해 주세요.` : `${serviceName} 결제 내역을 저장 전에 한 번 확인해 주세요.`;
    continuationAsset = conciergeHandoffAsset("happy", "./assets/characters/character-state-happy.webp");
  }

  const keyPoseAsset = conciergeHandoffAsset("paymentFound", "./assets/raster/character-state-payment-found.webp");
  const overlay = document.createElement("aside");
  overlay.className = "re-concierge-handoff";
  overlay.dataset.conciergeState = state;
  overlay.dataset.handoffSource = "android-heads-up";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.innerHTML = `
    <div class="re-concierge-handoff__character" aria-hidden="true">
      <img class="re-concierge-handoff__pose re-concierge-handoff__pose--key" alt="" />
      <img class="re-concierge-handoff__pose re-concierge-handoff__pose--continue" alt="" />
    </div>
    <div class="re-concierge-handoff__copy">
      <strong></strong>
      <span></span>
    </div>`;

  const keyPose = overlay.querySelector(".re-concierge-handoff__pose--key");
  const continuationPose = overlay.querySelector(".re-concierge-handoff__pose--continue");
  const titleNode = overlay.querySelector("strong");
  const bodyNode = overlay.querySelector("span");
  keyPose.src = keyPoseAsset;
  continuationPose.src = continuationAsset;
  titleNode.textContent = title;
  bodyNode.textContent = body;
  if (continuationAsset === keyPoseAsset) overlay.classList.add("re-concierge-handoff--same-pose");

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  if (state === "think") preloadConciergeFrames([...conciergeThinkFrames, ...conciergeThinkAppFrames]);

  document.body.append(overlay);
  app.dataset.conciergeHandoff = state;

  const continueTimer = window.setTimeout(() => {
    conciergeHandoffTimers.delete(continueTimer);
    overlay.classList.add("is-continuing");
    if (state === "think") {
      if (reducedMotion) {
        continuationPose.src = conciergeThinkFrames.at(-1).src;
        continuationPose.dataset.motionFrame = "reduced-final";
      } else {
        const thinkEnd = queueConciergeFrameSequence(continuationPose, conciergeThinkFrames.slice(1), 40);
        queueConciergeFrameSequence(continuationPose, conciergeThinkAppFrames.slice(1), thinkEnd + 40);
      }
    }
  }, 140);
  conciergeHandoffTimers.add(continueTimer);

  const settleDelay = state === "think" && !reducedMotion ? 1900 : 960;
  const settleTimer = window.setTimeout(() => {
    conciergeHandoffTimers.delete(settleTimer);
    overlay.classList.add("is-settled");
  }, settleDelay);
  conciergeHandoffTimers.add(settleTimer);

  const exitTimer = window.setTimeout(() => {
    conciergeHandoffTimers.delete(exitTimer);
    overlay.classList.add("is-leaving");
    const removeTimer = window.setTimeout(() => {
      conciergeHandoffTimers.delete(removeTimer);
      overlay.remove();
      delete app.dataset.conciergeHandoff;
    }, 320);
    conciergeHandoffTimers.add(removeTimer);
  }, 4600);
  conciergeHandoffTimers.add(exitTimer);
}

window.addEventListener("re:open-payment-candidate", (event) => {
  const detail = event.detail || {};
  if (detail.conciergeHandoff === true) showPaymentConciergeHandoff(detail);
  void openDetectedCandidate(detail, document.querySelector('[data-action="open-payment-candidate"]'));
});

window.addEventListener("re:edit-subscription", (event) => {
  openSubscriptionEditor(document.querySelector('[data-action="open-subscription-menu"]'), event.detail || null);
});

window.addEventListener("re:open-cancellation-checklist", () => {
  openGenericSheet(cancellationChecklistSheet, document.querySelector('[data-action="open-cancellation-checklist"]'), "button");
});

window.addEventListener("re:open-notification-detail", (event) => {
  if (!notificationDetailSheet) return;
  const detail = event.detail && typeof event.detail === "object" ? event.detail : {};
  const title = notificationDetailSheet.querySelector("[data-notification-detail-title]");
  const body = notificationDetailSheet.querySelector("[data-notification-detail-body]");
  const meta = notificationDetailSheet.querySelector("[data-notification-detail-meta]");
  if (title) title.textContent = String(detail.title || "RE. 알림").trim().slice(0, 140);
  if (body) body.textContent = String(detail.body || "확인할 내용이 없어요.").trim().slice(0, 500);
  if (meta) meta.textContent = [detail.serviceName, detail.timeLabel].filter(Boolean).join(" · ").slice(0, 120);
  openGenericSheet(notificationDetailSheet, document.activeElement instanceof HTMLElement ? document.activeElement : null, "[data-sheet-close]");
});

function openPasswordRecovery() {
  if (!passwordUpdateSheet || !passwordUpdateForm) return;
  setScreen("login");
  passwordUpdateForm.reset();
  setLocalSheetStatus(passwordUpdateForm, "");
  openGenericSheet(passwordUpdateSheet, null, '[name="new-password"]');
}

window.addEventListener("re:password-recovery", openPasswordRecovery);

document.querySelectorAll(".with-bottom-nav").forEach((screen) => {
  screen.append(bottomNavTemplate.content.cloneNode(true));
});

function getScreenFromUrl() {
  const value = new URLSearchParams(window.location.search).get("screen");
  return ROUTES.includes(value) ? value : "home";
}

function setAuthGateStatus(message) {
  const form = document.querySelector('[data-auth-form="login"]');
  if (form instanceof HTMLFormElement) setFormStatus(form, message, "warning");
}

function isSocialConsentRequired() {
  return legalConsentRequired || new URLSearchParams(window.location.search).get("socialConsent") === "required";
}

function syncRegisterScreenMode() {
  const screen = document.querySelector('.register-screen');
  const form = screen?.querySelector('[data-auth-form="register"]');
  if (!(screen instanceof HTMLElement) || !(form instanceof HTMLFormElement)) return false;
  const consentOnly = isSocialConsentRequired();
  screen.dataset.socialConsentMode = String(consentOnly);
  form.dataset.socialConsentMode = String(consentOnly);

  const title = screen.querySelector('#register-title');
  const copy = screen.querySelector('.auth-copy p');
  const submit = form.querySelector('.primary-button[type="submit"]');
  const emailInput = form.querySelector('[name="register-email"]');
  const passwordInput = form.querySelector('[name="register-password"]');
  const confirmationInput = form.querySelector('[name="register-password-confirm"]');
  const emailField = emailInput?.closest('.field');
  const passwordField = passwordInput?.closest('.field');
  const confirmationField = confirmationInput?.closest('.field');
  // Social OAuth has already authenticated the user. Hidden credential fields must
  // not participate in native browser validation or they silently block consent submit.
  [emailInput, passwordInput, confirmationInput].forEach((input) => {
    if (input instanceof HTMLInputElement) input.disabled = consentOnly;
  });
  const divider = screen.querySelector('.divider');
  const socialActions = screen.querySelector('.social-actions');
  const providerLegal = screen.querySelector('.provider-legal');
  const authFoot = screen.querySelector('.auth-foot');
  const resend = form.querySelector('[data-resend-confirmation]');

  [emailField, passwordField, confirmationField, divider, socialActions, providerLegal, authFoot].forEach((node) => {
    if (node instanceof HTMLElement) node.hidden = consentOnly;
  });
  if (resend instanceof HTMLElement) resend.hidden = true;
  if (title) title.textContent = consentOnly ? '필수 약관 동의' : '회원가입 🌸';
  if (copy) copy.textContent = consentOnly
    ? '계정 인증은 완료됐어요. 필수 약관 두 항목에 동의하면 바로 RE.를 시작할 수 있어요.'
    : 'RE.와 함께, 더 가벼운 오늘을 시작해요.';
  if (submit) submit.textContent = consentOnly ? '동의하고 계속하기' : '가입하기';