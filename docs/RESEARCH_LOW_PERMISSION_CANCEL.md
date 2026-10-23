# 추가 권한 없이 해지를 돕는 방법 리서치

- 작성일: 2026-10-04
- 상태: 1단계 구현 완료(결제 경로별 해지 이동, 어카운트인포 이용시간 안내·다시 알림, 캘린더 추가, 공유받기)
- 관련 기획서: [PRD_SUBSCRIPTION_APPROVAL_AGENT.md](PRD_SUBSCRIPTION_APPROVAL_AGENT.md) 15장

## 결론

해지의 마지막 단계는 사용자가 공식 화면에서 직접 하고, 꾸독은 그 화면까지 가장 짧게 데려다주고 시점과 순서를 챙긴다. 이 방식은 비밀번호·카드번호·이메일 접근이 필요 없고, 결제·정산에 관여하지 않으므로 전자금융거래법상 PG 문제나 서비스 약관 위반 위험이 없다. 새로 요청하는 Android 권한은 없다(알림 권한은 기존 결제 사전 알림과 같은 것을 쓴다).

## 뮤즈(Meta Muse)와의 차이

Meta의 개인 에이전트 뮤즈는 결제 내역에서 반복 결제를 찾고, 사용자가 승인하면 가맹점 웹사이트에서 해지 절차를 대신 밟는다. 카드사에 정기결제를 강제로 끊는 방식이 아니다. ([Meta 발표](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/), [Muse for Finance](https://ai.meta.com/muse/finance/))
꾸독은 로그인 정보를 받지 않는 원칙(기획서 2장 비목표)을 지키면서, 해지 화면 이동·순서 안내·시점 관리로 같은 편의를 노린다.

## 확인한 방법

| 방법 | 공식 근거 | 권한 | 꾸독 적용 |
|---|---|---|---|
| Google Play 구독 목록 열기 | `https://play.google.com/store/account/subscriptions`는 사용자의 전체 구독 목록을 연다. 구독 하나를 여는 `?sku=...&package=...`는 그 앱 개발사가 정한 상품 ID가 필요하다. ([Android Developers – About subscriptions](https://developer.android.com/google/play/billing/subscriptions)) | 없음 | 다른 회사 앱의 상품 ID는 알 수 없어 전체 목록 링크를 쓴다 |
| Apple 구독 관리 열기 | `https://apps.apple.com/account/subscriptions`에서 Apple 계정 로그인 후 구독을 고르고 취소한다. iPhone은 설정 → 내 이름 → 구독. ([Apple 지원](https://support.apple.com/en-us/118428)) | 없음 | 링크와 기기 경로를 함께 안내 |
| 어카운트인포(페이인포) 카드자동납부 | 여러 카드사의 자동납부를 한 곳에서 조회·해지·변경. 해지·변경은 영업일 09:00~22:00, 조회는 매일 08:00~24:00. 새로 등록한 자동납부는 다음 영업일 이후 조회된다. ([페이인포 이용 안내](https://www.payinfo.or.kr/guide/useguideCdtrns2.do), [카드자동납부 조회](https://www.payinfo.or.kr/cdtrns/inq/qryListCard.do)) | 없음 | 이용시간 밖이면 다음 영업일 09:00을 계산해 보여주고 다시 알림 예약 |
| 캘린더에 결제일 추가 | `Intent.ACTION_INSERT` + `CalendarContract.Events.CONTENT_URI`로 캘린더 앱의 일정 화면을 채워 열면 `READ_CALENDAR`/`WRITE_CALENDAR` 권한이 필요 없다. 캘린더 앱이 없으면 `ActivityNotFoundException`. ([Calendar provider](https://developer.android.com/identity/providers/calendar-provider), [Common intents](https://developer.android.com/guide/components/intents-common)) | 없음 | Android는 인텐트, 웹은 .ics 파일 |
| 다른 앱에서 공유로 등록 | `ACTION_SEND` 인텐트 필터(`CATEGORY_DEFAULT`, `text/plain`·`image/*`)를 선언하면 공유 목록에 뜬다. 글은 `EXTRA_TEXT`, 이미지는 `EXTRA_STREAM`의 content Uri를 `ContentResolver`로 연다. ([Receive simple data](https://developer.android.com/develop/ui/compose/sharing/receive), [Intent filters](https://developer.android.com/training/basics/intents/filters)) | 없음 | 결제 문자는 기기 안에서 파싱, 캡처는 기존 영수증 인식으로 등록 |

## 영업일 계산 근거

해지 가능 시각은 주말과 공휴일을 뺀 영업일 09:00 기준으로 계산한다. 공휴일은 우주항공청 「2026년 월력요항」, 한국천문연구원 「2027년 월력요항」, 관공서의 공휴일에 관한 규정(노동절·제헌절 공휴일 지정 반영)을 기준으로 `src/lib/businessDays.js`에 2026~2027년을 넣었다. ([우주항공청](https://www.kasa.go.kr/bbs/BBSMSTR_000000000010/view.do?nttId=B000000001860Pe2zT3), [한국천문연구원 2027](https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2027), [국가법령정보센터](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1018770105))

- 예: 2026-10-04(일)에 누르면 10-05(개천절 대체공휴일)를 건너뛰고 10-06(화) 09:00.
- 목록이 없는 해(2028년 이후)는 주말만 빼고 계산하고 화면에 "공휴일이면 그다음 영업일에 다시 시도해 주세요"를 보여준다. 매년 월력요항 발표(6월경) 뒤 목록을 추가한다.
- 12월 31일 등 금융결제원 자체 휴무일은 확인하지 못해 넣지 않았다.

## 쓰지 않기로 한 방법

| 방법 | 이유 |
|---|---|
| 사용자 아이디·비밀번호를 받아 대신 로그인·해지 | 기획서 비목표. 서비스 약관 위반과 계정 탈취 위험 |
| 어카운트인포·카드사 화면 자동 조작 | 본인인증 절차 우회로 보일 수 있고 금융 화면 자동화 위험이 크다 |
| 접근성 서비스로 다른 앱 대신 클릭 | 큰 권한이 필요하고 Play 정책상 용도 제한이 있다 |
| 카드 연결만 끊는 해지 | 계약이 남아 미납·연체·위약금이 생길 수 있다. 어카운트인포 경로에서도 "요금 받는 회사에도 해지 의사를 남기라"고 안내한다 |

## 한계

- 어카운트인포는 외부 앱이 해지를 대신 요청할 공개 API를 찾지 못했다. 꾸독은 화면 이동과 시간 안내까지만 한다.
- App Store·Google Play·PayPal·해외 가맹점 구독은 어카운트인포 카드자동납부에 보이지 않을 수 있다. 그래서 웹 구독은 서비스 해지 페이지가 먼저이고 어카운트인포는 접힌 보조 경로로만 보여준다.
- 결제 경로를 사용자가 바꾼 값은 구독의 `payment_channel`로 저장돼 로그인 사용자는 서버(Supabase)와 동기화된다(2026-10-04). 해지 다시 알림은 기기 로컬 알림이라 다른 기기로 옮겨지지 않는다.


## 선언적 서비스 보조(Declarative Assist)와 userMustTap 원칙

- 작성일: 2026-10-16
- 배경: 기존 네이버플러스 멤버십에 국한되었던 자동 위치 안내(WebGuide)를 넷플릭스(Netflix) 및 유튜브 프리미엄(YouTube Premium) 등 다양한 정기결제 서비스로 확장하기 위해, 서비스별 선언적 설정(DeclarativeCancelRoute) 구조를 도입하였다.
- 선언적 라우트 모델(DeclarativeCancelRoute):
  - 각 서비스는 id, URL 정규식 패턴(urlPattern), 선택적 CSS 선택자(selector), 버튼 텍스트 포함 검색(textMatch, 한/영 다국어 지원), 한글 안내 문구(instruction), 상호작용 타입(TAP), 그리고 최종 해지 단계 여부(userMustTap)를 선언적으로 정의한다.
  - 로그인 감지: 계정 로그인 화면 URL 패턴에 진입하면 자동으로 가이드 상태를 PAUSED로 전환하고 하단 도크에 "로그인이 끝나면 이어서 안내할게요" 문구를 띄운다.
- **중간 단계 자동 넘김(Auto-Advance)과 userMustTap 원칙**:
  1. **역할 분리와 읽기 전용 보장**: 탐색 분석기(TargetResolver)는 100% 읽기 전용을 유지하며 일절 클릭을 수행하지 않는다. 중간 단계 자동 클릭은 분리된 전용 엔진(AutoAdvancer)에서만 수행된다.
  2. **사용자 비밀번호 미취득 및 최종 단계 직접 누르기**: 사용자 계정 비밀번호는 절대 요청하거나 저장하지 않으며, 최종 해지 버튼(userMustTap = true)은 언제나 사용자가 직접 눌러야 한다. 하단 도크에는 "마지막 버튼은 직접 눌러 주세요. 누르면 해지가 진행돼요." 문구가 명시되며 붉은색 테두리로 강조된다.
  3. **안전 요건 및 심층 방어(Defense in Depth)**: 자동 넘김은 userMustTap이 false이고 대상이 화면에 가시적(FOUND_VISIBLE)이며, 보안 정책 허용 도메인 및 비로그인 화면일 때만 동작한다. 추가로 버튼 텍스트나 속성에 최종 결제/해지/탈퇴/환불 키워드(예: "해지 확정", "해지하기 완료", "멤버십 해지", "구독 해지", "해지 완료", "취소 완료", "결제 취소", "탈퇴", "환불", "Finish Cancellation", "Confirm cancellation", "Cancel membership", "Cancel subscription", "Delete" 등)가 포함되어 있으면 즉시 자동 넘김을 거부하고 수동 단계(userMustTap)로 전환한다.
  4. **시각적 카운트다운 및 즉각 취소(Interruptible)**: 자동 넘김 전 1.2초 동안 하단 도크에 "꾸독이 다음 화면으로 넘기는 중…" 문구와 함께 "직접 할게요" 옵트아웃 버튼을 표시한다. 사용자가 화면을 터치하거나 옵트아웃 버튼을 누르면 즉시 자동 넘김이 취소되고 해당 세션은 수동 모드로 유지된다.
  5. **루프 방지(Loop Guard)**: 동일 (스텝 ID + URL) 조합당 최대 1회, 세션당 최대 6회로 자동 넘김을 엄격히 제한하며, 클릭 후 3초간 화면 전환이 없으면 진행 불가로 판단하여 기존 수동 하이라이트로 우아하게 강등(Fallback)한다.
  6. **해지 성공 감지 및 증빙 캡처**: 최종 단계 클릭 이후에만 활성화되는 성공 감지기(SuccessDetector)를 통해 성공 URL 패턴이나 DOM 텍스트("해지가 완료", "Your membership has been cancelled" 등)를 확인하고, 완료 즉시 웹뷰 증빙 화면(JPEG)을 자동 캡처하여 JS 레이어로 결과를 보고한다.
  7. **도메인 격리 보안 정책(WebSecurityPolicy)**: 스크립트 주입은 허용된 서비스 도메인(naver.com, netflix.com, youtube.com)에만 엄격히 제한되며, 로그인 전용 도메인(accounts.google.com 등)에서는 어떠한 스크립트도 주입되지 않는다.
