-- Seed the six published entries already visible in the static portfolio.
insert into public.portfolio_entries
  (source_key, kind, title, subtitle, description, details, image_url, link_url, link_label, sort_order, published)
values
  ('shakti', 'project', 'Shakti Mathiya', 'Food & product catalog',
   'A home for traditional Indian snacks, with a browsable product catalog and direct WhatsApp enquiries.',
   jsonb_build_object('contribution', 'Complete website build', 'alt', 'Shakti Mathiya homepage screenshot'),
   'assets/work-shakti.jpg', 'https://shakti-mathiya.vercel.app/', 'View project', 1, true),
  ('anaya', 'project', 'Anaya’s Kitchen', 'Restaurant website',
   'A welcoming restaurant website bringing the menu, opening hours, location and WhatsApp ordering together.',
   jsonb_build_object('contribution', 'Complete website build', 'alt', 'Anaya’s Kitchen homepage screenshot'),
   'assets/work-anaya.jpg', 'https://anaya-kitchen.vercel.app/', 'View project', 2, true),
  ('anoobie', 'project', 'aNoobieCooKie', 'Minecraft & community portfolio',
   'A personal portfolio presenting Minecraft staffing experience, community services and ways to get in touch.',
   jsonb_build_object('contribution', 'Complete website build', 'alt', 'aNoobieCooKie homepage screenshot'),
   'assets/work-anoobie.jpg', 'https://anoobiecookie.vercel.app/', 'View project', 3, true),
  ('websites', 'service', 'Websites & Web Experiences', 'WEB',
   'A clear, considered home for your business online, shaped around your audience and what they need to do next.',
   jsonb_build_object('bullets', jsonb_build_array('Business websites & landing pages', 'Portfolios & website redesigns', 'Responsive layouts & custom interactions')),
   null, '#contact', 'Discuss your website', 1, true),
  ('marketing', 'service', 'Marketing & Sales Strategy', 'GROWTH',
   'Bring your message, content and sales approach into focus, with a practical plan for reaching the right people.',
   jsonb_build_object('bullets', jsonb_build_array('Social media content & campaign planning', 'Brand messaging & digital marketing', 'Offers, sales journeys & follow-up strategy')),
   null, '#contact', 'Plan your next move', 2, true),
  ('nfc', 'service', 'NFC & QR Experiences', 'CONNECT',
   'Make the step from an in-person interaction to a digital destination feel simple, with a tap or a scan.',
   jsonb_build_object('bullets', jsonb_build_array('Custom NFC cards & table standees', 'Review, menu & profile destinations', 'Branded QR artwork & link setup')),
   null, '#nfc', 'Explore Tapvora', 3, true)
on conflict (source_key) do nothing;
