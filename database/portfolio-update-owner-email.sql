-- Point portfolio ownership at the new business email.
-- Run once in the Supabase SQL Editor. Safe to re-run: each policy is dropped
-- before it is recreated, so no "already exists" error.
-- This does not create or change any auth user — see database/README.md.

begin;

drop policy if exists "Published entries or owner drafts can be read" on public.portfolio_entries;
drop policy if exists "Owner can create portfolio entries" on public.portfolio_entries;
drop policy if exists "Owner can update portfolio entries" on public.portfolio_entries;
drop policy if exists "Owner can remove portfolio entries" on public.portfolio_entries;
drop policy if exists "Owner can upload project images" on storage.objects;

create policy "Published entries or owner drafts can be read"
  on public.portfolio_entries for select to anon, authenticated
  using (published = true or ((select auth.jwt())->>'email') = 'yatharth@scaleupbiz.co.in');

create policy "Owner can create portfolio entries"
  on public.portfolio_entries for insert to authenticated
  with check (((select auth.jwt())->>'email') = 'yatharth@scaleupbiz.co.in');

create policy "Owner can update portfolio entries"
  on public.portfolio_entries for update to authenticated
  using (((select auth.jwt())->>'email') = 'yatharth@scaleupbiz.co.in')
  with check (((select auth.jwt())->>'email') = 'yatharth@scaleupbiz.co.in');

create policy "Owner can remove portfolio entries"
  on public.portfolio_entries for delete to authenticated
  using (((select auth.jwt())->>'email') = 'yatharth@scaleupbiz.co.in');

create policy "Owner can upload project images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio-images'
    and (storage.foldername(name))[1] = 'projects'
    and ((select auth.jwt())->>'email') = 'yatharth@scaleupbiz.co.in'
  );

commit;
