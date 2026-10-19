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
6. 꾸독 에이전트 승인 카드: 결제 예정·요금 인상·유료 전환을 알리고 회원의 결정(이번만 허용, 항상 허용, 거절하고 해지)을 기록합니다. 승인 카드와 "항상 허용"은 결제를 직접 막거나 실행하지 않으며, 결제를 멈추려면 해당 서비스에서 직접 해지해야 합니다.
7. 해지·환불 도우미 및 증빙 기록: 환불 요청처와 요청 문구를 안내합니다. 환불 가능성은 참고 정보이며 최종 결정은 서비스 제공자 또는 카드사가 합니다.
8. AI 대화(챗봇 "꾸독") 및 온디바이스 인사이트: 동의 시 질문 답변 및 구독 추가·수정·알림 설정 작업 제안(미동의 시 온디바이스 간단 모드), 단말기 로컬 기반 무료체험·연간갱신·미사용 알림(1일 최대 1회).

제3조 (핵심 면책 조항 - 필독)
1. 계약 당사자 지위의 부존재: 회사는 구독 관리 및 해지 절차를 보조하는 정보 제공자일 뿐이며, 외부 구독 서비스 제공자(넷플릭스, 유튜브 등)와의 구독 계약 당사자가 아닙니다.
2. 해지 절차 변경 면책: 외부 업체의 화면 변경에 따라 해지 경로가 상이할 수 있으며, 최종 해지 확인 책임은 회원 본인에게 있습니다.
3. 자동 감지 및 AI 인식·대화 오차 면책: 결제 알림 감지, AI OCR 및 AI 챗봇 결과는 통신, 서식 및 LLM 특성상 오차가 있을 수 있으며, 제안된 작업 실행 및 최종 저장 전 회원 본인이 내용을 확인해야 합니다.`;

const PRIVACY_TEXT = `# 꾸독 개인정보 처리방침 (요약 및 전문)

1. 수집하는 개인정보 항목
• 회원 가입(로그인 시 필수): Google OAuth 프로필 정보(이메일, 이름/닉네임, 프로필 사진), Supabase UID. (자체 ID/비밀번호 수집 없음. 게스트 모드는 단말기 로컬에만 보관)
• 구독 관리(필수, 게스트는 기기 한정): 서비스명, 요금제, 금액, 결제일, 결제수단 라벨
• AI 영수증/캡처 분석(선택, 별도 동의): 첨부한 영수증 이미지, 복사된 결제 문자 (Google Gemini API 유료 등급 우선, Google Cloud Vision 예비)
• 실시간 결제 감지(선택): 카드사/은행/간편결제 알림 텍스트 (기기 내에서만 파싱 후 즉시 폐기, 외부 서버 미전송, 문자/메신저는 설정 시에만)
• 꾸독 에이전트 승인 기록(로그인 시): 승인 요청 종류, 서비스명, 금액, 결제 예정일, 결정과 시각, "항상 허용" 범위(구독, 한도, 본인 확인 방식, 만료일)
• 결제 증빙 보관(선택, 별도 동의): 경고가 뜬 결제의 서비스명, 금액, 일시, 결제수단 이름과 카드 끝 4자리, 해지 일시, 승인 기록 (1년 보관 후 자동 삭제)
• 해지 난이도·다크패턴 제보(선택, 별도 동의): 서비스명, 해지 단계 수, 소요 시간(10초 단위), 다크패턴 유형, 체감 난이도(1~5), 해지 결과. (개인식별정보 없이 2년 익명 통계 보관, 5건 이상 집계 시 공개, 탈퇴 시 본인 제보 파기)
• AI 대화 챗봇 꾸독 & AI 문장 해석(선택, 별도 동의): 최근 대화(최대 12건), 구독 데이터 스냅샷(카드 식별번호 미포함), 입력 문장(300자 이내). Google Gemini API 유료 등급(모델 학습 미사용, 55일 내 시스템 로그 보관 후 폐기) 국외 이전. 미동의 시 기기 내 '간단 모드'(외부 전송 없음).
• AI 해지 도우미(선택, 별도 동의): 인앱 해지 브라우저에서 화면 버튼·제목 텍스트(최대 60개, 개인정보 마스킹) 분석 (Google Gemini API 유료 등급 국외 이전).
• AI 남용 방지(시스템): 사용자 ID 기준 일일 호출 횟수 (90일 보관 후 정기 삭제, 대화 내용 미포함).
※ 카드 비밀번호, CVC, 전체 계좌/카드번호는 일체 수집하지 않습니다.
※ 생체 정보는 휴대폰이 확인하며 꾸독은 받지 않습니다. 이메일함이나 사적 메신저에는 접근하지 않습니다.
※ FCM 원격 푸시 토큰은 수집하지 않으며 단말기 로컬 푸시 알림만 사용합니다.
※ AI 대화 및 분석 데이터는 서버 DB에 저장되지 않고 즉시 폐기되며, 대화 내역은 단말기(localStorage)에만 저장됩니다.

2. 보유 및 이용 기간
• 회원 탈퇴 시 지체 없이 영구 파기 (※ 회원 탈퇴 및 데이터 내보내기 기능은 account_deletion 스트림 연동 예정)
• 결제 증빙(선택): 만든 날부터 1년 뒤 자동 삭제, 내 계정 관리에서 언제든 삭제·동의 철회 가능
• 해지 난이도 제보(선택): 2년 보관 후 자동 삭제 (익명 통계)
• AI 남용 방지 일일 호출수: 90일 보관 후 자동 삭제
• 법령에 따른 보존: 접속 로그 3개월(통신비밀보호법), 분쟁처리 기록 3년(전자상거래법)

