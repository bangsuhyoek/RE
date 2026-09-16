-- ==========================================================
-- 구독 서비스 혜택(Benefits) 및 서비스별 다대다 연결(Service_Benefits) 스키마 & 시드
-- 파일: supabase/migrations/20260916100000_create_benefits_and_service_benefits_schema.sql
-- ==========================================================

begin;

-- 1. 혜택 마스터 테이블
create table if not exists public.benefits (
  id text primary key,
  title text not null,
  subtitle text,
  kind text not null,
  category text not null default '기타',
  description text,
  saving integer not null default 0,
  original_price integer not null default 0,
  offer_price integer not null default 0,
  dday integer,
  link text,
  benefit_period text,
  campaign_period text,
  monogram text,
  verified_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.benefits is '구독 서비스 프로모션, 제휴 무료, 결합 및 요금할인 혜택 마스터 테이블';

-- 2. 서비스 - 혜택 다대다 연결 테이블
create table if not exists public.service_benefits (
  service_id text not null references public.subscription_services(id) on delete cascade,
  benefit_id text not null references public.benefits(id) on delete cascade,
  role text not null default 'target',
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (service_id, benefit_id)
);

comment on table public.service_benefits is '구독 서비스와 혜택 간의 M:N 매핑 테이블 (제휴/결합 혜택 다중 연결 지원)';

create index if not exists idx_service_benefits_service_id on public.service_benefits(service_id);
create index if not exists idx_service_benefits_benefit_id on public.service_benefits(benefit_id);

-- 3. RLS 보안 정책 설정 (공개 카탈로그이므로 읽기는 전체 허용)
alter table public.benefits enable row level security;
alter table public.service_benefits enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'benefits' and policyname = 'Allow public read access on benefits'
  ) then
    create policy "Allow public read access on benefits"
      on public.benefits for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'service_benefits' and policyname = 'Allow public read access on service_benefits'
  ) then
    create policy "Allow public read access on service_benefits"
      on public.service_benefits for select
      using (true);
  end if;
end $$;

-- 4. 사용자 맞춤 혜택 조회 함수 (중복 제거 distinct on)
create or replace function public.get_user_personalized_benefits(p_user_id uuid)
returns setof public.benefits
language sql
security invoker
set search_path = public
stable
as $$
  select distinct on (b.id) b.*
  from public.benefits b
  join public.service_benefits sb on sb.benefit_id = b.id
  join public.subscriptions s on s.service_id = sb.service_id
  where s.user_id = p_user_id
    and s.status = 'active'
    and b.verified_status = 'active'
  order by b.id, b.saving desc;
$$;

comment on function public.get_user_personalized_benefits is '사용자가 등록한 활성 구독 서비스 목록에 연결된 혜택들을 중복 제거하여 조회';

