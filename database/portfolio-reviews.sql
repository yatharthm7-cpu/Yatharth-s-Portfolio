-- Client reviews for the portfolio "Client words" section.
-- Apply once in the Yatharth Portfolio project's SQL Editor (ccttomyjutpppemvtvfk).
-- Public visitors submit only through the /api/reviews Vercel function, which uses the
-- service-role key server-side. There is deliberately no anon insert policy, so the
-- publishable key alone can never write a review.
-- Public reads return only approved rows, and column grants below exclude client_email,
-- so an email address can never leave the database through the public query.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_name text not null check (char_length(client_name) between 1 and 80),
  business_name text check (business_name is null or char_length(business_name) between 1 and 100),
  project_name text check (project_name is null or char_length(project_name) between 1 and 100),
  rating integer not null check (rating between 1 and 5),
  review_text text not null check (char_length(review_text) between 40 and 700),
  client_email text not null check (char_length(client_email) between 3 and 254),
  consent_to_publish boolean not null default false check (consent_to_publish = true),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  verified_client boolean not null default false,
  display_order integer not null default 0 check (display_order between 0 and 999),
  published_at timestamptz
);

comment on table public.reviews is 'Client-submitted reviews. pending until the owner approves them; client_email is private and never granted to anon.';

create index reviews_public_listing on public.reviews (display_order, published_at desc)
  where status = 'approved';
create index reviews_moderation on public.reviews (status, created_at);

-- Keep updated_at truthful no matter which surface performs the moderation.
create or replace function public.set_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_reviews_updated_at();

alter table public.reviews enable row level security;

-- Public visitors may read approved reviews only. The owner reads every status.
create policy "Approved reviews are public, owner reads all"
  on public.reviews for select to anon, authenticated
  using (status = 'approved' or ((select auth.jwt())->>'email') = 'yatharth@scaleupbiz.co.in');

-- Public submissions never arrive here directly; the /api/reviews function writes with
-- the service role, which bypasses RLS. The owner may still add a review by hand.
create policy "Owner can add reviews"
  on public.reviews for insert to authenticated
  with check (((select auth.jwt())->>'email') = 'yatharth@scaleupbiz.co.in');

create policy "Owner can moderate reviews"
  on public.reviews for update to authenticated
  using (((select auth.jwt())->>'email') = 'yatharth@scaleupbiz.co.in')
  with check (((select auth.jwt())->>'email') = 'yatharth@scaleupbiz.co.in');

create policy "Owner can remove reviews"
  on public.reviews for delete to authenticated
  using (((select auth.jwt())->>'email') = 'yatharth@scaleupbiz.co.in');

-- Roles start with no table privileges in this migration. The anon role receives select
-- on public fields only, so client_email is unreadable through any public query,
-- including select=*.
revoke all on public.reviews from anon, authenticated, service_role;

grant select (
  id,
  client_name,
  business_name,
  project_name,
  rating,
  review_text,
  verified_client,
  published_at,
  display_order
) on public.reviews to anon;

grant select, insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
