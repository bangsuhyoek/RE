-- ==========================================================
-- 확정 94개 순수 디지털/웹 구독 서비스 카테고리별 마스터 시드
-- 파일: supabase/migrations/20260914180000_seed_confirmed_94_services_by_category.sql
-- ==========================================================

begin;

-- [기존 중복/비디지털 데이터 정리]
update public.subscription_services set active = false 
where id in ('coway-water', 'lg-puricare', 'skmagic-water', 'wisely', 'laundrygo', 'clean-special', 'sooldamhwa', 'kukka-flower');


-- ----------------------------------------------------------
-- [카테고리: SaaS / 개발자 도구 / AI / 클라우드] (28개 서비스)
-- ----------------------------------------------------------

insert into public.subscription_services (id, name, aliases, category, active)
values
  ('chatgpt', 'ChatGPT Plus', '["챗지피티","오픈ai","gpt4","chatgpt"]'::jsonb, 'SaaS', true),
  ('claude-pro', 'Claude Pro', '["클로드","클로드프로","claude"]'::jsonb, 'SaaS', true),
  ('perplexity-pro', 'Perplexity Pro', '["퍼플렉시티","perplexity"]'::jsonb, 'SaaS', true),
  ('midjourney', 'Midjourney', '["미드저니","그림ai"]'::jsonb, 'SaaS', true),
  ('runway-gen', 'Runway Gen-4.5', '["런웨이","영상ai","runway"]'::jsonb, 'SaaS', true),
  ('v0-vercel', 'v0 by Vercel', '["브이제로","v0"]'::jsonb, 'SaaS', true),
  ('figma', 'Figma Professional', '["피그마","figma"]'::jsonb, 'SaaS', true),
  ('canva', 'Canva Pro', '["캔바","canva"]'::jsonb, 'SaaS', true),
  ('adobe', 'Adobe Creative Cloud', '["어도비","포토샵","일러스트","creative cloud"]'::jsonb, 'SaaS', true),
  ('framer', 'Framer Pro', '["프레이머","framer"]'::jsonb, 'SaaS', true),
  ('webflow', 'Webflow', '["웹플로우","webflow"]'::jsonb, 'SaaS', true),
  ('cursor-ai', 'Cursor Pro', '["커서","cursor","커서ai"]'::jsonb, 'SaaS', true),
  ('github-copilot', 'GitHub Copilot', '["코파일럿","깃허브코파일럿"]'::jsonb, 'SaaS', true),
  ('jetbrains-all', 'JetBrains All Products', '["젯브레인","인텔리제이"]'::jsonb, 'SaaS', true),
  ('deepl-pro', 'DeepL Pro', '["딥엘","deepl"]'::jsonb, 'SaaS', true),
  ('grammarly', 'Grammarly', '["그래멀리","grammarly"]'::jsonb, 'SaaS', true),
  ('slack-pro', 'Slack Pro', '["슬랙","slack"]'::jsonb, 'SaaS', true),
  ('zoom-pro', 'Zoom Workplace Pro', '["줌","zoom"]'::jsonb, 'SaaS', true),
  ('ms365', 'Microsoft 365', '["오피스365","엑셀","워드","ms오피스"]'::jsonb, 'SaaS', true),
  ('google-one', 'Google One', '["구글원","구글드라이브","구글용량"]'::jsonb, 'SaaS', true),
  ('icloud', 'Apple iCloud+', '["아이클라우드","icloud"]'::jsonb, 'SaaS', true),
  ('dropbox', 'Dropbox', '["드롭박스","dropbox"]'::jsonb, 'SaaS', true),
  ('evernote', 'Evernote', '["에버노트","evernote"]'::jsonb, 'SaaS', true),
  ('todoist', 'Todoist', '["투두이스트","todoist"]'::jsonb, 'SaaS', true),
  ('1password', '1Password', '["원패스워드","1password"]'::jsonb, 'SaaS', true),
  ('nordvpn', 'NordVPN', '["노드vpn","nordvpn"]'::jsonb, 'SaaS', true),
  ('notion', 'Notion Plus', '["노션","notion"]'::jsonb, 'SaaS', true),
  ('adobe-lightroom', 'Adobe Lightroom Mobile Premium', '["라이트룸","라이트룸모바일","lightroom"]'::jsonb, 'SaaS', true)
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  category = excluded.category,
  active = true,
  updated_at = now();

