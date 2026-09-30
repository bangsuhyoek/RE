# RE 혜택 V2 별도 검증

이 브랜치는 `bangsuhyoek/RE` 전용 V2 shadow 수집기를 추가합니다. 기존 `crawl:schedule`, 정적 `promotionCatalog`, 앱 화면과 Android 파일은 그대로 둡니다. 이 브랜치만으로 혜택이 앱에 게시되지는 않습니다.

## 현재 연결 및 제한

- RE Supabase 프로젝트는 `ssukvsphufvdaanqlmgj`입니다. 다른 프로젝트 URL을 넣으면 RE 실행기는 수집과 DB 쓰기를 시작하기 전에 종료합니다.
- RE DB에는 V2 테이블과 `benefit_pipeline_flags`가 있지만 조사 시 V2 실행·혜택 기록은 0건이고 활성 플래그는 `v1`, shadow는 `true`였습니다.
- RE DB의 후보 테이블은 `(run_id, url)`에 유일 제약이 있고 `variant_id` 열이 없습니다. 이 브랜치는 같은 URL의 변형을 한 후보로 저장하되 `discovery_refs.variantId`에 변형별 연결을 남깁니다. 서로 다른 공식 URL의 증거는 별도 기록으로 유지합니다.
- 파이프라인의 공식 소스·조건 학습 코드는 2026-09-29 PC 수집본에 같은 날 순서대로 적용된 학생 액션, 히어로 CTA, Shadow 게이트 보완을 합쳤습니다. 이후 PC에 별도 수정이 있다면 병합 전에 다시 대조해야 합니다.
- 2026-09-30의 원래 KKUDOK DB Shadow는 Gemini 429로 `PARTIAL`이었습니다. 별도 DB 및 다른 앱에서 같은 수준의 품질을 아직 측정하지 않았습니다. 과거 Gold 52건 파일은 테스트 자료이며 RE 자동 게시 승인 자료가 아닙니다.

## RE shadow 실행 전 준비

RE 프로젝트의 **서버 전용** `secret/service_role` 키가 필요합니다. 브라우저용 `VITE_` 변수에 관리 키를 넣지 않습니다. 키는 파일, 로그, GitHub에 저장하지 않습니다. Windows에서는 다음 스크립트가 키를 숨겨서 입력받아 이 PowerShell 프로세스와 Node 자식 프로세스에서만 사용한 뒤 환경 변수를 제거합니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/benefit-v2/Run-RE-BenefitV2-Shadow.ps1
```

이 명령은 V2 수집·검증을 RE DB에 **shadow로만** 기록합니다. `--active`는 거부됩니다. `PARTIAL` 또는 `FAILED`면 종료 코드 2이며 결과는 점검 대상입니다.

## 교체 전 필수 확인

1. 실제 RE shadow 실행의 전체 보고서에서 DB 실행·후보·스냅샷·버전·지표 기록 수와 오류를 확인합니다. 공식 소스 수집과 Gemini 한도가 부족하면 보류합니다.
2. RE의 현재 34개 정적 혜택과 V2를 동일한 시점·대상·요금제·사용자 조건으로 대조하고, 독립적으로 검토한 Gold 및 CTA 링크를 확인합니다.
3. RE 앱은 아직 정적 카탈로그를 소비합니다. V2 게시 경로와 정확한 기존 혜택 대체표를 검토하고, 0건·조회 실패 시 기존 혜택이 남는 앱 조회 경로를 별도 검증합니다.
4. 이후 RE에 한해서 게시 플래그 및 자동 예약 실행을 전환합니다. 다른 저장소 및 다른 Supabase 프로젝트는 이 작업의 대상이 아닙니다.

테스트: `node --test tests/benefitPipelineV2.test.js tests/benefitV2ActivePublicationGate.test.js tests/benefitV2StudentAction.test.js tests/benefitV2SktIncludedCost.test.js tests/reBenefitV2Shadow.test.js`.
