# SubMate(꾸독) 구독 승인 에이전트 최종 기획서

- 문서 버전: v1.5 ('오늘 챙길 일': 해지 확인 루프, 무료체험 가드, 사용 체크, 정산 요청, 구독 순환)
- 작성일: 2026-10-01 / 수정일: 2026-10-04
- 상태: 1단계(MVP) 개발 착수 가능 / 2단계 출시 전 확인 필요 / 3단계 제휴·법률 검토 후 착수
- 리서치 보조: Gemini 3.8 Flash(국내 동향·규제 1차 조사). 주요 수치와 법 해석은 공식 출처로 재확인함

## 0. 한 줄 결론

ChatGPT 닷(dots)처럼 "결제 직전에 사용자 승인을 받는" 경험을 SubMate에 도입한다. 1단계는 결제를 막지 않는 **갱신 승인 카드 + 해지·환불 도우미 + 증빙 자동 수집**으로 바로 출시하고, 실제 결제 승인·거절은 카드사 제휴가 확정된 3단계에서 붙인다. SubMate는 어느 단계에서도 카드번호나 결제대금을 직접 다루지 않는다.

## 1. 배경과 벤치마크

### 1.1 ChatGPT 닷과 에이전트 결제 구조

| 구성 | 확인된 내용 | 출처 |
|---|---|---|
| 닷 출시 | 2026-09-29 발표. 클라우드의 자체 컴퓨터·브라우저를 쓰는 상시 에이전트. Pro·Business Premium 우선, Enterprise 베타 | [Introducing dots](https://openai.com/index/introducing-dots/) |
| 결제 직전 승인 | 구매 완료 전 사용자 승인 필수. 가맹점·상품·금액·결제수단이 명확히 범위 안일 때만 사전 승인 허용. 카드번호 전체·CVV·PIN·인증번호는 채팅에 입력하지 않음 | [앱 권한 관리](https://help.openai.com/en/articles/20001495-managing-app-permissions-in-chatgpt), [Dots 보안 FAQ](https://help.openai.com/en/articles/20001529-dots-privacy-security-and-safety-faqs) |
| 결제 위임 규격 | Agentic Commerce Protocol(ACP). 특정 가맹점·이번 구매에만 쓰이는 일회용 결제 토큰, 최대 금액·만료 시간 | [ACP 결제 규격](https://agentic-commerce-protocol.com/docs/commerce/specs/payment), [ACP 핵심 개념](https://developers.openai.com/commerce/guides/key-concepts) |
| 카드 네트워크 | Visa Intelligent Commerce·Mastercard Agent Pay. 카드·에이전트·가맹점·한도에 묶인 대체 번호(토큰) 사용. 최종 승인·거절은 카드사 | [Visa–OpenAI](https://corporate.visa.com/en/sites/visa-perspectives/innovation/visa-openai-partnership.html), [Mastercard Agent Pay](https://www.mastercard.com/us/en/business/artificial-intelligence/mastercard-agent-pay.html) |

흐름 요약:

```text
사용자 요청 → 에이전트가 결제 준비 → 정책 확인(한도·가맹점·승인 필요 여부)
→ 사용자 승인 카드 → 대체 번호(토큰) 발급 → 카드사가 최종 승인/거절
```

### 1.2 국내 현황

| 주체 | 내용 | 출처 |
|---|---|---|
| 카카오페이 | 2025-08 결제 MCP·Agent Toolkit 공개. 결제 준비·승인·취소·조회·정기결제를 에이전트 도구로 제공. 가맹점(판매자) 측 도구 | [카카오](https://www.kakaocorp.com/page/detail/11760), [GitHub](https://github.com/kakaopay-develop/agent-toolkit) |
| 신한카드 × Mastercard | 2026-03-30 국내 첫 에이전트 결제 실거래. 사용자는 마지막에 한 번 승인. 실증 단계 | [신한금융](https://www.shinhangroup.com/kr/archive/press/detail/692), [Mastercard](https://newsroom.mastercard.com/news/ap/en/newsroom/press-releases/en/2026/mastercard-completes-korea-s-first-live-agentic-transactions-unlocking-trusted-ai-powered-commerce/) |
| Visa Korea | 2025-11 LG U+ ixi-O 파일럿, 2026-04 '에이전틱 레디' 프로그램에 KB국민·삼성·신한·카카오뱅크·하나·현대카드 참여 | [Visa Korea 2025-11](https://www.visakorea.com/about-visa/newsroom/press-releases/nr-kr-251125.html), [Visa Korea 2026-04](https://www.visakorea.com/about-visa/newsroom/press-releases/nr-kr-260430.html) |
| 토스페이먼츠·네이버페이·KG이니시스 | 소비자용 에이전트 결제 상품 미확인 | 공식 발표 미확인 |

시사점: 결제 직전 승인 구조는 사실상 표준이 되었고 국내 카드사는 실증 단계다. 따라서 승인 경험과 해지·환불 지원을 먼저 만들고, 카드사 연동은 제휴로 붙인다.

### 1.3 규제 환경

- **다크패턴 규제(개정 전자상거래법, 2025-02-14 시행)**: 무료체험의 유료 전환·가격 인상 시 30일 내 별도 명시 동의 필요(창 닫기·무응답은 동의 아님). 가입보다 해지를 어렵게 하는 행위 규제. 피해 증빙으로 가입 화면·인상 고지·결제 내역·해지 시도 기록 보관 권장. ([공정위](https://www.ftc.go.kr/www/selectBbsNttView.do?bordCd=3&key=12&nttSn=43802&pageIndex=1&pageUnit=10&rltnNttSn=43802&searchCnd=all&searchViolt=000002), [정책브리핑](https://m.korea.kr/news/customizedNewsView.do?newsId=148939703))
- **청약철회**: 전자상거래법상 원칙 7일. 디지털 콘텐츠 사용분은 제한될 수 있음.
- **해외결제 이의제기(차지백)**: Mastercard는 해지 후 계속된 정기결제에 대해 결제 정산일(0일)부터 120일 안에 이의제기하도록 하고, 해지일·해지 확인 메일·캡처·가맹점과의 연락 기록을 증빙으로 본다. 한국소비자원은 Visa·Mastercard·American Express 통상 120일, UnionPay 통상 180일로 안내하되 카드사 안내가 우선이며 카드사 자체 마감은 더 짧을 수 있다고 본다. 신청은 국내 발급 카드사에 한다. ([Mastercard Chargeback Guide](https://www.mastercard.com/content/dam/mccom/shared/business/support/rules-pdfs/chargeback-guide.pdf), [한국소비자원](https://www.kca.go.kr/home/sub.do?menukey=7815&mode=view&no=1004353732))
- **전자금융거래법 PG 등록**: 금융위원회는 등록 PG가 대금을 수취·정산하고 플랫폼은 정산에 필요한 정보만 전달하는 구조라면 플랫폼은 PG 등록이 필요 없다고 설명한다. 그러나 대법원은 정보 송수신뿐 아니라 정산 대행·매개도 PG 업무로 보며, 다른 PG가 송금 일부를 맡더라도 자금 흐름에 실질적으로 관여하면 예외를 인정하지 않을 수 있다고 판단했다. 개정 전자금융거래법은 2026년 12월경 시행 예정으로 PG 정의·예외 범위가 구체화되므로 시행령·감독규정을 함께 확인한다. ([금융위원회 설명](https://www.fsc.go.kr/no010102/82523), [대법원 2016도2649](https://www.law.go.kr/LSW/precInfoP.do?precSeq=199847), [금융위원회 개정 안내](https://fsc.go.kr/po010106/85751), [입법예고](https://www.fsc.go.kr/po040301/view?noticeId=4155))
  - 설계 원칙: SubMate는 어느 단계에서도 결제 금액 결정, 송금·지급 지시, 환불·차감 처리를 하지 않고 승인 화면과 권한 범위 관리만 맡는다. 3단계 착수 전 실제 결제 흐름도를 첨부해 금융당국 법령해석 또는 비조치의견서를 받는다.

## 2. 문제 정의와 목표

| 사용자 문제 | 현재 SubMate | 목표 |
|---|---|---|
| 모르는 사이 자동 갱신·인상·유료 전환 | 결제 문자 감지 후 사후 알림, D-3/D-1 알림 | 결제 **전**에 승인 여부를 묻고 즉시 해지로 연결 |
| 해지해도 환불은 따로 요청해야 하고 요청처가 결제 경로마다 다름 | 해지 페이지 이동·가이드 | 결제 경로·경과일 기반 환불 요청처·가능성 안내, 요청 문구 생성 |
| 해지 후 계속 결제, 해외 가맹점 대응 어려움 | 없음 | 증빙 자동 수집 → 신고·이의제기 키트 |

비목표: 사용자 계정 비밀번호를 받아 대신 로그인하는 해지·환불 대행, SubMate 명의 결제·정산, 카드번호 저장, 사용자 이메일함 읽기(14장 참고).

## 3. 단계별 범위

| 단계 | 기능 | 결제를 막는가 | 전제 조건 | 착수 |
|---|---|---|---|---|
| 1. MVP | 갱신 승인 카드, 인상·전환 경고, 해지·환불 원스톱, 증빙 자동 수집 | 아니요 | 현재 코드로 가능 | 즉시 |
| 2 | 다크패턴 신고·해외결제 이의제기 키트 | 아니요(사후 회수) | 카드사별 접수 경로·마감 확인 | 1단계 후 |
| 3 | 실제 에이전트 결제 승인·거절(토큰 기반) | 예(카드사가 거절) | 카드사 제휴, 비조치의견서, 약관 개정 | 제휴 확정 후 |

## 4. 1단계(MVP) 상세

### 4.1 갱신 승인 카드

- 트리거: 결제 예정일 D-1(기존 알림 스케줄 재사용). 사용자 설정으로 D-3 추가 가능.
- 카드 내용: 서비스·요금제, 금액·통화, 결제 예정일, 결제수단(끝 4자리), 지난 결제 대비 변동.
- 선택지:
  1. **이번만 허용**: 결정 기록만 남김
  2. **이 금액 이하면 항상 허용**: 생체인증 후 권한 범위(mandate) 생성
  3. **거절하고 해지하기**: 해지·환불 도우미로 이동
- 무응답: 결제는 그대로 진행된다. 카드 하단에 "꾸독은 결제를 직접 막을 수 없어요. 원하지 않으면 해지하세요."를 항상 노출한다.
- 만료: 결제 예정 시각이 지나면 `expired`로 전환되고 이후 결정할 수 없다.

### 4.2 요금 인상·유료 전환 경고

- 감지: 결제 문자·영수증 금액이 등록 금액과 다르거나, 무료체험 종료일이 도래.
- 동작: "항상 허용" 범위가 있어도 금액이 한도를 넘거나 유료 전환이면 자동 허용하지 않고 별도 경고 카드를 띄운다.
- 안내: 사업자는 인상·전환 시 별도 동의를 받아야 한다는 사실과 증빙 저장 버튼을 함께 제공한다.

### 4.3 해지·환불 도우미

- 기존 `CancelModal`·`cancelBrowser` 흐름에 "해지하고 환불 요청" 경로를 추가한다.
- 판단 입력: 결제 경로(웹/App Store/Google Play/통신사/기타), 결제일로부터 경과일, 사용 여부, 사유(인상·전환·해지 후 결제·중복 결제 등).
- 출력: 요청처(예: App Store 결제 → Apple), 환불 가능성 3단계(높음/검토 필요/낮음), 정책 출처 링크와 마지막 확인일, 요청 문구(한/영) 복사.
- 제출은 사용자가 직접 한다. 요청 문구에는 카드번호 전체 대신 끝 4자리만 넣는다.
- 결과 기록: 사용자가 "환불됨/거절됨/대기"를 선택하면 `refund_cases`를 갱신한다.

### 4.4 증빙 자동 수집

- 해지 완료 처리 이후 같은 서비스 결제가 감지되거나, 4.2의 인상·전환이 감지되면 사건(case)을 자동 생성한다.
- 묶는 증빙: 결제 알림 원문, 해지 완료 처리 시각, 사용자가 첨부한 캡처, 승인 카드 결정 이력.
- 2단계 키트의 입력으로 그대로 쓴다.

### 4.5 화면 흐름

```text
[푸시 D-1] → [승인 카드]
   ├─ 이번만 허용 → 기록
   ├─ 항상 허용 → 생체인증 → 권한 범위 생성
   └─ 거절하고 해지 → [해지 가이드(기존)] → 해지 완료 → [환불 판단] → 요청 문구 → 결과 기록
[결제 문자 감지] → 금액 변동 또는 해지 후 결제? → [경고 카드] → 증빙 사건 생성
```

## 5. 2단계: 신고·이의제기 키트

- 국내 서비스 인상·전환·해지 방해: 공정위·국민신문고·한국소비자원 제출용 요약서(사건 경과, 증빙 목록)를 생성한다.
- 해외 가맹점: 카드사 해외이용 이의신청 자료 묶음(가맹점명·승인번호·금액·거래일, 해지·환불 요청 증빙, 가맹점 응답)을 생성한다.
- 기한 안내: 남은 일수를 단정해 보여주지 않는다. "국제 기준은 정산일부터 통상 120일(UnionPay 180일)이지만 카드사 마감은 더 짧을 수 있어요. 지금 바로 카드사에 접수하세요."로 표기하고, 카드사별 접수 경로·마감은 출시 전 확인해 정책 표에 넣는다.

## 6. 3단계: 실제 결제 승인

- 제휴 후보: 에이전트 결제 실증·프로그램 참여 카드사(신한·KB국민·삼성·하나·현대·카카오뱅크), Visa Intelligent Commerce, Mastercard Agent Pay.
- 구조: 사용자 카드 → 카드사가 SubMate 에이전트 전용 토큰 발급 → 정기결제 시 카드사가 SubMate 승인 정책을 조회하거나 사용자 승인을 요청 → 카드사가 승인/거절.
- SubMate 역할 한정: 승인 화면과 권한 범위 관리만 맡는다. 결제대금 수수·보관·정산·환불 처리·지급 지시는 하지 않는다.
- 착수 조건: ① 카드사 제휴 계약 ② 금융위 비조치의견서 ③ 약관·개인정보처리방침 개정 ④ 보안 점검.

## 7. 데이터 설계(Supabase)

모든 사용자 테이블은 RLS로 `user_id = auth.uid()`인 행만 접근한다. 정책 테이블은 읽기 전용으로 공개한다.

| 테이블 | 핵심 필드 | 비고 |
|---|---|---|
| `agent_mandates` | id, user_id, subscription_id, mode(`ask_every_time`/`auto_within_limit`), max_amount, currency, period, expires_at, revoked_at | "항상 허용" 범위 |
| `approval_requests` | id, user_id, subscription_id, kind(`renewal`/`price_increase`/`trial_conversion`/`cancel`/`refund`), amount, currency, due_at, status(`pending`/`approved_once`/`approved_mandate`/`declined`/`expired`), decided_at, idempotency_key(unique) | 결정은 1회, 이후 불변 |
| `refund_cases` | id, user_id, subscription_id, payment_channel, charged_at, reason, predicted_outcome, status, outcome_at | 환불 진행 |
| `evidence_cases` | id, user_id, case_key(unique), kind(`price_increase`/`trial_conversion`/`charged_after_cancel`), subscription_id, service_name, amount_krw, previous_amount_krw, created_at, expires_at(만든 날 + 1년) | 증빙 사건. 사용자 동의 시에만 저장 |
| `evidence_items` | id, case_id, user_id, item_key(사건 안에서 unique), type(`payment_message`/`cancel_record`/`decision_log`), captured_at, detail(카드 끝 4자리까지만), approval_key | 사건별 증빙. 수정 불가, 삭제만 가능 |
| `service_refund_policies` | service_id, payment_channel, refund_window_days, conditions, source_url, verified_at | 크롤러로 검증·갱신 |

무결성 규칙:

- `approval_requests`는 `pending`에서만 한 번 전환할 수 있다(DB 조건부 update 또는 함수). 같은 구독·같은 결제 예정일에는 `idempotency_key`가 하나만 존재한다.
- 금액이 `agent_mandates.max_amount`를 넘거나 kind가 `price_increase`/`trial_conversion`이면 자동 허용하지 않는다.
- 카드번호는 끝 4자리 외에는 저장하지 않는다.
- `agent_mandates`는 구독마다 하나만 유효하다. 만들기·해제는 `create_agent_mandate`·`revoke_agent_mandate` 함수로만 한다.
- 증빙은 만든 날부터 1년이 지나면 읽을 수 없고, `purge-expired-evidence` 예약 작업(pg_cron, 매일 03:17 UTC)이 지운다.

## 8. 기존 코드 재사용

| 영역 | 재사용 대상 |
|---|---|
| 해지 페이지·가이드 | `src/components/CancelModal.jsx`, `src/lib/cancelBrowser.js`, `cancel_urls` 마이그레이션 |
| 결제 감지·증빙 | `src/lib/paymentCapture.js`, `docs/PAYMENT_MESSAGE_REFERENCE.md` |
| 알림 스케줄 | `src/lib/notifications.js`, `src/hooks/useNotificationManager.js`, `src/components/RenewalSheet.jsx` |
| 정책 수집·검증 | `scripts/crawler/`(프로모션 공식 문구 검증 구조) → 환불 정책 수집에 재사용 |

## 9. 약관·개인정보

- 1·2단계는 현행 이용약관 제6조 제1항(구독 계약·결제·환불의 당사자가 아님)과 제4항(금융 거래 승인·취소 권한 없음)과 일치한다. 제5조 제7호·제8호에 "승인 카드와 항상 허용은 결제를 직접 막거나 실행하지 않는다"를 추가했다(2026-10-02 공지, 시행일 2026-10-09 확정).
- 3단계 전 제6조 제4항을 "제휴 카드사를 통한 승인 정책 전달" 범위로 개정한다.
- 개인정보처리방침에 승인 기록, 항상 허용 범위, 결제 증빙(선택 동의, 만든 날부터 1년, 내 계정 관리에서 삭제·철회)을 추가하고 이메일함 미접근을 명시했다. 결제 알림 원문은 여전히 서버로 보내지 않는다. 권한 고지에 생체인증(USE_BIOMETRIC)과 증빙 보관 동의를 추가했다.

## 10. 성과 지표

| 지표 | 정의 | 1단계 목표(초안) |
|---|---|---|
| 승인 카드 응답률 | 응답 건 / 발송 건 | 40% |
| 원치 않는 갱신 전환 | "거절하고 해지" 후 해지 완료한 사용자 | 월 활성 사용자의 5% |
| 인상·전환 경고 후 조치율 | 해지·요금제 변경 / 경고 건 | 25% |
| 환불·이의제기 성공률 | 환불됨 / 결과 기록 건 | 기준값 측정 |

## 11. 리스크

| 리스크 | 조건 | 가능성 | 영향 | 대응 |
|---|---|---|---|---|
| "꾸독이 결제를 막아준다"는 오해 | 1단계 승인 카드 | 중간 | 높음(민원) | 무응답 시 결제 진행 상시 고지 |
| 환불 예측 오류 | 서비스 정책 변경 | 중간 | 중간 | "가능성" 표기, 출처·확인일 노출, 크롤러 갱신 |
| PG 등록 대상 판단 | 3단계에서 자금 흐름 관여 시 | 낮음(설계상 비관여) | 높음 | 비조치의견서, 자금 비관여 유지 |
| 증빙 개인정보 | 캡처·문자 보관 | 중간 | 중간 | RLS, 보관 기간, 사용자 삭제 기능 |
| 카드사 제휴 지연 | 3단계 | 높음 | 낮음(1·2단계가 독립 가치) | 단계 분리 |

## 12. 출시 게이트(남은 확인 사항)

| 항목 | 단계 | 담당 | 상태 |
|---|---|---|---|
| 서비스별 환불 정책 초기 데이터(상위 30개) | 1 | 크롤러 | 완료(2026-10-02): 30개 서비스 공식 원문 확인. 출처 문구 정기 확인은 `npm run crawl:refunds`·스케줄러에 연결 |
| 약관·개인정보처리방침 개정 공지 | 1 | PM | 시행일 2026-10-09 확정(2026-10-02 공지). 시행 전에는 증빙 서버 보관을 배포하지 않음 |
| Play Console 데이터 보안 양식 갱신(구매 내역 선택 수집) | 1 | PM | 미착수 |
| 카드사별 해외이용 이의신청 경로·내부 마감 | 2 | PM | 미확인 |
| 금융위 비조치의견서 | 3 | 법무 | 미착수 |
| 카드사 제휴 제안 | 3 | 사업 | 미착수 |

## 13. 꾸독 에이전트(미니 닷) 시제품

ChatGPT 닷의 구성 요소 중 결제 실행을 뺀 나머지를 꾸독 안에 구현한 1단계 시제품이다.

| 닷 구성 요소 | 꾸독 시제품 | 위치 |
|---|---|---|
| 요청 해석 | 규칙 기반 해석 → 실패 시 Gemini가 의도·구독 id만 선택(목록 밖 값은 버림) | `src/lib/subscriptionAgent.js`, `api/agent.js`, `api/_lib/agentInterpretation.js` |
| 도구 사용 | 구독 조회, 결제일 계산, 결제 경로 판단, 검증된 환불 정책 확인, 요청서 작성 | `src/lib/subscriptionAgent.js` |
| 승인 카드 | 행동 승인(허용하고 진행/그만두기, 10분 만료), 갱신 승인(이번만 허용/거절하고 해지, 결제일 23:59 만료). 한 번만 결정 가능 | `src/components/AgentSheet.jsx` |
| 대신 클릭 | 승인 후 기존 해지 가이드 브라우저로 연결. 로그인·최종 확정은 사용자가 직접 | `CancelModal`·`cancelBrowser` 재사용 |
| 진입점 | 홈 화면 "꾸독에게 시키기" | `src/components/HomeScreen.jsx` |

검증(2026-10-01): 단위 테스트 10개 포함 전체 150개 통과, 프로덕션 빌드 성공. 개발 서버에서 다음 흐름을 직접 확인했다.

- "넷플릭스 해지하고 환불 받아줘" → 확인한 것(결제 정보·최근 결제·경로·환불 가능성) → 승인 카드 → 허용 → 환불 요청서(한/영, 카드 끝 4자리만) → Netflix 해지 가이드 열림
- "디즈니 이제 안 볼래"(해지 키워드 없음) → Gemini 해석으로 해지 승인 카드 생성
- "이번 주 결제 예정 알려줘" → 갱신 승인 카드 → 이번만 허용 → 같은 요청 반복 시 이전 결정 유지

2차 반영(2026-10-01):

- 승인 기록 서버 저장: `approval_requests` 테이블과 `decide_approval_request` 함수 적용(`supabase/migrations/20261001120000_create_approval_requests.sql`). 로그인 사용자는 자기 기록만 읽고 대기 상태로만 만들 수 있으며, 결정은 함수로 기한 안에 한 번만 바뀐다. 직접 수정·삭제 권한은 없다. 비로그인 사용자는 기기 저장만 쓴다.
- 결제 사전 알림(D-3, D-1, 체험 만료 D-1)을 누르면 그 구독의 갱신 승인 카드가 열린다. 대화에서 만든 카드와 같은 요청 키를 써서 결정이 하나만 남는다.
- 결제 알림 감지 시 요금 인상(등록 금액보다 큼, 공동 이용은 전체 금액 기준), 무료체험 유료 전환, 해지 후 결제를 경고 카드로 띄우고 증빙 사건을 기기에 만든다. 해지 후 결제는 해지일을 넣은 환불 요청서를 함께 만든다. "새 금액으로 계속 쓰기"를 고르면 등록 금액을 실제 결제 금액으로 맞춘다.

3차 반영(2026-10-02):

- "항상 허용" 권한 범위: 갱신 승인 카드에 "이 금액 이하면 항상 허용"을 추가했다. 무엇이 자동 허용되는지 먼저 보여주고, Android는 지문·얼굴 또는 기기 잠금(`DeviceAuthPlugin`, androidx.biometric), 웹은 확인 버튼으로 본인 확인한 뒤 범위를 만든다. 이후 한도 이하 갱신 카드는 열리자마자 `approved_mandate`로 기록된다. 서버 `decide_approval_request`가 갱신 여부·해제·만료·한도를 다시 확인하므로 요금 인상·유료 전환·한도 초과는 자동 허용되지 않는다. 범위는 1년 뒤 끝나고 카드에서 해제할 수 있다(`supabase/migrations/20261001140000_create_agent_mandates.sql`).
- 증빙 서버 저장: 결제 경고 카드나 내 계정 관리에서 동의한 로그인 사용자만 `evidence_cases`·`evidence_items`에 올린다. 동의를 철회하면 서버 기록을 지우고, 증빙 모두 지우기를 제공한다(`supabase/migrations/20261001141000_create_evidence_cases.sql`, `src/lib/evidenceStore.js`).
- 검증 환불 정책: 공식 원문으로 확인한 Netflix, YouTube Premium, Spotify, 쿠팡 와우를 추가했다. 승인 카드에 요약·출처·확인일을 보여준다. 디즈니+ 한국 정책 페이지는 "[이전]" 버전 표시가 있어 현행 여부를 확인할 때까지 넣지 않았다. 티빙·웨이브·Claude·네이버플러스·밀리의서재는 공식 원문 확인 전이라 "확인 필요"로 답한다.
- 검증: Supabase에서 실제 로그인 역할로 범위 판정(한도 이하 허용, 한도 초과·요금 인상·범위 없음 거절, 범위 1개 유지, 해제)과 다른 사용자 증빙 차단을 확인한 뒤 롤백했다. 단위 테스트, 프로덕션 빌드, Android 컴파일 통과.

4차 반영(2026-10-02):

- ChatGPT 환불 안내가 개정되어 요약을 고쳤다. 원칙적으로 환불되지 않지만 한국 거주자는 구매 후 7일 안에 요청하고 쓰지 않았다면 전액 환불된다. App Store 결제는 Apple에 요청한다. 원문에서 확인되지 않은 Google Play 경로 문구는 뺐다.
- 웨이브(유료서비스 이용약관 제8·10·12조)와 왓챠(고객센터 해지 안내)를 추가했다. 왓챠는 외부 블로그에만 있는 "7일 안 미사용 시 환불" 조건을 넣지 않았다. 티빙은 환불 조항이 있는 유료 이용약관 원문을 확인하지 못해 "확인 필요"로 둔다.
- 출처 문구 정기 확인: 정책마다 원문에 그대로 있는 문구(`checkPhrases`)를 저장하고, `scripts/crawler/refundPolicyCheck.js`가 페이지에 문구가 남아 있는지 본다. 문구가 사라지면 CHANGED, 페이지를 못 열면 UNREACHABLE로 알리고 정책은 자동으로 고치지 않는다. 매일 도는 크롤러 스케줄러에도 넣었다. 2026-10-02 실행에서 7개 모두 OK.

5차 반영(2026-10-02):

- 약관 시행일 2026-10-09를 확정했다.
- 검증 환불 정책을 30개로 늘렸다. 모두 공식 페이지 원문을 직접 받아 문구를 대조했고, 정책마다 `checkPhrases`를 넣었다.
  - OTT: Netflix, YouTube Premium, 웨이브, 왓챠, 티빙(유료서비스 이용약관), 디즈니+(현행 한국 이용약관), 라프텔, Apple TV+
  - 음악: Spotify, YouTube Music, 멜론, 지니, FLO, Apple Music
  - 소프트웨어: ChatGPT, Claude Pro, Adobe, Microsoft 365, Canva, Notion, Figma, Midjourney, iCloud+
  - 그 밖: 쿠팡 와우, 네이버플러스 멤버십, 밀리의 서재, Duolingo, The New York Times, PlayStation Plus, Apple Arcade
- Apple이 청구하는 구독 4개(iCloud+, Apple Music, Apple TV+, Apple Arcade)는 Apple 환불 요청 안내를 함께 쓴다.
- 하이픈이 있는 서비스 ID(`ps-plus`, `apple-arcade` 등)가 정책을 찾지 못하던 문제를 고쳤다.
- 원문을 받지 못했거나 출처가 공식이 아닌 서비스는 넣지 않고 "확인 필요"로 둔다. 쿠팡플레이(약관 본문 없음), SPOTV NOW·컬리멤버스(로그인·메인으로 이동), Dropbox·Google One·Coursera·Nintendo(주소 404), Perplexity(본문 없음)가 여기에 해당한다. Microsoft 365의 한국 일할 환불 여부는 국가 목록을 확인하지 못해 요약에 넣지 않았다.
- 검증: 단위 테스트 171개 통과, `npm run crawl:refunds`에서 30개 모두 OK, 프로덕션 빌드 통과.

남은 일:

- 실제 Android 기기에서 생체인증 창과 범위 생성 흐름 확인.
- 크롤러가 CHANGED·UNREACHABLE을 알리면 원문을 다시 확인해 요약과 확인일을 고친다.

## 14. 결정 기록: 사용자 이메일 읽기 제외 (2026-10-02)

결정: SubMate는 사용자의 이메일함(Gmail, 네이버 메일, Outlook 등)을 읽지 않는다. 메일로 얻으려던 정보는 결제 알림 감지, 사용자가 직접 첨부하는 캡처, 승인·해지 기록으로 대신한다.

| 검토한 방식 | 제외 이유 |
|---|---|
| Gmail API `gmail.readonly` | 제한 범위(restricted scope)라 Google 검증이 필요하고, 서버로 데이터를 받으면 매년 외부 보안 평가(CASA)를 받아야 한다. 결제·해지 메일 외의 개인 메일까지 읽을 수 있는 권한이라 얻는 정보에 비해 위험과 비용이 크다. |
| Gmail API `gmail.metadata` | 같은 제한 범위라 심사 부담은 같고, 본문을 읽지 못해 금액을 알 수 없어 인상 경고에 쓸 수 없다. |
| 네이버 메일 IMAP | OAuth가 없어 사용자의 애플리케이션 비밀번호를 받아야 한다. 2장 비목표의 "비밀번호를 받지 않는다" 원칙과 충돌한다. |
| 사용자가 메일을 전달·공유 | 가능하지만 1단계 증빙은 결제 알림과 캡처로 충분해 우선순위에서 뺐다. 필요하면 영수증 OCR 흐름을 재사용해 다시 검토한다. |

영향: 개인정보처리방침과 권한 고지에 "이메일함에 접근하지 않는다"를 명시했다. 증빙 요약은 "해지 확인 메일이 있으면 직접 첨부하라"고 안내한다.

## 15. 권한 없이 쓰는 해지 편의 기능 (2026-10-04)

근거와 출처는 [RESEARCH_LOW_PERMISSION_CANCEL.md](RESEARCH_LOW_PERMISSION_CANCEL.md)에 정리했다. 원칙은 같다: 해지 확정은 사용자가 공식 화면에서 하고, 꾸독은 화면 이동·순서·시점을 챙긴다. 새 Android 권한은 없다.

| 기능 | 동작 | 위치 |
|---|---|---|
| 결제 경로별 해지 이동 | 해지 시트에 "결제한 곳"(서비스 웹·앱 / Google Play / App Store / 카드 자동납부 / 휴대폰 요금)을 보여준다. 기본값은 결제수단과 Apple 청구 서비스로 판단하고, 사용자가 고친 값은 기기에 기억한다. Google Play는 전체 구독 목록, App Store는 Apple 구독 관리, 카드 자동납부는 어카운트인포를 먼저 연다. 카드로 결제한 웹 구독은 서비스 해지 페이지가 먼저이고 어카운트인포는 접힌 보조 경로로 보여준다. 상세 화면 버튼은 "해지하기"로 바꾸고, 스토어·어카운트인포 경로면 서비스 웹사이트를 자동으로 열지 않는다 | `src/lib/cancelRoutes.js`, `src/components/CancelModal.jsx`, `src/components/SubscriptionDetailScreen.jsx` |
| 어카운트인포 이용시간 안내 | 영업일 09:00~22:00이면 "지금 해지 가능", 아니면 다음 영업일 09:00을 보여준다. 2026~2027 공휴일·대체공휴일을 반영하고, 목록이 없는 해는 주말만 빼고 공휴일 주의 문구를 붙인다 | `src/lib/businessDays.js` |
| 해지 다시 알림 | 이용시간 밖이면 "N월 N일(요일) 09:00에 다시 알려주기"를 누를 수 있다. Android는 로컬 알림으로 예약하고(결제 알림 재예약 때도 유지), 누르면 그 구독의 해지 시트가 열린다. 웹은 시각이 지난 뒤 앱을 열면 알림 센터와 브라우저 알림으로 띄운다. 구독마다 하나만 둔다 | `src/lib/notifications.js`, `src/hooks/useNotificationManager.js`, `src/App.jsx` |
| 캘린더에 결제일 추가 | 상세 화면에서 Android는 캘린더 앱의 일정 화면을 채워 열고(사용자가 저장), 웹은 .ics를 내려받는다. 종일 일정, 매월·매년 반복, 하루 전 알림. 29~31일 결제와 무료체험은 반복하지 않는다 | `src/lib/calendarEvent.js`, `src/lib/calendarExport.js`, `SystemIntentsPlugin.java` |
| 공유로 등록 | 다른 앱의 "공유"에서 꾸독을 고르면 결제 문자는 기기 안에서 파싱해 기존 결제 감지 흐름(인상·해지 후 결제 경고 포함)으로, 영수증 캡처(JPG·PNG·WEBP, 8MB 이하)는 기존 영수증 인식으로 등록한다 | `src/lib/shareIntake.js`, `SystemIntentsPlugin.java`, `AndroidManifest.xml` |

검증(2026-10-04): 단위 테스트 19개 추가, 전체 테스트·프로덕션 빌드·Android Java 컴파일 통과. 개발 서버에서 Apple TV+(App Store 경로), Netflix(웹 + 접힌 어카운트인포 보조 경로), 경로 전환(Google Play·카드 자동납부), 일요일 기준 다음 해지 가능 시각 10월 6일(화) 09:00 표시와 다시 알림 예약, 캘린더 추가 안내를 확인했다.

남은 일:

- 실제 Android 기기에서 공유받기(글·이미지), 캘린더 앱 열기, 다시 알림 탭 동작 확인. 이 PC에는 에뮬레이터·기기가 없어 컴파일까지만 확인했다.
- 매년 월력요항 발표 뒤 `KR_HOLIDAYS`에 다음 해를 추가한다.
- Play Console 데이터 보안 양식: 공유받은 이미지는 기존 영수증 인식과 같은 경로로 처리되므로 수집 항목 변화는 없다(출시 전 PM 확인).

### 15.1 연결·동기화 보완 (2026-10-04)

| 항목 | 내용 | 검증 |
|---|---|---|
| 결제한 곳 서버 동기화 | `subscriptions.payment_channel`(null 또는 web·google_play·app_store·card_autopay·carrier, check 제약) 추가. 해지 시트에서 고른 값은 구독 수정과 같은 경로로 저장되고 로그인 사용자는 서버에 올라간다. 값이 없으면 결제수단으로 추정한다. 기기에만 두던 저장소는 없앴다 | 실제 DB에 적용(`20261004120000_add_payment_channel_to_subscriptions.sql`). 로그인 역할로 저장·변경 성공, 허용 밖 값 거부를 확인하고 롤백. 매핑 단위 테스트 |
| 해지 주소 DB 동기화 | `subscription_services.cancel_url`을 앱이 실제로 여는 주소(검증 해지 가이드 → 카탈로그 순)와 맞췄다. 적용되지 않았던 09-15 마이그레이션은 일부 주소가 낡아 대신 새 파일로 덮어쓴다 | `20261004121000_sync_service_cancel_urls.sql` 적용, 104개 중 98개 갱신. 적용 후 DB 값과 앱 값 차이 0개, 주소 있음 103개(컬리패스만 비어 있음) |
| 카탈로그 밖 서비스 4개 | 카카오 이모티콘 플러스, 컬리패스, 신세계 유니버스 클럽, T우주 우주패스를 앱 카탈로그에 추가. 카카오(카카오 고객센터), 신세계 유니버스(SSG.COM FAQ), T우주(T world 요금제 안내·T 우주 이용약관)는 공식 원문으로 해지 가이드를 넣었다. 컬리패스는 2023-08-01 판매 종료 공지만 확인되고 해지 경로 원문이 없어 공통 안내와 컬리 고객센터 링크만 보여준다 | DB 104개 모두 카탈로그와 연결, 검증 가이드 92개 |

## 16. 오늘 챙길 일: 사용자는 결정만, 나머지는 꾸독이 (2026-10-04)

원칙: 기억해야 할 일(언제 해지할지, 해지가 됐는지, 체험이 언제 끝나는지, 누구에게 정산을 받을지)을 꾸독이 맡고, 홈 '오늘 챙길 일'에서 버튼 하나로 결정만 받는다. 결제를 막거나 돈을 주고받지 않는다.

| 기능 | 동작 | 위치 |
|---|---|---|
| 해지 확인 루프 | '해지 완료'(해지 가이드·상세 화면 모두)를 누르면 다음 결제일을 기록하고 결제일+2일 오전 9시에 확인한다. 결제 알림 감지를 켠 사용자는 결제가 없었으면 자동으로 "해지 확인 완료"를, 아니면 "결제 문자가 왔나요?"를 한 번 묻는다(결제 없었어요/결제됐어요/아직 몰라요→다음 날 다시). 결제가 감지되거나 "결제됐어요"를 고르면 기존 '해지 후 결제' 경고(증빙·환불 요청 문구)로 이어진다 | `src/lib/cancelVerification.js`, `src/lib/storage.js`, `src/App.jsx` |
| 무료체험 가드 | 체험 중 구독은 유료 전환 3일 전부터 홈에 "지금 해지하기/계속 쓸게요"를 띄우고, 2일 전 오전 9시에 로컬 알림(누르면 해지 화면). 공유받은 가입 문자에 '무료 체험' 문구가 있으면 체험 중으로, 문자 속 날짜를 전환일로 등록한다 | `src/lib/trialGuard.js`, `src/lib/shareIntake.js` |
| 한 줄 사용 체크 | 매월 구독의 결제 1~3일 전에 "이번 달 잘 썼어요?"만 묻는다. "거의 안 썼어요"면 카탈로그의 더 싼 요금제와 아끼는 금액, 해지를 권하고 연속으로 안 쓴 달 수를 보여준다. 앱 사용 기록 권한은 쓰지 않는다 | `src/lib/usageCheck.js` |
| 공동 구독 정산 요청 | 나눠 내는 구독은 결제일 전날부터 홈에, 결제일 오전 9시에 알림으로 "1인 ₩X" 요청 문구를 준비한다. Android 공유 창·Web Share·클립보드로 보낸다. 상세 화면에도 "정산 요청 보내기"가 있다. 계좌·카드번호처럼 10자리 이상 숫자는 문구에서 가린다. 송금·수납은 하지 않는다 | `src/lib/settlement.js`, `src/lib/shareText.js`, `SystemIntentsPlugin.shareText` |
| 구독 순환 플래너 | 같은 분야(OTT·음악 등) 매월 구독이 2개 이상이면 "한 달에 하나만"을 제안한다. 순서를 정하면 6달 일정(차례가 끝난 구독은 결제일 전날 해지, 다음 차례는 그날 가입, 다시 가입한 날이 새 결제일)과 절약액을 보여주고, 해지·가입할 날 오전 9시에 알린다. 해지해 목록에서 빠져도 저장한 서비스 정보로 일정을 잇고, 가입할 날에는 등록 화면을 채워 연다 | `src/lib/rotationPlanner.js`, `src/lib/careFeed.js`, `src/components/RotationSheet.jsx` |
| 모으기·알림 | 홈 '오늘 챙길 일'에 우선순위(해지 확인 질문 → 해지 후 결제 → 체험 → 순환 → 정산 → 사용 체크) 순으로 최대 5건. 앱 밖 알림은 결제 사전 알림을 다시 예약할 때 함께 건다 | `src/components/CareSection.jsx`, `src/hooks/useCareFeed.js`, `src/lib/notifications.js` |

저장: 사용 체크 답, 처리한 항목, 순환 계획, 해지 기록은 기기에 저장한다(서버 동기화 없음). 구독 자체와 결제한 곳은 기존처럼 서버와 동기화된다.

제휴·허가가 필요한 다음 단계는 조사 문서로 정리했다.

- 마이데이터 자동 발견: [RESEARCH_MYDATA_AUTODISCOVERY.md](RESEARCH_MYDATA_AUTODISCOVERY.md) — 자체 허가(자본금 5억 원 이상 등)는 초기에 어렵고, 허가 사업자 제휴를 거치는 단계안.
- 카드사 결제 승인 제휴: [PROPOSAL_CARD_AGENT_PAYMENT.md](PROPOSAL_CARD_AGENT_PAYMENT.md) — Visa·Mastercard 에이전트 결제 구조, 국내 실증, 비조치의견서, 12주 파일럿 제안(수치는 가정).

검증(2026-10-04): 해지 확인·체험·사용 체크·정산·순환·모으기 단위 테스트 추가(전체 테스트 통과). 개발 서버에서 순환 제안 → 계획 시트(재가입일 기준 해지일 보정 확인) → 저장, 상세의 '해지 완료로 표시' → "해지 확인 중" 카드, 결제일 2일 전 구독의 사용 체크 → "거의 안 썼어요" → 더 싼 요금제 제안을 확인했다. 정산·무료체험 카드와 Android 알림·공유 창은 단위 테스트와 컴파일까지 확인했다.
