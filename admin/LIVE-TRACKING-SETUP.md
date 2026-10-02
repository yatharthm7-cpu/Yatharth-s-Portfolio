# Private Google Analytics report connection

The dashboard reads property **557081748**, stream **15941294569**. Collection uses `G-3SM0E2QYPQ`. Report access uses Vercel OIDC and Google Workload Identity Federation; no downloadable service-account key or private-key environment variable is required.

## Current configuration

- Google Cloud project: `scaleupbiz-analytics`, number `979369476930`.
- Reader: `scaleupbiz-analytics-reader@scaleupbiz-analytics.iam.gserviceaccount.com`.
- Reader has **Viewer** access to the ScaleUpBiz Website Analytics property only, and no Cloud project roles or domain-wide delegation.
- Enable Analytics Data API, IAM Service Account Credentials API and Security Token Service API in this project.
- Workload identity pool: `scaleupbiz-vercel`; provider: `vercel`.
- Issuer: `https://oidc.vercel.com/yatharthm7-cpus-projects`.
- Allowed audience: `https://vercel.com/yatharthm7-cpus-projects`.
- Attribute mapping: `google.subject = assertion.sub`.
- Attribute condition: `assertion.sub == 'owner:yatharthm7-cpus-projects:project:scaleupbiz:environment:production'`.
- Grant **Workload Identity User** on the reader service account only to:
  `principal://iam.googleapis.com/projects/979369476930/locations/global/workloadIdentityPools/scaleupbiz-vercel/subject/owner:yatharthm7-cpus-projects:project:scaleupbiz:environment:production`.

The non-secret federation audience and reader email are fixed in `api/analytics.js`. Changes to team/project/pool identifiers require updating both Google trust and that server configuration. Preview and local deployments intentionally cannot read production reports. The organization restriction on creating service-account keys remains enabled.

## Verification

1. Deploy the committed code to Vercel production.
2. Sign in at `https://scaleupbiz.co.in/admin/`. Confirm a successful Google Analytics update.
3. Visit a public page in another tab, accept analytics, and check that the report reflects real activity after Google's processing delay. Declined consent and blockers reduce observed traffic.
4. Confirm unauthenticated `/api/analytics` requests return 401, and non-owner accounts cannot read reports.

The function verifies the existing Supabase session with Auth on every request, including cached reports, and permits only the confirmed owner email. Google's official client exchanges the current runtime identity for a short-lived read-only Analytics token. Private tokens remain server-side, are never logged, and never appear in website files, GitHub or chat. No credential file is downloaded or uploaded.

Reports use fixed property/stream IDs, read-only scope, no shared HTTP cache and a 25-second cache inside each warm function instance. Multiple instances can make separate requests; this is not a global rate limiter. Dashboard auto-refresh runs every 30 seconds while visible and can be switched off. Connection failures show dashes or clearly labelled stale values instead of invented zero counts. Contact clicks remain separate from successful enquiries.

Reference: https://vercel.com/docs/oidc/gcp
