begin;

-- 1. 30개 주요 구독 서비스 마스터 데이터 등록
insert into public.subscription_services (id, name, aliases, category)
values
  -- OTT / 동영상 스트리밍
  ('netflix', 'Netflix', '["netflix", "넷플릭스", "netflix.com"]'::jsonb, 'OTT'),
  ('youtube', 'YouTube', '["youtube", "유튜브", "youtube premium", "유튜브 프리미엄", "youtube music", "유튜브 뮤직"]'::jsonb, 'OTT'),
  ('tving', '티빙', '["tving", "티빙", "cj enm tving"]'::jsonb, 'OTT'),
  ('disney', 'Disney+', '["disney+", "disney plus", "disneyplus", "디즈니+", "디즈니 플러스"]'::jsonb, 'OTT'),
  ('wavve', '웨이브', '["wavve", "웨이브", "wavve.com"]'::jsonb, 'OTT'),
  ('watcha', '왓챠', '["watcha", "왓챠", "왓챠플레이"]'::jsonb, 'OTT'),

  -- 쇼핑 / 배달 / 생활 멤버십
  ('coupang', '쿠팡 와우', '["coupang wow", "coupang", "쿠팡 와우", "쿠팡와우", "쿠팡", "쿠팡플레이", "쿠팡이츠"]'::jsonb, '쇼핑'),
  ('naverplus', '네이버플러스 멤버십', '["naverplus", "네이버플러스", "네이버 멤버십", "네이버플러스 멤버십"]'::jsonb, '쇼핑'),
  ('baemin', '배민클럽', '["배민클럽", "배달의민족", "배민", "baemin"]'::jsonb, '배달/생활'),
  ('yogipass', '요기패스X', '["요기패스", "요기패스x", "요기요", "yogiyo"]'::jsonb, '배달/생활'),
  ('shinsegae-universe', '신세계 유니버스 클럽', '["신세계 유니버스", "신세계 유니버스 클럽", "ssg", "g마켓"]'::jsonb, '쇼핑'),
  ('kurly', '컬리패스', '["컬리패스", "마켓컬리", "컬리", "kurly"]'::jsonb, '쇼핑'),

  -- 음원 스트리밍
  ('melon', '멜론', '["melon", "멜론", "카카오엔터테인먼트"]'::jsonb, '음악'),
  ('spotify', 'Spotify', '["spotify", "스포티파이"]'::jsonb, '음악'),
  ('genie', '지니뮤직', '["genie", "지니뮤직", "지니"]'::jsonb, '음악'),
  ('flo', '플로', '["flo", "플로", "드림어스컴퍼니"]'::jsonb, '음악'),
  ('apple-music', 'Apple Music', '["apple music", "애플 뮤직", "애플뮤직", "apple"]'::jsonb, '음악'),

  -- AI / 생산성 / 클라우드
  ('chatgpt', 'ChatGPT Plus', '["chatgpt plus", "chatgpt", "openai", "챗지피티"]'::jsonb, '생산성'),
  ('claude', 'Claude Pro', '["claude pro", "claude", "anthropic", "클로드"]'::jsonb, '생산성'),
  ('google-one', 'Google One', '["google one", "구글원", "구글 원", "구글 드라이브"]'::jsonb, '생산성'),
  ('ms365', 'Microsoft 365', '["microsoft 365", "m365", "오피스 365", "마이크로소프트 365"]'::jsonb, '생산성'),
  ('notion', 'Notion', '["notion", "노션"]'::jsonb, '생산성'),
  ('adobe', 'Adobe Creative Cloud', '["adobe", "어도비", "creative cloud", "포토샵"]'::jsonb, '생산성'),
  ('icloud', 'iCloud+', '["icloud", "icloud+", "아이클라우드", "애플 아이클라우드"]'::jsonb, '생산성'),

  -- 메신저 / 통신 / 플랫폼 부가서비스
  ('kakao-emoticon', '카카오 이모티콘 플러스', '["이모티콘 플러스", "카카오 이모티콘", "카카오톡 이모티콘"]'::jsonb, '생활/플랫폼'),
  ('kakao-talkdrive', '카카오톡 톡서랍 플러스', '["톡서랍 플러스", "톡서랍", "카카오 톡서랍"]'::jsonb, '생활/플랫폼'),
  ('t-universe', 'T우주 우주패스', '["t우주", "우주패스", "우주패스 all", "우주패스 life", "skt 우주"]'::jsonb, '생활/플랫폼'),

  -- 도서 / 오디오북
  ('millie', '밀리의 서재', '["millie", "밀리의 서재", "밀리"]'::jsonb, '도서'),
  ('ridi', '리디셀렉트', '["ridi", "리디", "리디셀렉트", "ridiselect"]'::jsonb, '도서'),
  ('willa', '윌라 오디오북', '["willa", "윌라", "윌라 오디오북"]'::jsonb, '도서')