3. 개인정보 처리 위탁 및 국외 이전
• Supabase Inc. (회원 DB 및 Google OAuth 인증 연동 관리 / 미국)
• Vercel Inc. (웹 호스팅 및 서버리스 연산 인프라 / 미국 및 글로벌 엣지)
• Google LLC (AI 대화, 문장 해석, 해지 도우미, 영수증 OCR / Gemini API 유료 등급 및 Cloud Vision / 미국 등 Google 데이터센터 / 문의: https://support.google.com/policies/troubleshooter/7575787 )
모든 전송 구간은 TLS 최고 등급 암호화가 적용되며, Supabase 인프라 저장 시 데이터베이스 디스크, 스토리지 및 백업본은 업계 표준 AES-256 암호화가 기본 적용됩니다.`;

const CONSENT_TEXT = `# 앱 접근 권한 및 눈에 띄는 사전 고지서 (Prominent Disclosure)

1. 실시간 결제 감지 알림 접근 권한 (BIND_NOTIFICATION_LISTENER_SERVICE)
• 목적: 웹/앱에서 구독 결제 시 카드사/은행/간편결제 푸시를 감지해 바로 등록 팝업 제공
• 안전 보증: 금융/결제/앱스토어 알림만 선별 확인하며, 사적인 메신저/문자/이메일은 절대 접근하지 않습니다(문자·메신저는 설정 시에만 활성화). 알림 내용은 기기 내에서만 온디바이스 분석 후 즉시 소멸됩니다.
• 증빙 보관(선택): 경고가 뜬 결제에 한해 회원이 따로 동의하면 요약(서비스명·금액·일시·카드 끝 4자리)만 계정에 1년 보관합니다.

2. AI 해지 도우미 국외 이전 동의 (선택)
• 목적: 인앱 해지 브라우저에서 복잡한 해지 화면 이동 시 다음 버튼 및 이동 경로 안내
• 안전 보증: 버튼·제목 텍스트에서 이름·이메일·전화번호·카드번호 등 식별정보를 마스킹 처리한 후 Google Gemini API 유료 등급(모델 학습 미사용)으로 전송합니다. 외부 오버레이 권한(SYSTEM_ALERT_WINDOW)은 일체 요구하지 않습니다.

3. 알림 권한 (POST_NOTIFICATIONS)
• 결제 예정일 D-3, D-1, 당일 사전 단말기 로컬 푸시 알림 발송 목적 (원격 FCM 푸시 미사용)

4. 생체인증 (USE_BIOMETRIC, 선택)
• 목적: "이 금액 이하면 항상 허용" 범위를 만들 때 지문·얼굴 또는 휴대폰 잠금으로 본인 확인
• 안전 보증: 생체 정보는 휴대폰이 확인하며 꾸독은 성공 여부만 받습니다 (androidx.biometric 라이브러리 연동, 매니페스트 직접 선언 없음).

5. AI 대화(챗봇 "꾸독") 및 AI 문장 해석 국외 이전 동의 (선택)
• 목적: AI 답변 생성 및 구독 추가·수정·알림 작업 제안, 자연어 문장 기반 구독 자동 등록 (Google Gemini API 유료 등급)
• 이전받는 자 및 연락처: Google LLC (주소: 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA / 문의: https://support.google.com/policies/troubleshooter/7575787 )
• 전송 항목: 최근 대화(최대 12건), 구독 데이터 스냅샷, 입력 문장(300자 이내) (카드번호 등 금융 식별정보 일체 미포함)
• 안전 보증: 유료 등급 계약 적용(모델 학습 미사용, 55일 내 시스템 로그 보관 후 폐기), 서버 미저장(즉시 폐기), 단말기에만 대화 보관([대화 지우기] 제공), [AI 데이터 전송 끄기] 시 온디바이스 '간단 모드'(외부 전송 없음) 전환.`;

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
                  <li>자체 ID/비밀번호 없이 Google OAuth 연동 및 Supabase AES-256 저장 암호화 적용.</li>
                  <li>실시간 결제 알림은 기기 내에서만 온디바이스 파싱 후 즉시 폐기됩니다.</li>
                  <li>AI 유료 등급 계약으로 이용자 데이터를 인공지능 모델 학습에 사용하지 않습니다.</li>
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
                  <li>결제 알림 접근: 오직 카드사/은행/페이 결제 승인 알림만 선별 감지합니다.</li>
                  <li>오버레이 권한 불필요: 전용 인앱 브라우저에서 안전하게 해지 가이드를 제공합니다.</li>
                  <li>사적인 메신저, 개인 문자, 이메일함 등에 대한 접근은 일체 수행하지 않습니다.</li>
                </ul>
              </div>
              <div className="whitespace-pre-line text-[12.5px] leading-6 text-[#333D4B]">
                {CONSENT_TEXT}
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-[#8B95A1]">
          시행일자: 2026년 10월 19일 (v1.3) · 상세 전문은 docs/terms/ 문서에서 확인하실 수 있습니다.
        </p>
      </div>
    </BottomSheet>
  );
}
