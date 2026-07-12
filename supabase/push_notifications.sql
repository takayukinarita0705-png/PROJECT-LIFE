create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

revoke all on table public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on table public.push_subscriptions
  to anon, authenticated;

drop policy if exists "Push subscriptions can be saved"
  on public.push_subscriptions;
create policy "Push subscriptions can be saved"
  on public.push_subscriptions
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Push subscriptions can be refreshed"
  on public.push_subscriptions;
create policy "Push subscriptions can be refreshed"
  on public.push_subscriptions
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Push subscriptions can be read by app"
  on public.push_subscriptions;
create policy "Push subscriptions can be read by app"
  on public.push_subscriptions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Push subscriptions can be deleted"
  on public.push_subscriptions;
create policy "Push subscriptions can be deleted"
  on public.push_subscriptions
  for delete
  to anon, authenticated
  using (true);

-- Supabase Dashboardで pg_cron と pg_net を有効化後に設定する例:
-- select cron.schedule(
--   'project-life-future-reminders',
--   '*/5 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://<project-ref>.functions.supabase.co/send-future-reminders',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
