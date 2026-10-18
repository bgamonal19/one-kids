-- ONE KIDS schema (Supabase)
-- Run in the SQL editor of your Supabase project.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  pin_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  age int not null check (age between 5 and 13),
  stars int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  active boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  summary text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.tutor_sessions enable row level security;

create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "children_own" on public.children
  for all using (auth.uid() = parent_id) with check (auth.uid() = parent_id);

create policy "tasks_via_child" on public.tasks
  for all using (
    exists (
      select 1 from public.children c
      where c.id = child_id and c.parent_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.children c
      where c.id = child_id and c.parent_id = auth.uid()
    )
  );

create policy "focus_via_child" on public.focus_sessions
  for all using (
    exists (
      select 1 from public.children c
      where c.id = child_id and c.parent_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.children c
      where c.id = child_id and c.parent_id = auth.uid()
    )
  );

create policy "tutor_via_child" on public.tutor_sessions
  for all using (
    exists (
      select 1 from public.children c
      where c.id = child_id and c.parent_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.children c
      where c.id = child_id and c.parent_id = auth.uid()
    )
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Padre'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
