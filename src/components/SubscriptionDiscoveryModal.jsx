import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ClipboardPaste,
  ExternalLink,
  FileSpreadsheet,
  LoaderCircle,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { Browser } from "@capacitor/browser";
import { isNativePlatform } from "../lib/platform";
import { formatWon } from "../lib/dates";
import { crawlSubscriptionHub } from "../lib/cancelBrowser";
import { BottomSheet, ServiceMark } from "./ui";
import {
  scanDeviceForSubscriptions,
  scanHubPageText,
  scanStatementText,
  SUBSCRIPTION_HUBS,
} from "../lib/subscriptionDiscovery";

const SAMPLE_STATEMENT_TEXT = [
  "2026.10.05 [신한카드] 넷플릭스 17,000원 일시불 승인",
  "2026.10.07 [KB국민카드] 구글플레이 14,900원 일시불 승인",
  "2026.10.09 [현대카드] 쿠팡(와우멤버십) 7,890원 정상승인",
  "2026.10.12 [토스페이] 네이버파이낸셜 정기결제 4,900원",
  "2026.10.15 [Google Play] Duolingo Super 무료 체험 시작 (체험 종료 후 월 14,000원)",
  "2026.10.16 [신한카드] GS25역삼점 4,500원 일시불 (일반 결제는 자동 제외됨)",
].join("\n");