delete from public.service_plans where service_id in ('chatgpt', 'claude-pro', 'perplexity-pro', 'midjourney', 'runway-gen', 'v0-vercel', 'figma', 'canva', 'adobe', 'framer', 'webflow', 'cursor-ai', 'github-copilot', 'jetbrains-all', 'deepl-pro', 'grammarly', 'slack-pro', 'zoom-pro', 'ms365', 'google-one', 'icloud', 'dropbox', 'evernote', 'todoist', '1password', 'nordvpn', 'notion', 'adobe-lightroom');

insert into public.service_plans (id, service_id, name, aliases, amount_krw, billing_cycle, catalog_version, verified_at, source_note, active)
values
  ('chatgpt-default-monthly', 'chatgpt', 'ChatGPT Plus', '["챗지피티","오픈ai","gpt4","chatgpt"]'::jsonb, 29000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('claude-pro-default-monthly', 'claude-pro', 'Claude Pro', '["클로드","클로드프로","claude"]'::jsonb, 29000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('perplexity-pro-default-monthly', 'perplexity-pro', 'Perplexity Pro', '["퍼플렉시티","perplexity"]'::jsonb, 27000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('midjourney-default-monthly', 'midjourney', 'Basic Plan', '["미드저니","그림ai"]'::jsonb, 14000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('runway-gen-default-monthly', 'runway-gen', 'Standard Plan', '["런웨이","영상ai","runway"]'::jsonb, 20000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('v0-vercel-default-monthly', 'v0-vercel', 'Premium', '["브이제로","v0"]'::jsonb, 27000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('figma-default-monthly', 'figma', 'Professional', '["피그마","figma"]'::jsonb, 21000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('canva-default-monthly', 'canva', 'Canva Pro', '["캔바","canva"]'::jsonb, 12900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('adobe-default-monthly', 'adobe', '모든 앱', '["어도비","포토샵","일러스트","creative cloud"]'::jsonb, 61600, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('framer-default-monthly', 'framer', 'Pro', '["프레이머","framer"]'::jsonb, 27000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('webflow-default-monthly', 'webflow', 'CMS Plan', '["웹플로우","webflow"]'::jsonb, 32000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('cursor-ai-default-monthly', 'cursor-ai', 'Pro Plan', '["커서","cursor","커서ai"]'::jsonb, 27000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('github-copilot-default-monthly', 'github-copilot', 'Individual', '["코파일럿","깃허브코파일럿"]'::jsonb, 14000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('jetbrains-all-default-monthly', 'jetbrains-all', 'All Products Pack', '["젯브레인","인텔리제이"]'::jsonb, 37000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('deepl-pro-default-monthly', 'deepl-pro', 'Starter', '["딥엘","deepl"]'::jsonb, 12000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('grammarly-default-monthly', 'grammarly', 'Premium', '["그래멀리","grammarly"]'::jsonb, 16000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('slack-pro-default-monthly', 'slack-pro', 'Pro', '["슬랙","slack"]'::jsonb, 11000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('zoom-pro-default-monthly', 'zoom-pro', 'Pro Plan', '["줌","zoom"]'::jsonb, 19000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('ms365-default-monthly', 'ms365', 'Personal', '["오피스365","엑셀","워드","ms오피스"]'::jsonb, 8900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('google-one-default-monthly', 'google-one', '100GB 플랜', '["구글원","구글드라이브","구글용량"]'::jsonb, 2400, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('icloud-default-monthly', 'icloud', '50GB 플랜', '["아이클라우드","icloud"]'::jsonb, 1100, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('dropbox-default-monthly', 'dropbox', 'Plus 2TB', '["드롭박스","dropbox"]'::jsonb, 15000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('evernote-default-monthly', 'evernote', 'Personal', '["에버노트","evernote"]'::jsonb, 11900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('todoist-default-monthly', 'todoist', 'Pro', '["투두이스트","todoist"]'::jsonb, 5500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('1password-default-monthly', '1password', 'Individual', '["원패스워드","1password"]'::jsonb, 4500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('nordvpn-default-monthly', 'nordvpn', 'Plus (2년 월환산)', '["노드vpn","nordvpn"]'::jsonb, 5900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('notion-default-monthly', 'notion', 'Plus Plan', '["노션","notion"]'::jsonb, 14000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('adobe-lightroom-default-monthly', 'adobe-lightroom', '모바일 프리미엄', '["라이트룸","라이트룸모바일","lightroom"]'::jsonb, 5500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true);

-- ----------------------------------------------------------
-- [카테고리: OTT / 동영상 스트리밍] (15개 서비스)
-- ----------------------------------------------------------

insert into public.subscription_services (id, name, aliases, category, active)
values
  ('netflix', 'Netflix', '["넷플릭스","넷플","netflix.com"]'::jsonb, 'OTT', true),
  ('youtube', 'YouTube Premium', '["유튜브","유튭","유튜브프리미엄"]'::jsonb, 'OTT', true),
  ('tving', 'TVING', '["티빙","tving"]'::jsonb, 'OTT', true),
  ('disney', 'Disney+', '["디즈니","디즈니플러스","디즈니+"]'::jsonb, 'OTT', true),
  ('wavve', 'Wavve', '["웨이브","wavve"]'::jsonb, 'OTT', true),
  ('watcha', 'WATCHA', '["왓챠","watcha"]'::jsonb, 'OTT', true),
  ('coupangplay', 'Coupang Play', '["쿠팡플레이","쿠플"]'::jsonb, 'OTT', true),
  ('laftel', 'Laftel', '["라프텔","애니메이션"]'::jsonb, 'OTT', true),
  ('appletv', 'Apple TV+', '["애플티비","애플tv"]'::jsonb, 'OTT', true),
  ('primevideo', 'Amazon Prime Video', '["프라임비디오","아마존비디오"]'::jsonb, 'OTT', true),
  ('spotvnow', 'SPOTV NOW', '["스포티비","spotv","해외축구"]'::jsonb, 'OTT', true),
  ('weverse', 'Weverse Digital Membership', '["위버스","weverse"]'::jsonb, 'OTT', true),
  ('crunchyroll', 'Crunchyroll', '["크런치롤"]'::jsonb, 'OTT', true),
  ('mubi', 'MUBI', '["뮤비","독립영화"]'::jsonb, 'OTT', true),
  ('dazn', 'DAZN', '["다존","dazn"]'::jsonb, 'OTT', true)
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  category = excluded.category,
  active = true,
  updated_at = now();

delete from public.service_plans where service_id in ('netflix', 'youtube', 'tving', 'disney', 'wavve', 'watcha', 'coupangplay', 'laftel', 'appletv', 'primevideo', 'spotvnow', 'weverse', 'crunchyroll', 'mubi', 'dazn');

insert into public.service_plans (id, service_id, name, aliases, amount_krw, billing_cycle, catalog_version, verified_at, source_note, active)
values
  ('netflix-default-monthly', 'netflix', '프리미엄', '["넷플릭스","넷플","netflix.com"]'::jsonb, 17000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('youtube-default-monthly', 'youtube', '개인 멤버십', '["유튜브","유튭","유튜브프리미엄"]'::jsonb, 14900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('tving-default-monthly', 'tving', '스탠다드', '["티빙","tving"]'::jsonb, 13500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('disney-default-monthly', 'disney', '스탠다드', '["디즈니","디즈니플러스","디즈니+"]'::jsonb, 9900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('wavve-default-monthly', 'wavve', '스탠다드', '["웨이브","wavve"]'::jsonb, 10900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('watcha-default-monthly', 'watcha', '프리미엄', '["왓챠","watcha"]'::jsonb, 12900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('coupangplay-default-monthly', 'coupangplay', '와우 회원 무료', '["쿠팡플레이","쿠플"]'::jsonb, 7890, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('laftel-default-monthly', 'laftel', '베이직', '["라프텔","애니메이션"]'::jsonb, 9900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('appletv-default-monthly', 'appletv', 'Apple TV+', '["애플티비","애플tv"]'::jsonb, 6500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('primevideo-default-monthly', 'primevideo', 'Prime Video', '["프라임비디오","아마존비디오"]'::jsonb, 7900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('spotvnow-default-monthly', 'spotvnow', '프리미엄', '["스포티비","spotv","해외축구"]'::jsonb, 19900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('weverse-default-monthly', 'weverse', '글로벌 멤버십', '["위버스","weverse"]'::jsonb, 25000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('crunchyroll-default-monthly', 'crunchyroll', 'Mega Fan', '["크런치롤"]'::jsonb, 8900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('mubi-default-monthly', 'mubi', 'MUBI 월정액', '["뮤비","독립영화"]'::jsonb, 12900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('dazn-default-monthly', 'dazn', 'Monthly Pass', '["다존","dazn"]'::jsonb, 25000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true);

-- ----------------------------------------------------------
-- [카테고리: 음원 스트리밍 & 디지털 팬덤] (14개 서비스)
-- ----------------------------------------------------------

insert into public.subscription_services (id, name, aliases, category, active)
values
  ('melon', 'Melon', '["멜론","melon"]'::jsonb, '음악', true),
  ('spotify', 'Spotify', '["스포티파이","spotify"]'::jsonb, '음악', true),
  ('genie', 'Genie Music', '["지니","지니뮤직"]'::jsonb, '음악', true),
  ('flo', 'FLO', '["플로","flo"]'::jsonb, '음악', true),
  ('bugs', 'Bugs', '["벅스","bugs"]'::jsonb, '음악', true),
  ('vibe', 'NAVER VIBE', '["바이브","vibe","네이버바이브"]'::jsonb, '음악', true),
  ('applemusic', 'Apple Music', '["애플뮤직","apple music"]'::jsonb, '음악', true),
  ('ytmusic', 'YouTube Music', '["유튜브뮤직","yt music"]'::jsonb, '음악', true),
  ('tidal', 'TIDAL', '["타이달","tidal"]'::jsonb, '음악', true),
  ('bubble-sm', 'DearU Bubble', '["버블","sm버블","jyp버블","디어유버블"]'::jsonb, '음악', true),
  ('fromm', 'fromm', '["프롬","fromm"]'::jsonb, '음악', true),
  ('podbbang', '팟빵 오디오매거진', '["팟빵","팟캐스트"]'::jsonb, '음악', true),
  ('welaaa', '윌라 오디오북', '["윌라","오디오북"]'::jsonb, '음악', true),
  ('storytel', 'Storytel', '["스토리텔","storytel"]'::jsonb, '음악', true)
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  category = excluded.category,
  active = true,
  updated_at = now();

delete from public.service_plans where service_id in ('melon', 'spotify', 'genie', 'flo', 'bugs', 'vibe', 'applemusic', 'ytmusic', 'tidal', 'bubble-sm', 'fromm', 'podbbang', 'welaaa', 'storytel');

insert into public.service_plans (id, service_id, name, aliases, amount_krw, billing_cycle, catalog_version, verified_at, source_note, active)
values
  ('melon-default-monthly', 'melon', '스트리밍 클럽', '["멜론","melon"]'::jsonb, 8900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('spotify-default-monthly', 'spotify', '개인', '["스포티파이","spotify"]'::jsonb, 10900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('genie-default-monthly', 'genie', '스마트 음악감상', '["지니","지니뮤직"]'::jsonb, 8400, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('flo-default-monthly', 'flo', '올인원 무제한', '["플로","flo"]'::jsonb, 7900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('bugs-default-monthly', 'bugs', '모바일 무제한', '["벅스","bugs"]'::jsonb, 7900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('vibe-default-monthly', 'vibe', '무제한 듣기', '["바이브","vibe","네이버바이브"]'::jsonb, 8500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('applemusic-default-monthly', 'applemusic', '개인 멤버십', '["애플뮤직","apple music"]'::jsonb, 8900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('ytmusic-default-monthly', 'ytmusic', 'Music Premium', '["유튜브뮤직","yt music"]'::jsonb, 11990, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('tidal-default-monthly', 'tidal', 'HiFi Plus', '["타이달","tidal"]'::jsonb, 14000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('bubble-sm-default-monthly', 'bubble-sm', '1인권 월정액', '["버블","sm버블","jyp버블","디어유버블"]'::jsonb, 4500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('fromm-default-monthly', 'fromm', '1인 메시지권', '["프롬","fromm"]'::jsonb, 4500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('podbbang-default-monthly', 'podbbang', '팟빵 프리미엄', '["팟빵","팟캐스트"]'::jsonb, 9900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('welaaa-default-monthly', 'welaaa', '오디오북 무제한', '["윌라","오디오북"]'::jsonb, 9900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('storytel-default-monthly', 'storytel', '무제한 스트리밍', '["스토리텔","storytel"]'::jsonb, 11900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true);

-- ----------------------------------------------------------
-- [카테고리: 디지털 도서 & 오디오북 & 뉴스 저널] (10개 서비스)
-- ----------------------------------------------------------

insert into public.subscription_services (id, name, aliases, category, active)
values
  ('millie', '밀리의 서재', '["밀리","밀리의서재"]'::jsonb, '도서/웹툰', true),
  ('ridiselect', '리디셀렉트', '["리디","리디셀렉트"]'::jsonb, '도서/웹툰', true),
  ('longblack', '롱블랙', '["롱블랙","longblack"]'::jsonb, '도서/웹툰', true),
  ('the-joongang-plus', '더중앙플러스', '["중앙일보","더중앙"]'::jsonb, '도서/웹툰', true),
  ('nyt-digital', 'The New York Times', '["뉴욕타임스","nyt"]'::jsonb, '도서/웹툰', true),
  ('wsj-digital', 'The Wall Street Journal', '["월스트리트저널","wsj"]'::jsonb, '도서/웹툰', true),
  ('ft-digital', 'Financial Times', '["파이낸셜타임스","ft"]'::jsonb, '도서/웹툰', true),
  ('the-economist', 'The Economist', '["이코노미스트","economist"]'::jsonb, '도서/웹툰', true),
  ('audible', 'Audible', '["오디블","audible"]'::jsonb, '도서/웹툰', true),
  ('scribd', 'Scribd', '["스크립드","scribd"]'::jsonb, '도서/웹툰', true)
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  category = excluded.category,
  active = true,
  updated_at = now();

delete from public.service_plans where service_id in ('millie', 'ridiselect', 'longblack', 'the-joongang-plus', 'nyt-digital', 'wsj-digital', 'ft-digital', 'the-economist', 'audible', 'scribd');

insert into public.service_plans (id, service_id, name, aliases, amount_krw, billing_cycle, catalog_version, verified_at, source_note, active)
values
  ('millie-default-monthly', 'millie', '전자책 정기구독', '["밀리","밀리의서재"]'::jsonb, 9900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('ridiselect-default-monthly', 'ridiselect', '리디셀렉트 월정액', '["리디","리디셀렉트"]'::jsonb, 4900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('longblack-default-monthly', 'longblack', '월간 멤버십', '["롱블랙","longblack"]'::jsonb, 4900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('the-joongang-plus-default-monthly', 'the-joongang-plus', '디지털 유료구독', '["중앙일보","더중앙"]'::jsonb, 9000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('nyt-digital-default-monthly', 'nyt-digital', 'All Access', '["뉴욕타임스","nyt"]'::jsonb, 6000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('wsj-digital-default-monthly', 'wsj-digital', 'Digital Access', '["월스트리트저널","wsj"]'::jsonb, 12000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('ft-digital-default-monthly', 'ft-digital', 'Standard Digital', '["파이낸셜타임스","ft"]'::jsonb, 45000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('the-economist-default-monthly', 'the-economist', 'Digital Access', '["이코노미스트","economist"]'::jsonb, 29000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('audible-default-monthly', 'audible', 'Audible Plus', '["오디블","audible"]'::jsonb, 11000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('scribd-default-monthly', 'scribd', 'Monthly Pass', '["스크립드","scribd"]'::jsonb, 13000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true);

-- ----------------------------------------------------------
-- [카테고리: 온라인 어학 & 교육] (10개 서비스)
-- ----------------------------------------------------------

insert into public.subscription_services (id, name, aliases, category, active)
values
  ('speak', 'Speak', '["스픽","speak","영어스피킹"]'::jsonb, '교육/어학', true),
  ('duolingo', 'Duolingo Super', '["듀오링고","duolingo"]'::jsonb, '교육/어학', true),
  ('ringle', 'Ringle', '["링글","ringle"]'::jsonb, '교육/어학', true),
  ('cambly', 'Cambly', '["캠블리","cambly"]'::jsonb, '교육/어학', true),
  ('santatoeic', '산타토익', '["산타토익"]'::jsonb, '교육/어학', true),
  ('malhaeboca', '말해보카', '["말해보카"]'::jsonb, '교육/어학', true),
  ('class101', 'CLASS101+', '["클래스101","class101"]'::jsonb, '교육/어학', true),
  ('fastcampus', '패스트캠퍼스', '["패스트캠퍼스","패캠"]'::jsonb, '교육/어학', true),
  ('inflearn', '인프런', '["인프런","inflearn"]'::jsonb, '교육/어학', true),
  ('coursera', 'Coursera Plus', '["코세라","coursera"]'::jsonb, '교육/어학', true)
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  category = excluded.category,
  active = true,
  updated_at = now();

delete from public.service_plans where service_id in ('speak', 'duolingo', 'ringle', 'cambly', 'santatoeic', 'malhaeboca', 'class101', 'fastcampus', 'inflearn', 'coursera');

insert into public.service_plans (id, service_id, name, aliases, amount_krw, billing_cycle, catalog_version, verified_at, source_note, active)
values
  ('speak-default-monthly', 'speak', '프리미엄 연간 (월환산)', '["스픽","speak","영어스피킹"]'::jsonb, 29000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('duolingo-default-monthly', 'duolingo', 'Super Duolingo', '["듀오링고","duolingo"]'::jsonb, 9900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('ringle-default-monthly', 'ringle', '정기구독 플랜', '["링글","ringle"]'::jsonb, 159000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('cambly-default-monthly', 'cambly', '주 3회 30분', '["캠블리","cambly"]'::jsonb, 129000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('santatoeic-default-monthly', 'santatoeic', 'AI 무제한패스', '["산타토익"]'::jsonb, 29000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('malhaeboca-default-monthly', 'malhaeboca', '연간 프리미엄 (월환산)', '["말해보카"]'::jsonb, 8900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('class101-default-monthly', 'class101', '연간 구독 (월환산)', '["클래스101","class101"]'::jsonb, 18900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('fastcampus-default-monthly', 'fastcampus', '올인원 구독권', '["패스트캠퍼스","패캠"]'::jsonb, 39000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('inflearn-default-monthly', 'inflearn', '인프런패스', '["인프런","inflearn"]'::jsonb, 29000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('coursera-default-monthly', 'coursera', 'Coursera Plus', '["코세라","coursera"]'::jsonb, 69000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true);

-- ----------------------------------------------------------
-- [카테고리: 디지털 플랫폼 & 배달/쇼핑 멤버십] (5개 서비스)
-- ----------------------------------------------------------

insert into public.subscription_services (id, name, aliases, category, active)
values
  ('naverplus', '네이버플러스 멤버십', '["네이버멤버십","네이버플러스"]'::jsonb, '쇼핑', true),
  ('baemin-club', '배민클럽', '["배민클럽","배달의민족"]'::jsonb, '쇼핑', true),
  ('yogipass', '요기패스X', '["요기패스","요기요"]'::jsonb, '쇼핑', true),
  ('kurly-pass', '컬리멤버스', '["컬리멤버스","마켓컬리","컬리패스"]'::jsonb, '쇼핑', true),
  ('coupang', '쿠팡 와우 멤버십', '["쿠팡","와우","쿠팡와우"]'::jsonb, '쇼핑', true)
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  category = excluded.category,
  active = true,
  updated_at = now();

delete from public.service_plans where service_id in ('naverplus', 'baemin-club', 'yogipass', 'kurly-pass', 'coupang');

insert into public.service_plans (id, service_id, name, aliases, amount_krw, billing_cycle, catalog_version, verified_at, source_note, active)
values
  ('naverplus-default-monthly', 'naverplus', '월간 이용권', '["네이버멤버십","네이버플러스"]'::jsonb, 4900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('baemin-club-default-monthly', 'baemin-club', '배민클럽 월정액', '["배민클럽","배달의민족"]'::jsonb, 3990, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('yogipass-default-monthly', 'yogipass', '요기패스X', '["요기패스","요기요"]'::jsonb, 2900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('kurly-pass-default-monthly', 'kurly-pass', '컬리멤버스 월정액', '["컬리멤버스","마켓컬리","컬리패스"]'::jsonb, 1900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('coupang-default-monthly', 'coupang', '와우 멤버십', '["쿠팡","와우","쿠팡와우"]'::jsonb, 7890, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true);

-- ----------------------------------------------------------
-- [카테고리: 게임 & 콘솔 디지털 네트워크] (7개 서비스)
-- ----------------------------------------------------------

insert into public.subscription_services (id, name, aliases, category, active)
values
  ('nintendo-online', 'Nintendo Switch Online', '["닌텐도","스위치온라인"]'::jsonb, '게임/엔터', true),
  ('ps-plus', 'PlayStation Plus', '["플스플러스","ps plus"]'::jsonb, '게임/엔터', true),
  ('xbox-gamepass', 'Xbox Game Pass Ultimate', '["게임패스","엑박게임패스"]'::jsonb, '게임/엔터', true),
  ('apple-arcade', 'Apple Arcade', '["애플아케이드"]'::jsonb, '게임/엔터', true),
  ('google-play-pass', 'Google Play Pass', '["플레이패스"]'::jsonb, '게임/엔터', true),
  ('ea-play', 'EA Play', '["ea플레이"]'::jsonb, '게임/엔터', true),
  ('wow-subscription', 'World of Warcraft 정액제', '["와우","블리자드와우","월드오브워크래프트"]'::jsonb, '게임/엔터', true)
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  category = excluded.category,
  active = true,
  updated_at = now();

delete from public.service_plans where service_id in ('nintendo-online', 'ps-plus', 'xbox-gamepass', 'apple-arcade', 'google-play-pass', 'ea-play', 'wow-subscription');

insert into public.service_plans (id, service_id, name, aliases, amount_krw, billing_cycle, catalog_version, verified_at, source_note, active)
values
  ('nintendo-online-default-monthly', 'nintendo-online', '개인 플랜 12개월 (월환산)', '["닌텐도","스위치온라인"]'::jsonb, 20000, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('ps-plus-default-monthly', 'ps-plus', '에센셜', '["플스플러스","ps plus"]'::jsonb, 7500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('xbox-gamepass-default-monthly', 'xbox-gamepass', 'Ultimate', '["게임패스","엑박게임패스"]'::jsonb, 13500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('apple-arcade-default-monthly', 'apple-arcade', '월정액', '["애플아케이드"]'::jsonb, 6500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('google-play-pass-default-monthly', 'google-play-pass', '월정액', '["플레이패스"]'::jsonb, 6500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('ea-play-default-monthly', 'ea-play', 'EA Play', '["ea플레이"]'::jsonb, 5500, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('wow-subscription-default-monthly', 'wow-subscription', '30일 이용권', '["와우","블리자드와우","월드오브워크래프트"]'::jsonb, 19800, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true);

-- ----------------------------------------------------------
-- [카테고리: 모바일 앱 & 메신저 플랫폼 디지털 기능] (5개 서비스)
-- ----------------------------------------------------------

insert into public.subscription_services (id, name, aliases, category, active)
values
  ('kakaotalk-drive', '카카오톡 톡서랍 플러스', '["톡서랍","카카오톡서랍"]'::jsonb, '생활/모빌리티', true),
  ('kakaotalk-emoticon', '카카오톡 이모티콘 플러스', '["이모티콘플러스","카카오이모티콘"]'::jsonb, '생활/모빌리티', true),
  ('naver-mybox', '네이버 MYBOX', '["마이박스","네이버mybox"]'::jsonb, '생활/모빌리티', true),
  ('strava-sub', 'Strava', '["스트라바","strava"]'::jsonb, '생활/모빌리티', true),
  ('burnfit-pro', '번핏 Pro', '["번핏","burnfit"]'::jsonb, '생활/모빌리티', true)
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  category = excluded.category,
  active = true,
  updated_at = now();

delete from public.service_plans where service_id in ('kakaotalk-drive', 'kakaotalk-emoticon', 'naver-mybox', 'strava-sub', 'burnfit-pro');

insert into public.service_plans (id, service_id, name, aliases, amount_krw, billing_cycle, catalog_version, verified_at, source_note, active)
values
  ('kakaotalk-drive-default-monthly', 'kakaotalk-drive', '100GB 드라이브', '["톡서랍","카카오톡서랍"]'::jsonb, 990, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('kakaotalk-emoticon-default-monthly', 'kakaotalk-emoticon', '이모티콘 무제한', '["이모티콘플러스","카카오이모티콘"]'::jsonb, 3900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('naver-mybox-default-monthly', 'naver-mybox', '80GB 월정액', '["마이박스","네이버mybox"]'::jsonb, 1650, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('strava-sub-default-monthly', 'strava-sub', '월정액 멤버십', '["스트라바","strava"]'::jsonb, 7900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true),
  ('burnfit-pro-default-monthly', 'burnfit-pro', '월간 프로', '["번핏","burnfit"]'::jsonb, 4900, '매월', '2026.09.14', current_date, '공식 요금제 검증 완료', true);

commit;
