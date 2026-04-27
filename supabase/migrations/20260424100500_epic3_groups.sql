create extension if not exists pgcrypto;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  group_id text not null unique,
  share_code text not null unique,
  name text not null,
  rules text not null,
  deadline timestamptz not null,
  max_players integer not null check (max_players between 4 and 200),
  scoring_mode text not null default 'winner_only' check (scoring_mode in ('winner_only')),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default timezone('utc'::text, now()),
  unique (group_id, user_id)
);

create index if not exists idx_groups_owner_user_id on public.groups (owner_user_id);
create index if not exists idx_group_memberships_user_id on public.group_memberships (user_id);

alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;

drop policy if exists "users_can_view_groups_they_belong_to" on public.groups;
create policy "users_can_view_groups_they_belong_to"
on public.groups
for select
using (
  exists (
    select 1
    from public.group_memberships memberships
    where memberships.group_id = groups.id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "users_can_view_their_memberships" on public.group_memberships;
create policy "users_can_view_their_memberships"
on public.group_memberships
for select
using (user_id = auth.uid());

create or replace function public.create_group_with_owner(
  group_slug text,
  group_identifier text,
  group_share_code text,
  group_name text,
  group_rules text,
  group_deadline timestamptz,
  group_max_players integer,
  group_scoring_mode text default 'winner_only'
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
