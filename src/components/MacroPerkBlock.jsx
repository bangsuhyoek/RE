import React from "react";
import { ChevronRight } from "lucide-react";
import { ServiceMark } from "./ui";

/**
 * 손글씨 / 마커 빗금 구분선 (Hand-drawn Hatched Divider)
 * 기계적인 직선 대신 손으로 빗금 친 듯한 아날로그 스트로크
 */
export function HanddrawnHatchedDivider({ className = "" }) {
  return (
    <div className={`w-full my-5 sm:my-6 overflow-hidden flex items-center select-none ${className}`}>
      <svg
        className="w-full h-3.5 sm:h-4"
        viewBox="0 0 820 16"
        preserveAspectRatio="none"
        fill="none"
      >
        <g stroke="#FF6F0F" strokeLinecap="round" strokeWidth="2.5" opacity="0.85">
          <path d="
            M10,13 L18,3 M26,14 L33,4 M41,12 L50,2 M58,15 L66,3 M74,13 L81,4 M89,14 L98,2 M106,12 L114,3 M122,14 L129,5 M137,13 L145,2 M153,15 L161,4 M169,12 L177,3 M185,14 L193,4 M201,13 L209,2 M217,15 L224,4 M232,12 L241,3 M249,14 L257,2 M265,13 L272,4 M280,15 L288,3 M296,12 L304,4 M312,14 L321,2 M329,13 L336,5 M344,14 L352,3 M360,12 L369,2 M377,15 L384,4 M392,13 L401,3 M409,14 L416,2 M424,12 L433,4 M441,15 L449,3 M457,13 L464,5 M472,14 L481,2 M489,12 L496,4 M504,15 L512,3 M520,13 L528,4 M536,14 L545,2 M553,12 L561,3 M569,15 L576,5 M584,13 L593,2 M601,14 L608,4 M616,12 L625,3 M633,15 L641,2 M649,13 L656,4 M664,14 L673,3 M681,12 L688,5 M696,15 L705,2 M713,13 L720,4 M728,14 L737,3 M745,12 L753,4 M761,15 L768,2 M776,13 L785,4 M793,14 L801,3 M809,12 L816,5
          " />
        </g>
      </svg>
    </div>
  );
}

/**
 * 에디토리얼 대형 혜택 블록
 */
export function MacroPerkBlock({
  serviceId = "netflix",
  serviceName = "넷플릭스",
  solutionTitle = "네이버 멤버십 연동으로 매월 구독료 0원 전환",
  description = "이미 결제 중인 네이버플러스 멤버십을 유지하는 동안, 디지털 콘텐츠 혜택으로 넷플릭스를 추가 비용 없이 무료 시청할 수 있어요.",
  savingText = null,
  offerPriceText = null,
  isDirectMatch = false,
  badgeText = null,
  onAction,
  className = "",
}) {
  return (
    <article
      onClick={onAction}
      className={`group flex w-full items-center justify-between gap-5 sm:gap-7 py-5 sm:py-6 px-2 sm:px-3.5 transition-colors hover:bg-[#F9FAFB] rounded-2xl cursor-pointer select-none ${className}`}
      role="button"
      tabIndex={0}
    >
      {/* 1. 좌측: 대형 서비스 로고 (74x74px) */}
      <div className="relative shrink-0">
        <ServiceMark
          serviceId={serviceId}
          name={serviceName}
          className="h-16 w-16 sm:h-[74px] sm:w-[74px] rounded-[20px] shadow-sm border border-black/5"
        />
      </div>

      {/* 2. 중앙: 여백을 살린 핵심 3대 정보 */}
      <div className="min-w-0 flex-1 flex flex-col justify-center pr-1 sm:pr-2">
        {/* 서비스명 및 뱃지 */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-[18px] sm:text-[19px] font-bold tracking-tight text-[#191F28] leading-snug">
            {serviceName}
          </h3>
          {badgeText && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isDirectMatch
                ? "bg-blue-50 text-[#3182F6]"
                : "bg-gray-100 text-[#6B7684]"
            }`}>
              {badgeText}
            </span>
          )}
        </div>

        {/* 통일된 핵심 가치: 솔루션 타이틀 & 정량적 절약 금액 배지 */}
        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
          <span className="text-[15.5px] sm:text-[16px] font-extrabold tracking-tight text-[#3182F6] leading-[1.45]">
            {solutionTitle}
          </span>
          {savingText && (
            <span className="text-[13px] font-black text-[#FF6F0F] bg-[#FFF2EA] px-2 py-0.5 rounded-md tracking-tight">
              {savingText}
            </span>
          )}
        </div>

        {/* 상세 설명 가이드 (한 줄 요약) */}
        <p className="mt-1 sm:mt-1.5 text-[13px] sm:text-[13.5px] leading-[1.5] text-[#6B7684] truncate">
          {description}
        </p>
      </div>

      {/* 3. 우측: 원형 바로가기 쉐브론 버튼 */}
      <div className="shrink-0 pl-1 sm:pl-2">
        <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#F2F4F6] text-[#4E5968] transition-all group-hover:bg-[#FF6F0F] group-hover:text-white">
          <ChevronRight size={22} className="stroke-[2.5]" />
        </div>
      </div>
    </article>
  );
}
