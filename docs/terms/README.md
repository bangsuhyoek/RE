# SubMate 법적 약관 및 고지 체계 (Legal & Compliance Documentation)

본 디렉터리는 SubMate 서비스의 상용화, Google Play 스토어 심사, 그리고 국내 전자상거래법 및 개인정보보호법 준수를 위해 제작된 공식 약관 및 고지 문서 일체입니다.

---

## 문서 구성 체계

| 문서명 | 파일 경로 | 적용 대상 및 목적 |
| :--- | :--- | :--- |
| **서비스 이용약관** | 01_TERMS_OF_SERVICE.md | 회원 이용 계약, 구독 관리/해지 보조 서비스의 정의 및 면책 조항 |
| **개인정보 처리방침** | 02_PRIVACY_POLICY.md | 수집 항목, 보유 기간, 클라우드(Supabase/Vercel/Google) 위탁 및 파기 규정 |
| **앱 접근 권한 및 사전 고지서** | 03_APP_PERMISSIONS_AND_CONSENTS.md | 구글 플레이 Prominent Disclosure, 알림 접근/오버레이 권한 사전 안내 |

---

## 스토어 심사 및 규제 대응 핵심 포인트

### 1. 구글 플레이스토어 심사 대비 (Google Play Console)
- **개인정보처리방침 URL 등록**:
  - 02_PRIVACY_POLICY.md 문서를 웹 호스팅(예: https://submate.app/privacy 또는 GitHub Pages/Notion 공개 링크)에 게시 후 Play Console의 [앱 콘텐츠 > 개인정보처리방침]에 URL 입력.
- **금융 데이터 및 알림 접근 권한 (NotificationListenerService) 선언**:
  - 구글 플레이 콘솔 내 [앱 접근 권한] 질의서에서:
    - 수집 여부: 기기 내 로컬 파싱 후 즉시 폐기 (Ephemeral On-Device Processing)
    - 공유 여부: 외부 제3자에게 전송하지 않음 (No Data Shared)
    - 암호화 여부: 기기 내 메모리에서만 처리됨
  - 앱 내 진입 전 03_APP_PERMISSIONS_AND_CONSENTS.md의 [고지 1] 팝업이 반드시 노출되도록 구현되어 있습니다.
- **오버레이 권한 (SYSTEM_ALERT_WINDOW)**:
  - 구독 해지 도우미 실행 시에만 제한적으로 화면 위에 버튼을 띄우는 특수 용도(Special Use)임을 명시.

### 2. 국내 개인정보보호법 대응
- **선택 동의 원칙**:
  - 알림 접근 권한, AI 영수증 분석, 마케팅 정보 수신은 모두 '선택 항목'으로 분류되어 거부하더라도 기본 수동 입력 기능을 정상 이용할 수 있습니다.
- **클라우드 및 AI 위탁 투명성**:
  - Supabase(DB), Vercel(호스팅), Google Cloud(AI OCR)에 대한 처리 위탁 및 국외 이전을 명시하여 법적 투명성을 확보했습니다.

---

## 앱 내 연동 위치 권장 가이드

1. **회원가입 화면 (src/components/AuthScreens.jsx)**:
   - 가입 완료 버튼 상단에 [이용약관] 및 [개인정보 처리방침] 링크 배치
2. **설정 화면 (src/components/HomeScreen.jsx 또는 마이페이지)**:
   - "서비스 이용약관", "개인정보 처리방침", "오픈소스 라이선스" 뷰어 메뉴 제공
3. **실시간 결제 감지 토글 (PaymentCapture)**:
   - 권한 요청 전 03_APP_PERMISSIONS_AND_CONSENTS.md의 눈에 띄는 고지 모달 노출 후 시스템 설정 창으로 연결

