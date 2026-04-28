create or replace function public.get_group_member_count(target_group_uuid uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  member_count integer := 0;
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
    raise exception 'GROUP_FORBIDDEN';
  end if;

  select count(*)::integer
  into member_count
  from public.group_memberships memberships
  where memberships.group_id = target_group_uuid;

  return member_count;
end;
$$;

grant execute on function public.get_group_member_count(uuid) to authenticated;
