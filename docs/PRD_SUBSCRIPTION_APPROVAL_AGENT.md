# SubMate(꾸독) 구독 승인 에이전트 최종 기획서

- 문서 버전: v1.0 (최종 기획)
- 작성일: 2026-10-01
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

비목표: 사용자 계정 비밀번호를 받아 대신 로그인하는 해지·환불 대행, SubMate 명의 결제·정산, 카드번호 저장.

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
| `evidence_items` | id, case_id, user_id, type(`payment_message`/`screenshot`/`cancel_record`/`decision_log`), captured_at, storage_path | 사건별 증빙 |
| `service_refund_policies` | service_id, payment_channel, refund_window_days, conditions, source_url, verified_at | 크롤러로 검증·갱신 |

무결성 규칙:

- `approval_requests`는 `pending`에서만 한 번 전환할 수 있다(DB 조건부 update 또는 함수). 같은 구독·같은 결제 예정일에는 `idempotency_key`가 하나만 존재한다.
- 금액이 `agent_mandates.max_amount`를 넘거나 kind가 `price_increase`/`trial_conversion`이면 자동 허용하지 않는다.
- 카드번호는 끝 4자리 외에는 저장하지 않는다.

## 8. 기존 코드 재사용

| 영역 | 재사용 대상 |
|---|---|
| 해지 페이지·가이드 | `src/components/CancelModal.jsx`, `src/lib/cancelBrowser.js`, `cancel_urls` 마이그레이션 |
| 결제 감지·증빙 | `src/lib/paymentCapture.js`, `docs/PAYMENT_MESSAGE_REFERENCE.md` |
| 알림 스케줄 | `src/lib/notifications.js`, `src/hooks/useNotificationManager.js`, `src/components/RenewalSheet.jsx` |
| 정책 수집·검증 | `scripts/crawler/`(프로모션 공식 문구 검증 구조) → 환불 정책 수집에 재사용 |

## 9. 약관·개인정보

- 1·2단계는 현행 이용약관 제6조 제1항(구독 계약·결제·환불의 당사자가 아님)과 제4항(금융 거래 승인·취소 권한 없음)과 일치한다. 제5조(서비스 내용)에 "승인 카드는 결제를 직접 막지 않는다"는 문구를 추가한다.
- 3단계 전 제6조 제4항을 "제휴 카드사를 통한 승인 정책 전달" 범위로 개정한다.
- 증빙 캡처·결제 알림 원문의 보관 목적과 보관 기간(예: 사건 종료 후 1년), 사용자 삭제 방법을 개인정보처리방침에 추가한다.

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
| 서비스별 환불 정책 초기 데이터(상위 30개) | 1 | 크롤러 | 미착수 |
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

남은 일:

- "항상 허용" 권한 범위(`agent_mandates`)와 생체인증(네이티브 생체인증 플러그인 추가 필요).
- 증빙 사건의 서버 저장(`evidence_items`)은 개인정보처리방침에 보관 목적·기간·삭제 방법을 넣은 뒤 진행한다. 현재는 기기에만 남는다.
- 서비스별 검증 환불 정책 확대(현재 ChatGPT만 공식 출처 확인).
