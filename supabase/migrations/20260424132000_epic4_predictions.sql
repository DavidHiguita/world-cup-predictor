create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  stage text not null,
  kickoff_at timestamptz not null,
  home_team_code text not null,
  home_team_name text not null,
  home_team_flag text not null,
  away_team_code text not null,
  away_team_name text not null,
  away_team_flag text not null,
  venue text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (home_team_code, away_team_code, kickoff_at)
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  predicted_winner_code text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (group_id, match_id, user_id)
);

create index if not exists idx_matches_kickoff_at on public.matches (kickoff_at);
create index if not exists idx_predictions_group_user on public.predictions (group_id, user_id);

alter table public.matches enable row level security;
alter table public.predictions enable row level security;

drop policy if exists "authenticated_users_can_view_matches" on public.matches;
create policy "authenticated_users_can_view_matches"
on public.matches
for select
to authenticated
using (true);

drop policy if exists "group_members_can_view_own_predictions" on public.predictions;
create policy "group_members_can_view_own_predictions"
on public.predictions
for select
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.group_memberships memberships
    where memberships.group_id = predictions.group_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "group_members_can_insert_own_predictions" on public.predictions;
create policy "group_members_can_insert_own_predictions"
on public.predictions
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.group_memberships memberships
    where memberships.group_id = predictions.group_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "group_members_can_update_own_predictions" on public.predictions;
create policy "group_members_can_update_own_predictions"
on public.predictions
for update
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.group_memberships memberships
    where memberships.group_id = predictions.group_id
      and memberships.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.group_memberships memberships
    where memberships.group_id = predictions.group_id
      and memberships.user_id = auth.uid()
  )
);

insert into public.matches (
  stage,
  kickoff_at,
  home_team_code,
  home_team_name,
  home_team_flag,
  away_team_code,
  away_team_name,
  away_team_flag,
  venue
)
values
  ('Group Stage', '2026-06-12T18:00:00+00:00', 'MEX', 'Mexico', '🇲🇽', 'JPN', 'Japan', '🇯🇵', 'Estadio Azteca'),
  ('Group Stage', '2026-06-12T21:00:00+00:00', 'USA', 'United States', '🇺🇸', 'GHA', 'Ghana', '🇬🇭', 'SoFi Stadium'),
  ('Group Stage', '2026-06-13T18:00:00+00:00', 'ARG', 'Argentina', '🇦🇷', 'NED', 'Netherlands', '🇳🇱', 'MetLife Stadium'),
  ('Group Stage', '2026-06-13T21:00:00+00:00', 'BRA', 'Brazil', '🇧🇷', 'ESP', 'Spain', '🇪🇸', 'AT&T Stadium')
on conflict (home_team_code, away_team_code, kickoff_at) do nothing;
