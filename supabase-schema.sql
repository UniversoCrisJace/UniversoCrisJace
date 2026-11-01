-- Ejecuta este SQL en Supabase > SQL Editor > New query.
create table if not exists public.weekly_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.weekly_plans enable row level security;

create policy "Users can read their own plans"
on public.weekly_plans for select
using (auth.uid() = user_id);

create policy "Users can insert their own plans"
on public.weekly_plans for insert
with check (auth.uid() = user_id);

create policy "Users can update their own plans"
on public.weekly_plans for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- No compartas tu service_role key. La app solo usa la anon/public key.