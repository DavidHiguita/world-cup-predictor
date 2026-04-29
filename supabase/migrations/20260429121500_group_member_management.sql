create or replace function public.get_group_management_members(target_group_uuid uuid)
returns table (
  user_id uuid,
  role text,
  joined_at timestamptz,
  display_name text,
  email text
)
language plpgsql
security definer
set search_path = public, auth
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
      and memberships.role = 'owner'
  ) then
    raise exception 'GROUP_ACCESS_DENIED';
  end if;

  return query
  select
    memberships.user_id,
    memberships.role,
    memberships.joined_at,
    coalesce(
      nullif(users.raw_user_meta_data ->> 'full_name', ''),
      nullif(users.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(users.email, '@', 1), ''),
      left(memberships.user_id::text, 8)
    ) as display_name,
    users.email::text
  from public.group_memberships memberships
  left join auth.users users
    on users.id = memberships.user_id
  where memberships.group_id = target_group_uuid
  order by
    case when memberships.role = 'owner' then 0 else 1 end,
    memberships.joined_at asc,
    memberships.user_id asc;
end;
$$;

grant execute on function public.get_group_management_members(uuid) to authenticated;

create or replace function public.remove_group_member(target_group_uuid uuid, target_user_uuid uuid)
returns public.group_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  removed_membership public.group_memberships;
  target_membership public.group_memberships;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.group_memberships memberships
    where memberships.group_id = target_group_uuid
      and memberships.user_id = current_user_id
      and memberships.role = 'owner'
  ) then
    raise exception 'GROUP_ACCESS_DENIED';
  end if;

  select *
  into target_membership
  from public.group_memberships memberships
  where memberships.group_id = target_group_uuid
    and memberships.user_id = target_user_uuid;

  if not found then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  if target_membership.user_id = current_user_id or target_membership.role = 'owner' then
    raise exception 'OWNER_MEMBER_PROTECTED';
  end if;

  delete from public.predictions predictions
  where predictions.group_id = target_group_uuid
    and predictions.user_id = target_user_uuid;

  delete from public.group_memberships memberships
  where memberships.group_id = target_group_uuid
    and memberships.user_id = target_user_uuid
  returning * into removed_membership;

  if removed_membership.id is null then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  return removed_membership;
end;
$$;

grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
