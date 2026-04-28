alter table public.groups alter column scoring_mode drop default;
alter table public.groups alter column scoring_mode type text;

alter table public.groups drop constraint if exists groups_scoring_mode_check;
alter table public.groups
  add constraint groups_scoring_mode_check
  check (scoring_mode in ('winner_only', 'exact_score'));

alter table public.groups alter column scoring_mode set default 'exact_score';
update public.groups set scoring_mode = 'exact_score' where scoring_mode = 'winner_only';

alter table public.predictions add column if not exists predicted_home_score integer;
alter table public.predictions add column if not exists predicted_away_score integer;

alter table public.predictions drop constraint if exists predictions_score_pair_check;
alter table public.predictions
  add constraint predictions_score_pair_check
  check (
    (predicted_home_score is null and predicted_away_score is null)
    or (predicted_home_score is not null and predicted_away_score is not null)
  );

alter table public.predictions drop constraint if exists predictions_score_range_check;
alter table public.predictions
  add constraint predictions_score_range_check
  check (
    (predicted_home_score is null or predicted_home_score between 0 and 99)
    and (predicted_away_score is null or predicted_away_score between 0 and 99)
  );

alter table public.matches drop constraint if exists matches_result_winner_code_check;
alter table public.matches
  add constraint matches_result_winner_code_check
  check (
    result_winner_code is null
    or result_winner_code = home_team_code
    or result_winner_code = away_team_code
    or result_winner_code = 'DRAW'
  );

create or replace function public.create_group_with_owner(
  group_slug text,
  group_identifier text,
  group_share_code text,
  group_name text,
  group_rules text,
  group_deadline timestamptz,
  group_max_players integer,
  group_scoring_mode text default 'exact_score'
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_group public.groups;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.groups (
    slug,
    group_id,
    share_code,
    name,
    rules,
    deadline,
    max_players,
    scoring_mode,
    owner_user_id
  )
  values (
    group_slug,
    group_identifier,
    group_share_code,
    group_name,
    group_rules,
    group_deadline,
    group_max_players,
    group_scoring_mode,
    current_user_id
  )
  returning * into inserted_group;

  insert into public.group_memberships (group_id, user_id, role)
  values (inserted_group.id, current_user_id, 'owner');

  return inserted_group;
exception
  when unique_violation then
    raise exception 'GROUP_DUPLICATE';
end;
$$;

grant execute on function public.create_group_with_owner(text, text, text, text, text, timestamptz, integer, text) to authenticated;

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
      matches.home_team_code,
      matches.away_team_code,
      matches.home_score,
      matches.away_score,
      matches.resolved_at
    from public.matches matches
    where matches.result_status = 'final'
      and matches.home_score is not null
      and matches.away_score is not null
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
      coalesce(sum(
        case
          when predictions.predicted_home_score is null or predictions.predicted_away_score is null then 0
          when predictions.predicted_home_score = resolved.home_score
            and predictions.predicted_away_score = resolved.away_score then 3
          when (
            case
              when predictions.predicted_home_score > predictions.predicted_away_score then resolved.home_team_code
              when predictions.predicted_away_score > predictions.predicted_home_score then resolved.away_team_code
              else 'DRAW'
            end
          ) = (
            case
              when resolved.home_score > resolved.away_score then resolved.home_team_code
              when resolved.away_score > resolved.home_score then resolved.away_team_code
              else 'DRAW'
            end
          ) then 1
          else 0
        end
      ), 0)::integer as total_points,
      coalesce(sum(
        case
          when predictions.predicted_home_score = resolved.home_score
            and predictions.predicted_away_score = resolved.away_score then 1
          else 0
        end
      ), 0)::integer as correct_picks,
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
