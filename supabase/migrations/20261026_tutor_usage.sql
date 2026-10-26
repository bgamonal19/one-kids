-- AI tutor settings and monthly usage per family account. Apply once in the ONE KIDS project
-- (Supabase → SQL Editor → paste → Run). Only the server (secret key) reads or writes it.
create table if not exists public.tutor_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  open_mode boolean not null default false,
  monthly_limit integer not null default 300000,
  usage_month text not null default to_char(now(), 'YYYY-MM'),
  used_tokens integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint tutor_limit_range check (monthly_limit between 10000 and 10000000),
  constraint tutor_used_positive check (used_tokens >= 0)
);
alter table public.tutor_accounts enable row level security;
revoke all on public.tutor_accounts from anon, authenticated;

-- Adds tokens in one statement and starts again from zero when the month changes.
create or replace function public.tutor_add_usage(p_user uuid, p_month text, p_tokens integer)
returns integer language sql security definer set search_path = '' as $$
  insert into public.tutor_accounts as t (user_id, usage_month, used_tokens)
  values (p_user, p_month, greatest(p_tokens, 0))
  on conflict (user_id) do update set
    used_tokens = case when t.usage_month = excluded.usage_month then t.used_tokens + excluded.used_tokens else excluded.used_tokens end,
    usage_month = excluded.usage_month,
    updated_at = now()
  returning used_tokens;
$$;
revoke all on function public.tutor_add_usage(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.tutor_add_usage(uuid, text, integer) to service_role;
