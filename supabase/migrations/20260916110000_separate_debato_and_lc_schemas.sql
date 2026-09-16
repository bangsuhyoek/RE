-- ==========================================================
-- 타 프로젝트(Debato 및 LC) 테이블을 전용 스키마로 분리 (SubMate public 스키마 정리)
-- 파일: supabase/migrations/20260916110000_separate_debato_and_lc_schemas.sql
-- ==========================================================

-- ==========================================================
-- 타 프로젝트(Debato 및 LC) 정리 및 SubMate public 스키마 정렬
-- 파일: supabase/migrations/20260916110000_separate_debato_and_lc_schemas.sql
-- ==========================================================

begin;

-- 1. DEBATO 및 LC 스키마 완전 삭제 (CASCADE)
drop schema if exists debato cascade;
drop schema if exists lc cascade;

-- 2. 이전 프로토타입 잔재 transfer_promotions 테이블 정리
drop table if exists public.transfer_promotions cascade;

-- 3. LC 관련 잔여 함수들 정리
drop function if exists public.lc_hash_token(text);
drop function if exists public.lc_pull_snapshot(text, timestamp with time zone);
drop function if exists public.lc_purge_device(text);
drop function if exists public.lc_push_snapshot(text, jsonb, jsonb, jsonb);
drop function if exists public.lc_register_device(text, text, integer);
drop function if exists public.lc_resolve_device(text);

-- 4. cancellation_history와 subscription_services 간의 외래키 연결 (Schema Visualizer 연결선)
alter table public.cancellation_history 
  drop constraint if exists cancellation_history_service_id_fkey;

alter table public.cancellation_history 
  add constraint cancellation_history_service_id_fkey 
  foreign key (service_id) references public.subscription_services(id) 
  on delete set null;

-- 5. 테이블 설명(Comment) 추가 (Schema Visualizer에서 식별 용이)
comment on table public.subscription_services is '구독 서비스 마스터 카탈로그 (94개 순수 디지털/웹 서비스)';
comment on table public.service_plans is '구독 서비스별 공식 요금제 (금액, 결제주기, 혜택)';
comment on table public.benefits is '구독 서비스 프로모션, 제휴 무료, 결합 및 요금할인 혜택 마스터';
comment on table public.service_benefits is '구독 서비스와 혜택 간의 M:N 매핑 (제휴/결합 다중 연결 지원)';
comment on table public.subscriptions is '사용자가 등록한 활성/체험 구독 목록 (결제일, 결제수단, 공유분담금 등)';
comment on table public.receipt_recognitions is '영수증 OCR 자동인식 결과 메타데이터 (보안상 원문/이미지는 미보관)';
comment on table public.profiles is 'SubMate 사용자 프로필 및 온보딩/알림 설정';
comment on table public.notifications is '결제일 D-3, D-1 알림 및 갱신/해지 알림 내역';
comment on table public.cancellation_history is '사용자가 해지 완료한 구독 서비스 및 절감액 이력';

commit;