on conflict (id) do update
set name = excluded.name,
    aliases = excluded.aliases,
    category = excluded.category,
    active = true;

-- 2. 서비스별 세부 요금제 등록
insert into public.service_plans
  (id, service_id, name, aliases, amount_krw, billing_cycle, catalog_version, verified_at, source_note)
values
  -- 넷플릭스
  ('netflix-ad-standard-monthly', 'netflix', '광고형 스탠다드', '["광고형", "광고형 스탠다드"]'::jsonb, 7000, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('netflix-standard-monthly', 'netflix', '스탠다드', '["스탠다드", "standard"]'::jsonb, 13500, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('netflix-premium-monthly', 'netflix', '프리미엄', '["프리미엄", "premium"]'::jsonb, 17000, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 유튜브
  ('youtube-lite-monthly', 'youtube', 'Premium Lite', '["lite", "라이트", "프리미엄 라이트"]'::jsonb, 8500, '매월', 'catalog-2026-09', current_date, '웹/안드로이드 기준'),
  ('youtube-music-monthly', 'youtube', 'Music Premium', '["music", "뮤직", "유튜브 뮤직"]'::jsonb, 11990, '매월', 'catalog-2026-09', current_date, '웹/안드로이드 기준'),
  ('youtube-individual-monthly', 'youtube', '개인 멤버십', '["individual", "개인", "프리미엄"]'::jsonb, 14900, '매월', 'catalog-2026-09', current_date, '웹/안드로이드 기준'),

  -- 티빙
  ('tving-ad-standard-monthly', 'tving', '광고형 스탠다드', '["광고형", "ad standard"]'::jsonb, 5500, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('tving-basic-monthly', 'tving', '베이직', '["basic", "베이직"]'::jsonb, 9500, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('tving-standard-monthly', 'tving', '스탠다드', '["standard", "스탠다드"]'::jsonb, 13500, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('tving-premium-monthly', 'tving', '프리미엄', '["premium", "프리미엄"]'::jsonb, 17000, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 디즈니+
  ('disney-standard-monthly', 'disney', '스탠다드', '["standard", "스탠다드"]'::jsonb, 9900, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('disney-premium-monthly', 'disney', '프리미엄', '["premium", "프리미엄"]'::jsonb, 13900, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('disney-standard-yearly', 'disney', '스탠다드 연간', '["standard yearly", "스탠다드 연간"]'::jsonb, 99000, '매년', 'catalog-2026-09', current_date, '공식 연간 요금'),
  ('disney-premium-yearly', 'disney', '프리미엄 연간', '["premium yearly", "프리미엄 연간"]'::jsonb, 139000, '매년', 'catalog-2026-09', current_date, '공식 연간 요금'),

  -- 웨이브
  ('wavve-basic-monthly', 'wavve', '베이직', '["basic", "베이직"]'::jsonb, 7900, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('wavve-standard-monthly', 'wavve', '스탠다드', '["standard", "스탠다드"]'::jsonb, 10900, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('wavve-premium-monthly', 'wavve', '프리미엄', '["premium", "프리미엄"]'::jsonb, 13900, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 왓챠
  ('watcha-basic-monthly', 'watcha', '베이직', '["basic", "베이직"]'::jsonb, 7900, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('watcha-premium-monthly', 'watcha', '프리미엄', '["premium", "프리미엄"]'::jsonb, 12900, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 쿠팡 와우
  ('coupang-wow-monthly', 'coupang', '와우 멤버십', '["wow", "와우", "와우 멤버십"]'::jsonb, 7890, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 네이버플러스 멤버십
  ('naverplus-monthly', 'naverplus', '월간 이용권', '["월간", "월간 멤버십"]'::jsonb, 4900, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('naverplus-yearly', 'naverplus', '연간 이용권', '["연간", "연간 멤버십"]'::jsonb, 46800, '매년', 'catalog-2026-09', current_date, '공식 연간 요금'),

  -- 배민클럽
  ('baemin-club-monthly', 'baemin', '배민클럽 정기구독', '["배민클럽", "클럽"]'::jsonb, 3990, '매월', 'catalog-2026-09', current_date, '공식 프로모션/정가 기준'),

  -- 요기패스X
  ('yogipass-x-monthly', 'yogipass', '요기패스X', '["요기패스x", "요기패스"]'::jsonb, 2900, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 신세계 유니버스 클럽
  ('shinsegae-universe-yearly', 'shinsegae-universe', '연간 멤버십', '["연간", "유니버스 연간"]'::jsonb, 30000, '매년', 'catalog-2026-09', current_date, '공식 연회비'),

  -- 컬리패스
  ('kurly-pass-monthly', 'kurly', '컬리패스 월정액', '["컬리패스"]'::jsonb, 4500, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 멜론
  ('melon-streaming-club-monthly', 'melon', '스트리밍 클럽', '["스트리밍", "스트리밍 클럽"]'::jsonb, 8900, '매월', 'catalog-2026-09', current_date, '공식 PC/웹 기준'),
  ('melon-premium-monthly', 'melon', '프리미엄 스트리밍', '["프리미엄 클럽", "다운로드 결합"]'::jsonb, 10900, '매월', 'catalog-2026-09', current_date, '공식 PC/웹 기준'),

  -- 스포티파이
  ('spotify-basic-monthly', 'spotify', '베이직', '["basic", "베이직"]'::jsonb, 7900, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('spotify-individual-monthly', 'spotify', '개인', '["individual", "개인"]'::jsonb, 10900, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('spotify-duo-monthly', 'spotify', '듀오', '["duo", "듀오"]'::jsonb, 16350, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 지니뮤직
  ('genie-smart-monthly', 'genie', '스마트 음악감상', '["스마트 음악감상", "스마트"]'::jsonb, 7400, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 플로 (FLO)
  ('flo-unlimited-monthly', 'flo', '무제한 듣기', '["무제한 듣기", "모바일 무제한"]'::jsonb, 7900, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 애플 뮤직
  ('apple-music-individual-monthly', 'apple-music', '개인', '["individual", "개인"]'::jsonb, 8900, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('apple-music-family-monthly', 'apple-music', '가족', '["family", "가족"]'::jsonb, 13500, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- ChatGPT
  ('chatgpt-plus-monthly', 'chatgpt', 'Plus', '["plus", "플러스"]'::jsonb, 29000, '매월', 'catalog-2026-09', current_date, '월 $20 기준 원화 환산'),

  -- Claude
  ('claude-pro-monthly', 'claude', 'Pro', '["pro", "프로"]'::jsonb, 29000, '매월', 'catalog-2026-09', current_date, '월 $20 기준 원화 환산'),

  -- Google One
  ('google-one-100gb-monthly', 'google-one', '베이직 (100GB)', '["100gb", "베이직"]'::jsonb, 2400, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('google-one-2tb-monthly', 'google-one', '프리미엄 (2TB)', '["2tb", "프리미엄"]'::jsonb, 11900, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- Microsoft 365
  ('ms365-personal-monthly', 'ms365', 'Personal', '["personal", "퍼스널"]'::jsonb, 8900, '매월', 'catalog-2026-09', current_date, '공식 월정액'),
  ('ms365-family-monthly', 'ms365', 'Family', '["family", "패밀리"]'::jsonb, 11900, '매월', 'catalog-2026-09', current_date, '공식 월정액'),

  -- Notion
  ('notion-plus-monthly', 'notion', 'Plus', '["plus", "플러스"]'::jsonb, 14000, '매월', 'catalog-2026-09', current_date, '월 $10 기준 원화 환산'),

  -- Adobe Creative Cloud
  ('adobe-photography-monthly', 'adobe', '포토그래피 플랜', '["photography", "포토그래피"]'::jsonb, 11000, '매월', 'catalog-2026-09', current_date, '공식 월 요금'),
  ('adobe-all-apps-monthly', 'adobe', '모든 앱', '["all apps", "모든 앱", "전체 앱"]'::jsonb, 61600, '매월', 'catalog-2026-09', current_date, '공식 월 요금'),

  -- iCloud+
  ('icloud-50gb-monthly', 'icloud', '50GB', '["50gb"]'::jsonb, 1100, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('icloud-200gb-monthly', 'icloud', '200GB', '["200gb"]'::jsonb, 4400, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('icloud-2tb-monthly', 'icloud', '2TB', '["2tb"]'::jsonb, 11000, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 카카오 이모티콘 플러스
  ('kakao-emoticon-monthly', 'kakao-emoticon', '정기구독', '["이모티콘 플러스", "월정액"]'::jsonb, 3900, '매월', 'catalog-2026-09', current_date, '웹 결제 기준 정가'),

  -- 카카오톡 톡서랍 플러스
  ('kakao-talkdrive-100gb-monthly', 'kakao-talkdrive', '100GB', '["100gb"]'::jsonb, 990, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('kakao-talkdrive-250gb-monthly', 'kakao-talkdrive', '250GB', '["250gb"]'::jsonb, 1900, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- T우주 우주패스
  ('t-universe-all-monthly', 't-universe', '우주패스 all', '["우주패스 all", "all"]'::jsonb, 9900, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('t-universe-life-monthly', 't-universe', '우주패스 life', '["우주패스 life", "life"]'::jsonb, 9900, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 밀리의 서재
  ('millie-monthly', 'millie', '전자책 정기구독', '["월정액", "구독권"]'::jsonb, 9900, '매월', 'catalog-2026-09', current_date, '공식 요금'),
  ('millie-yearly', 'millie', '전자책 연간구독', '["연간", "연간구독"]'::jsonb, 99000, '매년', 'catalog-2026-09', current_date, '공식 연간 요금'),

  -- 리디셀렉트
  ('ridi-select-monthly', 'ridi', '리디셀렉트 월정액', '["셀렉트", "월정액"]'::jsonb, 4900, '매월', 'catalog-2026-09', current_date, '공식 요금'),

  -- 윌라 오디오북
  ('willa-unlimited-monthly', 'willa', '오디오북+웹소설+전자책 무제한', '["무제한", "올인원"]'::jsonb, 9900, '매월', 'catalog-2026-09', current_date, '공식 요금')
on conflict (id) do update
set service_id = excluded.service_id,
    name = excluded.name,
    aliases = excluded.aliases,
    amount_krw = excluded.amount_krw,
    billing_cycle = excluded.billing_cycle,
    catalog_version = excluded.catalog_version,
    verified_at = excluded.verified_at,
    source_note = excluded.source_note,
    active = true;

commit;
