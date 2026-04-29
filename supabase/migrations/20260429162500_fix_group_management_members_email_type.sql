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
