import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import {
  calculateEqualShare,
  normalizePaymentMethod,
  normalizeSourceType,
  normalizeSubscriptionPlan,
  parseSubscriptionAmount,
  resolveSharingFields,
} from "../lib/subscriptionAdd";
import { BottomSheet } from "./ui";
import {
  annualDateLabel,
  callRecognitionApi,
  findServiceMatch,
  makeInitialForm,
  optimizeImageFile,
  validateImage,
} from "./addModal/utils";
import { OcrUploadSection } from "./addModal/OcrUploadSection";
import { SharingEditor } from "./addModal/SharingEditor";
import { ReviewSummarySection } from "./addModal/ReviewSummarySection";
import { SubscriptionEditForm } from "./addModal/SubscriptionEditForm";

export function AddModal({
  catalog = [],
  initialMode = "manual",
  initialData = null,
  initialFile = null,
  onClose,
  onOpenDiscovery,
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

  const validSharingAmount =
    !sharingEnabled ||
    (
      personalAmount === "" ||
      (
        Number.isFinite(Number(personalAmount)) &&
        Number(personalAmount) > 0 &&
        grossAmount !== null &&
        Number(personalAmount) <= grossAmount
      )
    );

  const validSchedule =
    form.billingCycle === "매년"
      ? Boolean(form.nextBillingDate)
      : Number.isInteger(numericDueDay) &&
        numericDueDay >= 1 &&
        numericDueDay <= 31;

  const canSave =
    validService &&
    validAmount &&
    validSharingAmount &&
    validSchedule &&
    !scanning;

  const needsReview =
    warnings.length > 0 ||
    !validService ||
    !validAmount ||
    !validSharingAmount ||
    !validSchedule;

  const updateForm = useCallback((key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setError("");

    if (key === "amount") {
      setSharingEnabled((enabled) => {
        if (enabled) {
          const parsed = parseSubscriptionAmount(value);
          if (parsed !== null) {
            setShareCount((count) => {
              setPersonalAmount(String(calculateEqualShare(parsed, count)));
              return count;
            });
          }
        }
        return enabled;
      });
    }
  }, []);

  const chooseService = useCallback((service) => {
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
  }, [catalog]);

  const handleSharingEnabled = useCallback((next) => {
    setSharingEnabled(next);

    setForm((current) => {
      const gross = parseSubscriptionAmount(current.amount) || 0;
      if (next) {
        setShareCount((count) => {
          setPersonalAmount(String(calculateEqualShare(gross, count)));
          return count;
        });
      } else {
        setPersonalAmount(gross ? String(gross) : "");
      }
      return current;
    });
  }, []);

  const handleShareCount = useCallback((next) => {
    const count = Math.max(
      2,
      Math.min(
        20,
        Number(next) || 2
      )
    );

    setShareCount(count);

    setForm((current) => {
      const gross = parseSubscriptionAmount(current.amount) || 0;
      setPersonalAmount(String(calculateEqualShare(gross, count)));
      return current;
    });
  }, []);

  const recognizeImage = useCallback(async (file) => {
    const validation = validateImage(file);

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
  }, [catalog]);

  // 다른 앱에서 공유받은 영수증 이미지는 열자마자 인식한다. 같은 파일을 두 번 보내지 않게 기억한다.
  const recognizedFileRef = useRef(null);
  useEffect(() => {
    if (!initialFile || recognizedFileRef.current === initialFile) return;
    recognizedFileRef.current = initialFile;
    recognizeImage(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  const handleFileChange = useCallback((event) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    recognizeImage(file);

    event.target.value = "";
  }, [recognizeImage]);

  const handleOpenFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleToggleManualEntry = useCallback((next) => {
    setManualEntryOpen(next);

    if (next) {
      setForm(
        makeInitialForm(
          null,
          catalog
        )
      );
      setIsServicePickerOpen(true);
      setCustomServiceInputOpen(false);
    } else {
      setIsServicePickerOpen(false);
      setCustomServiceInputOpen(false);
    }
  }, [catalog]);

  const saveSubscription = useCallback(() => {
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

    if (sharingEnabled) {
      const numPersonal = personalAmount === "" ? undefined : Number(personalAmount);
      if (numPersonal !== undefined && (!Number.isFinite(numPersonal) || numPersonal <= 0 || (grossAmount !== null && numPersonal > grossAmount))) {
        setError(
          "개인 부담금은 0원보다 크고 전체 금액 이하이어야 합니다."
        );
        setIsEditing(true);
        return;
      }
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
    } else {
      setError("구독 저장에 실패했습니다. 입력 정보를 확인해 주세요.");
      setIsEditing(true);
    }
  }, [
    validService,
    validAmount,
    validSchedule,
    sharingEnabled,
    personalAmount,
    grossAmount,
    shareCount,
    matchedService,
    catalog,
    form,
    numericDueDay,
    reviewMode,
    onAdd,
    onClose,
  ]);

  const scheduleSummary = useMemo(() => {
    if (form.billingCycle === "매년") {
      return annualDateLabel(form.nextBillingDate);
    }

    if (!validSchedule) {
      return "결제일 확인 필요";
    }

    return `매월 ${numericDueDay}일 결제`;
  }, [form.billingCycle, form.nextBillingDate, validSchedule, numericDueDay]);

  const handleOpenServicePicker = useCallback(() => {
    setIsServicePickerOpen(true);
    setCustomServiceInputOpen(false);
  }, []);

  const handleCustomServiceClick = useCallback(() => {
    setCustomServiceInputOpen(true);
    setIsServicePickerOpen(false);
    setForm((current) => ({
      ...current,
      serviceId: "",
    }));
  }, []);

  const handleCustomServiceNameChange = useCallback((value) => {
    const service = findServiceMatch(value, catalog);

    setForm((current) => ({
      ...current,
      name: value,
      serviceId: service?.id || "",
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
    }));

    setError("");
  }, [catalog]);

  const handleAmountChange = useCallback((value) => {
    updateForm("amount", value);
  }, [updateForm]);

  const handleBillingCycleChange = useCallback((value) => {
    updateForm("billingCycle", value);
  }, [updateForm]);

  const handleDueDayChange = useCallback((value) => {
    updateForm("dueDay", value);
  }, [updateForm]);

  const handleNextBillingDateChange = useCallback((value) => {
    updateForm("nextBillingDate", value);
  }, [updateForm]);

  const handlePaymentMethodChange = useCallback((value) => {
    updateForm("paymentMethod", value);
  }, [updateForm]);

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleFinishEditing = useCallback(() => {
    setIsEditing(false);
    setIsServicePickerOpen(false);
    setCustomServiceInputOpen(false);
  }, []);

  const editFieldsElement = (
    <SubscriptionEditForm
      form={form}
      matchedService={matchedService}
      catalog={catalog}
      validService={validService}
      validAmount={validAmount}
      validSchedule={validSchedule}
      isServicePickerOpen={isServicePickerOpen}
      customServiceInputOpen={customServiceInputOpen}
      onOpenServicePicker={handleOpenServicePicker}
      onSelectService={chooseService}
      onCustomServiceClick={handleCustomServiceClick}
      onCustomServiceNameChange={handleCustomServiceNameChange}
      onAmountChange={handleAmountChange}
      onBillingCycleChange={handleBillingCycleChange}
      onDueDayChange={handleDueDayChange}
      onNextBillingDateChange={handleNextBillingDateChange}
      onPaymentMethodChange={handlePaymentMethodChange}
    />
  );

  const sharingEditorElement = (
    <SharingEditor
      grossAmount={form.amount}
      enabled={sharingEnabled}
      shareCount={shareCount}
      personalAmount={personalAmount}
      onEnabledChange={handleSharingEnabled}
      onShareCountChange={handleShareCount}
      onPersonalAmountChange={setPersonalAmount}
    />
  );

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
          <OcrUploadSection
            fileInputRef={fileInputRef}
            scanning={scanning}
            onFileChange={handleFileChange}
            onOpenFilePicker={handleOpenFilePicker}
            onOpenDiscovery={onOpenDiscovery}
            manualEntryOpen={manualEntryOpen}
            onToggleManualEntry={handleToggleManualEntry}
          >
            <div className="mt-5">
              {editFieldsElement}

              <div className="mt-5">
                {sharingEditorElement}
              </div>
            </div>
          </OcrUploadSection>
        ) : (
          <ReviewSummarySection
            needsReview={needsReview}
            isEditing={isEditing}
            form={form}
            matchedService={matchedService}
            grossAmount={grossAmount}
            validService={validService}
            validAmount={validAmount}
            validSchedule={validSchedule}
            scheduleSummary={scheduleSummary}
            onStartEditing={handleStartEditing}
            onFinishEditing={handleFinishEditing}
            renderEditFields={editFieldsElement}
            sharingEditor={sharingEditorElement}
          />
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
