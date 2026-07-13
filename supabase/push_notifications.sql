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

-- Supabase Dashboardでpg_cron・pg_netを有効化し、VaultにFunction呼出用の
-- secret keyを「project_life_edge_function_key」という名前で保存してから設定する例:
-- select cron.schedule(
--   'project-life-future-reminders',
--   '* * * * *',
--   $$
--   select net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/send-future-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'apikey', (
--         select decrypted_secret
--         from vault.decrypted_secrets
--         where name = 'project_life_edge_function_key'
--       )
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
