# Private Google Analytics report connection

The dashboard reads property **557081748**, stream **15941294569**. Collection already works with tag `G-3SM0E2QYPQ`. Reading reports requires a separate Google Analytics Data API credential.

1. In a separate Google Cloud project for ScaleUpBiz, enable **Google Analytics Data API** (`analyticsdata.googleapis.com`). This feature does not need a paid Cloud resource, a trial or a billing subscription.
2. Create a service account named `scaleupbiz-analytics-reader`. Do not give it Cloud project roles or domain-wide delegation.
3. In Google Analytics, open ScaleUpBiz Website → Admin → Property access management. Add the service account email with **Viewer** access to this property only.
4. Create a JSON key for the service account. Treat the downloaded file as a secret.
5. Add the full JSON contents as a **Sensitive** Vercel Production environment variable named `GA_SERVICE_ACCOUNT_JSON`. Do not add it to HTML, JavaScript, GitHub or a chat. Redeploy after adding the variable.
6. Sign in at `https://scaleupbiz.co.in/admin/`. Verify the dashboard shows a successful update. Visit a public page in a separate browser, accept analytics, and check that Google activity appears after its processing delay.

The `/api/analytics` function verifies the existing Supabase session with Auth on every request and permits only the confirmed owner email. Google credentials remain server-side. Reports use read-only scope, fixed property/stream IDs, no shared HTTP cache and a 25-second cache inside each warm function instance. Multiple instances can each make their own Google requests; this cache is not a global rate limiter. Auto-refresh pauses when the tab is hidden and can be switched off.

The dashboard labels the 5/30-minute windows, consent limitation and last successful update. An unavailable connection shows a setup or error state with dashes, rather than invented zeros. Contact clicks are reported separately from enquiries. Existing CMS operations and visitor consent remain unchanged.
