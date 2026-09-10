import { useState, useRef, useEffect } from "react";
import { BottomSheet, SegmentedControl } from "./ui";
import { FileText, Shield, KeyRound, X } from "lucide-react";

const TERMS_TEXT = `# 꾸독 서비스 이용약관 (요약 및 전문)

제1조 (목적)
본 약관은 "꾸독"(이하 "회사")가 제공하는 구독 관리, 결제 알림 감지, 해지 보조 및 관련 제반 서비스의 이용 조건 및 절차를 규정합니다.

제2조 (서비스의 내용)
1. 구독 지출 종합 관리: 월간/연간 지출 통계 및 캘린더 분석
2. 결제 예정 사전 알림: D-3, D-1 결제 예정 알림
3. 실시간 결제 감지 및 퀵 등록: 카드사/간편결제 알림 수신 시 신규 구독 즉시 등록
4. AI 영수증/문자 인식: 영수증 사진 및 결제 문자를 통한 자동 입력
5. 해지 보조 도우미: 외부 구독 서비스 공식 해지 경로 안내 및 오버레이 가이드

제3조 (핵심 면책 조항 - 필독)
1. 계약 당사자 지위의 부존재: 회사는 구독 관리 및 해지 절차를 보조하는 정보 제공자일 뿐이며, 외부 구독 서비스 제공자(넷플릭스, 유튜브 등)와의 구독 계약 당사자가 아닙니다.
2. 해지 절차 변경 면책: 외부 업체의 화면 변경에 따라 해지 경로가 상이할 수 있으며, 최종 해지 확인 책임은 회원 본인에게 있습니다.
3. 자동 감지/AI 오차 면책: 결제 알림 감지 및 AI OCR 결과는 통신 및 서식에 따라 오차가 있을 수 있으므로, 최종 저장 전 회원 본인이 내용을 확인해야 합니다.`;

const PRIVACY_TEXT = `# 꾸독 개인정보 처리방침 (요약 및 전문)

1. 수집하는 개인정보 항목
• 회원 가입(필수): 아이디, 이메일, 닉네임, 암호화된 비밀번호
• 구독 관리(필수): 서비스명, 요금제, 금액, 결제일, 결제수단 라벨
• AI 영수증 분석(선택): 첨부한 영수증 이미지, 복사된 결제 문자
• 실시간 결제 감지(선택): 카드사/페이 알림 텍스트 (기기 내에서만 파싱 후 즉시 폐기, 외부 서버 전송 없음)
※ 카드 비밀번호, CVC, 전체 계좌/카드번호는 일체 수집하지 않습니다.

2. 보유 및 이용 기간
• 회원 탈퇴 시 지체 없이 영구 파기

3. 개인정보 처리 위탁 및 국외 이전
• Supabase Inc. (회원 DB 및 인증 관리 / 미국)
• Vercel Inc. (호스팅 및 연산 인프라 / 미국)
• Google LLC (영수증 이미지 AI OCR 분석 / 미국)
모든 전송 구간은 SSL/TLS 최고 등급 암호화가 적용됩니다.`;

const CONSENT_TEXT = `# 앱 접근 권한 및 눈에 띄는 사전 고지서 (Prominent Disclosure)

1. 실시간 결제 감지 알림 접근 권한 (BIND_NOTIFICATION_LISTENER_SERVICE)
• 목적: 웹/앱에서 구독 결제 시 카드사 푸시를 감지해 바로 등록 팝업 제공
• 안전 보증: 신한, KB, 현대, 토스, 카카오페이 등 결제 알림만 선별 확인하며, 사적인 메신저/문자/이메일은 절대 접근하지 않습니다. 알림 내용은 기기 내에서만 분석 후 즉시 소멸됩니다.

2. 해지 보조 다른 앱 위에 표시 권한 (SYSTEM_ALERT_WINDOW)
• 목적: 넷플릭스 등 해지 웹페이지 이동 시 화면 한쪽에 플로팅 해지 팁 표시
• 안전 보증: 키보드 입력 및 화면 캡처를 일체 수행하지 않으며, 해지 도우미 종료 즉시 화면에서 제거됩니다.

3. 알림 권한 (POST_NOTIFICATIONS)
• 결제 예정일 D-3, D-1 사전 알림 발송 목적`;

