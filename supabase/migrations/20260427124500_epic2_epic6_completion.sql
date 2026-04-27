create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  requested_at timestamptz not null default timezone('utc'::text, now()),
  scheduled_purge_at timestamptz not null,
  exclude_from_marketing boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'canceled', 'completed'))
);

create index if not exists idx_account_deletion_requests_user_id on public.account_deletion_requests (user_id);

alter table public.account_deletion_requests enable row level security;

drop policy if exists "users_can_view_own_account_deletion_requests" on public.account_deletion_requests;
create policy "users_can_view_own_account_deletion_requests"
on public.account_deletion_requests
for select
using (user_id = auth.uid());

create or replace function public.request_account_deletion()
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  deletion_request public.account_deletion_requests;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.account_deletion_requests (
    user_id,
    requested_at,
    scheduled_purge_at,
    exclude_from_marketing,
    status
  )
  values (
    current_user_id,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()) + interval '1 month',
    true,
    'pending'
  )
  on conflict (user_id) do update
  set
    requested_at = excluded.requested_at,
    scheduled_purge_at = excluded.scheduled_purge_at,
    exclude_from_marketing = true,
    status = 'pending'
  returning * into deletion_request;

  return deletion_request;
end;
$$;

grant execute on function public.request_account_deletion() to authenticated;

create or replace function public.get_group_join_preview_by_identifier(target_group_identifier text)
returns table (
  id uuid,
  group_id text,
  share_code text,
  slug text,
  name text,
  rules text,
  deadline timestamptz,
  max_players integer,
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
    current_member_count,
    current_join_state;
end;
$$;

grant execute on function public.get_group_join_preview_by_identifier(text) to anon, authenticated;

create or replace function public.get_group_join_preview_by_share_code(target_group_share_code text)
returns table (
  id uuid,
  group_id text,
  share_code text,
  slug text,
  name text,
  rules text,
  deadline timestamptz,
  max_players integer,
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
    current_member_count,
    current_join_state;
end;
$$;

grant execute on function public.get_group_join_preview_by_share_code(text) to anon, authenticated;

create or replace function public.join_group_with_identifier(target_group_identifier text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_group public.groups;
  current_member_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into target_group
  from public.groups groups
  where groups.group_id = target_group_identifier;

  if not found then
    raise exception 'GROUP_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.group_memberships memberships
    where memberships.group_id = target_group.id
      and memberships.user_id = current_user_id
  ) then
    raise exception 'GROUP_ALREADY_JOINED';
  end if;

  select count(*)::integer
  into current_member_count
  from public.group_memberships memberships
  where memberships.group_id = target_group.id;

  if current_member_count >= target_group.max_players then
    raise exception 'GROUP_FULL';
  end if;

  insert into public.group_memberships (group_id, user_id, role)
  values (target_group.id, current_user_id, 'member');

  return target_group;
exception
  when unique_violation then
    raise exception 'GROUP_ALREADY_JOINED';
end;
$$;

grant execute on function public.join_group_with_identifier(text) to authenticated;

create or replace function public.join_group_with_share_code(target_group_share_code text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_group public.groups;
  current_member_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into target_group
  from public.groups groups
  where groups.share_code = target_group_share_code;

  if not found then
    raise exception 'GROUP_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.group_memberships memberships
    where memberships.group_id = target_group.id
      and memberships.user_id = current_user_id
  ) then
    raise exception 'GROUP_ALREADY_JOINED';
  end if;

  select count(*)::integer
  into current_member_count
  from public.group_memberships memberships
  where memberships.group_id = target_group.id;

  if current_member_count >= target_group.max_players then
    raise exception 'GROUP_FULL';
  end if;

  insert into public.group_memberships (group_id, user_id, role)
  values (target_group.id, current_user_id, 'member');

  return target_group;
exception
  when unique_violation then
    raise exception 'GROUP_ALREADY_JOINED';
end;
$$;

grant execute on function public.join_group_with_share_code(text) to authenticated;
