alter table public.matches add column if not exists home_score integer;
alter table public.matches add column if not exists away_score integer;
alter table public.matches add column if not exists result_winner_code text;
alter table public.matches add column if not exists result_status text not null default 'scheduled';
alter table public.matches add column if not exists resolved_at timestamptz;

create index if not exists idx_matches_result_status on public.matches (result_status);
create index if not exists idx_predictions_group_match on public.predictions (group_id, match_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_result_status_check'
  ) then
    alter table public.matches
      add constraint matches_result_status_check
      check (result_status in ('scheduled', 'final'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_result_winner_code_check'
  ) then
    alter table public.matches
      add constraint matches_result_winner_code_check
      check (
        result_winner_code is null
        or result_winner_code = home_team_code
        or result_winner_code = away_team_code
      );
  end if;
end
$$;

update public.matches
set
  home_score = 2,
  away_score = 1,
  result_winner_code = 'MEX',
  result_status = 'final',
  resolved_at = '2026-06-12T20:05:00+00:00'
where home_team_code = 'MEX'
  and away_team_code = 'JPN'
  and kickoff_at = '2026-06-12T18:00:00+00:00';

update public.matches
set
  home_score = 1,
  away_score = 2,
  result_winner_code = 'GHA',
  result_status = 'final',
  resolved_at = '2026-06-12T23:05:00+00:00'
where home_team_code = 'USA'
  and away_team_code = 'GHA'
  and kickoff_at = '2026-06-12T21:00:00+00:00';

create or replace function public.get_group_rankings(target_group_uuid uuid)
returns table (
  user_id uuid,
  role text,
  total_points integer,
  correct_picks integer,
  scored_matches integer,
  rank integer,
  resolved_matches integer,
  last_updated timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.group_memberships memberships
    where memberships.group_id = target_group_uuid
      and memberships.user_id = current_user_id
  ) then
    raise exception 'GROUP_ACCESS_DENIED';
  end if;

  return query
  with resolved_matches_cte as (
    select
      matches.id,
      matches.result_winner_code,
      matches.resolved_at
    from public.matches matches
    where matches.result_status = 'final'
      and matches.result_winner_code is not null
  ),
  group_members as (
    select memberships.user_id, memberships.role
    from public.group_memberships memberships
    where memberships.group_id = target_group_uuid
  ),
  member_scores as (
    select
      members.user_id,
      members.role,
      coalesce(sum(case when predictions.predicted_winner_code = resolved.result_winner_code then 3 else 0 end), 0)::integer as total_points,
      coalesce(sum(case when predictions.predicted_winner_code = resolved.result_winner_code then 1 else 0 end), 0)::integer as correct_picks,
      coalesce(count(resolved.id), 0)::integer as scored_matches
    from group_members members
    left join public.predictions predictions
      on predictions.group_id = target_group_uuid
      and predictions.user_id = members.user_id
    left join resolved_matches_cte resolved
      on resolved.id = predictions.match_id
    group by members.user_id, members.role
  ),
  ranked_scores as (
    select
      scores.user_id,
      scores.role,
      scores.total_points,
      scores.correct_picks,
      scores.scored_matches,
      dense_rank() over (
        order by scores.total_points desc, scores.correct_picks desc, scores.scored_matches desc, scores.user_id asc
      )::integer as rank,
      (select count(*)::integer from resolved_matches_cte) as resolved_matches,
      (select max(resolved_at) from resolved_matches_cte) as last_updated
    from member_scores scores
  )
  select
    ranked_scores.user_id,
    ranked_scores.role,
    ranked_scores.total_points,
    ranked_scores.correct_picks,
    ranked_scores.scored_matches,
    ranked_scores.rank,
    ranked_scores.resolved_matches,
    ranked_scores.last_updated
  from ranked_scores
  order by ranked_scores.rank asc, ranked_scores.user_id asc;
end;
$$;

grant execute on function public.get_group_rankings(uuid) to authenticated;