export function TermsModal({ initialTab = "terms", onClose }) {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentTab]);

  return (
    <BottomSheet onClose={onClose} label="꾸독 약관 및 정책">
      <div className="pb-2">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#191F28] text-white">
              <Shield size={16} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#191F28]">약관 및 정책</h2>
              <p className="text-[11px] text-[#71717A]">꾸독의 이용약관 및 개인정보 보호정책</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-black"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        <SegmentedControl
          className="mt-3"
          value={currentTab}
          onChange={setCurrentTab}
          options={[
            { value: "terms", label: "이용약관", icon: <FileText size={13} /> },
            { value: "privacy", label: "개인정보", icon: <Shield size={13} /> },
            { value: "permissions", label: "권한고지", icon: <KeyRound size={13} /> },
          ]}
        />

        <div ref={contentRef} className="mt-4 max-h-[380px] overflow-y-auto rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] p-4 text-[13px] leading-relaxed text-[#333D4B] font-sans">
          {currentTab === "terms" && (
            <div>
              <div className="mb-3.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-[12px] text-blue-950">
                <strong className="block font-bold mb-1">💡 이용약관 핵심 요약</strong>
                <ul className="space-y-0.5 text-[11px] text-blue-900/90 list-disc list-inside">
                  <li>꾸독은 계약 당사자가 아닌 구독 관리 보조 서비스입니다.</li>
                  <li>최종 결제 및 해지 확인 책임은 이용자 본인에게 있습니다.</li>
                  <li>결제 감지 및 AI 인식 오차 가능성을 감안해 최종 확인을 권장합니다.</li>
                </ul>
              </div>
              <div className="whitespace-pre-line text-[12.5px] leading-6 text-[#333D4B]">
                {TERMS_TEXT}
              </div>
            </div>
          )}
          {currentTab === "privacy" && (
            <div>
              <div className="mb-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-[12px] text-emerald-950">
                <strong className="block font-bold mb-1">🔒 개인정보 보호 핵심 원칙</strong>
                <ul className="space-y-0.5 text-[11px] text-emerald-900/90 list-disc list-inside">
                  <li>카드 비밀번호, CVC, 전체 계좌번호는 일체 수집하지 않습니다.</li>
                  <li>실시간 결제 알림은 기기 내에서만 파싱 후 즉시 폐기됩니다.</li>
                  <li>회원 탈퇴 시 모든 개인정보는 지체 없이 영구 파기됩니다.</li>
                </ul>
              </div>
              <div className="whitespace-pre-line text-[12.5px] leading-6 text-[#333D4B]">
                {PRIVACY_TEXT}
              </div>
            </div>
          )}
          {currentTab === "permissions" && (
            <div>
              <div className="mb-3.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[12px] text-amber-950">
                <strong className="block font-bold mb-1">🛡️ 권한 사용 및 안전 보증</strong>
                <ul className="space-y-0.5 text-[11px] text-amber-900/90 list-disc list-inside">
                  <li>결제 알림 접근: 오직 카드사/페이 결제 승인 알림만 선별 감지합니다.</li>
                  <li>다른 앱 위에 표시: 해지 공식 사이트 이동 시 화면 구석 미니 팁 표시.</li>
                  <li>사적인 메신저, 문자, 사진 등에 대한 접근은 일체 수행하지 않습니다.</li>
                </ul>
              </div>
              <div className="whitespace-pre-line text-[12.5px] leading-6 text-[#333D4B]">
                {CONSENT_TEXT}
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-[#8B95A1]">
          시행일자: 2026년 9월 7일 · 상세 전문은 docs/terms/ 문서에서 확인하실 수 있습니다.
        </p>
      </div>
    </BottomSheet>
  );
}
