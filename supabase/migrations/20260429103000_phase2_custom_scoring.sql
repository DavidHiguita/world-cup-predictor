alter table public.groups add column if not exists exact_score_points integer;
alter table public.groups add column if not exists correct_outcome_points integer;

update public.groups
set
  exact_score_points = coalesce(exact_score_points, 3),
  correct_outcome_points = coalesce(correct_outcome_points, 1);

alter table public.groups alter column exact_score_points set default 3;
alter table public.groups alter column correct_outcome_points set default 1;
alter table public.groups alter column exact_score_points set not null;
alter table public.groups alter column correct_outcome_points set not null;

alter table public.groups drop constraint if exists groups_exact_score_points_check;
alter table public.groups
  add constraint groups_exact_score_points_check
  check (exact_score_points between 1 and 10);

alter table public.groups drop constraint if exists groups_correct_outcome_points_check;
alter table public.groups
  add constraint groups_correct_outcome_points_check
  check (correct_outcome_points between 0 and 10);

alter table public.groups drop constraint if exists groups_scoring_points_order_check;
alter table public.groups
  add constraint groups_scoring_points_order_check
  check (exact_score_points >= correct_outcome_points);

drop function if exists public.create_group_with_owner(text, text, text, text, text, timestamptz, integer, text);
drop function if exists public.create_group_with_owner(text, text, text, text, text, timestamptz, integer, text, integer, integer);
create or replace function public.create_group_with_owner(
  group_slug text,
  group_identifier text,
  group_share_code text,
  group_name text,
  group_rules text,
  group_deadline timestamptz,
  group_max_players integer,
  group_scoring_mode text default 'exact_score',
  group_exact_score_points integer default 3,
  group_correct_outcome_points integer default 1
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
    exact_score_points,
    correct_outcome_points,
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
    group_exact_score_points,
    group_correct_outcome_points,
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

grant execute on function public.create_group_with_owner(text, text, text, text, text, timestamptz, integer, text, integer, integer) to authenticated;

drop function if exists public.get_group_rankings(uuid);
create function public.get_group_rankings(target_group_uuid uuid)
returns table (
  user_id uuid,
  role text,
  total_points integer,
  correct_picks integer,
  scored_matches integer,
  rank integer,
  resolved_matches integer,
  last_updated timestamptz,
  exact_score_points integer,
  correct_outcome_points integer
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
  with group_settings as (
    select groups.id, groups.exact_score_points, groups.correct_outcome_points
    from public.groups groups
    where groups.id = target_group_uuid
  ),
  resolved_matches_cte as (
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
            and predictions.predicted_away_score = resolved.away_score then settings.exact_score_points
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
          ) then settings.correct_outcome_points
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
    cross join group_settings settings
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
      (select max(resolved_at) from resolved_matches_cte) as last_updated,
      (select settings.exact_score_points from group_settings settings) as exact_score_points,
      (select settings.correct_outcome_points from group_settings settings) as correct_outcome_points
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
    ranked_scores.last_updated,
    ranked_scores.exact_score_points,
    ranked_scores.correct_outcome_points
  from ranked_scores
  order by ranked_scores.rank asc, ranked_scores.user_id asc;
end;
$$;

grant execute on function public.get_group_rankings(uuid) to authenticated;

drop function if exists public.get_group_join_preview_by_identifier(text);
create function public.get_group_join_preview_by_identifier(target_group_identifier text)
returns table (
  id uuid,
  group_id text,
  share_code text,
  slug text,
  name text,
  rules text,
  deadline timestamptz,
  max_players integer,
  exact_score_points integer,
  correct_outcome_points integer,
  member_count integer,
  join_state text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_group public.groups;
  current_member_count integer := 0;
  current_join_state text := 'open';
begin
  select *
  into target_group
  from public.groups groups
  where groups.group_id = target_group_identifier;

  if not found then
    return;
  end if;

  select count(*)::integer
  into current_member_count
  from public.group_memberships memberships
  where memberships.group_id = target_group.id;

  if current_user_id is not null and exists (
    select 1
    from public.group_memberships memberships
    where memberships.group_id = target_group.id
      and memberships.user_id = current_user_id
  ) then
    current_join_state := 'joined';
  elsif current_member_count >= target_group.max_players then
    current_join_state := 'full';
  end if;

  return query
  select
    target_group.id,
    target_group.group_id,
    target_group.share_code,
    target_group.slug,
    target_group.name,
    target_group.rules,
    target_group.deadline,
    target_group.max_players,
    target_group.exact_score_points,
    target_group.correct_outcome_points,
    current_member_count,
    current_join_state;
end;
$$;

grant execute on function public.get_group_join_preview_by_identifier(text) to anon, authenticated;

drop function if exists public.get_group_join_preview_by_share_code(text);
create function public.get_group_join_preview_by_share_code(target_group_share_code text)
returns table (
  id uuid,
  group_id text,
  share_code text,
  slug text,
  name text,
  rules text,
  deadline timestamptz,
  max_players integer,
  exact_score_points integer,
  correct_outcome_points integer,
  member_count integer,
  join_state text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_group public.groups;
  current_member_count integer := 0;
  current_join_state text := 'open';
begin
  select *
  into target_group
  from public.groups groups
  where groups.share_code = target_group_share_code;

  if not found then
    return;
  end if;

  select count(*)::integer
  into current_member_count
  from public.group_memberships memberships
  where memberships.group_id = target_group.id;

  if current_user_id is not null and exists (
    select 1
    from public.group_memberships memberships
    where memberships.group_id = target_group.id
      and memberships.user_id = current_user_id
  ) then
    current_join_state := 'joined';
  elsif current_member_count >= target_group.max_players then
    current_join_state := 'full';
  end if;

  return query
  select
    target_group.id,
    target_group.group_id,
    target_group.share_code,
    target_group.slug,
    target_group.name,
    target_group.rules,
    target_group.deadline,
    target_group.max_players,
    target_group.exact_score_points,
    target_group.correct_outcome_points,
    current_member_count,
    current_join_state;
end;
$$;

grant execute on function public.get_group_join_preview_by_share_code(text) to anon, authenticated;
