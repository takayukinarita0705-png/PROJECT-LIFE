alter table public.study_time_records
  add column if not exists task_title text,
  add column if not exists category_id text,
  add column if not exists category_name text;

create index if not exists study_time_records_category_id_idx
  on public.study_time_records (user_id, category_id, study_date desc)
  where category_id is not null;
