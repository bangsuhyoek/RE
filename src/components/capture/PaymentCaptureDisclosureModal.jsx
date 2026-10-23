import { useState } from "react";
import { ShieldCheck, CheckCircle2, Lock, Smartphone, RefreshCw, X } from "lucide-react";
import { BottomSheet, Button } from "../ui";

/**
 * Google Play 눈에 띄는 사전 고지 및 동의(Prominent Disclosure & Consent) 모달
 *
 * 구글 플레이 정책 필수 요구사항 충족:
 * 1. 무엇을 읽는지: 결제 앱 알림의 금액, 가맹점, 결제일시, 결제수단 등 구독 등록에 필요한 정보만 선별 추출
 * 2. 어떤 앱을 읽는지: 카드사, 은행, 간편결제, 앱스토어, 통신사 공식 앱 (화이트리스트 등록 앱)
 * 3. 목적: 정기 결제 및 구독 서비스를 감지하여 자동 등록 팝업 제공
 * 4. 데이터 보관 위치: 알림 원문은 기기 밖으로 전송되지 않으며 온디바이스에서 즉시 분석 후 파기.
 *    이용자가 직접 확인하고 등록한 구독 정보만 로컬(또는 로그인 시 본인 계정)에 안전하게 저장.
 * 5. 언제든지 철회 가능: 계정 설정에서 동의 철회 및 시스템 설정에서 알림 접근 권한 해제 가능
 * 6. 명시적 "동의하고 계속" 및 "취소" 버튼: 취소 시 알림 접근 권한 설정으로 이동하지 않으며 수동 등록 유지
 */
export function PaymentCaptureDisclosureModal({
  isOpen,
  onConfirm,
  onCancel,
}) {
  const [showFullWhitelist, setShowFullWhitelist] = useState(false);

  if (!isOpen) return null;

  return (
    <BottomSheet onClose={onCancel} label="결제 알림 자동 감지 안내 및 동의">
      <div className="space-y-4 text-[#191F28]" data-testid="payment-capture-disclosure-modal">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#F2F4F6] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold tracking-tight text-[#191F28]">
                결제 알림 감지 사전 고지 및 동의
              </h2>
              <p className="text-[11.5px] text-[#8B95A1]">
                구글 플레이 사용자 보호 정책에 따른 접근 권한 사전 안내
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-[#8B95A1] hover:bg-[#F2F4F6] hover:text-[#191F28]"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Core Purpose */}
        <div className="rounded-xl bg-emerald-50/80 p-3.5 text-[12.5px] leading-relaxed text-emerald-950 border border-emerald-100">
          <p className="font-semibold mb-1 flex items-center gap-1.5 text-emerald-900">
            <Smartphone size={15} className="shrink-0" />
            왜 알림 접근 권한이 필요한가요?
          </p>
          <p className="text-[12px] text-emerald-800/90 leading-normal">
            꾸독은 카드 결제나 간편결제가 일어났을 때, 번거로운 직접 입력 없이
            <strong> 구독 결제 자동 등록 팝업</strong>을 띄워 드리기 위해 안드로이드 알림 접근 권한(NotificationListenerService)을 사용합니다.
          </p>
        </div>

        {/* Detailed Disclosure Items */}
        <div className="space-y-2.5 text-[12px]">
          {/* 1. What is read */}
          <div className="rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] p-3">
            <strong className="block font-semibold text-[#191F28] mb-1 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              수집 및 확인 항목
            </strong>
            <p className="text-[#4E5968] leading-relaxed">
              결제 관련 알림 내의 <strong>결제 금액, 가맹점/서비스명, 결제 일시, 결제 수단</strong>만을 선별하여 읽습니다.
              개인적인 대화나 사적인 메시지 내용은 절대 읽지 않습니다.
            </p>
          </div>

          {/* 2. Whitelist Apps */}
          <div className="rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] p-3">
            <strong className="block font-semibold text-[#191F28] mb-1 flex items-center gap-1.5">
              <Smartphone size={14} className="text-emerald-600 shrink-0" />
              감지 대상 앱 (화이트리스트 지정 앱)
            </strong>
            <p className="text-[#4E5968] leading-relaxed">
              등록된 금융 및 결제 공식 앱의 알림만 감지합니다.
            </p>
            <div className="mt-1.5 text-[11px] text-[#6B7684] space-y-0.5">
              <p>• <strong>카드사:</strong> 신한, KB, 현대, 삼성, 우리, 롯데, 하나, 비씨, 농협, 기업</p>
              <p>• <strong>은행 & 간편결제:</strong> 토스, 카카오페이, 네이버페이, 페이코, 삼성월렛, 주요 시중은행</p>
              <p>• <strong>스토어 & 통신사:</strong> Google Play 스토어, 원스토어, 통신 3사(T world, KT, U+)</p>
            </div>
            {showFullWhitelist ? (
              <div className="mt-2 text-[10.5px] text-[#8B95A1] border-t border-[#E5E8EB] pt-1.5 leading-relaxed">
                * 문자(SMS), 메신저(카카오톡 알림톡), 이메일 앱은 기본적으로 제외되며,
                이용자가 [알림 수집 범위]에서 직접 켤 때에만 결제 알림을 선별 확인합니다.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowFullWhitelist(true)}
                className="mt-1 text-[11px] font-medium text-emerald-600 underline"
              >
                선택 수집 대상 자세히 보기
              </button>
            )}
          </div>

          {/* 3. Data Storage & Privacy */}
          <div className="rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] p-3">
            <strong className="block font-semibold text-[#191F28] mb-1 flex items-center gap-1.5">
              <Lock size={14} className="text-emerald-600 shrink-0" />
              데이터 보관 및 처리 방식
            </strong>
            <p className="text-[#4E5968] leading-relaxed">
              수신된 알림 원문은 외부 서버로 전송되지 않으며, <strong>사용자 기기 내부(On-Device)에서 즉시 분석 후 파기</strong>됩니다.
              사용자가 팝업에서 직접 확인하고 등록을 완료한 구독 정보만 안전하게 보관됩니다.
            </p>
          </div>

          {/* 4. Revocation */}
          <div className="rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] p-3">
            <strong className="block font-semibold text-[#191F28] mb-1 flex items-center gap-1.5">
              <RefreshCw size={14} className="text-emerald-600 shrink-0" />
              언제든지 동의 철회 및 비활성화 가능
            </strong>
            <p className="text-[#4E5968] leading-relaxed">
              본 동의는 언제든지 [계정 설정]에서 철회하거나 안드로이드 시스템 설정의 [알림 접근 허용]에서 비활성화할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            className="flex-1 !py-3 !text-[13px] !text-[#4E5968]"
            onClick={onCancel}
          >
            취소
          </Button>
          <Button
            type="button"
            className="flex-1 !py-3 !text-[13px] !bg-emerald-600 !text-white hover:!bg-emerald-700 font-semibold"
            onClick={onConfirm}
          >
            동의하고 계속
          </Button>
        </div>

        <p className="text-center text-[10.5px] text-[#8B95A1] pb-1">
          취소하더라도 구독 수동 등록 및 검색 등 꾸독의 모든 기본 기능은 제한 없이 사용하실 수 있습니다.
        </p>
      </div>
    </BottomSheet>
  );
}
