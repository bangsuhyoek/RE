import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  Pencil,
  UploadCloud,
  X,
} from "lucide-react";

import { API_BASE_URL, getApiEndpoint } from "../lib/apiBase";
import { recognizeDirectly, isDirectGeminiAvailable } from "../lib/geminiOcr";
import {
  calculateEqualShare,
  normalizePaymentMethod,
  normalizeSourceType,
  normalizeSubscriptionPlan,
  parseSubscriptionAmount,
  resolveSharingFields,
} from "../lib/subscriptionAdd";
import { POPULAR_SERVICE_SHORTCUTS } from "../data/popularServiceShortcuts";
import {
  BottomSheet,
  PaymentMethodTriggerField,
  ServiceMark,
  ToggleSwitch,
} from "./ui";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const SERVICE_ALIASES = [
  {
    id: "netflix",
    aliases: ["netflix", "넷플릭스", "넷플"],
  },
  {
    id: "youtube",
    aliases: ["youtube", "youtube premium", "유튜브", "유튜브프리미엄"],
  },
  {
    id: "coupang",
    aliases: ["coupang", "쿠팡", "쿠팡와우", "와우"],
  },
  {
    id: "spotify",
    aliases: ["spotify", "스포티파이"],
  },
  {
    id: "chatgpt",
    aliases: ["chatgpt", "chatgpt plus", "openai", "챗지피티"],
  },
  {
    id: "tving",
    aliases: ["tving", "티빙"],
  },
  {
    id: "disney",
    aliases: ["disney", "disney+", "disneyplus", "디즈니", "디즈니플러스"],
  },
  {
    id: "millie",
    aliases: ["millie", "밀리", "밀리의서재"],
  },
  {
    id: "naver",
    aliases: ["naver", "네이버", "네이버플러스", "네이버플러스멤버십"],
  },
];

function cleanKey(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, "");
}

function findServiceMatch(value, catalog = []) {
  const query = cleanKey(value);
  if (!query) return null;

  const exactCatalog = catalog.find((service) => {
    return (
      cleanKey(service.name) === query ||
      cleanKey(service.id) === query
    );
  });

  if (exactCatalog) return exactCatalog;

  const aliasMatch = SERVICE_ALIASES.find((service) =>
    service.aliases.some((alias) => {
      const key = cleanKey(alias);
      return query.includes(key) || key.includes(query);
    })
  );

  if (aliasMatch) {
    return (
      catalog.find((service) => service.id === aliasMatch.id) || {
        id: aliasMatch.id,
        name:
          POPULAR_SERVICE_SHORTCUTS.find(
            (service) => service.id === aliasMatch.id
          )?.name || value,
        category: "기타",
      }
    );
  }

  return (
    catalog.find((service) => {
      const name = cleanKey(service.name);
      const id = cleanKey(service.id);
      return (
        query.includes(name) ||
        name.includes(query) ||
        query.includes(id) ||
        id.includes(query)
      );
    }) || null
  );
}

function formatWon(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0원";
  return `${number.toLocaleString("ko-KR")}원`;
}

function annualDateLabel(value) {
  if (!value) return "결제일 확인 필요";

  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return "결제일 확인 필요";

  return `매년 ${month}월 ${day}일 결제`;
}

function makeInitialForm(initialData, catalog) {
  const match = initialData?.name
    ? findServiceMatch(initialData.name, catalog)
    : null;

  const rawPaymentMethod = normalizePaymentMethod(
    initialData?.paymentMethod || ""
  );

  return {
    serviceId:
      initialData?.serviceId ||
      initialData?.id ||
      match?.id ||
      "",
    name: initialData?.name || "",
    category:
      initialData?.category ||
      match?.category ||
      "기타",
    plan: initialData?.plan || "",
    amount:
      initialData?.amount !== undefined &&
      initialData?.amount !== null &&
      initialData?.amount !== 0
        ? String(initialData.amount)
        : initialData?.isTrial
          ? "0"
          : "",
    dueDay:
      initialData?.dueDay !== undefined &&
      initialData?.dueDay !== null
        ? String(initialData.dueDay)
        : "",
    billingCycle: initialData?.billingCycle || "매월",
    nextBillingDate: initialData?.nextBillingDate || "",
    paymentMethod: rawPaymentMethod,
    monogram:
      initialData?.monogram ||
      match?.monogram ||
      initialData?.name?.trim().slice(0, 1).toUpperCase() ||
      "",
    cancelUrl:
      initialData?.cancelUrl ||
      match?.cancelUrl ||
      "",
    memo: initialData?.memo || "",
    isTrial: Boolean(initialData?.isTrial),
    sourceType: normalizeSourceType(
      initialData?.sourceType ||
      (initialData?.autoDetected ? "sms" : "manual")
    ),
  };
}

