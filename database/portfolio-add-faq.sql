-- Run once in the existing Yatharth Portfolio Supabase SQL Editor before editing FAQs in /admin/.
-- Existing project and service rows remain unchanged.
alter table public.portfolio_entries drop constraint if exists portfolio_entries_kind_check;
alter table public.portfolio_entries add constraint portfolio_entries_kind_check check (kind in ('project', 'service', 'faq'));

insert into public.portfolio_entries
  (source_key, kind, title, subtitle, description, details, image_url, link_url, link_label, sort_order, published)
values
  ('faq-timeline', 'faq', 'How long does a website take to build?', '01 / Websites',
   E'Most business websites take two to four weeks from our first conversation to launch. Landing pages can be ready sooner, and larger projects with catalogues or custom interactions usually take five to eight weeks.\n\nYou see the work in progress and give feedback at each stage, so nothing arrives as a surprise at the end.',
   jsonb_build_object('alt', ''), null, null, '', 1, true),
  ('faq-mobile', 'faq', 'Will the website work properly on a phone?', '01 / Websites',
   E'Yes. Every site I build is laid out to work across screen sizes, and it’s tested on phones, tablets and desktops before launch — not as an afterthought.\n\nIf most of your customers find you on a phone, that’s where we focus first.',
   jsonb_build_object('alt', ''), null, null, '', 2, true),
  ('faq-social', 'faq', 'Do you run my social media, or plan it with me?', '02 / Growth',
   E'Either, depending on what suits the business. I can shape the content plan, messaging and campaign direction for your team to run, or handle the ongoing work alongside you.\n\nWe agree on which it is before starting, so you know exactly what you’re getting.',
   jsonb_build_object('alt', ''), null, null, '', 3, true),
  ('faq-results', 'faq', 'How will I know if the marketing is working?', '02 / Growth',
   E'We settle on what to measure before we begin — usually enquiries, calls, messages or sales, rather than follower counts — and review those numbers together as the work progresses.\n\nIf something isn’t producing results, that’s what the plan is there to fix.',
   jsonb_build_object('alt', ''), null, null, '', 4, true),
  ('faq-card', 'faq', 'What does a Tapvora card actually do?', '03 / Tapvora',
   E'It takes a customer straight to a destination you choose — most often your Google review page — with a tap of the card or a scan of its QR code. No typing, no searching.\n\nThe card and standee carry your branding, so it looks like part of your business rather than a generic link.',
   jsonb_build_object('alt', ''), null, null, '', 5, true),
  ('faq-app', 'faq', 'Do my customers need an app to use the card?', '03 / Tapvora',
   E'No. Both the NFC tap and the QR scan open the link using what’s already built into the phone, so nothing needs to be installed first.\n\nThat matters most for older or lower-end phones, where asking customers to download something usually means they don’t.',
   jsonb_build_object('alt', ''), null, null, '', 6, true)
on conflict (source_key) do nothing;
