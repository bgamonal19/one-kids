-- Independent of the old prototype schema. Apply once in the ONE KIDS project.
-- Supabase Auth owns users and password hashing; never store passwords here.
create table if not exists public.family_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint family_state_object check (jsonb_typeof(state) = 'object'),
  constraint family_state_size check (octet_length(state::text) <= 1048576),
  constraint family_no_credentials check (
    not (state ?| array['password','passwordHash','access_token','refresh_token','parent'])
  )
);
alter table public.family_states enable row level security;
revoke all on public.family_states from anon;
grant select, insert, update on public.family_states to authenticated;

drop policy if exists family_read_own on public.family_states;
create policy family_read_own on public.family_states for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists family_insert_own on public.family_states;
create policy family_insert_own on public.family_states for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists family_update_own on public.family_states;
create policy family_update_own on public.family_states for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.set_family_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists family_updated_at on public.family_states;
create trigger family_updated_at before update on public.family_states
for each row execute function public.set_family_updated_at();
