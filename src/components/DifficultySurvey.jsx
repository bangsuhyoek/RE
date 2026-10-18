import { useState } from "react";
import { AlertCircle, CheckCircle2, ShieldCheck, ThumbsUp, X } from "lucide-react";
import { Button } from "./ui";
import {
  buildDifficultyReport,
  grantDifficultyConsent,
  readDifficultyConsent,
  submitDifficultyReport,
} from "../lib/cancelDifficulty";

/**
 * 해지 후 난이도 및 다크패턴 조사 컴포넌트
 * - 동의된 상태: 즉시 설문 문항 노출
 * - 미동의 상태(로그인 유저): 1줄 참여 권유 배너 노출 후 동의 시 설문으로 전환
 * - 프라이버시 원칙: "익명으로 저장돼요. 누가 보냈는지 남기지 않아요."
 */
export function DifficultySurvey({ serviceId, session, userId, onDone }) {
  const [consented, setConsented] = useState(() => Boolean(readDifficultyConsent(userId)));
  const [phoneOnly, setPhoneOnly] = useState(false);
  const [hiddenMenu, setHiddenMenu] = useState(false);
  const [retentionOffer, setRetentionOffer] = useState(false);
  const [forcedSurvey, setForcedSurvey] = useState(false);
  const [difficulty, setDifficulty] = useState(3);
  const [outcome, setOutcome] = useState("cancelled");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleOptIn = () => {
    grantDifficultyConsent(userId);
    setConsented(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    const row = buildDifficultyReport(session, {
      serviceId,
      phoneOnly,
      hiddenMenu,
      retentionOfferShown: retentionOffer,
      forcedSurveyOrChat: forcedSurvey,
      difficulty,
      outcome,
    });

    const res = await submitDifficultyReport(row, { userId });
    setSubmitting(false);

    const isDuplicate = res?.skipped && res?.reason === "duplicate";
    const isSuccess = res?.success === true;

    if (isSuccess || isDuplicate) {
      if (isDuplicate) {
        setDuplicateMessage(true);
      }
      setSubmitted(true);
      setTimeout(() => {
        onDone?.();
      }, 1200);
      return;
    }

    // 실패(not success and not duplicate) 시 재시도 가능한 에러 표시
    setErrorMessage("전송하지 못했어요. 잠시 후 다시 시도해 주세요.");
  };

  // 이미 제출 완료된 상태
  if (submitted) {
    return (
      <div className="mt-4 w-full rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left">
        <div className="flex items-center justify-center gap-1.5 text-[13px] font-bold text-emerald-950">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{duplicateMessage ? "오늘 이미 제보했어요" : "제보해 주셔서 감사해요!"}</span>
        </div>
        <p className="mt-1 text-[11px] text-emerald-800">
          {duplicateMessage
            ? "소중한 경험을 이미 남겨주셨어요. 내일 다시 참여하실 수 있어요."
            : "다른 사용자들의 해지 난이도 분석에 익명으로 반영돼요."}
        </p>
      </div>
    );
  }

  // 미로그인 상태면 노출하지 않음
  if (!userId) {
    return null;
  }

  // 미동의 상태: 1줄 참여 권유 프롬프트
  if (!consented) {
    return (
      <div className="mt-4 w-full rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] p-3.5 text-left">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-[#191F28]">
              해지 과정이 어떠셨나요?
            </p>
            <p className="mt-0.5 text-[11px] text-[#8B95A1]">
              익명으로 경험을 나누고 다크패턴 지수 작성에 참여해보세요.
            </p>
          </div>
          <Button
            size="compact"
            variant="secondary"
            className="shrink-0 !text-[11px] !px-2.5 !py-1.5"
            onClick={handleOptIn}
          >
            참여하기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 w-full rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-2xs text-left" data-testid="difficulty-survey">
      <div className="flex items-start justify-between gap-2 border-b border-[#F2F4F6] pb-2.5">
        <div>
          <strong className="text-[13px] font-bold text-[#191F28]">
            해지 경험 익명 제보
          </strong>
          <p className="mt-0.5 text-[11px] text-[#3182F6] font-medium flex items-center gap-1">
            <ShieldCheck size={13} />
            익명으로 저장돼요. 누가 보냈는지 남기지 않아요.
          </p>
        </div>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-[#8B95A1] hover:text-[#191F28] p-1"
            aria-label="건너뛰기"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* 에러 메시지 알림 */}
      {errorMessage && (
        <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-[12px] font-medium text-red-600">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 빠른 토글 질문들 */}
      <div className="mt-3 space-y-2">
        <label className="flex items-center justify-between rounded-xl border border-[#F2F4F6] bg-[#F9FAFB] px-3 py-2 cursor-pointer transition-colors hover:bg-[#F2F4F6]">
          <span className="text-[12px] font-medium text-[#333D4B]">전화로만 해지됐나요?</span>
          <input
            type="checkbox"
            checked={phoneOnly}
            onChange={(e) => setPhoneOnly(e.target.checked)}
            className="h-4 w-4 rounded accent-[#191F28]"
          />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-[#F2F4F6] bg-[#F9FAFB] px-3 py-2 cursor-pointer transition-colors hover:bg-[#F2F4F6]">
          <span className="text-[12px] font-medium text-[#333D4B]">해지 메뉴를 찾기 어려웠나요?</span>
          <input
            type="checkbox"
            checked={hiddenMenu}
            onChange={(e) => setHiddenMenu(e.target.checked)}
            className="h-4 w-4 rounded accent-[#191F28]"
          />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-[#F2F4F6] bg-[#F9FAFB] px-3 py-2 cursor-pointer transition-colors hover:bg-[#F2F4F6]">
          <span className="text-[12px] font-medium text-[#333D4B]">할인 제안이나 만류 화면이 나왔나요?</span>
          <input
            type="checkbox"
            checked={retentionOffer}
            onChange={(e) => setRetentionOffer(e.target.checked)}
            className="h-4 w-4 rounded accent-[#191F28]"
          />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-[#F2F4F6] bg-[#F9FAFB] px-3 py-2 cursor-pointer transition-colors hover:bg-[#F2F4F6]">
          <span className="text-[12px] font-medium text-[#333D4B]">설문이나 상담원 채팅을 강제했나요?</span>
          <input
            type="checkbox"
            checked={forcedSurvey}
            onChange={(e) => setForcedSurvey(e.target.checked)}
            className="h-4 w-4 rounded accent-[#191F28]"
          />
        </label>
      </div>

      {/* 체감 난이도 (1-5) */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#4E5968]">체감 난이도</span>
          <span className="text-[11px] font-semibold text-[#3182F6]">
            {difficulty === 1 && "매우 쉬움 (1)"}
            {difficulty === 2 && "쉬움 (2)"}
            {difficulty === 3 && "보통 (3)"}
            {difficulty === 4 && "어려움 (4)"}
            {difficulty === 5 && "매우 어려움 (5)"}
          </span>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setDifficulty(val)}
              className={
                "flex-1 rounded-xl py-1.5 text-[12px] font-bold transition-all " +
                (difficulty === val
                  ? "bg-[#191F28] text-white shadow-xs"
                  : "bg-[#F2F4F6] text-[#6B7684] hover:bg-[#E5E8EB]")
              }
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* 해지 결과 */}
      <div className="mt-3">
        <span className="text-[12px] font-bold text-[#4E5968]">해지 결과</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOutcome("cancelled")}
            className={
              "rounded-xl py-2 text-[12px] font-bold transition-all " +
              (outcome === "cancelled"
                ? "border-2 border-[#191F28] bg-white text-[#191F28]"
                : "border border-[#E5E8EB] bg-[#F9FAFB] text-[#6B7684]")
            }
          >
            해지 완료
          </button>
          <button
            type="button"
            onClick={() => setOutcome("gave_up")}
            className={
              "rounded-xl py-2 text-[12px] font-bold transition-all " +
              (outcome === "gave_up"
                ? "border-2 border-[#F04452] bg-white text-[#F04452]"
                : "border border-[#E5E8EB] bg-[#F9FAFB] text-[#6B7684]")
            }
          >
            중도 포기
          </button>
        </div>
      </div>

      {/* 제출 / 건너뛰기 버튼 */}
      <div className="mt-4 flex gap-2">
        {onDone && (
          <Button
            size="medium"
            variant="secondary"
            className="flex-1"
            onClick={onDone}
            disabled={submitting}
          >
            건너뛰기
          </Button>
        )}
        <Button
          size="medium"
          className="flex-1"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "제출 중..." : errorMessage ? "다시 시도하기" : "익명 제보하기"}
        </Button>
      </div>
    </div>
  );
}