const optimizeImageFile = (file) =>
  new Promise((resolve) => {
    const fallback = () => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = String(reader.result || "");
        resolve({
          base64: result.includes(",") ? result.split(",")[1] : result,
          mimeType: file.type || "image/jpeg",
        });
      };

      reader.onerror = () =>
        resolve({
          base64: "",
          mimeType: file.type || "image/jpeg",
        });

      reader.readAsDataURL(file);
    };

    if (
      typeof window === "undefined" ||
      !window.URL?.createObjectURL ||
      file.size < 1.5 * 1024 * 1024
    ) {
      fallback();
      return;
    }

    try {
      const image = new Image();
      const url = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(url);

        const maxDimension = 1600;
        let { width, height } = image;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          fallback();
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);

        resolve({
          base64: dataUrl.includes(",")
            ? dataUrl.split(",")[1]
            : dataUrl,
          mimeType: "image/jpeg",
        });
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        fallback();
      };

      image.src = url;
    } catch {
      fallback();
    }
  });

async function callRecognitionApi(payload) {
  if (!API_BASE_URL) {
    if (isDirectGeminiAvailable()) {
      return recognizeDirectly(payload);
    }

    throw new Error(
      "AI 영수증 인식을 위해 백엔드 서버 또는 Gemini 설정이 필요합니다."
    );
  }

  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    35_000
  );

  try {
    const response = await fetch(
      getApiEndpoint("/api/ocr"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );

    let result;

    try {
      result = await response.json();
    } catch {
      if (isDirectGeminiAvailable()) {
        return recognizeDirectly(payload);
      }

      throw new Error(
        "서버 응답을 처리하지 못했습니다."
      );
    }

    if (!response.ok || !result.ok) {
      throw new Error(
        result.message ||
        "결제 정보를 인식하지 못했습니다."
      );
    }

    return result;
  } catch (error) {
    if (
      isDirectGeminiAvailable() &&
      (
        error.name === "AbortError" ||
        (
          error instanceof TypeError &&
          error.message?.includes("fetch")
        )
      )
    ) {
      return recognizeDirectly(payload);
    }

    if (error.name === "AbortError") {
      throw new Error(
        "이미지 인식 시간이 초과되었습니다. 다시 시도해 주세요."
      );
    }

    if (
      error instanceof TypeError &&
      error.message?.includes("fetch")
    ) {
      throw new Error(
        "AI 서버에 연결할 수 없습니다."
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function FieldLabel({
  children,
  required = false,
}) {
  return (
    <label className="mb-1.5 block text-[13px] font-semibold text-[#252A28]">
      {children}
      {required && (
        <span className="ml-0.5 text-[#B42318]">
          *
        </span>
      )}
    </label>
  );
}

function ServiceShortcutCarousel({
  catalog,
  selectedId,
  onSelect,
}) {
  return (
    <div className="mt-3">
      <p className="mb-2.5 text-[12px] font-semibold text-[#6B7684]">
        자주 쓰는 서비스
      </p>

      <div className="-mx-4 overflow-x-auto px-4 pb-1 no-scrollbar sm:-mx-5 sm:px-5">
        <div className="flex w-max gap-3">
          {POPULAR_SERVICE_SHORTCUTS.map(
            (shortcut) => {
              const catalogService =
                catalog.find(
                  (service) =>
                    service.id === shortcut.id
                ) || shortcut;

              const selected =
                selectedId === shortcut.id;

              return (
                <button
                  key={shortcut.id}
                  type="button"
                  onClick={() =>
                    onSelect(catalogService)
                  }
                  className="group flex w-[66px] shrink-0 flex-col items-center gap-1.5"
                >
                  <span className="relative">
                    <ServiceMark
                      serviceId={shortcut.id}
                      name={shortcut.name}
                      monogram={shortcut.monogram}
                      className={`h-12 w-12 rounded-[14px] transition-all ${
                        selected
                          ? "ring-2 ring-[#153D2E] ring-offset-2"
                          : ""
                      }`}
                    />

                    {selected && (
                      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#153D2E] text-white ring-2 ring-white">
                        <Check
                          size={11}
                          strokeWidth={3}
                        />
                      </span>
                    )}
                  </span>

                  <span
                    className={`max-w-[66px] truncate text-center text-[11px] leading-4 ${
                      selected
                        ? "font-semibold text-[#153D2E]"
                        : "font-medium text-[#6B7684]"
                    }`}
                  >
                    {shortcut.name}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}

function SharingEditor({
  grossAmount,
  enabled,
  shareCount,
  personalAmount,
  onEnabledChange,
  onShareCountChange,
  onPersonalAmountChange,
}) {
  const gross =
    parseSubscriptionAmount(grossAmount) || 0;

  const equalShare =
    enabled && shareCount >= 2
      ? calculateEqualShare(gross, shareCount)
      : gross;

  return (
    <section className="border-t border-[#E7EAE8] pt-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[14px] font-semibold text-[#252A28]">
            다른 사람과 함께 이용 중이에요
          </p>

          {enabled && (
            <p className="mt-0.5 text-[12px] text-[#6B7684]">
              실제로 내가 부담하는 금액만 지출에 반영해요.
            </p>
          )}
        </div>

        <ToggleSwitch
          checked={enabled}
          onChange={onEnabledChange}
          label="공동 이용 여부"
        />
      </div>

      {enabled && (
        <div className="mt-4 rounded-2xl bg-[#F4F7F5] p-4">
          <FieldLabel>
            함께 이용하는 인원
          </FieldLabel>

          <div className="grid grid-cols-4 gap-2">
            {[2, 3, 4, 5].map((count) => {
              const selected =
                count === 5
                  ? shareCount >= 5
                  : shareCount === count;

              return (
                <button
                  key={count}
                  type="button"
                  onClick={() =>
                    onShareCountChange(count)
                  }
                  className={`h-10 rounded-xl border text-[13px] font-semibold transition-all ${
                    selected
                      ? "border-[#153D2E] bg-[#153D2E] text-white"
                      : "border-[#DDE2DF] bg-white text-[#252A28]"
                  }`}
                >
                  {count === 5
                    ? "5명+"
                    : `${count}명`}
                </button>
              );
            })}
          </div>

          {shareCount >= 5 && (
            <div className="mt-3">
              <FieldLabel>
                총 이용 인원
              </FieldLabel>

              <input
                type="number"
                min="5"
                max="20"
                value={shareCount}
                onChange={(event) =>
                  onShareCountChange(
                    Math.max(
                      5,
                      Math.min(
                        20,
                        Number(event.target.value) ||
                          5
                      )
                    )
                  )
                }
                className="w-full rounded-xl border border-[#DDE2DF] bg-white px-3.5 py-3 text-[14px] text-[#111315] outline-none focus:border-[#153D2E] focus:ring-[3px] focus:ring-[#153D2E]/[0.08]"
              />
            </div>
          )}

          <div className="mt-4 space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-[#6B7684]">
                전체 구독료
              </span>
              <strong className="font-semibold text-[#252A28]">
                {formatWon(gross)}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B7684]">
                {shareCount}명 균등 분담 기준
              </span>
              <strong className="font-semibold text-[#252A28]">
                {formatWon(equalShare)}
              </strong>
            </div>
          </div>

          <div className="mt-4">
            <FieldLabel>
              내 실제 부담금
            </FieldLabel>

            <div className="relative">
              <input
                inputMode="numeric"
                value={personalAmount}
                onChange={(event) =>
                  onPersonalAmountChange(
                    event.target.value.replace(
                      /[^0-9]/g,
                      ""
                    )
                  )
                }
                className="w-full rounded-xl border border-[#DDE2DF] bg-white px-3.5 py-3 pr-9 text-right text-[16px] font-bold text-[#153D2E] outline-none focus:border-[#153D2E] focus:ring-[3px] focus:ring-[#153D2E]/[0.08]"
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#6B7684]">
                원
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function AddModal({
  catalog = [],
  subscriptions = [],
  initialMode = "manual",
  initialData = null,
  onClose,
  onAdd,
}) {
  const fileInputRef = useRef(null);

  const hasInitialRecognition =
    Boolean(
      initialData?.autoDetected ||
      initialMode === "quick-detect"
    ) &&
    Boolean(
      initialData?.name ||
      initialData?.amount
    );

  const [form, setForm] = useState(() =>
    makeInitialForm(initialData, catalog)
  );

  const [reviewMode, setReviewMode] =
    useState(hasInitialRecognition);

  const [manualEntryOpen, setManualEntryOpen] =
    useState(false);

  const [isEditing, setIsEditing] =
    useState(false);

  const [
    isServicePickerOpen,
    setIsServicePickerOpen,
  ] = useState(false);

  const [
    customServiceInputOpen,
    setCustomServiceInputOpen,
  ] = useState(false);

  const [scanning, setScanning] =
    useState(false);

  const [error, setError] =
    useState("");

  const [warnings, setWarnings] =
    useState([]);

  const [
    sharingEnabled,
    setSharingEnabled,
  ] = useState(false);

  const [shareCount, setShareCount] =
    useState(4);

  const [
    personalAmount,
    setPersonalAmount,
  ] = useState("");

  useEffect(() => {
    if (!initialData) return;

    setForm(
      makeInitialForm(initialData, catalog)
    );

    if (
      initialData.autoDetected ||
      initialMode === "quick-detect"
    ) {
      setReviewMode(true);
      setManualEntryOpen(false);
      setIsEditing(false);
      setIsServicePickerOpen(false);
    }
  }, [
    initialData,
    initialMode,
    catalog,
  ]);

  const matchedService = useMemo(
    () =>
      form.name
        ? findServiceMatch(
            form.name,
            catalog
          )
        : null,
    [form.name, catalog]
  );

  const grossAmount =
    parseSubscriptionAmount(form.amount);

  const numericDueDay =
    Number(form.dueDay);

  const validService =
    Boolean(form.name.trim());

  const validAmount =
    form.isTrial
      ? grossAmount !== null &&
        grossAmount >= 0
      : grossAmount !== null &&
        grossAmount > 0;

  const validSchedule =
    form.billingCycle === "매년"
      ? Boolean(form.nextBillingDate)
      : Number.isInteger(numericDueDay) &&
        numericDueDay >= 1 &&
        numericDueDay <= 31;

  const canSave =
    validService &&
    validAmount &&
    validSchedule &&
    !scanning;

  const needsReview =
    warnings.length > 0 ||
    !validService ||
    !validAmount ||
    !validSchedule;

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setError("");

    if (
      key === "amount" &&
      sharingEnabled
    ) {
      const parsed =
        parseSubscriptionAmount(value);

      if (parsed !== null) {
        setPersonalAmount(
          String(
            calculateEqualShare(
              parsed,
              shareCount
            )
          )
        );
      }
    }
  }

  function chooseService(service) {
    const catalogService =
      catalog.find(
        (item) => item.id === service.id
      ) || service;

    setForm((current) => ({
      ...current,
      serviceId: catalogService.id || "",
      name: catalogService.name || "",
      category:
        catalogService.category ||
        current.category ||
        "기타",
      monogram:
        catalogService.monogram ||
        catalogService.name
          ?.trim()
          .slice(0, 1)
          .toUpperCase() ||
        current.monogram,
      cancelUrl:
        catalogService.cancelUrl ||
        current.cancelUrl ||
        "",
    }));

    setIsServicePickerOpen(false);
    setCustomServiceInputOpen(false);
    setError("");
  }

  function handleSharingEnabled(next) {
    setSharingEnabled(next);

    const gross =
      parseSubscriptionAmount(
        form.amount
      ) || 0;

    if (next) {
      setPersonalAmount(
        String(
          calculateEqualShare(
            gross,
            shareCount
          )
        )
      );
    } else {
      setPersonalAmount(
        gross ? String(gross) : ""
      );
    }
  }

  function handleShareCount(next) {
    const count =
      Math.max(
        2,
        Math.min(
          20,
          Number(next) || 2
        )
      );

    setShareCount(count);

    const gross =
      parseSubscriptionAmount(
        form.amount
      ) || 0;

    setPersonalAmount(
      String(
        calculateEqualShare(
          gross,
          count
        )
      )
    );
  }

  function validateImage(file) {
    if (!file) {
      return "영수증 또는 결제 화면 이미지를 선택해 주세요.";
    }

    const fileType =
      String(file.type || "")
        .toLowerCase();

    const allowed =
      ALLOWED_IMAGE_TYPES.has(fileType) ||
      /\.(jpe?g|png|webp)$/i.test(
        file.name || ""
      );

    if (!allowed) {
      return "JPG, PNG, WEBP 이미지만 사용할 수 있습니다.";
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return "이미지는 8MB 이하만 사용할 수 있습니다.";
    }

    return "";
  }

  async function recognizeImage(file) {
    const validation =
      validateImage(file);

    if (validation) {
      setError(validation);
      return;
    }

    setError("");
    setWarnings([]);
    setScanning(true);

    try {
      const {
        base64,
        mimeType,
      } = await optimizeImageFile(file);

      const result =
        await callRecognitionApi({
          imageBase64: base64,
          mimeType,
        });

      const recognized =
        result?.data || {};

      const serviceMatch =
        recognized.name
          ? findServiceMatch(
              recognized.name,
              catalog
            )
          : null;

      setForm({
        serviceId:
          recognized.serviceId ||
          serviceMatch?.id ||
          "",
        name:
          recognized.name || "",
        category:
          serviceMatch?.category ||
          recognized.category ||
          "기타",
        plan:
          recognized.plan || "",
        amount:
          recognized.amount !==
            undefined &&
          recognized.amount !== null
            ? String(
                recognized.amount
              )
            : "",
        dueDay:
          recognized.dueDay !==
            undefined &&
          recognized.dueDay !== null
            ? String(
                recognized.dueDay
              )
            : "",
        billingCycle:
          recognized.billingCycle ||
          "매월",
        nextBillingDate:
          recognized.nextBillingDate ||
          "",
        paymentMethod:
          normalizePaymentMethod(
            recognized.paymentMethod ||
            ""
          ),
        monogram:
          serviceMatch?.monogram ||
          recognized.name
            ?.trim()
            .slice(0, 1)
            .toUpperCase() ||
          "",
        cancelUrl:
          serviceMatch?.cancelUrl ||
          "",
        memo: "",
        isTrial: false,
        sourceType: "image",
      });

      setWarnings(
        Array.isArray(result?.warnings)
          ? result.warnings
          : []
      );

      setReviewMode(true);
      setManualEntryOpen(false);
      setIsEditing(false);
      setIsServicePickerOpen(false);
      setCustomServiceInputOpen(false);
    } catch (recognitionError) {
      setError(
        recognitionError?.message ||
        "결제 정보를 인식하지 못했습니다."
      );
    } finally {
      setScanning(false);
    }
  }

  function handleFileChange(event) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    recognizeImage(file);

    event.target.value = "";
  }

  function saveSubscription() {
    if (!validService) {
      setError(
        "서비스명을 확인해 주세요."
      );
      setIsEditing(true);
      return;
    }

    if (!validAmount) {
      setError(
        "결제 금액을 확인해 주세요."
      );
      setIsEditing(true);
      return;
    }

    if (!validSchedule) {
      setError(
        "결제 일정을 확인해 주세요."
      );
      setIsEditing(true);
      return;
    }

    const sharing =
      resolveSharingFields({
        grossAmount,
        personalAmount:
          personalAmount === ""
            ? undefined
            : Number(personalAmount),
        sharingEnabled,
        shareCount,
      });

    const service =
      matchedService ||
      catalog.find(
        (item) =>
          item.id === form.serviceId
      );

    const payload = {
      id:
        service?.id ||
        form.serviceId ||
        undefined,

      name: form.name.trim(),

      plan:
        normalizeSubscriptionPlan(
          form.plan
        ),

      category:
        service?.category ||
        form.category ||
        "기타",

      amount: sharing.amount,

      grossAmount:
        sharing.grossAmount,

      sharingEnabled:
        sharing.sharingEnabled,

      shareCount:
        sharing.shareCount,

      dueDay:
        form.billingCycle === "매년"
          ? Number(
              String(
                form.nextBillingDate
              ).split("-")[2]
            ) || 1
          : numericDueDay,

      billingCycle:
        form.billingCycle,

      nextBillingDate:
        form.billingCycle === "매년"
          ? form.nextBillingDate
          : null,

      paymentMethod:
        normalizePaymentMethod(
          form.paymentMethod
        ),

      monogram:
        form.monogram ||
        service?.monogram ||
        form.name
          .trim()
          .slice(0, 1)
          .toUpperCase(),

      cancelUrl:
        form.cancelUrl ||
        service?.cancelUrl ||
        "",

      memo: form.memo || "",

      isTrial:
        Boolean(form.isTrial),

      sourceType:
        normalizeSourceType(
          form.sourceType ||
          (reviewMode
            ? "image"
            : "manual")
        ),
    };

    const added =
      onAdd(payload);

    if (added !== false) {
      onClose();
    }
  }

  function renderScheduleSummary() {
    if (
      form.billingCycle === "매년"
    ) {
      return annualDateLabel(
        form.nextBillingDate
      );
    }

    if (!validSchedule) {
      return "결제일 확인 필요";
    }

    return `매월 ${numericDueDay}일 결제`;
  }

  function renderEditFields() {
    return (
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <FieldLabel required>
              서비스
            </FieldLabel>

            {!isServicePickerOpen && (
              <button
                type="button"
                onClick={() => {
                  setIsServicePickerOpen(
                    true
                  );
                  setCustomServiceInputOpen(
                    false
                  );
                }}
                className="mb-1.5 inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#2C6049]"
              >
                변경
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {!customServiceInputOpen ? (
            <div
              className={`flex min-h-[50px] items-center gap-3 rounded-xl border bg-white px-3.5 ${
                !validService
                  ? "border-[#B42318]"
                  : "border-[#DDE2DF]"
              }`}
            >
              <ServiceMark
                serviceId={
                  form.serviceId ||
                  matchedService?.id
                }
                name={form.name}
                monogram={form.monogram}
                className="h-8 w-8 rounded-[10px] p-1.5"
              />

              <span
                className={`min-w-0 flex-1 truncate text-[14px] font-semibold ${
                  form.name
                    ? "text-[#111315]"
                    : "text-[#8B95A1]"
                }`}
              >
                {form.name ||
                  "서비스를 선택해 주세요"}
              </span>
            </div>
          ) : (
            <input
              autoFocus
              value={form.name}
              onChange={(event) => {
                const value =
                  event.target.value;

                const service =
                  findServiceMatch(
                    value,
                    catalog
                  );

                setForm(
                  (current) => ({
                    ...current,
                    name: value,
                    serviceId:
                      service?.id || "",
                    category:
                      service?.category ||
                      current.category ||
                      "기타",
                    monogram:
                      service?.monogram ||
                      value
                        .trim()
                        .slice(0, 1)
                        .toUpperCase(),
                    cancelUrl:
                      service?.cancelUrl ||
                      "",
                  })
                );

                setError("");
              }}
              placeholder="서비스명을 입력해 주세요"
              className={`w-full rounded-xl border bg-white px-3.5 py-3 text-[14px] text-[#111315] outline-none focus:border-[#153D2E] focus:ring-[3px] focus:ring-[#153D2E]/[0.08] ${
                !validService
                  ? "border-[#B42318]"
                  : "border-[#DDE2DF]"
              }`}
            />
          )}

          {isServicePickerOpen && (
            <div className="mt-3 rounded-2xl bg-[#F7F8F6] px-4 py-4">
              <ServiceShortcutCarousel
                catalog={catalog}
                selectedId={
                  form.serviceId ||
                  matchedService?.id
                }
                onSelect={
                  chooseService
                }
              />

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-[#6B7684]">
                  찾는 서비스가 없나요?
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setCustomServiceInputOpen(
                      true
                    );
                    setIsServicePickerOpen(
                      false
                    );
                    setForm(
                      (current) => ({
                        ...current,
                        serviceId: "",
                      })
                    );
                  }}
                  className="text-[13px] font-semibold text-[#2C6049]"
                >
                  + 직접 입력
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <FieldLabel required>
            결제 금액
          </FieldLabel>

          <div className="relative">
            <input
              inputMode="numeric"
              value={form.amount}
              onChange={(event) =>
                updateForm(
                  "amount",
                  event.target.value.replace(
                    /[^0-9]/g,
                    ""
                  )
                )
              }
              placeholder="0"
              className={`w-full rounded-xl border bg-white px-3.5 py-3 pr-9 text-right text-[16px] font-bold text-[#111315] outline-none focus:border-[#153D2E] focus:ring-[3px] focus:ring-[#153D2E]/[0.08] ${
                !validAmount
                  ? "border-[#B42318]"
                  : "border-[#DDE2DF]"
              }`}
            />

            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#6B7684]">
              원
            </span>
          </div>
        </div>

        <div>
          <FieldLabel required>
            결제 일정
          </FieldLabel>

          <div className="grid grid-cols-[112px_1fr] gap-2">
            <select
              value={
                form.billingCycle
              }
              onChange={(event) =>
                updateForm(
                  "billingCycle",
                  event.target.value
                )
              }
              className="rounded-xl border border-[#DDE2DF] bg-white px-3 py-3 text-[14px] font-semibold text-[#252A28] outline-none focus:border-[#153D2E]"
            >
              <option value="매월">
                매월
              </option>
              <option value="매년">
                매년
              </option>
            </select>

            {form.billingCycle ===
            "매월" ? (
              <select
                value={form.dueDay}
                onChange={(event) =>
                  updateForm(
                    "dueDay",
                    event.target.value
                  )
                }
                className={`rounded-xl border bg-white px-3 py-3 text-[14px] text-[#252A28] outline-none focus:border-[#153D2E] ${
                  !validSchedule
                    ? "border-[#B42318]"
                    : "border-[#DDE2DF]"
                }`}
              >
                <option value="">
                  결제일 선택
                </option>

                {Array.from(
                  { length: 31 },
                  (_, index) =>
                    index + 1
                ).map((day) => (
                  <option
                    key={day}
                    value={day}
                  >
                    {day}일
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="date"
                value={
                  form.nextBillingDate
                }
                onChange={(event) =>
                  updateForm(
                    "nextBillingDate",
                    event.target.value
                  )
                }
                className={`rounded-xl border bg-white px-3 py-3 text-[14px] text-[#252A28] outline-none focus:border-[#153D2E] ${
                  !validSchedule
                    ? "border-[#B42318]"
                    : "border-[#DDE2DF]"
                }`}
              />
            )}
          </div>
        </div>

        <div>
          <FieldLabel>
            결제 수단
          </FieldLabel>

          <PaymentMethodTriggerField
            value={
              form.paymentMethod
            }
            onChange={(value) =>
              updateForm(
                "paymentMethod",
                normalizePaymentMethod(
                  value
                )
              )
            }
          />

          <p className="mt-1.5 text-[11px] leading-4 text-[#6B7684]">
            어디에서 구독료가 나가는지 기록하는 용도예요.
          </p>
        </div>
      </div>
    );
  }

  const title =
    reviewMode
      ? "구독 정보 확인"
      : "구독 추가하기";

  return (
    <BottomSheet
      onClose={onClose}
      label={title}
    >
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#111315]">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-[#7E8782] transition-colors hover:bg-[#F7F8F6] hover:text-[#111315]"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#FFF4F2] px-3.5 py-3 text-[12px] leading-5 text-[#B42318]">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0"
            />
            <span>{error}</span>
          </div>
        )}

        {!reviewMode ? (
          <div className="pb-2">
            <div className="pb-7 pt-7 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#EAF2ED] text-[#153D2E]">
                <UploadCloud size={25} />
              </div>

              <h3 className="mt-4 text-[18px] font-bold tracking-[-0.02em] text-[#111315]">
                결제 내역을 불러오면
                <br />
                직접 입력하지 않아도 돼요.
              </h3>

              <p className="mt-2 text-[13px] leading-5 text-[#6B7684]">
                영수증이나 결제 화면을 분석해서
                <br />
                구독 정보를 먼저 채워드려요.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              disabled={scanning}
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#153D2E] px-4 text-[15px] font-bold text-white transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                  결제 정보 확인 중
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  영수증 · 결제 화면 불러오기
                </>
              )}
            </button>

            <p className="mt-2 text-center text-[11px] text-[#8B95A1]">
              JPG · PNG · WEBP / 최대 8MB
            </p>

            <div className="mt-7 border-t border-[#E7EAE8] pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] font-semibold text-[#252A28]">
                    직접 입력이 필요해요
                  </p>

                  <p className="mt-0.5 text-[12px] leading-4 text-[#6B7684]">
                    자동으로 불러오기 어려운 경우에만 사용해요.
                  </p>
                </div>

                <ToggleSwitch
                  checked={
                    manualEntryOpen
                  }
                  onChange={(next) => {
                    setManualEntryOpen(
                      next
                    );

                    if (next) {
                      setForm(
                        makeInitialForm(
                          null,
                          catalog
                        )
                      );
                      setIsServicePickerOpen(
                        true
                      );
                      setCustomServiceInputOpen(
                        false
                      );
                    } else {
                      setIsServicePickerOpen(
                        false
                      );
                      setCustomServiceInputOpen(
                        false
                      );
                    }
                  }}
                  label="직접 입력"
                />
              </div>

              {manualEntryOpen && (
                <div className="mt-5">
                  {renderEditFields()}

                  <div className="mt-5">
                    <SharingEditor
                      grossAmount={
                        form.amount
                      }
                      enabled={
                        sharingEnabled
                      }
                      shareCount={
                        shareCount
                      }
                      personalAmount={
                        personalAmount
                      }
                      onEnabledChange={
                        handleSharingEnabled
                      }
                      onShareCountChange={
                        handleShareCount
                      }
                      onPersonalAmountChange={
                        setPersonalAmount
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="pb-2">
            <div
              className={`mt-4 flex items-center gap-2 text-[12px] font-semibold ${
                needsReview
                  ? "text-[#8A5A12]"
                  : "text-[#2C6049]"
              }`}
            >
              {needsReview ? (
                <AlertTriangle
                  size={15}
                />
              ) : (
                <CheckCircle2
                  size={15}
                />
              )}

              <span>
                {needsReview
                  ? "일부 정보만 확인해 주세요"
                  : "결제 정보를 찾았어요"}
              </span>
            </div>

            {!isEditing ? (
              <>
                <div className="pb-8 pt-8 text-center">
                  <ServiceMark
                    serviceId={
                      form.serviceId ||
                      matchedService?.id
                    }
                    name={form.name}
                    monogram={
                      form.monogram
                    }
                    className="mx-auto h-12 w-12 rounded-[14px] p-2"
                  />

                  <p
                    className={`mt-3 text-[16px] font-semibold ${
                      validService
                        ? "text-[#111315]"
                        : "text-[#B42318]"
                    }`}
                  >
                    {form.name ||
                      "서비스 확인 필요"}
                  </p>

                  <p
                    className={`mt-4 text-[28px] font-bold tracking-[-0.04em] ${
                      validAmount
                        ? "text-[#111315]"
                        : "text-[#B42318]"
                    }`}
                  >
                    {validAmount
                      ? formatWon(
                          grossAmount
                        )
                      : "금액 확인 필요"}
                  </p>

                  <p
                    className={`mt-1 text-[14px] ${
                      validSchedule
                        ? "text-[#6B7684]"
                        : "text-[#B42318]"
                    }`}
                  >
                    {renderScheduleSummary()}
                  </p>
                </div>

                <div className="border-t border-[#E7EAE8] py-5">
                  <p className="mb-2 text-[12px] font-semibold text-[#6B7684]">
                    결제 수단
                  </p>

                  {form.paymentMethod ? (
                    <button
                      type="button"
                      onClick={() =>
                        setIsEditing(
                          true
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="text-[14px] font-semibold text-[#252A28]">
                        {
                          form.paymentMethod
                        }
                      </span>

                      <span className="rounded-full bg-[#EAF2ED] px-2 py-1 text-[10px] font-semibold text-[#2C6049]">
                        기록용
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setIsEditing(
                          true
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="text-[14px] font-semibold text-[#2C6049]">
                        어떤 카드에서 결제되는지 기록하기
                      </span>

                      <ChevronRight
                        size={17}
                        className="text-[#2C6049]"
                      />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsEditing(true)
                  }
                  className="flex w-full items-center justify-between border-t border-[#E7EAE8] py-4 text-left"
                >
                  <span className="text-[13px] text-[#6B7684]">
                    정보가 다른가요?
                  </span>

                  <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#2C6049]">
                    수정하기
                    <ChevronRight
                      size={15}
                    />
                  </span>
                </button>
              </>
            ) : (
              <div className="pb-5 pt-6">
                {renderEditFields()}

                <div className="mt-5 flex items-center justify-between border-t border-[#E7EAE8] pt-4">
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B7684]">
                    <Pencil size={14} />
                    정보 수정 중
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(
                        false
                      );
                      setIsServicePickerOpen(
                        false
                      );
                      setCustomServiceInputOpen(
                        false
                      );
                    }}
                    className="text-[13px] font-bold text-[#2C6049]"
                  >
                    완료
                  </button>
                </div>
              </div>
            )}

            <SharingEditor
              grossAmount={
                form.amount
              }
              enabled={
                sharingEnabled
              }
              shareCount={
                shareCount
              }
              personalAmount={
                personalAmount
              }
              onEnabledChange={
                handleSharingEnabled
              }
              onShareCountChange={
                handleShareCount
              }
              onPersonalAmountChange={
                setPersonalAmount
              }
            />
          </div>
        )}

        {(reviewMode ||
          manualEntryOpen) && (
          <div className="sticky bottom-0 z-10 -mx-4 mt-auto bg-gradient-to-t from-white via-white to-white/80 px-4 pb-1 pt-4 sm:-mx-5 sm:px-5">
            <button
              type="button"
              disabled={!canSave}
              onClick={
                saveSubscription
              }
              className="min-h-[54px] w-full rounded-2xl bg-[#153D2E] px-5 text-[15px] font-bold text-white shadow-sm transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#DDE2DF] disabled:text-[#8B95A1]"
            >
              내 구독에 추가
            </button>

            {!canSave && (
              <p className="mt-2 text-center text-[11px] text-[#8B95A1]">
                서비스명 · 금액 · 결제 일정을 확인해 주세요.
              </p>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
