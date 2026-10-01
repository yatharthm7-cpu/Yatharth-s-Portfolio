# Portfolio content admin

The portfolio uses its own Supabase project, **Yatharth Portfolio** (`ccttomyjutpppemvtvfk`). It is separate from the Tapvora project's database, authentication, and storage. The public project URL and publishable key in `content-config.js` are safe to ship; never place a secret or service-role key in the browser.

Open `/admin/` on the deployed portfolio and request a sign-in link for `yatharth@scaleupbiz.co.in`. The project Auth Site URL is `https://scaleupbiz.co.in/admin/`. After opening the emailed link, add or edit a project, service, or FAQ, upload a project screenshot if needed, choose its order, then tick **Published on the website** and save. Unticking Published keeps the entry as a private draft. Public changes load on the website after refresh; no GitHub edit or Vercel rebuild is needed.

For the existing database, run `portfolio-add-faq.sql` once in the **Yatharth Portfolio** project's SQL Editor before using the FAQ editor. This extends the content type constraint and adds the six initial questions without changing existing projects or services. The portfolio displays its built-in FAQ while the database is unavailable or has no FAQ entries.

`portfolio-schema.sql` records the final schema, access policies, and image bucket configuration. `portfolio-seed.sql` contains the original three projects, three services, and six FAQs, with stable source keys to avoid duplicates if the seed is run again. The page retains its original built-in cards and FAQ if the content API is unavailable.

If the owner email changes, update the five policy references here and in `admin/admin.js`, then run `portfolio-update-owner-email.sql` once in the Supabase SQL Editor. That migration only drops and recreates the policies — it does not create or change an auth user, so also add the new address under Authentication → Users before signing in with it.

The database limits editing to the verified owner email through row-level security. The public client fetches published entries only. The `portfolio-images` bucket serves public portfolio images and permits uploads only from the owner. To add editable content types later, extend the table's `kind` constraint, the admin editor, and the public renderer together.
