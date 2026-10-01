-- Portfolio content only. Apply to a dedicated Supabase project, not Tapvora's database.
create table public.portfolio_entries (
  id uuid primary key default gen_random_uuid(),
  source_key text unique,
  kind text not null check (kind in ('project', 'service', 'faq')),
  title text not null check (length(title) between 1 and 100),
  subtitle text not null default '' check (length(subtitle) <= 60),
  description text not null default '' check (length(description) <= 500),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  image_url text,
  link_url text,
  link_label text not null default '' check (length(link_label) <= 50),
  sort_order integer not null default 1 check (sort_order between 1 and 999),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index portfolio_entries_public_order on public.portfolio_entries (kind, sort_order)
  where published = true;

alter table public.portfolio_entries enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.portfolio_entries to anon;
grant select, insert, update, delete on public.portfolio_entries to authenticated;

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-images', 'portfolio-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']);

create policy "Owner can upload project images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio-images'
    and (storage.foldername(name))[1] = 'projects'
    and ((select auth.jwt())->>'email') = 'yatharth@scaleupbiz.co.in'
  );
