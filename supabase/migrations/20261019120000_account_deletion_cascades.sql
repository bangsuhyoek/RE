-- ==========================================================
-- 회원 탈퇴 및 계정 삭제 시 외래키 ON DELETE CASCADE 보장
-- 파일: supabase/migrations/20261019120000_account_deletion_cascades.sql
-- ==========================================================

begin;

-- 보조 사용자 테이블(profiles, notifications, cancellation_history)이 존재할 경우 auth.users CASCADE 외래키 보장
do $$
begin
  if to_regclass('public.profiles') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
    ) then
      alter table public.profiles
        drop constraint if exists profiles_user_id_fkey;
      alter table public.profiles
        add constraint profiles_user_id_fkey
        foreign key (user_id) references auth.users(id) on delete cascade;
    end if;
  end if;

  if to_regclass('public.notifications') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'notifications' and column_name = 'user_id'
    ) then
      alter table public.notifications
        drop constraint if exists notifications_user_id_fkey;
      alter table public.notifications
        add constraint notifications_user_id_fkey
        foreign key (user_id) references auth.users(id) on delete cascade;
    end if;
  end if;

  if to_regclass('public.cancellation_history') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'cancellation_history' and column_name = 'user_id'
    ) then
      alter table public.cancellation_history
        drop constraint if exists cancellation_history_user_id_fkey;
      alter table public.cancellation_history
        add constraint cancellation_history_user_id_fkey
        foreign key (user_id) references auth.users(id) on delete cascade;
    end if;
  end if;
end $$;

commit;