-- 5. 혜택 마스터 데이터 적재 (119건)
insert into public.benefits (
  id, title, subtitle, kind, category, description,
  saving, original_price, offer_price, dday,
  link, benefit_period, campaign_period, monogram, verified_status
) values
  ('spotify-3m-free', 'Spotify Premium', '3개월 동안 ₩0에 이용하기', '3개월 0원 무료 체험', '100원/무료', '개인 요금제 3개월 ₩0 혜택! 광고 없는 음악 감상과 오프라인 저장 지원.', 35970, 11990, 0, 9, 'https://www.spotify.com/kr-ko/premium/', '가입 후 첫 3개월 (2026.09.23까지 신청)', '2026.08.15 ~ 2026.09.23 (종료 임박)', 'S', 'active'),
  ('youtube-1m-free', 'YouTube Premium', '₩0에 1개월 무료 체험', '1개월 무료 체험', '100원/무료', '광고 없는 감상, 백그라운드 재생, YouTube Music 무료 이용 혜택.', 14900, 14900, 0, 30, 'https://www.youtube.com/premium', '가입 후 첫 1개월', '상시 진행 (신규 회원 한정)', 'Y', 'active'),
  ('wavve-100-payback', 'Wavve (웨이브)', '첫 달 이용권 전액 돌려드려요!', '첫 달 100% 페이백', '100원/무료', '웨이브 첫 가입 회원 대상 첫 달 이용권 결제금액 100% 코인 캐시백 혜택.', 10900, 10900, 0, 14, 'https://www.wavve.com/voucher/index.html', '가입 후 첫 1개월', '상시 진행 (신규 회원 한정)', 'W', 'active'),
  ('millie-1plus1', '밀리의 서재', '첫 달 구독하면 둘째 달 무료!', '둘째 달 무료 (1+1)', '100원/무료', '밀리 10주년 기념 1+1 생일 이벤트! 첫 달 시작 시 둘째 달 이용권 증정.', 9900, 9900, 0, 7, 'https://www.millie.co.kr/', '가입 후 첫 1개월', '상시 진행 (신규 회원 한정)', 'M', 'active'),
  ('genie-110won', 'Genie Music (지니)', '스마트 음악감상 2회차 110원', '다음 달 110원 특가', '100원/무료', '지니뮤직 스마트 음악감상 1회차 정상가 결제 시 다음 달 단돈 110원 파격 혜택.', 8290, 8400, 110, 5, 'https://pay.genie.co.kr/buy/recommend', '정기결제 2회차 (1개월간)', '상시 진행 (2회차 결제 특가)', 'G', 'active'),
  ('naverplus-welcome', '네이버플러스 멤버십', '첫 달 무료 웰컴 쿠폰', '첫 달 4,900원 웰컴 쿠폰', '100원/무료', '가입 즉시 4,900원 웰컴 쿠폰 증정! 쇼핑 5% 적립 + 넷플릭스/스포티파이/웹툰 중 택1 무료.', 4900, 4900, 0, 30, 'https://nid.naver.com/membership/join', '네이버 멤버십 유지 기간 상시', '상시 제휴 (네이버플러스 멤버십 파트너십)', 'NP', 'active'),
  ('coupang-30d-free', '쿠팡 와우', '와우 30일 무료 체험', '와우 멤버십 30일 무료', '100원/무료', '로켓배송 무료, 반품 무료, 쿠팡이츠 배달비 무료, 쿠팡플레이 전 콘텐츠 무료 시청.', 7890, 7890, 0, 30, 'https://loyalty.coupang.com/loyalty/sign-up/home', '가입 후 첫 30일 (1개월간)', '상시 진행 (신규 가입 웰컴 트라이얼)', 'C', 'active'),
  ('welaaa-first-month', '윌라 오디오북', '첫 달 0원 무제한 듣기', '첫 달 무료 체험', '100원/무료', '전문 성우가 낭독하는 프리미엄 오디오북과 클래스를 첫 달 무료로 감상하세요.', 9900, 9900, 0, 30, 'https://www.welaaa.com', '가입 후 첫 1개월', '상시 진행 (신규 회원 한정)', 'W', 'active'),
  ('appletv-7d-free', 'Apple TV+', '애플 오리지널 7일 무료', '7일 무료 체험 (기기 구매 시 3개월)', '100원/무료', '애플 오리지널 시리즈를 7일간 무료 체험하세요. 새 Apple 기기 구입 시 3개월 무료.', 6500, 6500, 0, 7, 'https://tv.apple.com', '가입 후 첫 7일간', '상시 진행 (신규 회원 웰컴 트라이얼)', 'TV', 'active'),
  ('nintendo-7d-free', 'Nintendo Switch Online', '스위치 온라인 대전 7일 무료', '7일 무료 체험권', '100원/무료', '닌텐도 공식 페이지에서 스위치 온라인 대전 및 클래식 게임 7일 무료 이용권 증정.', 2000, 20000, 0, 7, 'https://www.nintendo.com/kr/nintendo-switch-online/', '가입 후 첫 7일간', '상시 진행 (신규 회원 웰컴 트라이얼)', 'N', 'active'),
  ('speak-7d-free', 'Speak (스픽)', 'AI 튜터 1:1 회화 7일 무료', '7일 무료 체험', '100원/무료', 'AI 영어 선생님과 하루 100문장 이상 실시간 피드백 회화를 7일간 무료로 체험하세요.', 7250, 29000, 0, 7, 'https://www.usespeak.com', '가입 후 첫 7일간', '상시 진행 (신규 회원 웰컴 트라이얼)', 'S', 'active'),
  ('duolingo-14d-free', 'Duolingo Super', '하트 무제한 슈퍼 듀오링고', '14일 무료 체험', '100원/무료', '광고 없는 어학 학습과 하트 무제한 충전, 맞춤 복습 기능을 14일간 무료로 이용하세요.', 4950, 9900, 0, 14, 'https://www.duolingo.com', '가입 후 첫 14일간', '상시 진행 (신규 회원 웰컴 트라이얼)', 'D', 'active'),
  ('naverplus-netflix', '네이버플러스 X Netflix', '네이버 멤버십으로 넷플릭스 0원', '넷플릭스 광고형 스탠다드 무료 연동', '통신사/결합', '네이버플러스 멤버십(월 4,900원) 가입 시 넷플릭스 광고형 스탠다드(월 5,500원) 이용권을 무료 제공.', 5500, 5500, 0, 30, 'https://help.naver.com/service/23168/contents/23881?lang=ko', '네이버 멤버십 유지 기간 상시', '상시 제휴 (네이버플러스 멤버십 파트너십)', 'N', 'active'),
  ('naver-spotify-link', '네이버플러스 X Spotify', '네이버 멤버십으로 스포티파이 0원', '네이버플러스 스포티파이 연동 무료', '통신사/결합', '네이버플러스 멤버십 디지털 혜택으로 Spotify Premium Basic 무제한 스트리밍을 매월 0원에 이용.', 10900, 10900, 0, 30, 'https://nid.naver.com/membership/join', '네이버 멤버십 유지 기간 상시', '상시 제휴 (네이버플러스 멤버십 파트너십)', 'NP', 'active'),
  ('disney-bundle-37', 'Disney+ X TVING X Wavve', '디즈니+, 티빙, 웨이브를 한 번에!', '3사 통합 번들 37% 결합 할인', '통신사/결합', 'KBO 생중계부터 지상파, 디즈니+ 오리지널까지 개별 구독 대비 최대 37% 결합 할인.', 12000, 34300, 22300, 15, 'https://www.disneyplus.com/ko-kr', '번들 요금제 유지 기간 상시', '상시 제휴 (통합 번들 요금제)', 'D', 'active'),
  ('skt-universe-youtube', '우주패스 X YouTube Premium', '유튜브 프리미엄 + 편의점/투썸 혜택', '우주패스 유튜브 결합 (월 5,000원 할인)', '통신사/결합', '월 9,900원 우주패스 life 가입 시 유튜브 프리미엄을 정가(14,900원) 대비 5,000원 할인된 금액에 이용.', 5000, 14900, 9900, 10, 'https://m.tworld.co.kr/product/call-plan/subscription', '가입 후 첫 1개월', '상시 진행 (신규 회원 한정)', 'SKT', 'active'),
  ('skt-perplexity-free', 'Perplexity Pro X SKT', 'Perplexity Pro 1년 전액 무료', 'SKT 에이닷 가입자 1년 무료', '통신사/결합', 'SKT 에이닷 이용 고객 대상 퍼플렉시티 프로(연 324,000원 상당) 1년 전액 무료 지원.', 27000, 27000, 0, 365, 'https://m.tworld.co.kr', '가입 후 첫 1개월', '상시 진행 (신규 회원 한정)', 'SKT', 'active'),
  ('tving-naver', '티빙 네이버플러스 연동', '네이버플러스 공식 제휴 연동', '네이버 제휴 파트너 연동', '통신사/결합', '네이버플러스 멤버십 제휴 연동 안내 공식 페이지.', 13500, 13500, 0, 30, 'https://nid.naver.com/membership/partner', '네이버 멤버십 유지 기간 상시', '상시 제휴 (네이버플러스 멤버십 파트너십)', 'T', 'active'),
  ('adobe-student-66', 'Adobe Creative Cloud', '모든 앱 20종 66% 할인', '학생·교사 66% 특가 할인', '학생/연간', '포토샵, 프리미어, 일러스트 등 20개 전 앱을 첫해 월 26,400원에 이용하세요. (연 62만 원 절약)', 51700, 78100, 26400, 14, 'https://www.adobe.com/kr/creativecloud/buy/students.html', '인증 후 1년 (매년 갱신 가능)', '상시 진행 (교육 기관 재학/재직 인증)', 'A', 'active'),
  ('github-student-pack', 'GitHub Student Pack', 'GitHub Copilot 무료 이용', '학생 Copilot 100% 무료 제공', '학생/연간', '학생 인증 시 GitHub Pro 및 AI 코딩 도구 GitHub Copilot(월 14,000원 상당)을 전액 무료 제공.', 14000, 14000, 0, 365, 'https://education.github.com/pack', '인증 후 1년 (매년 갱신 가능)', '상시 진행 (교육 기관 재학/재직 인증)', 'GH', 'active'),
  ('notion-student-free', 'Notion Plus', '학교 웹메일 인증 시 Plus 0원', '학생·교육자 Plus 플랜 100% 무료', '학생/연간', '대학교 웹메일 인증 시 월 14,000원 상당의 Notion Plus 플랜을 무료로 업그레이드.', 14000, 14000, 0, 365, 'https://www.notion.so/product/notion-for-education', '인증 후 1년 (매년 갱신 가능)', '상시 진행 (교육 기관 재학/재직 인증)', 'N', 'active'),
  ('figma-edu-free', 'Figma Professional', 'Figma Professional 전액 무료', '교육자·학생 Professional 100% 무료', '학생/연간', '디자인 전공 및 학생/교사 인증 시 월 21,000원 상당의 Figma Professional 플랜 무료 제공.', 21000, 21000, 0, 365, 'https://www.figma.com/education/', '인증 후 1년 (매년 갱신 가능)', '상시 진행 (교육 기관 재학/재직 인증)', 'F', 'active'),
  ('jetbrains-student-free', 'JetBrains All Products Pack', 'IntelliJ Ultimate 등 16종 무료', '학생 전 제품 IDE 100% 무료 라이선스', '학생/연간', '학생증 및 학교 메일 인증 시 연간 37만원 상당의 JetBrains 전 제품을 전액 무료로 이용하세요.', 37000, 37000, 0, 365, 'https://www.jetbrains.com/community/education/#students', '인증 후 1년 (매년 갱신 가능)', '상시 진행 (교육 기관 재학/재직 인증)', 'JB', 'active'),
  ('disney-annual-16', 'Disney+', '연간 결제로 2개월 무료 효과', '연간 결제 16% 할인 (2개월 무료 효과)', '학생/연간', '스탠다드 요금제를 연 99,000원에 결제하여 월 결제 대비 16% 절약하세요.', 19800, 118800, 99000, 365, 'https://www.disneyplus.com/ko-kr', '결제일로부터 1년 (12개월)', '상시 운영 (공식 연간 할인 플랜)', 'D', 'active'),
  ('tving-annual-44', 'TVING', '연간 구독 시 44% 요금 절약', '연간 이용권 최대 44% 할인', '학생/연간', '티빙 스탠다드 및 프리미엄을 1년 결제 시 최대 44% 할인된 금액으로 감상하세요.', 59000, 162000, 103000, 365, 'https://www.tving.com/my/pass', '결제일로부터 1년 (12개월)', '상시 운영 (공식 연간 할인 플랜)', 'T', 'active'),
  ('wavve-annual-16', 'Wavve', '1년 결제 시 2개월 요금 무료', '연간 이용권 16% 할인 (2개월 무료)', '학생/연간', '스탠다드 연간 이용권 결제 시 2개월 요금을 아끼고 지상파 및 VOD 무제한 시청.', 21800, 130800, 109000, 365, 'https://www.wavve.com/voucher/index.html', '결제일로부터 1년 (12개월)', '상시 운영 (공식 연간 할인 플랜)', 'W', 'active'),
  ('nintendo-family-plan', 'Nintendo Switch Online 패밀리', '8인 결합 시 1인당 연 4,740원', '패밀리 플랜 결합 (최대 8인 공유)', '학생/연간', '연 37,900원 패밀리 플랜을 친구/가족 8명이 공유하면 1인당 월 395원으로 스위치 온라인 이용. (80% 절약)', 15260, 20000, 4740, 365, 'https://www.nintendo.com/kr/nintendo-switch-online/', '가입 후 첫 1개월', '상시 진행 (신규 회원 한정)', 'N', 'active'),
  ('melon-2m-discount', 'Melon (멜론)', '멜로너를 위한 2개월 특별 할인', '스트리밍클럽 2개월 특가 할인', '경쟁사 프로모', '스트리밍 클럽 2개월간 특별 할인가(월 5,900원) 제공 전용 쿠폰팩 이벤트.', 6000, 8900, 5900, 10, 'https://www.melon.com/', '가입 후 첫 1개월', '상시 진행 (신규 회원 한정)', 'M', 'active'),
  ('adobe-new-user-25', 'Adobe Creative Cloud', '첫해 한정 모든 앱 25% 할인', '신규 구독자 첫해 한정 25% 할인', '경쟁사 프로모', '신규 구독자라면 모든 앱 플랜을 정가 78,100원 대신 첫해 월 58,200원에 이용하세요.', 19900, 78100, 58200, 14, 'https://www.adobe.com/kr/creativecloud/plans.html', '가입 후 첫 1개월', '상시 진행 (신규 회원 한정)', 'A', 'active'),
  ('youtube-lite-43', 'YouTube Premium Lite', '광고 제거 전용 신규 플랜 월 8,500원', 'Premium Lite 요금제 43% 비용 절감', 'OTT', 'YouTube Music 없이 영상 광고만 제거하고 싶은 유저를 위한 43% 저렴한 공식 요금제.', 6400, 14900, 8500, 30, 'https://www.youtube.com/premium', '가입 후 첫 1개월', '상시 진행 (신규 회원 한정)', 'Y', 'active'),
  ('chatgpt-discount-1', 'ChatGPT Plus ChatGPT Free 플랜 (GPT-4o 기본 무료 제공)', '기본 모델 무료 이용으로 구독료 대체', 'ChatGPT Free 플랜 (GPT-4o 기본 무료 제공)', 'SaaS', 'ChatGPT Plus: 기본 모델 무료 이용으로 구독료 대체', 29000, 29000, 0, null, 'https://chatgpt.com/#settings/Subscription', '상시 프로모션', '상시 제휴/할인', 'C', 'active'),
  ('claude-pro-discount-1', 'Claude Pro Claude 무료 계정 (Sonnet 3.5 기본 제공)', '비과금 유저도 고성능 Sonnet 3.5 모델 무료 이용', 'Claude 무료 계정 (Sonnet 3.5 기본 제공)', 'SaaS', 'Claude Pro: 비과금 유저도 고성능 Sonnet 3.5 모델 무료 이용', 29000, 29000, 0, null, 'https://claude.ai/settings', '상시 프로모션', '상시 제휴/할인', 'C', 'active'),
  ('midjourney-discount-1', 'Midjourney 연간 결제 시 20% 요금 할인', '1년 결제 시 매월 2,800원 절약', '연간 결제 시 20% 요금 할인', 'SaaS', 'Midjourney: 1년 결제 시 매월 2,800원 절약', 2800, 14000, 11200, null, 'https://www.midjourney.com/account', '상시 프로모션', '상시 제휴/할인', 'M', 'active'),
  ('runway-gen-discount-1', 'Runway Gen-4.5 기본 무료 계정 125 크레딧 지급 (0원)', '가입 시 AI 영상 생성 크레딧 무료 체험', '기본 무료 계정 125 크레딧 지급 (0원)', 'SaaS', 'Runway Gen-4.5: 가입 시 AI 영상 생성 크레딧 무료 체험', 20000, 20000, 0, null, 'https://runwayml.com', '상시 프로모션', '상시 제휴/할인', 'R', 'active'),
  ('v0-vercel-discount-1', 'v0 by Vercel Vercel Free 크레딧 (매월 무료 메시지 충전)', '기본 계정에 매월 무료 생성 크레딧 지급', 'Vercel Free 크레딧 (매월 무료 메시지 충전)', 'SaaS', 'v0 by Vercel: 기본 계정에 매월 무료 생성 크레딧 지급', 27000, 27000, 0, null, 'https://v0.dev', '상시 프로모션', '상시 제휴/할인', 'V', 'active'),
  ('canva-discount-1', 'Canva Pro 교사 및 초중고 교육용 Canva Pro 100% 무료', '교육 기관 인증 시 Canva Pro 팀 기능 무료 제공', '교사 및 초중고 교육용 Canva Pro 100% 무료', 'SaaS', 'Canva Pro: 교육 기관 인증 시 Canva Pro 팀 기능 무료 제공', 12900, 12900, 0, null, 'https://www.canva.com/settings', '상시 프로모션', '상시 제휴/할인', 'C', 'active'),
  ('adobe-discount-3', 'Adobe Creative Cloud 14일 무조건 전액 환불 보장', '구매 후 14일 이내 무료 취소 지원', '14일 무조건 전액 환불 보장', 'SaaS', 'Adobe Creative Cloud: 구매 후 14일 이내 무료 취소 지원', 78100, 26400, 0, null, 'https://account.adobe.com/plans', '상시 프로모션', '상시 제휴/할인', 'A', 'active'),
  ('framer-discount-1', 'Framer Pro Free 플랜 무료 사이트 배포 (0원)', '프레이머 서브도메인 무료 호스팅 지원', 'Free 플랜 무료 사이트 배포 (0원)', 'SaaS', 'Framer Pro: 프레이머 서브도메인 무료 호스팅 지원', 27000, 27000, 0, null, 'https://www.framer.com', '상시 프로모션', '상시 제휴/할인', 'F', 'active'),
  ('webflow-discount-1', 'Webflow Free Starter 플랜 (2개 사이트 무료)', '스타터 요금제 0원으로 웹 구축', 'Free Starter 플랜 (2개 사이트 무료)', 'SaaS', 'Webflow: 스타터 요금제 0원으로 웹 구축', 32000, 32000, 0, null, 'https://webflow.com', '상시 프로모션', '상시 제휴/할인', 'W', 'active'),
  ('cursor-ai-discount-1', 'Cursor Pro Hobby 플랜 (월 200회 빠른 요청 무료)', '개인 가입 시 기본 프리미엄 모델 무료 쿼리 제공', 'Hobby 플랜 (월 200회 빠른 요청 무료)', 'SaaS', 'Cursor Pro: 개인 가입 시 기본 프리미엄 모델 무료 쿼리 제공', 27000, 27000, 0, null, 'https://www.cursor.com/settings', '상시 프로모션', '상시 제휴/할인', 'C', 'active'),
  ('deepl-pro-discount-1', 'DeepL Pro DeepL 30일 무료 체험', '고품질 번역기 Pro 기능 30일간 무료', 'DeepL 30일 무료 체험', 'SaaS', 'DeepL Pro: 고품질 번역기 Pro 기능 30일간 무료', 12000, 12000, 0, null, 'https://www.deepl.com/pro-account', '상시 프로모션', '상시 제휴/할인', 'D', 'active'),
  ('grammarly-discount-1', 'Grammarly Grammarly 무료 기본 문법 검사', '영문 맞춤법 및 톤 검사 0원 이용', 'Grammarly 무료 기본 문법 검사', 'SaaS', 'Grammarly: 영문 맞춤법 및 톤 검사 0원 이용', 16000, 16000, 0, null, 'https://account.grammarly.com', '상시 프로모션', '상시 제휴/할인', 'G', 'active'),
  ('slack-pro-discount-1', 'Slack Pro 비영리 단체 및 교육용 85% 할인', '비영리 단체 인증 시 대폭 할인', '비영리 단체 및 교육용 85% 할인', 'SaaS', 'Slack Pro: 비영리 단체 인증 시 대폭 할인', 9350, 11000, 1650, null, 'https://slack.com/admin/billing', '상시 프로모션', '상시 제휴/할인', 'S', 'active'),
  ('zoom-pro-discount-1', 'Zoom Workplace Pro Basic 플랜 40분 무료 화상회의 (0원)', '40분 미팅 무제한 무료 생성', 'Basic 플랜 40분 무료 화상회의 (0원)', 'SaaS', 'Zoom Workplace Pro: 40분 미팅 무제한 무료 생성', 19000, 19000, 0, null, 'https://zoom.us/billing', '상시 프로모션', '상시 제휴/할인', 'Z', 'active'),
  ('ms365-discount-1', 'Microsoft 365 대학생 오피스 365 Education 100% 무료', '학교 협약 메일 인증 시 정품 오피스 무료', '대학생 오피스 365 Education 100% 무료', 'SaaS', 'Microsoft 365: 학교 협약 메일 인증 시 정품 오피스 무료', 8900, 8900, 0, null, 'https://account.microsoft.com/services', '상시 프로모션', '상시 제휴/할인', 'M', 'active'),
  ('ms365-discount-2', 'Microsoft 365 Family 6인 결합 시 인당 월 1,980원 (75% 절약)', 'Family 요금제 공유 시 인당 75% 절약', 'Family 6인 결합 시 인당 월 1,980원 (75% 절약)', 'SaaS', 'Microsoft 365: Family 요금제 공유 시 인당 75% 절약', 6920, 8900, 1980, null, 'https://account.microsoft.com/services', '상시 프로모션', '상시 제휴/할인', 'M', 'active'),
  ('google-one-discount-1', 'Google One 100GB 저장공간 첫 달 0원 무료 체험', '구글 포토/드라이브 100GB 첫 달 무료', '100GB 저장공간 첫 달 0원 무료 체험', 'SaaS', 'Google One: 구글 포토/드라이브 100GB 첫 달 무료', 2400, 2400, 0, null, 'https://one.google.com', '상시 프로모션', '상시 제휴/할인', 'G', 'active'),
  ('google-one-discount-2', 'Google One 가족 5인 스토리지 공유 (추가비용 0원)', '100GB 용량을 가족 5명이 무료 공유', '가족 5인 스토리지 공유 (추가비용 0원)', 'SaaS', 'Google One: 100GB 용량을 가족 5명이 무료 공유', 9600, 2400, 2400, null, 'https://one.google.com', '상시 프로모션', '상시 제휴/할인', 'G', 'active'),
  ('icloud-discount-1', 'Apple iCloud+ 가족 공유로 200GB 이상 플랜 분담 (인당 60% 절약)', '가족 공유 설정 시 인당 요금 대폭 절감', '가족 공유로 200GB 이상 플랜 분담 (인당 60% 절약)', 'SaaS', 'Apple iCloud+: 가족 공유 설정 시 인당 요금 대폭 절감', 2200, 1100, 1100, null, 'https://support.apple.com/billing', '상시 프로모션', '상시 제휴/할인', 'A', 'active'),
  ('dropbox-discount-1', 'Dropbox 친구 초대 시 영구 무료 용량 최대 16GB 증정', '친구 추천 가입 시 계정 용량 무료 확장', '친구 초대 시 영구 무료 용량 최대 16GB 증정', 'SaaS', 'Dropbox: 친구 추천 가입 시 계정 용량 무료 확장', 5000, 15000, 0, null, 'https://www.dropbox.com/account', '상시 프로모션', '상시 제휴/할인', 'D', 'active'),
  ('evernote-discount-1', 'Evernote 연간 결제 시 40% 학생 할인', '학생증 인증 시 1년간 40% 할인', '연간 결제 시 40% 학생 할인', 'SaaS', 'Evernote: 학생증 인증 시 1년간 40% 할인', 4760, 11900, 7140, null, 'https://www.evernote.com', '상시 프로모션', '상시 제휴/할인', 'E', 'active'),
  ('todoist-discount-1', 'Todoist 교육용 계정 70% 할인 지원', '학생 및 교육자 할인 요금 적용', '교육용 계정 70% 할인 지원', 'SaaS', 'Todoist: 학생 및 교육자 할인 요금 적용', 3850, 5500, 1650, null, 'https://todoist.com', '상시 프로모션', '상시 제휴/할인', 'T', 'active'),
  ('1password-discount-1', '1Password Families 플랜 5인 공유 (인당 월 1,500원)', '가족 요금제 공유 시 60% 이상 비용 절감', 'Families 플랜 5인 공유 (인당 월 1,500원)', 'SaaS', '1Password: 가족 요금제 공유 시 60% 이상 비용 절감', 3000, 4500, 1500, null, 'https://1password.com', '상시 프로모션', '상시 제휴/할인', '1', 'active'),
  ('nordvpn-discount-1', 'NordVPN 2년 결제 시 최대 70% 할인 + 3개월 무료', '장기 결제 시 월 1만원 이상 절약', '2년 결제 시 최대 70% 할인 + 3개월 무료', 'SaaS', 'NordVPN: 장기 결제 시 월 1만원 이상 절약', 10500, 5900, 4500, null, 'https://my.nordaccount.com', '상시 프로모션', '상시 제휴/할인', 'N', 'active'),
  ('netflix-discount-2', 'Netflix LG U+ 유독 스트리밍 결합 할인', '유독에서 유튜브/통신비와 묶을 시 할인', 'LG U+ 유독 스트리밍 결합 할인', 'OTT', 'Netflix: 유독에서 유튜브/통신비와 묶을 시 할인', 3500, 17000, 13500, null, 'https://www.netflix.com/cancelplan', '상시 프로모션', '상시 제휴/할인', 'N', 'active'),
  ('tving-discount-2', 'TVING LG U+ 너겟 5G 요금제 무료', '너겟 무약정 요금제 이용 시 매월 무료', 'LG U+ 너겟 5G 요금제 무료', 'OTT', 'TVING: 너겟 무약정 요금제 이용 시 매월 무료', 13500, 5500, 0, null, 'https://www.tving.com/my/pass', '상시 프로모션', '상시 제휴/할인', 'T', 'active'),
  ('disney-discount-3', 'Disney+ KT OTT 구독팩 5,000원 청구할인', 'KT 부가서비스 구독 시 매월 5천원 할인', 'KT OTT 구독팩 5,000원 청구할인', 'OTT', 'Disney+: KT 부가서비스 구독 시 매월 5천원 할인', 5000, 9900, 4900, null, 'https://www.disneyplus.com/ko-kr/account', '상시 프로모션', '상시 제휴/할인', 'D', 'active'),
  ('watcha-discount-1', 'WATCHA 신규 가입 2주 0원 무료 체험', '가입 즉시 2주간 왓챠 무제한 0원', '신규 가입 2주 0원 무료 체험', 'OTT', 'WATCHA: 가입 즉시 2주간 왓챠 무제한 0원', 6450, 12900, 0, null, 'https://watcha.com/settings', '상시 프로모션', '상시 제휴/할인', 'W', 'active'),
  ('laftel-discount-1', 'Laftel 친구 초대 7일 무료 이용권', '친구 초대 코드 입력 시 7일 무료 연장', '친구 초대 7일 무료 이용권', 'OTT', 'Laftel: 친구 초대 코드 입력 시 7일 무료 연장', 2500, 9900, 0, null, 'https://laftel.net/mypage', '상시 프로모션', '상시 제휴/할인', 'L', 'active'),
  ('primevideo-discount-1', 'Amazon Prime Video Amazon Prime Video 7일 무료 체험', '신규 가입 시 7일간 0원 무료', 'Amazon Prime Video 7일 무료 체험', 'OTT', 'Amazon Prime Video: 신규 가입 시 7일간 0원 무료', 7900, 7900, 0, null, 'https://www.amazon.com', '상시 프로모션', '상시 제휴/할인', 'A', 'active'),
  ('spotvnow-discount-1', 'SPOTV NOW 네이버플러스 멤버십 스포츠 무제한 연동', '네이버플러스 디지털 혜택으로 마이팀 경기 무료', '네이버플러스 멤버십 스포츠 무제한 연동', 'OTT', 'SPOTV NOW: 네이버플러스 디지털 혜택으로 마이팀 경기 무료', 9900, 19900, 0, null, 'https://www.spotvnow.co.kr', '상시 프로모션', '상시 제휴/할인', 'S', 'active'),
  ('weverse-discount-1', 'Weverse Digital Membership 글로벌 멤버십 웰컴 기프트 바우처', '멤버십 가입 시 공식 샵 쿠폰 증정', '글로벌 멤버십 웰컴 기프트 바우처', 'OTT', 'Weverse Digital Membership: 멤버십 가입 시 공식 샵 쿠폰 증정', 10000, 25000, 15000, null, 'https://weverse.io', '상시 프로모션', '상시 제휴/할인', 'W', 'active'),
  ('crunchyroll-discount-1', 'Crunchyroll 14일 무료 체험 (Mega Fan)', '신규 가입 시 14일간 무료 스트리밍', '14일 무료 체험 (Mega Fan)', 'OTT', 'Crunchyroll: 신규 가입 시 14일간 무료 스트리밍', 4500, 8900, 0, null, 'https://www.crunchyroll.com', '상시 프로모션', '상시 제휴/할인', 'C', 'active'),
  ('mubi-discount-1', 'MUBI 7일 무료 체험 (MUBI Free Trial)', '큐레이션 영화 7일간 무료 시청', '7일 무료 체험 (MUBI Free Trial)', 'OTT', 'MUBI: 큐레이션 영화 7일간 무료 시청', 3000, 12900, 0, null, 'https://mubi.com', '상시 프로모션', '상시 제휴/할인', 'M', 'active'),
  ('dazn-discount-1', 'DAZN 연간 결제 시 월 요금 25% 할인', '연간 구독 시 월 6,250원 절약', '연간 결제 시 월 요금 25% 할인', 'OTT', 'DAZN: 연간 구독 시 월 6,250원 절약', 6250, 25000, 18750, null, 'https://www.dazn.com', '상시 프로모션', '상시 제휴/할인', 'D', 'active'),
  ('melon-discount-2', 'Melon SKT T멤버십 0데이 결합 30% 할인', 'T멤버십 VIP 30% 청구할인', 'SKT T멤버십 0데이 결합 30% 할인', '음악', 'Melon: T멤버십 VIP 30% 청구할인', 2670, 8900, 6230, null, 'https://member.melon.com', '상시 프로모션', '상시 제휴/할인', 'M', 'active'),
  ('spotify-discount-3', 'Spotify 학생 인증 시 50% 요금 감면', '학생 인증 시 정가 대비 50% 할인', '학생 인증 시 50% 요금 감면', '음악', 'Spotify: 학생 인증 시 정가 대비 50% 할인', 5995, 11990, 5995, null, 'https://www.spotify.com/kr-ko/account/overview/', '상시 프로모션', '상시 제휴/할인', 'S', 'active'),
  ('genie-discount-2', 'Genie Music 1년 이용권 결제 시 네이버페이 30,000P 페이백', '연간권 구매 시 N페이 3만포인트 즉시 지급', '1년 이용권 결제 시 네이버페이 30,000P 페이백', '음악', 'Genie Music: 연간권 구매 시 N페이 3만포인트 즉시 지급', 30000, 8400, 59000, null, 'https://www.genie.co.kr', '상시 프로모션', '상시 제휴/할인', 'G', 'active'),
  ('genie-discount-3', 'Genie Music KT 통신사 멤버십 포인트 30% 차감할인', 'KT 멤버십 포인트로 매월 30% 결제', 'KT 통신사 멤버십 포인트 30% 차감할인', '음악', 'Genie Music: KT 멤버십 포인트로 매월 30% 결제', 2520, 8400, 5880, null, 'https://www.genie.co.kr', '상시 프로모션', '상시 제휴/할인', 'G', 'active'),
  ('flo-discount-1', 'FLO 첫 달 100원 특가 프로모션', '신규 가입자 한정 첫 달 100원 듣기', '첫 달 100원 특가 프로모션', '음악', 'FLO: 신규 가입자 한정 첫 달 100원 듣기', 7800, 7900, 100, null, 'https://www.music-flo.com', '상시 프로모션', '상시 제휴/할인', 'F', 'active'),
  ('flo-discount-2', 'FLO SKT 통신사 T멤버십 30% 결합할인', 'SKT 회선 결합 시 매월 30% 청구할인', 'SKT 통신사 T멤버십 30% 결합할인', '음악', 'FLO: SKT 회선 결합 시 매월 30% 청구할인', 2370, 7900, 5530, null, 'https://www.music-flo.com', '상시 프로모션', '상시 제휴/할인', 'F', 'active'),
  ('bugs-discount-1', 'Bugs 첫 달 100원 특가 프로모션', '모바일 무제한 첫 달 100원 이벤트', '첫 달 100원 특가 프로모션', '음악', 'Bugs: 모바일 무제한 첫 달 100원 이벤트', 7800, 7900, 100, null, 'https://secure.bugs.co.kr', '상시 프로모션', '상시 제휴/할인', 'B', 'active'),
  ('vibe-discount-1', 'NAVER VIBE 네이버플러스 멤버십 연동 300회 무료', '네이버 멤버십으로 매월 300회 무료 스트리밍', '네이버플러스 멤버십 연동 300회 무료', '음악', 'NAVER VIBE: 네이버 멤버십으로 매월 300회 무료 스트리밍', 3000, 8500, 0, null, 'https://vibe.naver.com', '상시 프로모션', '상시 제휴/할인', 'N', 'active'),
  ('applemusic-discount-1', 'Apple Music 신규 가입 1개월 무료 (기기 구매 시 6개월)', '1개월 무료, AirPods/HomePod 구매 시 6개월 무료', '신규 가입 1개월 무료 (기기 구매 시 6개월)', '음악', 'Apple Music: 1개월 무료, AirPods/HomePod 구매 시 6개월 무료', 8900, 8900, 0, null, 'https://support.apple.com', '상시 프로모션', '상시 제휴/할인', 'A', 'active'),
  ('ytmusic-discount-1', 'YouTube Music YouTube Premium 가입 시 Music 전액 무료', '유튜브 프리미엄 구독 시 뮤직 자동 무료 포함', 'YouTube Premium 가입 시 Music 전액 무료', '음악', 'YouTube Music: 유튜브 프리미엄 구독 시 뮤직 자동 무료 포함', 11990, 11990, 0, null, 'https://music.youtube.com', '상시 프로모션', '상시 제휴/할인', 'Y', 'active'),
  ('tidal-discount-1', 'TIDAL 30일 무료 체험 (HiFi Plus)', '무손실 고음질 스트리밍 30일간 무료', '30일 무료 체험 (HiFi Plus)', '음악', 'TIDAL: 무손실 고음질 스트리밍 30일간 무료', 14000, 14000, 0, null, 'https://my.tidal.com', '상시 프로모션', '상시 제휴/할인', 'T', 'active'),
  ('bubble-sm-discount-1', 'DearU Bubble 다인권 결합 할인 (3인권 이상)', '구독 인원 증가 시 인당 요금 할인', '다인권 결합 할인 (3인권 이상)', '음악', 'DearU Bubble: 구독 인원 증가 시 인당 요금 할인', 1500, 4500, 12000, null, 'https://www.lysn.com', '상시 프로모션', '상시 제휴/할인', 'D', 'active'),
  ('fromm-discount-1', 'fromm 첫 결제 프롬 코인 10% 추가 적립', '첫 결제 시 인앱 코인 페이백', '첫 결제 프롬 코인 10% 추가 적립', '음악', 'fromm: 첫 결제 시 인앱 코인 페이백', 450, 4500, 4050, null, 'https://fromm.im', '상시 프로모션', '상시 제휴/할인', 'F', 'active'),
  ('podbbang-discount-1', '팟빵 오디오매거진 팟빵 오디오북 첫 달 100원 딜', '유료 팟캐스트/오디오북 첫 달 100원', '팟빵 오디오북 첫 달 100원 딜', '음악', '팟빵 오디오매거진: 유료 팟캐스트/오디오북 첫 달 100원', 9800, 9900, 100, null, 'https://www.podbbang.com', '상시 프로모션', '상시 제휴/할인', '팟', 'active'),
  ('millie-discount-2', '밀리의 서재 연간 결제 시 2개월 구독료 무료 (연 99,000원)', '1년 결제로 2개월치 비용 면제', '연간 결제 시 2개월 구독료 무료 (연 99,000원)', '도서/웹툰', '밀리의 서재: 1년 결제로 2개월치 비용 면제', 1650, 9900, 8250, null, 'https://www.millie.co.kr/v3/mypage/subscription', '상시 프로모션', '상시 제휴/할인', '밀', 'active'),
  ('ridiselect-discount-1', '리디셀렉트 리디셀렉트 첫 달 0원 무료 체험', '신간/베스트셀러 첫 달 0원 무제한 독서', '리디셀렉트 첫 달 0원 무료 체험', '도서/웹툰', '리디셀렉트: 신간/베스트셀러 첫 달 0원 무제한 독서', 4900, 4900, 0, null, 'https://select.ridibooks.com', '상시 프로모션', '상시 제휴/할인', '리', 'active'),
  ('storytel-discount-1', 'Storytel 스토리텔 14일 무료 체험', '글로벌 오디오북 14일간 0원 감상', '스토리텔 14일 무료 체험', '음악', 'Storytel: 글로벌 오디오북 14일간 0원 감상', 5500, 11900, 0, null, 'https://www.storytel.com', '상시 프로모션', '상시 제휴/할인', 'S', 'active'),
  ('longblack-discount-1', '롱블랙 롱블랙 연간 멤버십 16% 할인', '연간 결제 시 1일 1노트 할인 이용', '롱블랙 연간 멤버십 16% 할인', '도서/웹툰', '롱블랙: 연간 결제 시 1일 1노트 할인 이용', 800, 4900, 4100, null, 'https://www.longblack.co', '상시 프로모션', '상시 제휴/할인', '롱', 'active'),
  ('the-joongang-plus-discount-1', '더중앙플러스 더중앙플러스 첫 달 1,000원 특가 딜', '중앙일보 유료 디지털 구독 첫 달 1,000원', '더중앙플러스 첫 달 1,000원 특가 딜', '도서/웹툰', '더중앙플러스: 중앙일보 유료 디지털 구독 첫 달 1,000원', 8000, 9000, 1000, null, 'https://www.joongang.co.kr', '상시 프로모션', '상시 제휴/할인', '더', 'active'),
  ('nyt-digital-discount-1', 'The New York Times The New York Times 첫해 주 1달러 ($4/월)', '신규 구독자 첫해 한정 70% 이상 할인', 'The New York Times 첫해 주 1달러 ($4/월)', '도서/웹툰', 'The New York Times: 신규 구독자 첫해 한정 70% 이상 할인', 15000, 6000, 5500, null, 'https://www.nytimes.com', '상시 프로모션', '상시 제휴/할인', 'T', 'active'),
  ('wsj-digital-discount-1', 'The Wall Street Journal Wall Street Journal 첫해 월 $4 특가 프로모션', '글로벌 경제지 첫해 대폭 할인', 'Wall Street Journal 첫해 월 $4 특가 프로모션', '도서/웹툰', 'The Wall Street Journal: 글로벌 경제지 첫해 대폭 할인', 25000, 12000, 5500, null, 'https://www.wsj.com', '상시 프로모션', '상시 제휴/할인', 'T', 'active'),
  ('ft-digital-discount-1', 'Financial Times Financial Times 4주 시험구독 1달러', '첫 달 파격가 체험 지원', 'Financial Times 4주 시험구독 1달러', '도서/웹툰', 'Financial Times: 첫 달 파격가 체험 지원', 43600, 45000, 1400, null, 'https://www.ft.com', '상시 프로모션', '상시 제휴/할인', 'F', 'active'),
  ('the-economist-discount-1', 'The Economist 이코노미스트 첫 12주 50% 할인', '디지털 구독 첫 분기 반값 혜택', '이코노미스트 첫 12주 50% 할인', '도서/웹툰', 'The Economist: 디지털 구독 첫 분기 반값 혜택', 14500, 29000, 14500, null, 'https://www.economist.com', '상시 프로모션', '상시 제휴/할인', 'T', 'active'),
  ('audible-discount-1', 'Audible Audible 30일 무료 체험 + 1권 무료 영구 소장', '첫 달 0원 + 프리미엄 오디오북 1권 무료 소장', 'Audible 30일 무료 체험 + 1권 무료 영구 소장', '도서/웹툰', 'Audible: 첫 달 0원 + 프리미엄 오디오북 1권 무료 소장', 11000, 11000, 0, null, 'https://www.audible.com', '상시 프로모션', '상시 제휴/할인', 'A', 'active'),
  ('scribd-discount-1', 'Scribd Scribd 30일 무료 체험 (전자책/문서)', '글로벌 전자책 및 논문 30일간 0원', 'Scribd 30일 무료 체험 (전자책/문서)', '도서/웹툰', 'Scribd: 글로벌 전자책 및 논문 30일간 0원', 13000, 13000, 0, null, 'https://www.scribd.com', '상시 프로모션', '상시 제휴/할인', 'S', 'active'),
  ('speak-discount-2', 'Speak 연간 결제 시 50% 얼리버드 할인 (월 14,500원)', '월 29,000원 정가 대비 연간 결제 시 반값', '연간 결제 시 50% 얼리버드 할인 (월 14,500원)', '교육/어학', 'Speak: 월 29,000원 정가 대비 연간 결제 시 반값', 14500, 29000, 14500, null, 'https://www.usespeak.com', '상시 프로모션', '상시 제휴/할인', 'S', 'active'),
  ('duolingo-discount-2', 'Duolingo Super Family 6인 결합 시 인당 월 2,500원 (65% 절약)', '패밀리 플랜 공유 시 대폭 할인', 'Family 6인 결합 시 인당 월 2,500원 (65% 절약)', '교육/어학', 'Duolingo Super: 패밀리 플랜 공유 시 대폭 할인', 7400, 9900, 2500, null, 'https://www.duolingo.com/settings/super', '상시 프로모션', '상시 제휴/할인', 'D', 'active'),
  ('ringle-discount-1', 'Ringle 아이비리그 튜터 1:1 회화 20분 무료 체험권', '가입 즉시 원어민 1:1 무료 수업권 지급', '아이비리그 튜터 1:1 회화 20분 무료 체험권', '교육/어학', 'Ringle: 가입 즉시 원어민 1:1 무료 수업권 지급', 35000, 159000, 0, null, 'https://www.ringleplus.com', '상시 프로모션', '상시 제휴/할인', 'R', 'active'),
  ('cambly-discount-1', 'Cambly 15분 무료 체험 수업권', '캠블리 원어민 실시간 대화 무료 체험', '15분 무료 체험 수업권', '교육/어학', 'Cambly: 캠블리 원어민 실시간 대화 무료 체험', 20000, 129000, 0, null, 'https://www.cambly.com', '상시 프로모션', '상시 제휴/할인', 'C', 'active'),
  ('santatoeic-discount-1', '산타토익 AI 토익 점수 진단 및 모의고사 무료', '취약점 분석 및 예측 점수 0원 진단', 'AI 토익 점수 진단 및 모의고사 무료', '교육/어학', '산타토익: 취약점 분석 및 예측 점수 0원 진단', 15000, 29000, 0, null, 'https://www.santatoeic.com', '상시 프로모션', '상시 제휴/할인', '산', 'active'),
  ('malhaeboca-discount-1', '말해보카 7일 무료 체험 + 연간 30% 할인', '영단어 암기 앱 7일 무료 이용', '7일 무료 체험 + 연간 30% 할인', '교육/어학', '말해보카: 영단어 암기 앱 7일 무료 이용', 8900, 8900, 0, null, 'https://www.malhaeboca.com', '상시 프로모션', '상시 제휴/할인', '말', 'active'),
  ('class101-discount-1', 'CLASS101+ 연간 구독 30% 얼리버드 할인 (월 18,900원)', '5천여 개 실무/취미 클래스 무제한 수강', '연간 구독 30% 얼리버드 할인 (월 18,900원)', '교육/어학', 'CLASS101+: 5천여 개 실무/취미 클래스 무제한 수강', 7500, 18900, 18900, null, 'https://class101.net/mypage', '상시 프로모션', '상시 제휴/할인', 'C', 'active'),
  ('fastcampus-discount-1', '패스트캠퍼스 온라인 올인원 구독 패스 특가', '개발/데이터/AI 실무 강의 무제한 수강', '온라인 올인원 구독 패스 특가', '교육/어학', '패스트캠퍼스: 개발/데이터/AI 실무 강의 무제한 수강', 20000, 39000, 39000, null, 'https://fastcampus.co.kr', '상시 프로모션', '상시 제휴/할인', '패', 'active'),
  ('inflearn-discount-1', '인프런 인프런 지식공유 무료 강의 1,000여 개', '프로그래밍 기초 및 IT 강의 0원 수강', '인프런 지식공유 무료 강의 1,000여 개', '교육/어학', '인프런: 프로그래밍 기초 및 IT 강의 0원 수강', 50000, 29000, 0, null, 'https://www.inflearn.com', '상시 프로모션', '상시 제휴/할인', '인', 'active'),
  ('coursera-discount-1', 'Coursera Plus Coursera Plus 7일 무료 체험', '글로벌 명문대 전문 수료증 과정 7일 무료', 'Coursera Plus 7일 무료 체험', '교육/어학', 'Coursera Plus: 글로벌 명문대 전문 수료증 과정 7일 무료', 15000, 69000, 0, null, 'https://www.coursera.org', '상시 프로모션', '상시 제휴/할인', 'C', 'active'),
  ('naverplus-discount-2', '네이버플러스 멤버십 패밀리 3인 무료 초대 (적립 혜택 공유)', '가족 3명 무료 등록하여 적립 극대화', '패밀리 3인 무료 초대 (적립 혜택 공유)', '쇼핑', '네이버플러스 멤버십: 가족 3명 무료 등록하여 적립 극대화', 14700, 4900, 0, null, 'https://nid.naver.com/membership', '상시 프로모션', '상시 제휴/할인', '네', 'active'),
  ('baemin-club-discount-1', '배민클럽 배민클럽 론칭 기념 첫 달 0원 무료', '무제한 배달비 무료 혜택 첫 달 0원', '배민클럽 론칭 기념 첫 달 0원 무료', '쇼핑', '배민클럽: 무제한 배달비 무료 혜택 첫 달 0원', 3990, 3990, 0, null, 'https://baemin.com', '상시 프로모션', '상시 제휴/할인', '배', 'active'),
  ('yogipass-discount-1', '요기패스X 요기패스X 첫 달 무료 프로모션', '전 매장 무료배달 첫 달 0원 체험', '요기패스X 첫 달 무료 프로모션', '쇼핑', '요기패스X: 전 매장 무료배달 첫 달 0원 체험', 2900, 2900, 0, null, 'https://www.yogiyo.co.kr', '상시 프로모션', '상시 제휴/할인', '요', 'active'),
  ('yogipass-discount-2', '요기패스X 네이버플러스 멤버십 연동 배달비 무료', '네이버 멤버십 회원 시 요기패스X 무료 연동', '네이버플러스 멤버십 연동 배달비 무료', '쇼핑', '요기패스X: 네이버 멤버십 회원 시 요기패스X 무료 연동', 2900, 2900, 0, null, 'https://www.yogiyo.co.kr', '상시 프로모션', '상시 제휴/할인', '요', 'active'),
  ('kurly-pass-discount-1', '컬리멤버스 컬리멤버스 첫 달 무료 + 2,000원 적립금', '첫 달 무료 가입 시 적립금 즉시 페이백', '컬리멤버스 첫 달 무료 + 2,000원 적립금', '쇼핑', '컬리멤버스: 첫 달 무료 가입 시 적립금 즉시 페이백', 3900, 4500, 0, null, 'https://www.kurly.com/mypage', '상시 프로모션', '상시 제휴/할인', '컬', 'active'),
  ('ps-plus-discount-1', 'PlayStation Plus 연간 결제 시 월 결제 대비 최대 25% 할인', '1년 정기결제로 매월 요금 절감', '연간 결제 시 월 결제 대비 최대 25% 할인', '게임/엔터', 'PlayStation Plus: 1년 정기결제로 매월 요금 절감', 1875, 7500, 5625, null, 'https://store.playstation.com', '상시 프로모션', '상시 제휴/할인', 'P', 'active'),
  ('xbox-gamepass-discount-1', 'Xbox Game Pass Ultimate 신규 가입 첫 달 1,000원 딜', 'PC/콘솔 400여 개 대작 게임 첫 달 1,000원', '신규 가입 첫 달 1,000원 딜', '게임/엔터', 'Xbox Game Pass Ultimate: PC/콘솔 400여 개 대작 게임 첫 달 1,000원', 12500, 13500, 1000, null, 'https://account.microsoft.com/services', '상시 프로모션', '상시 제휴/할인', 'X', 'active'),
  ('xbox-gamepass-discount-2', 'Xbox Game Pass Ultimate 네이버플러스 멤버십 이용 시 PC Game Pass 0원', '네이버 멤버십 회원 시 무료 연동', '네이버플러스 멤버십 이용 시 PC Game Pass 0원', '게임/엔터', 'Xbox Game Pass Ultimate: 네이버 멤버십 회원 시 무료 연동', 7900, 13500, 0, null, 'https://account.microsoft.com/services', '상시 프로모션', '상시 제휴/할인', 'X', 'active'),
  ('apple-arcade-discount-1', 'Apple Arcade 1개월 무료 체험 (기기 구매 시 3개월)', '인앱결제 없는 200개 게임 1개월 0원', '1개월 무료 체험 (기기 구매 시 3개월)', '게임/엔터', 'Apple Arcade: 인앱결제 없는 200개 게임 1개월 0원', 6500, 6500, 0, null, 'https://support.apple.com/billing', '상시 프로모션', '상시 제휴/할인', 'A', 'active'),
  ('google-play-pass-discount-1', 'Google Play Pass 1개월 무료 체험 (안드로이드 전용)', '유료 앱/게임 수백 종 광고 없이 1개월 무료', '1개월 무료 체험 (안드로이드 전용)', '게임/엔터', 'Google Play Pass: 유료 앱/게임 수백 종 광고 없이 1개월 무료', 6500, 6500, 0, null, 'https://play.google.com/store/account/subscriptions', '상시 프로모션', '상시 제휴/할인', 'G', 'active'),
  ('google-play-pass-discount-2', 'Google Play Pass 가족 그룹 5인 공유 무료', '가족 5명이 추가비용 없이 플레이패스 공유', '가족 그룹 5인 공유 무료', '게임/엔터', 'Google Play Pass: 가족 5명이 추가비용 없이 플레이패스 공유', 26000, 6500, 6500, null, 'https://play.google.com/store/account/subscriptions', '상시 프로모션', '상시 제휴/할인', 'G', 'active'),
  ('ea-play-discount-1', 'EA Play 연간 결제 시 50% 요금 절약 (연 33,900원)', '월 5,500원 대비 연간 결제로 반값 혜택', '연간 결제 시 50% 요금 절약 (연 33,900원)', '게임/엔터', 'EA Play: 월 5,500원 대비 연간 결제로 반값 혜택', 2675, 5500, 2825, null, 'https://www.ea.com', '상시 프로모션', '상시 제휴/할인', 'E', 'active'),
  ('wow-subscription-discount-1', 'World of Warcraft 정액제 6개월 정액제 결제 시 15% 할인 + 탈것 증정', '장기 결제 시 월 요금 할인 및 한정판 아이템', '6개월 정액제 결제 시 15% 할인 + 탈것 증정', '게임/엔터', 'World of Warcraft 정액제: 장기 결제 시 월 요금 할인 및 한정판 아이템', 3000, 19800, 16800, null, 'https://account.battle.net', '상시 프로모션', '상시 제휴/할인', 'W', 'active'),
  ('kakaotalk-drive-discount-1', '카카오톡 톡서랍 플러스 첫 달 100원 특가 (100GB 드라이브)', '카톡 사진/대화 자동 백업 첫 달 100원', '첫 달 100원 특가 (100GB 드라이브)', '생활/모빌리티', '카카오톡 톡서랍 플러스: 카톡 사진/대화 자동 백업 첫 달 100원', 890, 990, 100, null, 'https://drive.kakao.com', '상시 프로모션', '상시 제휴/할인', '카', 'active'),
  ('kakaotalk-emoticon-discount-1', '카카오톡 이모티콘 플러스 첫 달 100원 특가 (이모티콘 무제한)', '모든 카카오톡 이모티콘 무제한 이용 첫 달 100원', '첫 달 100원 특가 (이모티콘 무제한)', '생활/모빌리티', '카카오톡 이모티콘 플러스: 모든 카카오톡 이모티콘 무제한 이용 첫 달 100원', 3800, 3900, 100, null, 'https://e.kakao.com', '상시 프로모션', '상시 제휴/할인', '카', 'active'),
  ('naver-mybox-discount-1', '네이버 MYBOX 기본 30GB 영구 무료 제공 (0원)', '네이버 계정 기본 30GB 무료 클라우드', '기본 30GB 영구 무료 제공 (0원)', '생활/모빌리티', '네이버 MYBOX: 네이버 계정 기본 30GB 무료 클라우드', 1650, 1650, 0, null, 'https://mybox.naver.com', '상시 프로모션', '상시 제휴/할인', '네', 'active'),
  ('strava-sub-discount-1', 'Strava 30일 무료 체험 (Strava Premium)', '러닝/사이클 코스 및 구간 기록 30일간 무료', '30일 무료 체험 (Strava Premium)', '생활/모빌리티', 'Strava: 러닝/사이클 코스 및 구간 기록 30일간 무료', 7900, 7900, 0, null, 'https://www.strava.com/settings/subscription', '상시 프로모션', '상시 제휴/할인', 'S', 'active'),
  ('burnfit-pro-discount-1', '번핏 Pro 7일 무료 체험 (BurnFit Pro)', '운동 루틴 및 무게 점진적 과부하 분석 7일 무료', '7일 무료 체험 (BurnFit Pro)', '생활/모빌리티', '번핏 Pro: 운동 루틴 및 무게 점진적 과부하 분석 7일 무료', 4900, 4900, 0, null, 'https://burnfit.app', '상시 프로모션', '상시 제휴/할인', '번', 'active'),
  ('adobe-lightroom-discount-1', 'Adobe Lightroom Mobile Premium Lightroom Mobile 7일 무료 체험', '모바일 고해상도 RAW 보정 프리미엄 7일 무료', 'Lightroom Mobile 7일 무료 체험', 'SaaS', 'Adobe Lightroom Mobile Premium: 모바일 고해상도 RAW 보정 프리미엄 7일 무료', 5500, 5500, 0, null, 'https://account.adobe.com', '상시 프로모션', '상시 제휴/할인', 'A', 'active')
