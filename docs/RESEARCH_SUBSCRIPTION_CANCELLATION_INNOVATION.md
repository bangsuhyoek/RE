# 구독 해지 혁신 리서치: '어디서 해지하나'에서 '해지 라이프사이클 전체 장악'으로

- 작성일: 2026-10-16
- 상태: 제품 전략 및 아키텍처 제안 (1차 완결)
- 대상 레포지토리: SubMate (꾸독)
- 기준 선행 문서: [RESEARCH_LOW_PERMISSION_CANCEL.md](RESEARCH_LOW_PERMISSION_CANCEL.md) (저권한 해지 원칙 준수)

---

## 핵심 결론

SubMate(꾸독)는 이미 94개 서비스의 해지 URL, 스토어·어카운트인포 분기, 안드로이드 오버레이 플로팅 가이드(CancelBrowser)를 통해 "어디서 해지해야 하는가"라는 탐색 문제를 성공적으로 해결했습니다. 그러나 사용자가 겪는 실제 해지 고통은 링크 클릭 이후인 타이밍 선택, 결제 레일 차단, 해지 완료 증빙 확보, 사후 부당 결제 감시, 그리고 위반 시 환불 청구까지 이어지는 긴 라이프사이클 전체에 걸쳐 존재합니다. SubMate의 다음 해지 혁신은 자격증명(ID/PW) 대행이라는 법적·보안적 고위험 방식을 철저히 배제하고, "언제 해지할지 -> 어느 레일에서 끊을지 -> 증거 확보 -> 결제 감시 -> 부당 청구 대응"으로 이어지는 해지 전 주기를 온디바이스 저권한 기술과 공공 규제 레버리지로 장악하는 것입니다.

---

## 1. 배경 및 문제 정의

### 1.1 현재 SubMate의 해지 기능과 도달점
현재 SubMate 코드베이스는 저권한 원칙하에 탄탄한 해지 기반을 구축해 두었습니다.
1. **결제 경로 분기 및 안내**: [src/lib/cancelRoutes.js](src/lib/cancelRoutes.js)에서 결제 수단에 따라 Google Play, App Store, 카드 자동납부(어카운트인포), 통신사 부가서비스, 개별 서비스 웹사이트로 분기합니다.
2. **영업일 계산 엔진**: [src/lib/businessDays.js](src/lib/businessDays.js)를 통해 어카운트인포 운영시간(평일 09:00~22:00) 외 접근 시 다음 영업일 오전 9시 예약 알림을 설정합니다.
3. **온디바이스 네이티브 가이드**: [src/lib/cancelBrowser.js](src/lib/cancelBrowser.js) 및 [android/app/src/main/java/com/submate/app/webguide/services/naver/NaverMonthlyCancelRoute.java](android/app/src/main/java/com/submate/app/webguide/services/naver/NaverMonthlyCancelRoute.java)를 통해 안드로이드 오버레이 권한으로 웹 서핑 중 플로팅 가이드를 제공합니다.
4. **해지 검증 및 증빙 파이프라인**: [src/lib/cancelVerification.js](src/lib/cancelVerification.js)의 watching -> asking -> verified/charged 상태 머신과 [supabase/migrations/20261001141000_create_evidence_cases.sql](supabase/migrations/20261001141000_create_evidence_cases.sql)의 charged_after_cancel 증거 케이스, [src/components/AgentSheet.jsx](src/components/AgentSheet.jsx)의 LLM 환불 요청 초안 생성 기능이 유기적으로 연결되어 있습니다.
5. **94개 주요 구독 커버리지**: [supabase/migrations/20261004121000_sync_service_cancel_urls.sql](supabase/migrations/20261004121000_sync_service_cancel_urls.sql)을 통해 국내외 94개 서비스의 직링(direct cancel URL)을 동기화하고 있습니다.

### 1.2 '어디서 해지하나' 이후 남겨진 5대 사각지대
단순히 '해지 페이지 링크를 열어주는 것'만으로는 사용자가 구독을 안전하게 종료했다고 확신하기 어렵습니다.
1. **타이밍 불안**: '지금 해지 버튼을 누르면 오늘 바로 서비스가 끊기는가, 아니면 결제 주기 말일까지 볼 수 있는가?' (즉시 해지 vs 정기결제 해지 미분리로 인한 손해 공포)
2. **복합 결제 레일의 사각지대**: 네이버플러스, 카카오페이, 토스페이, 통신사 부가서비스 등 간편결제·통신사 결제는 서비스 홈페이지에서 해지해도 결제 레일 상의 자동결제 등록이 살아있거나, 반대로 결제 레일만 끊고 서비스 계약이 유지되어 연체·추심이 발생하는 혼선이 발생합니다.
3. **해지 증거 부재**: 해지 완료 버튼을 눌렀으나 이메일이나 완료 화면 캡처가 남아있지 않아, 다음 달에 결제 문자가 날아와도 카드사나 사업자에 대항할 증빙이 없습니다.
4. **다크패턴 피로도**: 3~5단계에 걸친 혜택 포기 설득, 숨겨진 작은 텍스트 버튼, 환불 불가 경고문으로 인해 해지를 중도 포기합니다.
5. **사후 부당 청구 방치**: 해지 신청 후 시스템 오류나 숨은 약관으로 계속 결제(charged_after_cancel)되어도 개인이 1372 소비자상담센터나 공정위에 민원을 작성하고 환불을 받아내는 과정이 너무 번거로워 소액을 포기합니다.

---

## 2. 규제 동향 및 플랫폼 환경 분석

해지 혁신의 성공 여부는 각국 규제 당국의 다크패턴 근절 법제화와 앱 마켓 생태계 정책의 흐름에 정확히 부합하는가에 달려 있습니다.

