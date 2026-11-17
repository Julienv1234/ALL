-- ALL: cloud storage for one person's data.
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.

create table if not exists public.user_state (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Everyone only ever sees and changes their own row.
alter table public.user_state enable row level security;

drop policy if exists "own row: read" on public.user_state;
drop policy if exists "own row: insert" on public.user_state;
drop policy if exists "own row: update" on public.user_state;
drop policy if exists "own row: delete" on public.user_state;
drop policy if exists "two-step when turned on" on public.user_state;

create policy "own row: read" on public.user_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own row: insert" on public.user_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own row: update" on public.user_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own row: delete" on public.user_state
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Once two-step verification is on, the data only opens after the code was entered.
create policy "two-step when turned on" on public.user_state
  as restrictive to authenticated
  using (
    array[(select auth.jwt() ->> 'aal')] <@ (
      select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
      from auth.mfa_factors
      where (select auth.uid()) = user_id and status = 'verified'
    )
  );

-- Keep updated_at honest: the database sets it, not the browser.
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_state_touch on public.user_state;
create trigger user_state_touch before insert or update on public.user_state
  for each row execute function public.touch_updated_at();