on conflict (id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  kind = excluded.kind,
  category = excluded.category,
  description = excluded.description,
  saving = excluded.saving,
  original_price = excluded.original_price,
  offer_price = excluded.offer_price,
  dday = excluded.dday,
  link = excluded.link,
  benefit_period = excluded.benefit_period,
  campaign_period = excluded.campaign_period,
  monogram = excluded.monogram,
  verified_status = excluded.verified_status,
  updated_at = now();

-- 6. 서비스-혜택 매핑 데이터 적재 (130건)
insert into public.service_benefits (
  service_id, benefit_id, role, is_primary
) values
  ('spotify', 'spotify-3m-free', 'target', true),
  ('youtube', 'youtube-1m-free', 'target', true),
  ('wavve', 'wavve-100-payback', 'target', true),
  ('millie', 'millie-1plus1', 'target', true),
  ('genie', 'genie-110won', 'target', true),
  ('naverplus', 'naverplus-welcome', 'target', true),
  ('coupang', 'coupang-30d-free', 'target', true),
  ('coupangplay', 'coupang-30d-free', 'provider', false),
  ('welaaa', 'welaaa-first-month', 'target', true),
  ('appletv', 'appletv-7d-free', 'target', true),
  ('nintendo-online', 'nintendo-7d-free', 'target', true),
  ('speak', 'speak-7d-free', 'target', true),
  ('duolingo', 'duolingo-14d-free', 'target', true),
  ('netflix', 'naverplus-netflix', 'target', true),
  ('naverplus', 'naverplus-netflix', 'provider', false),
  ('spotify', 'naver-spotify-link', 'target', true),
  ('naverplus', 'naver-spotify-link', 'provider', false),
  ('disney', 'disney-bundle-37', 'bundle_member', true),
  ('tving', 'disney-bundle-37', 'bundle_member', false),
  ('wavve', 'disney-bundle-37', 'bundle_member', false),
  ('youtube', 'skt-universe-youtube', 'target', true),
  ('perplexity-pro', 'skt-perplexity-free', 'target', true),
  ('tving', 'tving-naver', 'target', true),
  ('naverplus', 'tving-naver', 'provider', false),
  ('adobe', 'adobe-student-66', 'target', true),
  ('github-copilot', 'github-student-pack', 'target', true),
  ('notion', 'notion-student-free', 'target', true),
  ('figma', 'figma-edu-free', 'target', true),
  ('jetbrains-all', 'jetbrains-student-free', 'target', true),
  ('disney', 'disney-annual-16', 'target', true),
  ('tving', 'tving-annual-44', 'target', true),
  ('wavve', 'wavve-annual-16', 'target', true),
  ('nintendo-online', 'nintendo-family-plan', 'target', true),
  ('melon', 'melon-2m-discount', 'target', true),
  ('adobe', 'adobe-new-user-25', 'target', true),
  ('youtube', 'youtube-lite-43', 'target', true),
  ('chatgpt', 'chatgpt-discount-1', 'target', true),
  ('claude-pro', 'claude-pro-discount-1', 'target', true),
  ('midjourney', 'midjourney-discount-1', 'target', true),
  ('runway-gen', 'runway-gen-discount-1', 'target', true),
  ('v0-vercel', 'v0-vercel-discount-1', 'target', true),
  ('canva', 'canva-discount-1', 'target', true),
  ('adobe', 'adobe-discount-3', 'target', true),
  ('framer', 'framer-discount-1', 'target', true),
  ('webflow', 'webflow-discount-1', 'target', true),
  ('cursor-ai', 'cursor-ai-discount-1', 'target', true),
  ('deepl-pro', 'deepl-pro-discount-1', 'target', true),
  ('grammarly', 'grammarly-discount-1', 'target', true),
  ('slack-pro', 'slack-pro-discount-1', 'target', true),
  ('zoom-pro', 'zoom-pro-discount-1', 'target', true),
  ('ms365', 'ms365-discount-1', 'target', true),
  ('ms365', 'ms365-discount-2', 'target', true),
  ('google-one', 'google-one-discount-1', 'target', true),
  ('google-one', 'google-one-discount-2', 'target', true),
  ('icloud', 'icloud-discount-1', 'target', true),
  ('dropbox', 'dropbox-discount-1', 'target', true),
  ('evernote', 'evernote-discount-1', 'target', true),
  ('todoist', 'todoist-discount-1', 'target', true),
  ('1password', '1password-discount-1', 'target', true),
  ('nordvpn', 'nordvpn-discount-1', 'target', true),
  ('netflix', 'netflix-discount-2', 'target', true),
  ('tving', 'tving-discount-2', 'target', true),
  ('disney', 'disney-discount-3', 'target', true),
  ('watcha', 'watcha-discount-1', 'target', true),
  ('laftel', 'laftel-discount-1', 'target', true),
  ('primevideo', 'primevideo-discount-1', 'target', true),
  ('spotvnow', 'spotvnow-discount-1', 'target', true),
  ('naverplus', 'spotvnow-discount-1', 'provider', false),
  ('weverse', 'weverse-discount-1', 'target', true),
  ('crunchyroll', 'crunchyroll-discount-1', 'target', true),
  ('mubi', 'mubi-discount-1', 'target', true),
  ('dazn', 'dazn-discount-1', 'target', true),
  ('melon', 'melon-discount-2', 'target', true),
  ('spotify', 'spotify-discount-3', 'target', true),
  ('genie', 'genie-discount-2', 'target', true),
  ('genie', 'genie-discount-3', 'target', true),
  ('flo', 'flo-discount-1', 'target', true),
  ('flo', 'flo-discount-2', 'target', true),
  ('bugs', 'bugs-discount-1', 'target', true),
  ('vibe', 'vibe-discount-1', 'target', true),
  ('naverplus', 'vibe-discount-1', 'provider', false),
  ('applemusic', 'applemusic-discount-1', 'target', true),
  ('ytmusic', 'ytmusic-discount-1', 'target', true),
  ('youtube', 'ytmusic-discount-1', 'provider', false),
  ('tidal', 'tidal-discount-1', 'target', true),
  ('bubble-sm', 'bubble-sm-discount-1', 'target', true),
  ('fromm', 'fromm-discount-1', 'target', true),
  ('podbbang', 'podbbang-discount-1', 'target', true),
  ('millie', 'millie-discount-2', 'target', true),
  ('ridiselect', 'ridiselect-discount-1', 'target', true),
  ('storytel', 'storytel-discount-1', 'target', true),
  ('longblack', 'longblack-discount-1', 'target', true),
  ('the-joongang-plus', 'the-joongang-plus-discount-1', 'target', true),
  ('nyt-digital', 'nyt-digital-discount-1', 'target', true),
  ('wsj-digital', 'wsj-digital-discount-1', 'target', true),
  ('ft-digital', 'ft-digital-discount-1', 'target', true),
  ('the-economist', 'the-economist-discount-1', 'target', true),
  ('audible', 'audible-discount-1', 'target', true),
  ('scribd', 'scribd-discount-1', 'target', true),
  ('speak', 'speak-discount-2', 'target', true),
  ('duolingo', 'duolingo-discount-2', 'target', true),
  ('ringle', 'ringle-discount-1', 'target', true),
  ('cambly', 'cambly-discount-1', 'target', true),
  ('santatoeic', 'santatoeic-discount-1', 'target', true),
  ('malhaeboca', 'malhaeboca-discount-1', 'target', true),
  ('class101', 'class101-discount-1', 'target', true),
  ('fastcampus', 'fastcampus-discount-1', 'target', true),
  ('inflearn', 'inflearn-discount-1', 'target', true),
  ('coursera', 'coursera-discount-1', 'target', true),
  ('naverplus', 'naverplus-discount-2', 'target', true),
  ('baemin-club', 'baemin-club-discount-1', 'target', true),
  ('yogipass', 'yogipass-discount-1', 'target', true),
  ('yogipass', 'yogipass-discount-2', 'target', true),
  ('naverplus', 'yogipass-discount-2', 'provider', false),
  ('kurly-pass', 'kurly-pass-discount-1', 'target', true),
  ('ps-plus', 'ps-plus-discount-1', 'target', true),
  ('xbox-gamepass', 'xbox-gamepass-discount-1', 'target', true),
  ('xbox-gamepass', 'xbox-gamepass-discount-2', 'target', true),
  ('naverplus', 'xbox-gamepass-discount-2', 'provider', false),
  ('apple-arcade', 'apple-arcade-discount-1', 'target', true),
  ('google-play-pass', 'google-play-pass-discount-1', 'target', true),
  ('google-play-pass', 'google-play-pass-discount-2', 'target', true),
  ('ea-play', 'ea-play-discount-1', 'target', true),
  ('wow-subscription', 'wow-subscription-discount-1', 'target', true),
  ('kakaotalk-drive', 'kakaotalk-drive-discount-1', 'target', true),
  ('kakaotalk-emoticon', 'kakaotalk-emoticon-discount-1', 'target', true),
  ('naver-mybox', 'naver-mybox-discount-1', 'target', true),
  ('strava-sub', 'strava-sub-discount-1', 'target', true),
  ('burnfit-pro', 'burnfit-pro-discount-1', 'target', true),
  ('adobe-lightroom', 'adobe-lightroom-discount-1', 'target', true)
on conflict (service_id, benefit_id) do update set
  role = excluded.role,
  is_primary = excluded.is_primary;

commit;
