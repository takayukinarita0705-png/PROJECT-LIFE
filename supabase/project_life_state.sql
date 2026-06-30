create table if not exists public.project_life_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.project_life_state enable row level security;

revoke all on table public.project_life_state from anon, authenticated;
grant select, insert, update on table public.project_life_state
  to anon, authenticated;

drop policy if exists "Shared schedule can be read"
  on public.project_life_state;
create policy "Shared schedule can be read"
  on public.project_life_state
  for select
  to anon, authenticated
  using (id = 'default');

drop policy if exists "Shared schedule can be created"
  on public.project_life_state;
create policy "Shared schedule can be created"
  on public.project_life_state
  for insert
  to anon, authenticated
  with check (id = 'default');

drop policy if exists "Shared schedule can be updated"
  on public.project_life_state;
create policy "Shared schedule can be updated"
  on public.project_life_state
  for update
  to anon, authenticated
  using (id = 'default')
  with check (id = 'default');