| 관할권 / 주체 | 주요 법령 및 판례 / 정책 | 핵심 내용 및 시행 시점 | SubMate 시사점 및 레버리지 |
|---|---|---|---|
| **대한민국 (공정위)** | 전자상거래법 개정안 (다크패턴 방지) | 2025년 2월 14일 시행. 취소·해지 방해(다크패턴), 숨은 갱신, 유료 전환 및 정기결제 증액 시 사전 고지·동의 의무화. 위반 시 시정명령 및 과태료 부과. ([공정거래위원회](https://www.ftc.go.kr)) | 서비스의 해지 방해 행위는 명백한 불법. SubMate가 수집한 해지 난이도/다크패턴 데이터가 법적 분쟁 및 신고 초안의 핵심 근거가 됨. |
| **대한민국 (방통위)** | 전기통신사업법 위반 제재 | Google(YouTube Premium) 중도해지 제한 및 환불 불가 정책에 과징금 8억 6,700만 원 부과 확정 (2020년 의결). ([연합뉴스](https://www.yna.co.kr/view/AKR20200122122752017)) | 국내법상 소비자의 '중도해지권(일할 계산 환불)' 보장이 핵심 쟁점. 서비스별 즉시해지/일할환불 정책 안내의 법적 당위성 확보. |
| **미국 (FTC / 연방법원)** | FTC 'Click-to-Cancel' Rule & 8th Cir. 판결 | FTC가 가입만큼 쉽게 클릭 한 번으로 해지하도록 의무화한 규칙을 발표했으나, 제8연방순회항소법원이 절차적 사유 등으로 효력 정지/파기(vacated, 2025-07-08). ([8th Cir. Ruling](https://law.justia.com/cases/federal/appellate-courts/ca8/24-3137/24-3137-2025-07-08.html)) | 연방 차원의 단일 해지 룰은 사법 리스크로 지연되었으나, 주(State) 단위 법률과 개별 집행 소송(ROSCA)이 더욱 강력하게 작동 중. |
| **미국 (FTC / 사법부)** | ROSCA 위반 대형 합의 | Amazon Prime 해지 방해 소송 25억 달러 규모 보상 합의 ([FTC Amazon](https://search.ftc.gov/news-events/news/press-releases/2026/09/ftc-announces-additional-payments-consumers-stemming-ftcs-amazon-prime-settlement)), Adobe 숨은 수수료 소송 1.5억 달러 합의 (2026-03 보도 기준, [DOJ Adobe](https://www.justice.gov/opa/pr/adobe-agrees-150-million-settlement-and-injunction-resolve-alleged-violations-restore-online)) | 글로벌 빅테크 기업들도 다단계 해지 방해와 숨은 위약금 부과에 대해 막대한 배상금을 지불하는 추세. |
| **미국 (캘리포니아)** | California ARL (AB 2863) | 2025년 7월 1일 시행. 온라인 가입 구독은 클릭 한 번(Click-to-Cancel)으로 온라인 해지 제공 의무화, 연간 구독 갱신 전 명확한 통지 요구. | 글로벌 서비스들이 캘리포니아 법률 준수를 위해 마련한 단축 해지 경로(웹 Direct Link)를 SubMate가 카탈로그로 흡수 가능. |
| **독일** | BGB §312k (Kündigungsbutton) | 2022년 7월 1일부터 전자상거래 지속적 채무관계 계약에 웹사이트상 영구적 '해지 버튼' 및 해지 확인증 즉시 발급 의무화. ([독일 연방 법령정보](https://www.gesetze-im-internet.juris.de/bgb/__312k.html)) | 2단계 정형화된 해지 양식(해지 의사 입력 -> 확인) 표준 모델. 글로벌 서비스의 독일어/글로벌 해지 엔드포인트 벤치마킹 기준. |
| **유럽연합 (EU)** | Directive 2023/2673 (금융 및 원격계약 철회권) | 2026년 6월 19일부터 회원국 전면 적용. 소비자가 온라인 인터페이스에서 손쉽게 철회권을 행사할 수 있는 '철회 기능(withdrawal button)' 구비 의무화. ([EUR-Lex 2023/2673](https://eur-lex.europa.eu/eli/dir/2023/2673/oj/eng)) | 유럽 진출 및 글로벌 서비스들의 다크패턴 퇴출이 전 세계적 웹 UI 표준 개편으로 이어지는 직접적 계기. |
| **영국** | DMCCA 2024 (디지털 시장·경쟁·소비자법) | 구독 트랩(Subscription Traps) 근절을 위한 단계적 시행. 계약 전 중요 정보 고지, 정기 알림, 직관적이고 용이한 해지 메커니즘 강제. | 글로벌 시장 전반이 '가입보다 복잡한 해지는 위법'이라는 단일 원칙으로 수렴. |
| **Apple / Google** | 앱 마켓 가이드라인 및 결제 API | Apple showManageSubscriptions API / Google Play Subscriptions Center (https://play.google.com/store/account/subscriptions?sku=&package=). ([Android Billing](https://developer.android.com/google/play/billing/subscriptions), [Apple Support](https://support.apple.com/en-us/118428)) | OS/스토어 인앱결제는 deep link 및 package/sku 파라미터 조합으로 가장 완벽하고 안전한 원클릭 해지 제공 가능. |

---

## 3. 글로벌 및 국내 경쟁 지형

구독 관리 및 해지 지원 서비스는 접근 방식에 따라 명확한 한계와 리스크를 드러내고 있습니다.

| 서비스 / 모델 | 주요 메커니즘 | 장점 | 치명적 한계 및 규제 리스크 | SubMate의 차별화 포지션 |
|---|---|---|---|---|
| **Rocket Money** (미국) | Concierge Cancellation (계정 로그인 정보 위임 또는 고객 명의 대행) ([Rocket Money Guide](https://help.rocketmoney.com/en/articles/934402-how-do-i-cancel-a-subscription-on-rocket-money)) | 사용자가 손 하나 까딱 않고 해지 완료 | 유료 플랜 요구, 대행 실패율 존재, 제3자 로그인으로 인한 서비스 약관 위반 및 보안 침해 우려. | **비자격증명 온디바이스 저권한 가이드**: ID/PW 수집 없이 사용자의 통제권을 유지하며 즉시 이동. |
| **DoNotPay** (미국) | AI 기반 분쟁 및 구독 자동 취소 표방 | '로봇 변호사'를 내세운 공격적 마케팅 | FTC 허위 과장 광고 제재 및 환불 명령 확정 (2025년 2월 FTC Final Order). 실질적 법적 대리권 없음. ([FTC DoNotPay](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires)) | 허위 자동화 주장 배제. 사실에 기반한 증거 패키지 빌더와 사용자 직접 발송 모델로 규제 준수. |
| **Revolut / Monzo** (영국/유럽) | 네오뱅크 수준의 가상카드 발급 및 특정 가맹점 결제 차단(Block Future Payments) | 카드 레일에서 원클릭 결제 중단 | 은행 인가 필요, 결제만 차단 시 계약 불이행으로 채권 추심 또는 서비스 이용 정지 분쟁 발생. | 결제 레일 차단과 서비스 계약 해지(양방향 가이드)의 차이를 명확히 분리 안내. |
| **Privacy.com** (미국) | 가맹점 전용 가상카드(Merchant-locked Cards) 발급 ([Privacy.com Docs](https://developers.privacy.com/docs/cards)) | 결제 한도 설정 및 카드 삭제로 강제 결제 방지 | 국내 전자금융거래법상 전자지급수단 발행업 라이선스 필요, 국내 카드 결제망 미지원. | 기존 카드사 및 페이사(카카오/네이버/토스)의 자동결제 해지 메뉴 딥링크로 대체. |
| **Visa / Mastercard** | Visa Subscription Manager ([Visa](https://developer.visa.com/capabilities/visa-subscription-manager)), Mastercard Smart Subscriptions (Minna 인수 연계) ([Mastercard](https://www.mastercard.com/us/en/business/cybersecurity-fraud-prevention/dispute-management/smart-subscriptions.html)) | 카드 네트워크망 수준에서 정기결제 조회 및 중단 API | 금융기관(발행사) B2B 솔루션으로 개별 서드파티 앱이 직접 제어 불가. 한국 카드망 미도입. | 마이데이터 2.0([금융위](https://fsc.go.kr/po010101/84780)) 및 어카운트인포([Payinfo](https://www.payinfo.or.kr)) 공개 인프라 연계. |
| **해지냥** (국내) | 웹 기반 서비스별 해지 매뉴얼 및 팁 제공 ([해지냥](https://cancelcat.space)) | 직관적인 스크린샷 가이드 | 정적 웹사이트에 머물러 개인 구독 데이터, 결제 주기 알림, 온디바이스 연동 부재. | 앱 내 구독 라이프사이클(알림, 플로팅 가이드, 사후 검증, 증거 관리) 통합. |
| **국내 페이사 / 금융결제원** | 카카오·네이버·토스페이 자동결제 관리, 페이인포 어카운트인포 ([Payinfo](https://www.payinfo.or.kr)) | 공인된 결제 차단 창구 | 각 사 앱/웹의 깊은 뎁스에 숨겨져 있어 사용자가 어디서 찾아야 하는지 모름. 운영시간 제한(어카운트인포). | 페이사별 자동결제 딥링크 직결 + 영업일 엔진([src/lib/businessDays.js](src/lib/businessDays.js))을 통한 지능형 리마인더. |

---

## 4. SubMate 6대 해지 혁신 제안

SubMate는 자격증명 수집이나 위험한 웹 자동 대행을 배제하는 선행 원칙([RESEARCH_LOW_PERMISSION_CANCEL.md](RESEARCH_LOW_PERMISSION_CANCEL.md))을 계승하며, 해지 전 과정을 완성하는 6가지 혁신 기능을 제안합니다.

```
[해지 라이프사이클 파이프라인]

1. 언제 해지할까? (해지 타이밍 엔진)
   ├─ 즉시 종료 vs 잔여 기간 유지 식별
   └─ 중도해지 일할 환불 여부 안내 및 D-1 예약 알림
         ▼
2. 어디서 끊을까? (결제 레일 우선 해지)
   ├─ 진짜 결제 레일 식별 (스토어 / 페이사 / 카드 / 통신사)
   └─ 최단 직링 안내 + '결제 수단 차단 ≠ 계약 해지' 양방향 처리
         ▼
3. 어떻게 증명할까? (해지 증명 패키지 & 사후 보호)
   ├─ 온디바이스 해지 완료 스크린샷 / 타임스탬프 로컬 저장
   └─ cancelVerification 루프 연계: 사후 부당 결제 감시
         ▼
4. 부당 결제 발생 시? (분쟁 해결 지원)
   └─ 1372 소비자상담 / 공정위 다크패턴 위반 신고 초안 자동 생성
         ▼
[상시 데이터 인프라]
- 해지 난이도 및 다크패턴 지수 (크라우드 소싱 기반 투명성 지수)
- 리텐션 오퍼 카탈로그 & 정기 로테이션 대안 제시
- 사용자 세션 내 저위험 온디바이스 보조 자동화 (점진적 적용)
```

---

### 제안 1. 해지 타이밍 엔진 (Termination Timing Engine)

#### 1) 해결하려는 문제
구독 서비스마다 해지 시점의 효력이 상이합니다.
- **기간 만료형(잔여 기간 유지)**: 넷플릭스, 왓챠 등은 결제일 직후 해지해도 다음 결제일까지 서비스가 유지됩니다.
- **즉시 종료형(중도해지 환불)**: 네이버플러스 멤버십 등은 즉시 종료 시 미사용 혜택을 정산하여 부분 환불하거나 서비스가 즉시 중단됩니다.
- **위약금/할인반환금 발생형**: 어도비, 통신사 약정형 상품은 중도 해지 시 거액의 위약금이 발생합니다.
사용자는 '지금 누르면 바로 끊길까 봐' 다음 결제일 직전까지 미루다가 깜빡 잊고 재결제되는 트랩에 빠집니다.

#### 2) 사용자 경험 (시나리오)
> 사용자 민우 씨는 넷플릭스 구독을 정리하려 합니다. SubMate 상세 화면에서 '해지하기'를 누르면 상단에 굵은 배지가 표시됩니다:
> **'지금 해지해도 10월 28일까지 12일간 무료로 계속 시청할 수 있어요! (기간말 정기결제 해지)'**
> 안심한 민우 씨는 미루지 않고 즉시 해지 플로우로 진입합니다.
> 반면, 연간 약정 어도비를 해지하려 할 때는 **'지금 해지하면 약정 위약금이 청구될 수 있어요. 결제 갱신월(11월)에 해지하는 것이 안전해요.'**라는 안내와 함께 `[갱신 7일 전 알림 예약]` 버튼이 제공됩니다.

#### 3) 구현 방식 및 확장 대상 코드
- **데이터베이스 스키마 확장**: [supabase/migrations/20261004121000_sync_service_cancel_urls.sql](supabase/migrations/20261004121000_sync_service_cancel_urls.sql)에서 정의된 서비스 메타데이터에 해지 정책 컬럼을 추가합니다.
  - `cancel_type`: `period_end` (기간말 종료), `immediate_prorated` (즉시 일할 환불), `immediate_loss` (즉시 소멸), `contract_penalty` (약정 위약금 주의)
  - `refund_policy_summary`: 한국어 한 줄 정책 요약
  - `penalty_warning`: 위약금 경고 플래그
- **UI 및 알림 로직 확장**:
  - [src/components/CancelModal.jsx](src/components/CancelModal.jsx): 모달 상단에 해지 정책 배지(`PolicyTimingBadge`) 및 최적 해지 시점 권고 렌더링.
  - [src/lib/notifications.js](src/lib/notifications.js): '결제일 1일 전 09:00' 또는 '영업일 계산 엔진([src/lib/businessDays.js](src/lib/businessDays.js)) 기준 전 영업일'에 맞춤 해지 알림 예약.

#### 4) 필요 데이터
주요 94개 서비스의 이용약관 및 결제 취소 정책 전수 조사:
- 즉시 해지 시 환불 로직 (미이용 기간 환불 가능 여부, 콘텐츠 다운로드/시청 이력에 따른 환불 제한 규정)
- 연간 구독의 약정 기간 및 취소 수수료율 (어도비 등).

#### 5) 법적·운영 리스크 분석
- **트리거**: 서비스사의 약관 변경(예: 기간말 유지에서 즉시 소멸로 변경)을 SubMate가 제때 반영하지 못한 경우.
- **가능성(Likelihood)**: 낮음~중간 (정기 구독 약관은 빈번하게 변경되지 않음).
- **영향도(Impact)**: 중간 (사용자가 조기 종료로 인한 서비스 일수 손실 불만 제기 가능).
- **대응 조치**: 모든 안내 문구 하단에 '서비스사 최신 약관(2026년 10월 확인 기준)에 따르며 변경될 수 있습니다' 면책 각주 표시 및 크라우드 제보 피드백 버튼 연동.

#### 6) 성공 지표
- 해지 결심 후 실제 해지 가이드 실행 완료율 (Click-through rate) 25% 상승.
- 결제일 직전 깜빡 재결제 발생률 40% 감소.

---

### 제안 2. 결제 레일 우선 해지 (Rail-First Cancellation)

#### 1) 해결하려는 문제
많은 사용자가 앱스토어 인앱결제나 네이버페이·카카오페이 간편결제로 가입해 두고도, 서비스사 공식 웹사이트에서 해지 메뉴를 찾지 못해 헤맵니다. 또한 반대로 페이사나 카드사에서 자동결제를 차단했을 때, '결제 승인 차단'과 '서비스 계약 해지'의 차이를 혼동하여 미납 연체 독촉이나 신용점수 하락 분쟁을 겪기도 합니다.

#### 2) 사용자 경험 (시나리오)
> 사용자 지혜 씨는 티빙을 해지하려 합니다. SubMate는 지혜 씨의 결제 채널이 `naver_pay`임을 자동 인식([src/lib/cancelRoutes.js](src/lib/cancelRoutes.js))하고 있습니다.
> CancelModal을 열자 2단계 스위치가 제시됩니다:
> 1단계: **[티빙 서비스 이용권 해지]** 버튼 -> 티빙 마이페이지 직링크 안내.
> 2단계: **[네이버페이 정기결제 수단 차단]** 버튼 -> 네이버페이 현장결제/반복결제 관리 직링크 안내.
> 화면에는 안내문이 명확히 표시됩니다:
> *'주의: 네이버페이에서 결제만 끊으면 서비스 이용 계약이 남아 미납 안내가 올 수 있어요. 꼭 1단계(티빙 해지)를 먼저 마치고 2단계(결제 차단)를 진행하세요.'*

#### 3) 구현 방식 및 확장 대상 코드
- **결제 채널 확장**: [src/lib/cancelRoutes.js](src/lib/cancelRoutes.js)의 `STORE_ROUTES` 및 `CANCEL_CHANNELS`에 국내 대표 페이사 딥링크 추가:
  - 카카오페이: `kakaopay://` 스킴 또는 모바일 웹 자동결제 관리 경로
  - 네이버페이: `https://m.pay.naver.com/recurring/list` (네이버페이 반복/정기결제 관리)
  - 토스페이: 토스 앱 내 브랜드 자동결제 해제 스킴
  - 통신사 부가서비스: SKT Tworld, KT 마이케이티, LGU+ 당신의U+ 부가서비스 해지 딥링크
- **스토어 딥링크 고도화**:
  - Google Play: 기존 단순 URL(`https://play.google.com/store/account/subscriptions`)에서 카탈로그에 등록된 패키지명과 결합하여 `https://play.google.com/store/account/subscriptions?package={pkg}` 형태로 특정 앱 구독 관리 화면 직결. ([Android Billing](https://developer.android.com/google/play/billing/subscriptions))
  - Apple: `https://apps.apple.com/account/subscriptions` 및 iOS 환경에서 `itms-apps://apps.apple.com/account/subscriptions` 네이티브 스킴 분기. ([Apple Support](https://support.apple.com/en-us/118428))
- **양방향 안전 가이드 추가**:
  - [src/components/CancelModal.jsx](src/components/CancelModal.jsx) 내에 '계약 해지'와 '결제 레일 차단'을 탭 형태로 분리하여 사용자에게 두 단계가 모두 필요함을 시각적 체크리스트로 제공.

#### 4) 필요 데이터
- 국내 3대 페이사(카카오/네이버/토스) 모바일 웹/앱 정기결제 관리 딥링크 매핑.
- 94개 서비스별 안드로이드 패키지명(`package_name`) 및 iOS App ID 매핑.

#### 5) 법적·운영 리스크 분석
- **트리거**: 사용자가 서비스 계약을 해지하지 않고 페이사/카드사 결제만 끊어 서비스사로부터 채권 추심이나 계정 정지를 당하는 경우.
- **가능성(Likelihood)**: 낮음 (SubMate가 강력한 경고 UI를 명시하므로).
- **영향도(Impact)**: 중간 (사용자 클레임 가능성).
- **대응 조치**: [RESEARCH_LOW_PERMISSION_CANCEL.md](RESEARCH_LOW_PERMISSION_CANCEL.md)의 원칙에 따라 '카드 연결만 끊는 해지는 미납이 생길 수 있음' 경고를 붉은색 안내 박스로 필수 노출.

#### 6) 성공 지표
- 결제 수단 오매칭으로 인한 해지 실패율 0% 수렴.
- 간편결제 연동 구독의 해지 완료 전환율 35% 증대.

---

### 제안 3. 온디바이스 해지 증명 패키지 & 사후 부당 결제 방어 (Cancel Proof Package & Guarantee)

#### 1) 해결하려는 문제
해지를 정상적으로 마쳤음에도 불구하고 사업자의 전산 오류, 지연 처리, 또는 다크패턴(해지 버튼 클릭 후 추가 확인 미완료 등)으로 인해 다음 달에 구독료가 청구되는 사고(`charged_after_cancel`)가 빈번합니다. 소비자는 해지 완료 시점의 캡처본이나 증거를 남겨두지 않아 카드사 이의제기(Chargeback)나 고객센터 환불 요구 시 입증에 곤란을 겪습니다.

#### 2) 사용자 경험 (시나리오)
> 영호 씨는 OTT 해지 가이드 진행 중, CancelBrowserModal([src/components/CancelBrowserModal.jsx](src/components/CancelBrowserModal.jsx))의 마지막 화면에서 **[해지 완료 화면 저장]** 버튼을 누릅니다.
> 앱은 영호 씨 기기의 로컬 저장소에 해지 완료 화면 캡처, 완료 일시(2026-10-16 14:22 KST), 결제 수단 정보를 암호화하여 담은 '해지 증명서(Evidence)'를 생성합니다.
> `cancelVerification.js` 엔진은 다음 결제 예정일(11월 16일) 이후 2일간 결제 알림 수신 여부를 자동 감시합니다.
> 만약 11월 16일에 카드 결제 문자가 감지되면, SubMate는 즉시 경고를 띄웁니다:
> **'해지하셨던 OTT 서비스에서 14,900원이 결제되었습니다! 저장해 둔 해지 증명서로 환불을 요청할까요?'**
> 영호 씨가 터치 한 번을 누르면, AgentSheet([src/components/AgentSheet.jsx](src/components/AgentSheet.jsx))가 1372 소비자상담센터 양식 및 전자상거래법 다크패턴 조항이 기재된 환불 요청 이메일 초안을 즉시 완성해 주며, 영호 씨는 복사하여 고객센터에 전송합니다.

#### 3) 구현 방식 및 확장 대상 코드
- **로컬 증빙 캡처 및 암호화**:
  - [src/components/CancelBrowserModal.jsx](src/components/CancelBrowserModal.jsx) 및 [src/lib/cancelBrowser.js](src/lib/cancelBrowser.js): 사용자가 해지 완료 단계에 도달했을 때 단말기 화면 캡처 인텐트를 호출하여 기기 내 샌드박스에 이미지 저장.
  - [supabase/migrations/20261001141000_create_evidence_cases.sql](supabase/migrations/20261001141000_create_evidence_cases.sql): `evidence_cases` 테이블의 `kind = 'charged_after_cancel'`과 `evidence_items`(`cancel_record`)에 타임스탬프와 메타데이터(금액, 카드 끝 4자리) 연동. 사용자가 서버 동의를 한 경우에만 메타데이터가 동기화되며, 스크린샷 원본은 철저히 로컬에만 보관.
- **해지 후 감시 루프 강화**:
  - [src/lib/cancelVerification.js](src/lib/cancelVerification.js): `reviewCancelVerifications` 함수가 결제 감지 시스템과 상시 연동되어 결제 문자 수신 시 즉시 `charged_after_cancel` 케이스를 트리거.
- **분쟁 해결 초안 생성기 고도화**:
  - [src/components/AgentSheet.jsx](src/components/AgentSheet.jsx): 기존 LLM 기반 환불 요청서 작성기에 **'2025.2.14 시행 개정 전자상거래법 제21조의2(소비자의 청약철회 및 해지 방해 금지)'** 및 **'전자상거래 등에서의 소비자보호 지침'** 조항을 인용하는 전문 템플릿 주입. ([공정거래위원회](https://www.ftc.go.kr))
  - 1372 소비자상담센터 온라인 상담 접수용 표준 서식(청구 금액, 결제 일시, 해지 신청 일시, 사업자명) 자동 채우기 텍스트 생성.

#### 4) 필요 데이터
- 한국소비자원(1372) 분쟁 조정 양식 필드 맵.
- 개정 전자상거래법 및 통신판매업 규정 법률 문언 템플릿.

#### 5) 법적·운영 리스크 분석
- **트리거**: SubMate가 사용자를 '대리'하여 통신판매업자에게 직접 메일을 발송하거나 소송을 수행할 경우 (변호사법 위반 소지).
- **가능성(Likelihood)**: 매우 낮음 (원칙적으로 SubMate는 초안 작성 도구만 제공).
- **영향도(Impact)**: 치명적 (변호사법 제109조 위반 형사 리스크).
- **대응 조치**: DoNotPay의 FTC 제재 사례([FTC DoNotPay](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires))를 엄격히 반면교사 삼아, **'SubMate는 법률 대리인이 아니며, 작성된 초안의 검토 및 발송 주체는 전적으로 사용자 본인'**임을 앱 내에 명확히 고지하고 발송 버튼은 시스템 메일 앱 클라이언트(`mailto` link)로 연결하여 사용자가 직접 전송하도록 강제.

#### 6) 성공 지표
- 해지 후 부당 결제 발생 건 중 환불 성공률 80% 이상 달성.
- 증거 저장 기능 활성화 사용자 비율 50% 이상.

---

### 제안 4. 해지 난이도 및 다크패턴 지수 (Dark Pattern Index & Transparency Report)

#### 1) 해결하려는 문제
소비자는 어떤 서비스가 가입은 원클릭이면서 해지는 5단계를 거치게 하는지, 전화 통화로만 해지가 가능한지 사전에 알 수 없습니다. 이러한 비대칭 정보를 수면 위로 끌어올려 사용자의 구독 선택을 돕고, 서비스사들이 자발적으로 해지 절차를 개선하도록 유도할 공공재적 데이터가 필요합니다.

#### 2) 사용자 경험 (시나리오)
> 수진 씨가 새로운 음원 스트리밍 서비스를 구독하려 탐색할 때, SubMate 상세 정보에 **'해지 난이도: 🔴 어려움 (다크패턴 지수 82점)'**이 표시됩니다.
> - 해지까지 평균 단계: 4.8단계
> - 평균 소요 시간: 3분 40초
> - 다크패턴 유형: 혜택 포기 확인창 3회 반복, '해지 유지' 버튼을 강조색으로 처리, 작은 회색 글씨 해지 링크.
> 실제 해지 진행 화면에서도 단계별 진행률 바가 표시되어 '현재 4단계 중 2단계(혜택 유지 설득)입니다. 다음 화면에서 최종 버튼이 나옵니다.'라는 가이드를 통해 심리적 피로를 덜어줍니다.

#### 3) 구현 방식 및 확장 대상 코드
- **온디바이스 가이드 텔레메트리 (익명 집계)**:
  - [src/lib/cancelBrowser.js](src/lib/cancelBrowser.js) 및 [src/components/CancelBrowserModal.jsx](src/components/CancelBrowserModal.jsx)의 가이드 진행 단계 통계(단계 수, 도달 시간, 중도 이탈률)를 비식별화하여 집계.
  - 개인정보(PII)나 화면 캡처는 일체 서버로 전송하지 않으며, 오직 단계 ID와 소요 시간만 수집 (Opt-in 동의 기반).
- **다크패턴 스코어링 알고리즘**:
  - 점수 산정 항목: ① 모바일 웹 해지 불가(전화/PC 전용 여부: +40점), ② 해지 단계 수(3단계 이상 시 단계당 +10점), ③ 감정적 설득창(Confirmshaming 여부: +15점), ④ 버튼 시각적 오도(Misdirection: +15점).
- **분기별 공개 '구독 해지 투명성 리포트' 발행**:
  - SubMate 브랜딩 및 PR 레버리지로 활용. 언론 홍보 및 공정거래위원회 다크패턴 모니터링 실태조사 보도자료 배포.

#### 4) 필요 데이터
- 서비스별 해지 스텝 수, 방해 요소 태그 데이터.
- 사용자 해지 완료 응답 데이터.

#### 5) 법적·운영 리스크 분석
- **트리거**: 특정 서비스사가 자사의 해지 난이도 등급 표시에 대해 영업 방해, 명예훼손 또는 정보통신망법 위반을 주장하며 소송이나 내용증명을 제기하는 경우.
- **가능성(Likelihood)**: 중간.
- **영향도(Impact)**: 중간 (법률 대응 비용 발생 가능).
- **대응 조치**: 평가 기준을 개정 전자상거래법의 공정위 다크패턴 심사지침에 1:1로 결부시키고, 정량적 사실 지표(클릭 수, 확인 화면 수, 전화 필수 여부)만 기재하여 객관적 공익 목적 정보 제공임을 입증할 수 있도록 설계.

#### 6) 성공 지표
- 분기별 투명성 리포트 언론 인용 및 바이럴 트래픽 확보.
- 다크패턴 지수 확인 후 해지 성공률 20% 개선.

---

### 제안 5. 리텐션 오퍼 카탈로그 & 정기 로테이션 대안 제시 (Retention Offer & Tier Optimization)

#### 1) 해결하려는 문제
구독 해지는 사용자가 서비스가 완전히 싫어서가 아니라, '지금 당장은 너무 비싸서' 또는 '잠시 볼 게 없어서' 결정하는 경우가 많습니다. 서비스사들은 해지 직전에 숨겨진 50% 할인 쿠폰, 일시정지 옵션, 저렴한 광고형 요금제를 제안합니다. 그러나 사용자는 어떤 혜택이 있는지 알지 못한 채 정가를 다 내거나, 불필요하게 완전 해지 후 재가입하는 번거로움을 겪습니다.

#### 2) 사용자 경험 (시나리오)
> 사용자 진우 씨가 유튜브 프리미엄 해지 모달을 엽니다. SubMate는 해지 안내 하단에 팁을 제공합니다:
> *'잠깐! 완전 해지 대신 비용을 아끼는 3가지 방법이 있어요.'*
> 1. **[최대 6개월 멤버십 일시정지]**: 여행/시험 기간 동안 결제 없이 유지.
> 2. **[해지 방어 할인]**: 해지 플로우 2단계에서 제공되는 1개월 무료/할인 혜택 확인법.
> 3. **[구독 로테이션]**: SubMate의 기존 OTT 로테이션 플랜과 연동하여 '이번 달은 티빙 보고 다음 달에 다시 올까요?' 제안.

#### 3) 구현 방식 및 확장 대상 코드
- **서비스 메타데이터 확장**: [supabase/migrations/20261004121000_sync_service_cancel_urls.sql](supabase/migrations/20261004121000_sync_service_cancel_urls.sql) 카탈로그에 대안 정보 필드 추가:
  - `pause_supported`: 일시정지 지원 여부 및 최대 일시정지 기간.
  - `retention_offers`: 알려진 해지 방어 프로모션 정보 JSON.
  - `alternative_plans`: 광고형 요금제, 알뜰 요금제 정보.
- **UI 연계**:
  - [src/components/CancelModal.jsx](src/components/CancelModal.jsx): 해지 버튼 직전에 접이식 아코디언 형태로 '해지 전 받을 수 있는 혜택 및 대안' 탭 렌더링.

#### 4) 필요 데이터
- 주요 스트리밍 및 SaaS 서비스의 일시정지 정책 및 리텐션 할인 정책 크라우드 소싱 데이터.

#### 5) 법적·운영 리스크 분석
- **트리거**: 서비스사의 리텐션 오퍼 정책 변경(프로모션 조기 종료)으로 사용자가 안내된 할인을 받지 못하는 경우.
- **가능성(Likelihood)**: 중간.
- **영향도(Impact)**: 낮음.
- **대응 조치**: '사용자 제보 기준이며, 계정 상태에 따라 제공되지 않을 수 있음'을 명시.

#### 6) 성공 지표
- 완전 해지 대비 일시정지/요금제 다운그레이드로 전환된 사용자 만족도 30% 증대.
- SubMate 구독 로테이션 기능과의 시너지 창출.

---

### 제안 6. 사용자 세션 내 저위험 온디바이스 보조 자동화 (In-Session Assisted Automation, 중장기)

#### 1) 해결하려는 문제
복잡한 다크패턴 화면에서 텍스트 가이드만 보고 따라가기 어려워하는 디지털 취약 계층이나 고령층 사용자는 여전히 해지에 큰 어려움을 겪습니다. OpenAI의 Computer Use([OpenAI Computer Use](https://developers.openai.com/api/docs/guides/agents-api/tools/computer-use)) 등 에이전트 기술이 발전하고 있으나, 클라우드 대행 방식은 자격증명 노출과 CAPTCHA 차단이라는 구조적 한계가 있습니다.

#### 2) 사용자 경험 (시나리오)
> 60대 사용자 정숙 씨가 해지하기를 누르면, 앱 내 샌드박스된 전용 웹뷰(In-App WebView)가 열립니다.
> 정숙 씨가 자신의 계정으로 로그인(생체 인증 또는 패스키)을 완료하면, SubMate의 가이드 에이전트가 화면 상의 '해지' 관련 버튼 테두리를 밝은 노란색으로 강조하고 화면을 해당 위치로 자동 스크롤해 줍니다.
> 다단계 설득 페이지를 넘길 때도 다음 클릭 위치를 명확히 짚어주며, **최종 해지 확정 버튼(법적 의사표시)은 오직 사용자가 직접 눈으로 확인하고 손가락으로 누르도록 합니다.**

#### 3) 구현 방식 및 확장 대상 코드
- **클라이언트 WebView 스크립트 인젝션**:
  - [src/lib/cancelBrowser.js](src/lib/cancelBrowser.js) 및 [src/components/CancelBrowserModal.jsx](src/components/CancelBrowserModal.jsx)의 웹뷰 내에서 작동하는 경량 DOM 하이라이터 스크립트 작성.
  - [android/app/src/main/java/com/submate/app/webguide/services/naver/NaverMonthlyCancelRoute.java](android/app/src/main/java/com/submate/app/webguide/services/naver/NaverMonthlyCancelRoute.java)의 셀렉터 기반 스텝 로직을 발전시켜, 서비스별 주요 버튼 DOM 셀렉터(`[data-testid='cancel-button']` 등)를 감지하여 하이라이트 표시 및 스크롤 지원.
- **절대적 원칙 유지**:
  - 자격증명(ID/PW)은 웹뷰 세션 내에만 머물며 앱 저장소나 백엔드로 절대 추출되지 않음.
  - 최종 해지 확정 클릭은 자동화 스크립트로 트리거하지 않고 오직 사용자의 물리적 터치 입력만 허용.

#### 4) 필요 데이터
- 주요 10대 서비스(네이버, 쿠팡, 넷플릭스, 티빙, 유튜브 등)의 웹 DOM 셀렉터 트리 및 주기적 모니터링 데이터.

#### 5) 법적·운영 리스크 분석
- **트리거**: 서비스사의 서비스 이용약관상 '비인가 스크립트/봇 사용 금지' 조항 및 DOM 구조 변경으로 인한 오작동.
- **가능성(Likelihood)**: 높음 (웹 프론트엔드 배포에 따라 DOM이 수시로 변함).
- **영향도(Impact)**: 중간 (해지 단계 안내 실패).
- **대응 조치**: DOM 요소를 찾지 못하면 즉시 일반 안내 모드(기존 CancelBrowser 플로팅 가이드)로 우아하게 강등(Graceful Fallback)되는 안전장치 내장.

#### 6) 성공 지표
- 모바일 웹 해지 완료 소요 시간 50% 단축.
- 50대 이상 사용자의 해지 플로우 완주율 40% 증가.

---

## 5. 배제한 접근 방식과 그 이유

SubMate의 보안·법률 원칙([RESEARCH_LOW_PERMISSION_CANCEL.md](RESEARCH_LOW_PERMISSION_CANCEL.md))에 따라 다음 3가지 방식은 검토 후 공식적으로 배제합니다.

```
[명확히 배제한 안과 기각 근거]

1. 사용자 계정 자격증명 기반 대행 해지 (Credential Proxy)
   - 기각 사유: 정보통신망법 제48조(정보통신망 침해행위) 위반 소지, 금융/쇼핑 통합 계정 탈취 위험, 서비스 이용약관 위반에 따른 법적 분쟁.

2. 클라우드 헤드리스 브라우저 원격 대행 (Cloud Headless Bot)
   - 기각 사유: 클라우드 IP 차단(WAF/봇 방어), CAPTCHA 및 2차 인증(SMS/OTP) 통과 불가, 고비용 서버 인프라 유지비.

3. 가상 결제 카드 발급 및 네트워크 강제 차단 (Virtual Card Issuance)
   - 기각 사유: 전자금융거래법상 전자지급수단 발행업 등록 및 막대한 자본금 요건 필요, 채무 불이행으로 인한 사용자 신용 리스크 유발.
```

1. **사용자 계정 자격증명 수집을 통한 원격 대행 (Credential-based Proxy Cancellation)**
   - 메커니즘: 사용자의 아이디와 비밀번호를 받아 백엔드 서버나 상담원이 대신 로그인하여 해지하는 방식 (Rocket Money 초기 모델).
   - 배제 이유: 네이버, 카카오, 구글, 쿠팡 등 국내 대다수 계정은 간편결제 및 개인정보가 직결되어 있습니다. 자격증명을 서버에 저장하는 순간 정보통신망법상 최고 수준의 암호화 및 ISMS 인증 의무가 발생하며, 유출 시 치명적 보안 사고로 이어집니다. 또한 서비스사의 비인가 로그인 탐지에 걸려 계정이 정지될 수 있습니다.
2. **클라우드 헤드리스 브라우저 봇 (Cloud Headless Automation)**
   - 메커니즘: 클라우드 인스턴스(Puppeteer/Playwright)에서 가상 브라우저를 띄워 백그라운드로 해지 처리.
   - 배제 이유: Cloudflare, Akamai 등 봇 방어 솔루션과 CAPTCHA, SMS 2단계 인증을 넘을 수 없습니다. 무엇보다 서비스 변경 시 유지보수 비용이 기하급수적으로 증가하며, 금융 거래와 연결된 세션을 서버가 제3자로서 조작하는 것은 전자금융거래법 및 플랫폼 이용약관에 정면 위배됩니다.
3. **가상 카드 발급을 통한 강제 결제 차단 (Virtual Card Issuance / Merchant-locked Card)**
   - 메커니즘: Privacy.com이나 Revolut처럼 SubMate가 가상 카드를 발급하고, 해지 요청 시 카드 승인을 거절하는 방식.
   - 배제 이유: 국내에서 이를 구현하려면 금융위원회에 전자지급수단 발행업 또는 선불전자지급수단 등록을 마쳐야 하며 수십억 원의 자본금과 금융보안원 보안 심사가 요구됩니다. 결정적으로, '결제 승인 차단'은 '법적 이용계약 해지'가 아니므로 이용약관상 미납 연체료가 쌓이고 채권추심으로 이어질 수 있습니다.

---

## 6. 제품 로드맵 및 실행 우선순위

기존 코드베이스 자산을 최대한 재활용하고 공수 대비 사용자 체감 가치가 높은 순으로 3단계로 나누어 추진합니다.

| 단계 | 추진 과제 | 상세 내용 | 대상 파일 / 컴포넌트 | 예상 공수 |
|---|---|---|---|---|
| **지금 (Phase 1)**<br>즉시 착수 (1~2개월) | **해지 타이밍 엔진 구축** | 94개 서비스 해지 정책 데이터(`cancel_type`) 수집 및 모달 배지 표시, D-1 알림 | [supabase/migrations/20261004121000_sync_service_cancel_urls.sql](supabase/migrations/20261004121000_sync_service_cancel_urls.sql)<br>[src/components/CancelModal.jsx](src/components/CancelModal.jsx)<br>[src/lib/notifications.js](src/lib/notifications.js) | **M** (2~3주) |
| | **페이사 및 스토어 딥링크 직결** | 카카오/네이버/토스페이 정기결제 관리 딥링크 추가, Google Play package 직결 | [src/lib/cancelRoutes.js](src/lib/cancelRoutes.js) | **S** (1주) |
| | **다크패턴 법률 템플릿 환불 초안** | 개정 전자상거래법 제21조의2 조항을 반영한 환불 청구서/소비자원 상담 서식 탑재 | [src/components/AgentSheet.jsx](src/components/AgentSheet.jsx) | **S** (1주) |
| **다음 (Phase 2)**<br>핵심 확장 (3~4개월) | **해지 증명 패키지 (로컬)** | 안드로이드 해지 완료 화면 캡처 저장, `cancelVerification` 감시 루프 결합 | [src/components/CancelBrowserModal.jsx](src/components/CancelBrowserModal.jsx)<br>[src/lib/cancelBrowser.js](src/lib/cancelBrowser.js)<br>[src/lib/cancelVerification.js](src/lib/cancelVerification.js) | **M** (3주) |
| | **해지 난이도 지수 도입** | 단계 수, 소요 시간 비식별 텔레메트리 수집 및 서비스 상세 화면 배지화 | [src/lib/cancelBrowser.js](src/lib/cancelBrowser.js)<br>[src/components/CancelModal.jsx](src/components/CancelModal.jsx) | **M** (3주) |
| | **리텐션 오퍼 카탈로그** | 일시정지 가능 여부 및 해지 방어 프로모션 정보 탭 추가 | [src/components/CancelModal.jsx](src/components/CancelModal.jsx) | **S** (1주) |
| **나중 (Phase 3)**<br>기술 고도화 (5개월~) | **세션 내 온디바이스 DOM 하이라이터** | 웹뷰 내 안전한 버튼 하이라이트 및 스크롤 보조 가이드 (주요 5대 서비스) | [android/app/src/main/java/com/submate/app/webguide/services/naver/NaverMonthlyCancelRoute.java](android/app/src/main/java/com/submate/app/webguide/services/naver/NaverMonthlyCancelRoute.java)<br>[src/lib/cancelBrowser.js](src/lib/cancelBrowser.js) | **L** (6~8주) |
| | **분기별 해지 투명성 리포트 발간** | 집계된 다크패턴 지수를 공공 리포트 및 PR 자산으로 공식 발행 | 백엔드 집계 파이프라인 | **M** (2주) |

---

## 7. 미결 제품 결정 사항 (Open Questions)

본 혁신안을 실제 프로덕션에 구현하기 위해 팀 내부에서 합의해야 할 정책적 결정 사항입니다.

1. **해지 증명 캡처본의 서버 동의 업로드 허용 여부**
   - 질문: 현재 [supabase/migrations/20261001141000_create_evidence_cases.sql](supabase/migrations/20261001141000_create_evidence_cases.sql)은 텍스트 메타데이터만 서버에 동의 보관하도록 되어 있습니다. 해지 완료 스크린샷 이미지 자체도 암호화하여 서버에 동의 백업할 수 있게 할 것인가, 아니면 프라이버시 원칙에 따라 100% 온디바이스 로컬 저장으로 한정할 것인가?
   - 권고: 프라이버시 침해 및 스토리지 비용 위험을 감안하여 1단계에서는 순수 온디바이스 로컬 파일 저장소(Capacitor Filesystem)에만 보관하고, 분쟁 발생 시 사용자가 직접 공유 인텐트로 내보내도록 하는 것이 안전합니다.
2. **다크패턴 지수 공개 시 서비스사 반발 대응 정책**
   - 질문: 해지 난이도 점수 공개로 인해 특정 기업(예: 통신사, 대형 플랫폼)으로부터 항의나 법적 조치 위협을 받을 경우의 대응 가이드라인은 무엇인가?
   - 권고: 주관적 비난 표현을 배제하고, 공정위 고시 기준(클릭 수, 확인창 횟수, 전화 필수 여부)을 기계적 사실(Fact)로만 나열하며, 서비스사가 절차를 간소화할 경우 점수를 즉각 재평가해 주는 '신속 갱신 창구'를 함께 운영합니다.
3. **페이사 딥링크의 플랫폼별 지원 편차**
   - 질문: 카카오페이, 토스페이의 앱 스킴(kakaopay://, supertoss://)은 모바일 웹 환경이나 단말기에 앱이 설치되지 않은 환경에서 에러를 유발할 수 있습니다.
   - 권고: 앱 스킴 호출 실패 시 모바일 웹 결제 관리 페이지로 자동 폴백(fallback)되도록 [src/lib/cancelRoutes.js](src/lib/cancelRoutes.js)의 라우팅 구조를 이중화합니다.