# ScaleUpBiz search setup

Production URL: https://scaleupbiz.co.in/

The homepage includes descriptive metadata, one canonical URL, the existing sharing image, and linked Organization, Person, WebSite and WebPage data. The five services are described in visible HTML and in the organization's offer catalog. No ratings, client results, pricing, addresses or awards were invented.

`robots.txt` allows crawling and points to `sitemap.xml`. The sitemap contains the homepage only: section anchors are not separate pages. No fixed last-modified date is used because the admin can update published content independently of a deployment.

The admin keeps its HTML noindex directive and gets an X-Robots-Tag header. Robots does not block admin crawling, allowing search engines to see that directive. Database and review artifacts also receive noindex headers. These directives do not replace authentication or database access controls.

Vercel permanently redirects the www and production vercel.app aliases to the main domain, retaining paths and query parameters. `/index.html` redirects to `/`. The custom `404.html` must return HTTP 404 for missing URLs.

The latest supplied ScaleUpBiz mark is used for the crawlable PNG favicon and organization logo. The Tapvora card has 640px and 1004px WebP alternatives, with the original PNG retained as a fallback.

## Indexing and measurement

1. Verify `https://scaleupbiz.co.in/` in [Google Search Console](https://search.google.com/search-console). A URL-prefix property can use Google's supplied HTML verification file or meta tag. A domain property requires the supplied DNS record. Do not add a guessed verification code.
2. Submit `https://scaleupbiz.co.in/sitemap.xml` in Sitemaps.
3. Inspect the homepage URL and request indexing. Inspect the rendered page to check that the published portfolio content is visible.
4. Review indexing reports and search queries after Google processes the site. Keep project descriptions and services accurate as content changes.

Search Console verification and sitemap submission have not been performed by this code change. Search features and rankings remain Google's decision. Future service or case-study pages should contain substantive original content, use their own canonical URL, and be linked from the homepage and sitemap.

## Checks

Run `python review/verify-seo.py` and the existing portfolio, content, admin-routing and testimonial checks. After deployment, check robots/sitemap, favicon, WebP alternatives, canonical redirects, admin response headers and a genuine missing URL. Check the desktop and mobile page for image loading and horizontal overflow.
