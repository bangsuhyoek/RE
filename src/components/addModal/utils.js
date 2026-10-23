import { getApiEndpoint } from "../../lib/apiBase.js";
import { supabase } from "../../lib/supabase.js";
import {
  normalizePaymentMethod,
  normalizeSourceType,
} from "../../lib/subscriptionAdd.js";
import { POPULAR_SERVICE_SHORTCUTS } from "../../data/popularServiceShortcuts.js";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const SERVICE_ALIASES = [
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

export function cleanKey(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, "");
}

export function findServiceMatch(value, catalog = []) {
  const query = cleanKey(value);
  if (!query) return null;

  const exactCatalog = catalog.find((service) => {
    return (
      cleanKey(service.name) === query ||
      cleanKey(service.id) === query
    );
  });

  if (exactCatalog) return exactCatalog;

  const catalogAliasMatch = catalog.find((service) =>
    (service.aliases || []).some((alias) => {
      const key = cleanKey(alias);
      return query === key || query.includes(key) || key.includes(query);
    })
  );
  if (catalogAliasMatch) return catalogAliasMatch;

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

export function formatWon(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0원";
  return `${number.toLocaleString("ko-KR")}원`;
}

export function annualDateLabel(value) {
  if (!value) return "결제일 확인 필요";

  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return "결제일 확인 필요";

  return `매년 ${month}월 ${day}일 결제`;
}

export function makeInitialForm(initialData, catalog) {
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

export const optimizeImageFile = (file) =>
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

export async function callRecognitionApi(payload) {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    35_000
  );

  let token = null;
  try {
    const sessionRes = await supabase?.auth?.getSession?.();
    token = sessionRes?.data?.session?.access_token || null;
  } catch {
    /* ignore session lookup error */
  }

  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      getApiEndpoint("/api/ocr"),
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );

    let result;

    try {
      result = await response.json();
    } catch {
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
    if (error.name === "AbortError") {
      throw new Error(
        "이미지 인식 시간이 초과되었습니다. 다시 시도해 주세요.",
        { cause: error }
      );
    }

    if (
      error instanceof TypeError &&
      error.message?.includes("fetch")
    ) {
      throw new Error(
        "AI 서버에 연결할 수 없습니다.",
        { cause: error }
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export function validateImage(file) {
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