export function SubscriptionDiscoveryModal({
  catalog = [],
  subscriptions = [],
  onClose,
  onAddBatch,
  notify,
}) {
  const [activeTab, setActiveTab] = useState("device"); // "device" | "statement" | "hubs"
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [deviceItems, setDeviceItems] = useState([]);
  const [installedServiceIds, setInstalledServiceIds] = useState([]);
  const [statementText, setStatementText] = useState("");
  const [statementItems, setStatementItems] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [crawlingHubId, setCrawlingHubId] = useState("");
  const textFileInputRef = useRef(null);

  const getItemKey = (item) =>
    (item.serviceId || item.name || "sub") + "_" + String(item.amount || 0);

  // 기기 스캔 실행 (설치된 구독 앱 + 활성 알림)
  const runDeviceScan = async (useDemoIfWeb = false) => {
    setDeviceLoading(true);
    try {
      const result = await scanDeviceForSubscriptions({
        catalog,
        existingSubscriptions: subscriptions,
      });
      let list = result.items || [];
      if (list.length === 0 && (!result.isNativeSupported || useDemoIfWeb)) {
        // 웹 환경이거나 테스트 시 대표 샘플을 통해 동작 확인 가능
        if (useDemoIfWeb) {
          const demoIds = ["youtube", "netflix", "coupang", "naver", "millie", "chatgpt"];
          list = demoIds
            .map((id) => {
              const found = catalog.find((c) => c.id === id);
              if (!found) return null;
              const alreadyRegistered = subscriptions.some(
                (s) => s.status !== "cancelled" && (s.serviceId === id || s.id === id)
              );
              return {
                serviceId: found.id,
                name: found.name,
                category: found.category || "기타",
                plan: found.plan || "기본 플랜",
                amount: Number(found.amount) || 0,
                dueDay: Number(found.dueDay) || new Date().getDate(),
                billingCycle: "매월",
                paymentMethod: "신용/체크카드",
                isTrial: false,
                sourceBadge: "설치된 앱 발견",
                alreadyRegistered,
              };
            })
            .filter(Boolean);
        }
      }
      setDeviceItems(list);
      setInstalledServiceIds(result.installedServiceIds || []);
      const initialSelected = new Set(
        list.filter((item) => !item.alreadyRegistered).map(getItemKey)
      );
      setSelectedKeys(initialSelected);
    } finally {
      setDeviceLoading(false);
    }
  };

  useEffect(() => {
    runDeviceScan(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runStatementAnalysis = (raw) => {
    const targetText = raw !== undefined ? raw : statementText;
    const res = scanStatementText(targetText, {
      catalog,
      existingSubscriptions: subscriptions,
      installedServiceIds,
    });
    setStatementItems(res.items || []);
    const nextSelected = new Set(
      (res.items || []).filter((item) => !item.alreadyRegistered).map(getItemKey)
    );
    setSelectedKeys(nextSelected);
  };

  const handlePasteClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip && clip.trim()) {
        setStatementText(clip);
        runStatementAnalysis(clip);
        notify?.("클립보드 내역을 분석했어요.");
      } else {
        notify?.("클립보드가 비어 있어요. 결제 문자나 내역을 먼저 복사해 주세요.");
      }
    } catch {
      notify?.("클립보드 읽기 권한이 없어 입력창에 직접 길게 눌러 붙여넣어 주세요.");
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      setStatementText(content);
      runStatementAnalysis(content);
      notify?.(file.name + " 파일에서 정기결제 내역을 스캔했어요.");
    };
    reader.readAsText(file, "utf-8");
    event.target.value = "";
  };

  const toggleKey = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const activeList = activeTab === "device" ? deviceItems : activeTab === "statement" ? statementItems : [];
  const selectedItems = activeList.filter((item) => selectedKeys.has(getItemKey(item)));

  const handleBatchAdd = () => {
    if (selectedItems.length === 0) return;
    onAddBatch?.(selectedItems);
    onClose?.();
  };

  const openHubExternally = async (hub) => {
    try {
      if (isNativePlatform()) {
        await Browser.open({ url: hub.url });
      } else {
        window.open(hub.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(hub.url, "_blank", "noopener,noreferrer");
    }
  };

  // 앱에서는 허브 화면을 인앱 브라우저로 열고, 사용자가 [이 화면 불러오기]를 누르면 보이는 글에서 구독을 찾는다.
  const handleOpenHub = async (hub) => {
    if (crawlingHubId) return;
    setCrawlingHubId(hub.id);
    try {
      const result = await crawlSubscriptionHub({ hubId: hub.id, hubName: hub.name, url: hub.url });
      if (result.status === "unsupported" || result.status === "error") {
        await openHubExternally(hub);
        notify?.("화면의 구독 내역을 복사해 [2. 명세서·문자 분석]에 붙여넣으면 바로 찾아드려요.");
        return;
      }
      if (result.status !== "crawled" || !result.text) return;
      const scanned = scanHubPageText(result.text, {
        catalog,
        existingSubscriptions: subscriptions,
        installedServiceIds,
        hubName: hub.name,
      });
      const items = scanned.items || [];
      if (items.length === 0) {
        notify?.(hub.name + " 화면에서 구독을 찾지 못했어요. 구독 목록이 보이는 화면에서 다시 불러와 주세요.");
        return;
      }
      setStatementItems(items);
      setSelectedKeys(new Set(items.filter((item) => !item.alreadyRegistered).map(getItemKey)));
      setActiveTab("statement");
      notify?.(hub.name + "에서 구독 " + items.length + "개를 찾았어요.");
    } finally {
      setCrawlingHubId("");
    }
  };

  return (
    <BottomSheet onClose={onClose} label="숨은 구독 한 번에 찾기">
      <div className="flex max-h-[82vh] flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-[#E7EAE8] pb-3.5">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF2ED] px-2.5 py-0.5 text-[11px] font-bold text-[#153D2E]">
              <Sparkles size={12} />
              비용 0원 온디바이스 스캐너
            </span>
            <h2 className="mt-1 text-[19px] font-extrabold tracking-tight text-[#111315]">
              숨은 구독 한 번에 찾기
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-[#7E8782] hover:bg-[#F7F8F6] hover:text-[#111315]"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* 3가지 무료 탐지 방식 탭 */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-[#F4F7F5] p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("device");
              setSelectedKeys(
                new Set(deviceItems.filter((i) => !i.alreadyRegistered).map(getItemKey))
              );
            }}
            className={
              "rounded-lg py-2 text-[12px] font-bold transition-all " +
              (activeTab === "device"
                ? "bg-white text-[#153D2E] shadow-2xs"
                : "text-[#6B7684] hover:text-[#111315]")
            }
          >
            1. 설치앱·알림 스캔
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("statement");
              setSelectedKeys(
                new Set(statementItems.filter((i) => !i.alreadyRegistered).map(getItemKey))
              );
            }}
            className={
              "rounded-lg py-2 text-[12px] font-bold transition-all " +
              (activeTab === "statement"
                ? "bg-white text-[#153D2E] shadow-2xs"
                : "text-[#6B7684] hover:text-[#111315]")
            }
          >
            2. 명세서·문자 분석
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("hubs")}
            className={
              "rounded-lg py-2 text-[12px] font-bold transition-all " +
              (activeTab === "hubs"
                ? "bg-white text-[#153D2E] shadow-2xs"
                : "text-[#6B7684] hover:text-[#111315]")
            }
          >
            3. 5대 결제허브
          </button>
        </div>

        {/* 본문 영역 */}
        <div className="mt-4 flex-1 overflow-y-auto pr-0.5 pb-4">
          {/* 탭 1: 기기 내 설치된 구독 앱 + 상태바 알림 스캔 */}
          {activeTab === "device" && (
            <div>
              <div className="rounded-2xl bg-[#F4F7F5] p-3.5 text-[12.5px] leading-relaxed text-[#4E5968]">
                <strong className="font-bold text-[#153D2E]">
                  휴대폰에 설치된 구독 앱과 상태바의 결제·영수증 알림
                </strong>
                을 기기 안에서 즉시 스캔합니다. 외부 서버 전송이나 비용 없이 1초 만에 찾아요.
              </div>

              {deviceLoading ? (
                <div className="py-12 text-center">
                  <LoaderCircle size={26} className="mx-auto animate-spin text-[#153D2E]" />
                  <p className="mt-2.5 text-[13px] font-semibold text-[#6B7684]">
                    설치된 구독 앱과 알림을 확인하고 있어요...
                  </p>
                </div>
              ) : deviceItems.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#F4F7F5] text-[#6B7684]">
                    <Smartphone size={22} />
                  </div>
                  <p className="mt-3 text-[14px] font-bold text-[#111315]">
                    {isNativePlatform()
                      ? "새로 발견된 구독 앱이나 활성 알림이 없어요"
                      : "안드로이드 앱에서 실행하면 설치된 구독 앱을 1초 만에 찾아드려요"}
                  </p>
                  <p className="mt-1 text-[12px] text-[#6B7684]">
                    아래 버튼으로 스캔 결과를 미리 체험하거나 [2. 명세서·문자 분석] 탭을 이용해 보세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => runDeviceScan(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#153D2E]/30 bg-[#EAF2ED] px-4 py-2.5 text-[12.5px] font-bold text-[#153D2E]"
                  >
                    <Sparkles size={14} />
                    설치된 구독 앱 스캔 시뮬레이션 보기
                  </button>
                </div>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {deviceItems.map((item) => {
                    const key = getItemKey(item);
                    const checked = selectedKeys.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleKey(key)}
                        className={
                          "flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all " +
                          (checked
                            ? "border-[#153D2E] bg-[#F4F7F5]"
                            : "border-[#E7EAE8] bg-white")
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ServiceMark
                            serviceId={item.serviceId}
                            name={item.name}
                            className="h-10 w-10 shrink-0 rounded-xl"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <strong className="text-[14px] font-bold text-[#111315]">
                                {item.name}
                              </strong>
                              <span className="rounded-md bg-[#EAF2ED] px-1.5 py-0.5 text-[10px] font-bold text-[#153D2E]">
                                {item.sourceBadge}
                              </span>
                              {item.alreadyRegistered && (
                                <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                                  이미 등록됨
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[12px] text-[#6B7684]">
                              {item.plan} · 월 {formatWon(item.amount)} · 매월 {item.dueDay}일
                            </p>
                          </div>
                        </div>
                        <span
                          className={
                            "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all " +
                            (checked
                              ? "border-[#153D2E] bg-[#153D2E] text-white"
                              : "border-[#DDE2DF] bg-white")
                          }
                        >
                          {checked && <Check size={13} strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 탭 2: 명세서·결제내역(CSV/TXT/문자 묶음) 일괄 분석 */}
          {activeTab === "statement" && (
            <div>
              <div className="rounded-2xl bg-[#F4F7F5] p-3.5 text-[12.5px] leading-relaxed text-[#4E5968]">
                카드사·토스·카카오페이·문자 보관함에서 복사한{" "}
                <strong className="font-bold text-[#153D2E]">
                  결제 내역 여러 줄이나 명세서 파일(.csv, .txt)
                </strong>
                을 넣으면 일반 쇼핑은 걸러내고{" "}
                <strong className="font-bold text-[#153D2E]">
                  정기구독·구글플레이 숨은 결제·반복 결제
                </strong>
                만 골라냅니다.
              </div>

              <input
                ref={textFileInputRef}
                type="file"
                accept=".csv,.txt,.tsv,text/plain,text/csv"
                className="hidden"
                onChange={handleFileUpload}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDE2DF] bg-white px-3 py-2 text-[12px] font-bold text-[#252A28] hover:bg-[#F7F8F6]"
                >
                  <ClipboardPaste size={14} />
                  클립보드 붙여넣기
                </button>
                <button
                  type="button"
                  onClick={() => textFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDE2DF] bg-white px-3 py-2 text-[12px] font-bold text-[#252A28] hover:bg-[#F7F8F6]"
                >
                  <FileSpreadsheet size={14} />
                  CSV · 텍스트 파일 열기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatementText(SAMPLE_STATEMENT_TEXT);
                    runStatementAnalysis(SAMPLE_STATEMENT_TEXT);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#153D2E]/25 bg-[#EAF2ED] px-3 py-2 text-[12px] font-bold text-[#153D2E]"
                >
                  <Sparkles size={14} />
                  예시 내역으로 테스트
                </button>
              </div>

              <textarea
                rows={5}
                value={statementText}
                onChange={(e) => {
                  setStatementText(e.target.value);
                  runStatementAnalysis(e.target.value);
                }}
                placeholder="여기에 결제 승인 문자 여러 건이나 카드사/토스/네이버페이 결제내역을 붙여넣어 보세요. (예: 구글플레이 14,900원, 넷플릭스 17,000원 등)"
                className="mt-2.5 w-full rounded-2xl border border-[#DDE2DF] bg-white p-3.5 text-[13px] leading-relaxed text-[#111315] outline-none focus:border-[#153D2E]"
              />

              {statementItems.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-[12px] font-bold text-[#153D2E]">
                    발견된 정기구독 {statementItems.length}건
                  </p>
                  {statementItems.map((item) => {
                    const key = getItemKey(item);
                    const checked = selectedKeys.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleKey(key)}
                        className={
                          "flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all " +
                          (checked
                            ? "border-[#153D2E] bg-[#F4F7F5]"
                            : "border-[#E7EAE8] bg-white")
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ServiceMark
                            serviceId={item.serviceId}
                            name={item.name}
                            className="h-10 w-10 shrink-0 rounded-xl"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <strong className="text-[14px] font-bold text-[#111315]">
                                {item.name}
                              </strong>
                              <span className="rounded-md bg-[#EAF2ED] px-1.5 py-0.5 text-[10px] font-bold text-[#153D2E]">
                                {item.reason}
                              </span>
                              {item.isTrial && (
                                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                  무료체험
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[12px] text-[#6B7684]">
                              {item.plan} · {formatWon(item.amount)} ({item.billingCycle}) · {item.dueDay}일 · {item.paymentMethod}
                            </p>
                          </div>
                        </div>
                        <span
                          className={
                            "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all " +
                            (checked
                              ? "border-[#153D2E] bg-[#153D2E] text-white"
                              : "border-[#DDE2DF] bg-white")
                          }
                        >
                          {checked && <Check size={13} strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 탭 3: 한국 사용자 5대 결제 허브 원클릭 조회 */}
          {activeTab === "hubs" && (
            <div className="space-y-2.5">
              <div className="rounded-2xl bg-[#F4F7F5] p-3.5 text-[12.5px] leading-relaxed text-[#4E5968]">
                카드 명세서에 <strong className="font-bold text-[#153D2E]">구글플레이·애플·네이버페이·통신비</strong>로만 찍혀서 어떤 구독인지 모르겠다면 아래 5대 허브를 눌러 숨은 정기결제를 바로 확인하세요.
              </div>
              {SUBSCRIPTION_HUBS.map((hub) => (
                <div
                  key={hub.id}
                  className="rounded-2xl border border-[#E7EAE8] bg-white p-4 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-[14.5px] font-bold text-[#111315]">
                          {hub.name}
                        </strong>
                        <span className="rounded-full bg-[#EAF2ED] px-2 py-0.5 text-[10.5px] font-bold text-[#153D2E]">
                          {hub.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-[#4E5968]">
                        {hub.description}
                      </p>
                      <p className="mt-1.5 text-[11.5px] font-medium text-[#2C6049]">
                        💡 {hub.tip}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenHub(hub)}
                      disabled={Boolean(crawlingHubId)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#153D2E] px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                    >
                      {crawlingHubId === hub.id ? (
                        <LoaderCircle size={13} className="animate-spin" />
                      ) : (
                        <>
                          {isNativePlatform() ? "불러오기" : "열기"}
                          <ExternalLink size={13} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 일괄 추가 버튼 */}
        {activeTab !== "hubs" && (
          <div className="border-t border-[#E7EAE8] pt-3">
            <button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={handleBatchAdd}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#153D2E] px-5 text-[15px] font-bold text-white transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#DDE2DF] disabled:text-[#8B95A1]"
            >
              <CheckCircle2 size={18} />
              {selectedItems.length > 0
                ? "선택한 " + String(selectedItems.length) + "개 구독 한 번에 등록하기"
                : "등록할 구독을 선택해 주세요"}
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
