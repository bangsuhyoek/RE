-- ==========================================================
-- Atomic Account Deletion & Security Hardening
-- File: supabase/migrations/20261023100000_atomic_account_deletion_and_security_hardening.sql
--
-- 1. Ensure pgcrypto is located in extensions schema
-- 2. Restrict consume_agent_chat_quota to service_role only
-- 3. Provide atomic delete_submate_user_data(target_user_id) function
-- ==========================================================

-- 1. Ensure pgcrypto extension is moved to extensions schema if currently in public
create schema if not exists extensions;

do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_extension e
    join pg_catalog.pg_namespace n on e.extnamespace = n.oid
    where e.extname = 'pgcrypto' and n.nspname = 'public'
  ) then
    alter extension pgcrypto set schema extensions;
  end if;
end $$;

-- 2. Revoke execute on consume_agent_chat_quota from public, anon, and authenticated
do $$
begin
  if to_regprocedure('public.consume_agent_chat_quota()') is not null then
    revoke all on function public.consume_agent_chat_quota() from public, anon, authenticated;
    grant execute on function public.consume_agent_chat_quota() to service_role;
  end if;
end $$;

-- 3. Atomic user data deletion function
create or replace function public.delete_submate_user_data(target_user_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table text;
begin
  if target_user_id is null then
    raise exception 'target_user_id cannot be null';
  end if;

  -- (1) Confirmed user tables in foreign-key dependency order (children before parents)
  foreach v_table in array array[
    'evidence_items',
    'evidence_cases',
    'approval_requests',
    'agent_mandates',
    'subscriptions',
    'receipt_recognitions',
    'agent_chat_usage',
    'api_endpoint_usage'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      if exists (
        select 1 from pg_catalog.pg_attribute a
        join pg_catalog.pg_class c on a.attrelid = c.oid
        join pg_catalog.pg_namespace n on c.relnamespace = n.oid
        where n.nspname = 'public'
          and c.relname = v_table
          and a.attname = 'user_id'
          and not a.attisdropped
      ) then
        execute format('delete from %I.%I where user_id = $1', 'public', v_table)
          using target_user_id;
      end if;
    end if;
  end loop;

  -- (2) Cancel difficulty reports (identified by owner_hash = sha256(user_id))
  if to_regclass('public.cancel_difficulty_reports') is not null then
    if exists (
      select 1 from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on a.attrelid = c.oid
      join pg_catalog.pg_namespace n on c.relnamespace = n.oid
      where n.nspname = 'public'
        and c.relname = 'cancel_difficulty_reports'
        and a.attname = 'owner_hash'
        and not a.attisdropped
    ) then
      execute 'delete from public.cancel_difficulty_reports where owner_hash = encode(extensions.digest($1::text, ''sha256''), ''hex'')'
        using target_user_id;
    end if;
  end if;

  -- (3) Optional user tables (conditionally deleted if table and column exist)
  foreach v_table in array array[
    'cancellation_history',
    'notifications',
    'profiles'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      if exists (
        select 1 from pg_catalog.pg_attribute a
        join pg_catalog.pg_class c on a.attrelid = c.oid
        join pg_catalog.pg_namespace n on c.relnamespace = n.oid
        where n.nspname = 'public'
          and c.relname = v_table
          and a.attname = 'user_id'
          and not a.attisdropped
      ) then
        execute format('delete from %I.%I where user_id = $1', 'public', v_table)
          using target_user_id;
      end if;
    end if;
  end loop;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.delete_submate_user_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_submate_user_data(uuid) to service_role;
