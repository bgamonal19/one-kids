create table public.child_accounts (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  child_id text not null,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
  learning jsonb not null check (jsonb_typeof(learning) = 'object' and octet_length(learning::text) <= 1000000 and learning->'child'->>'id' = child_id),
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  unique(parent_user_id, child_id)
);
alter table public.child_accounts enable row level security;
revoke all on public.child_accounts from anon, authenticated;
grant select on public.child_accounts to authenticated;
grant update(learning) on public.child_accounts to authenticated;
create policy child_access_read on public.child_accounts for select to authenticated using (
  (select auth.uid()) = auth_user_id or (select auth.uid()) = parent_user_id
);
create policy child_access_update on public.child_accounts for update to authenticated using (
  (select auth.uid()) = auth_user_id or (select auth.uid()) = parent_user_id
) with check ((select auth.uid()) = auth_user_id or (select auth.uid()) = parent_user_id);
create function public.version_child_learning() returns trigger language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  if auth.uid() = old.auth_user_id and new.learning->'focusActive' is distinct from old.learning->'focusActive' then
    if new.learning->'focusActive' = 'true'::jsonb or exists (
      select 1 from jsonb_array_elements(coalesce(new.learning->'tasks', '[]'::jsonb)) t where t->'done' is distinct from 'true'::jsonb
    ) then raise exception 'Solo los padres pueden cambiar el enfoque'; end if;
  end if;
  return new;
end;
$$;
create trigger child_learning_version before update on public.child_accounts for each row execute function public.version_child_learning();
drop policy family_read_own on public.family_states;
drop policy family_insert_own on public.family_states;
drop policy family_update_own on public.family_states;
create policy family_read_own on public.family_states for select to authenticated using (
  (select auth.uid()) = user_id and coalesce((select auth.jwt())->'app_metadata'->>'one_kids_role', '') <> 'child'
);
create policy family_insert_own on public.family_states for insert to authenticated with check (
  (select auth.uid()) = user_id and coalesce((select auth.jwt())->'app_metadata'->>'one_kids_role', '') <> 'child'
);
create policy family_update_own on public.family_states for update to authenticated using (
  (select auth.uid()) = user_id and coalesce((select auth.jwt())->'app_metadata'->>'one_kids_role', '') <> 'child'
) with check ((select auth.uid()) = user_id and coalesce((select auth.jwt())->'app_metadata'->>'one_kids_role', '') <> 'child');
alter table public.child_accounts add constraint valid_child_learning check (
 jsonb_typeof(learning->'child') = 'object'
 and coalesce(learning->'child'->>'id' = child_id, false)
 and jsonb_typeof(learning->'tasks') = 'array'
 and jsonb_typeof(learning->'courses') = 'array'
 and jsonb_typeof(learning->'agenda') = 'array'
 and jsonb_typeof(learning->'focusActive') = 'boolean'
 and not (learning ?| array['password','passwordHash','access_token','refresh_token','parent'])
);
