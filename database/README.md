# Portfolio content admin

The portfolio uses its own Supabase project, **Yatharth Portfolio** (`ccttomyjutpppemvtvfk`). It is separate from the Tapvora project's database, authentication, and storage. The public project URL and publishable key in `content-config.js` are safe to ship; never place a secret or service-role key in the browser.

Open `/admin/` on the deployed portfolio and request a sign-in link for `yatharth@scaleupbiz.co.in`. The project Auth Site URL is `https://scaleupbiz.co.in/admin/`. After opening the emailed link, add or edit a project, service, or FAQ, upload a project screenshot if needed, choose its order, then tick **Published on the website** and save. Unticking Published keeps the entry as a private draft. Public changes load on the website after refresh; no GitHub edit or Vercel rebuild is needed.

For the existing database, run `portfolio-add-faq.sql` once in the **Yatharth Portfolio** project's SQL Editor before using the FAQ editor. This extends the content type constraint and adds the six initial questions without changing existing projects or services. The portfolio displays its built-in FAQ while the database is unavailable or has no FAQ entries.

`portfolio-schema.sql` records the final schema, access policies, and image bucket configuration. `portfolio-seed.sql` contains the original three projects, three services, and six FAQs, with stable source keys to avoid duplicates if the seed is run again. The page retains its original built-in cards and FAQ if the content API is unavailable.

If the owner email changes, update the five policy references here and in `admin/admin.js`, then run `portfolio-update-owner-email.sql` once in the Supabase SQL Editor. That migration only drops and recreates the policies — it does not create or change an auth user, so also add the new address under Authentication → Users before signing in with it.

## Client reviews

Run `portfolio-reviews.sql` once in the same project's SQL Editor before using the review system. It creates the `reviews` table with a `pending`/`approved`/`rejected` status, an `updated_at` trigger, row-level security, and column grants: anonymous visitors may select only the public fields of approved rows (never `client_email`), and there is deliberately no anon insert policy — submissions arrive only through the `/api/reviews` Vercel function, which validates them server-side and writes them with a current secret key (`SUPABASE_SECRET_KEY`). The older `SUPABASE_SERVICE_ROLE_KEY` remains a temporary fallback for an existing deployment. The owner reads and moderates every field in the dashboard's **Reviews** tab through their own authenticated session; approving sets `status='approved'` and `published_at`, which is what makes a row visible to the public query the website uses.

The database limits editing to the verified owner email through row-level security. The public client fetches published entries only. The `portfolio-images` bucket serves public portfolio images and permits uploads only from the owner. To add editable content types later, extend the table's `kind` constraint, the admin editor, and the public renderer together.
