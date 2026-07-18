create table if not exists public.study_time_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text,
  study_date date not null,
  minutes integer not null check (minutes between 1 and 1440),
  source text not null check (
    source in ('manual', 'task_completion', 'timer', 'scheduled_duration')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_time_records enable row level security;

revoke all on table public.study_time_records from anon, authenticated;
grant select, insert, update, delete on table public.study_time_records
  to authenticated;

drop policy if exists "Users can read own study time records"
  on public.study_time_records;
create policy "Users can read own study time records"
  on public.study_time_records
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own study time records"
  on public.study_time_records;
create policy "Users can create own study time records"
  on public.study_time_records
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own study time records"
  on public.study_time_records;
create policy "Users can update own study time records"
  on public.study_time_records
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own study time records"
  on public.study_time_records;
create policy "Users can delete own study time records"
  on public.study_time_records
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create unique index if not exists study_time_records_completion_unique
  on public.study_time_records (user_id, task_id)
  where task_id is not null
    and source in ('task_completion', 'scheduled_duration');

create index if not exists study_time_records_user_study_date_idx
  on public.study_time_records (user_id, study_date desc);

create index if not exists study_time_records_task_id_idx
  on public.study_time_records (task_id)
  where task_id is not null;

create or replace function public.set_study_time_records_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_study_time_records_updated_at
  on public.study_time_records;
create trigger set_study_time_records_updated_at
before update on public.study_time_records
for each row execute function public.set_study_time_records_updated_at();
