# Cursor prompt: Drivers Voice image integration

Copy the `public` folder from this pack into the root of the existing Next.js repository, merging folders. Then give Cursor the following instructions.

```text
Integrate the supplied Drivers Voice illustration pack into the existing Next.js website. These instructions are based on the actual pages in pages.zip. Make the code changes; do not simply explain them.

SOURCE AND SCOPE
- The pack contains public/illustrations/drivers-voice/*.webp and image-map.json.
- Inspect the full repository before editing. The uploaded pages folder alone is not the full application. Locate app/ or src/app/, components/chrome, and the existing image components.
- Preserve all existing copy, form behaviour, authentication, authorisation, privacy controls, server rendering and data queries.
- Use only the supplied local illustrations. Do not fetch remote stock images or fabricate missing assets.
- Copy the supplied illustrations to the repository's public/illustrations/drivers-voice/ directory. Browser src paths start /illustrations/drivers-voice/ (never /public/).
- All people are fictional. No image documents a real event, committee appointment, completed action, survey result or official endorsement.

EXISTING HOMEPAGE
- The current homepage imports next/image and has a figure using src="/illustrations/hero.svg", fill, priority, unoptimized, and object-[center_62%].
- Replace the asset with /illustrations/drivers-voice/home.webp.
- Keep the existing headline, introduction, calls to action and fictional-image figcaption.
- The supplied image is 1672x941. Use a responsive aspect-video or similarly wide container, not the current tight 4/3 or 5/4 crop. Do not crop out the people to accommodate empty space.
- Remove the obsolete SVG-only unoptimized prop. Use the image optimisation supported by the installed Next.js version.
- Keep the text beside the image on wide screens and stacked on mobile. Do not add a second headline inside the image.

REUSABLE COMPONENTS
- Create a server-compatible PageIllustration component accepting asset key, variant, className and optional caption.
- Create a typed asset registry using the descriptions, filenames and focal points in image-map.json.
- Use next/image with explicit width/height or fill inside a positioned aspect-ratio container. Always supply accurate sizes. Use object-fit: contain by default to preserve whole illustrations, with a matching background and rounded corners.
- Use the project's existing rounded-dv, shadow-dv, navy, teal and CSS variables. Do not restyle the entire website.
- Public banner variant: after PageIntro and before page content, one image, maximum width matching the existing max-w-3xl content column, wide natural aspect ratio, margin-top approximately 1.5rem.
- Dashboard variant: compact illustration, max-height 144px on desktop and 96px on mobile, beside the page introduction when space permits. Keep tables and primary controls high on screen.
- Form variant: desktop side panel up to 240px wide; on mobile use a small 72px decorative thumbnail or hide the decoration so the form stays prominent.
- Detail/admin variant: small 48-64px thumbnail in the introductory area. No large repeated banners on data-heavy screens.
- Legal variant: restrained 160-220px-wide illustration floated alongside the intro on desktop, stacked small on mobile. Do not distract from the legal text.
- Decorative repeated instances must have alt="". Informative public illustrations use concise descriptive alt text from the registry. Do not use filenames as alt text.
- Keep the existing homepage fictional-image caption. Public illustrations of people should have a discreet caption, "Conceptual illustration. People are fictional; this does not depict a real event." Do not add repetitive captions to every internal thumbnail.
- Avoid adding duplicate h1 tags, duplicate main elements or a client-side component merely to select an image.

PAGE ASSIGNMENTS
Use every exact route and variant in image-map.json, which maps all page.tsx files in the supplied ZIP. In summary:
- /: home.webp, existing hero replacement.
- /our-plan: our-plan.webp, public banner.
- /priorities: priorities.webp, public banner.
- /updates and /updates/[slug]: updates.webp, section banner. On article pages label it as generic section artwork; do not imply it illustrates the article's real events. Do not override an existing legitimate article-specific image.
- /about: about.webp, public banner; no implication that these people are the actual committee.
- /code-of-conduct: conduct.webp, restrained legal variant.
- /privacy: privacy.webp, restrained legal variant. Do not add security guarantees or certification claims.
- /contact: contact.webp, form variant; preserve disabled collection state and QuestionForm.
- /sign-in: privacy.webp, form variant; do not move or obstruct authentication controls.
- /portal: home.webp, compact dashboard variant.
- /portal/reports: records.webp, compact dashboard variant.
- /portal/reports/new and /portal/incidents/new: records.webp, form variant. Preserve all official-reporting and emergency instructions.
- /portal/reports/[id]: records.webp, small detail thumbnail only.
- /portal/priorities: priorities.webp, compact variant; this is consultation artwork, not a formal ballot or results graphic.
- /portal/actions: our-plan.webp, compact variant.
- /portal/updates and /portal/updates/[slug]: updates.webp, compact/detail variants.
- /portal/volunteer: about.webp, form variant.
- /portal/questions: contact.webp, form variant.
- /portal/account: privacy.webp, small detail thumbnail.
- /admin: records.webp, compact dashboard variant.
- /admin/actions and /admin/process-tracker: our-plan.webp, small header thumbnail.
- /admin/reports, /admin/reports/[id] and /admin/audit: records.webp, small header thumbnail.
- /admin/members and /admin/volunteers: about.webp, small header thumbnail.
- /admin/surveys: priorities.webp, small header thumbnail.
- /admin/updates: updates.webp, small header thumbnail.
- /admin/settings: privacy.webp, small header thumbnail.
- Use contact.webp as a small illustration in not-found.tsx if it improves the existing composition. It is optional for error/loading states.
- API route handlers, auth callbacks, sitemap.ts and robots.ts do not need images.

NEXT.JS AND PERFORMANCE
- Keep images local and use the installed Next.js Image API. Do not upgrade dependencies merely for this change.
- Only the actual homepage LCP image should receive elevated loading priority. Other images should normally lazy-load.
- Do not apply pathname logic in a global layout that adds the same large banner to every page.
- If images are added through nested layouts, ensure each route renders the intended illustration only once.
- Public asset files contain no private data and may be publicly cached. Preserve private-page no-store behaviour and all existing access rules.
- No image URLs derived from user input, no report data in alt text or captions, and no change to private-page search-indexing rules.

VALIDATION
- Confirm every referenced asset exists and no old hero.svg reference remains on the homepage.
- Check at 360px, 768px and 1440px. Images must not overflow, distort, cause layout shift or obscure controls.
- Verify representative public, form, dashboard, detail and admin pages; only use configured test/demo accounts.
- Run available type checks, linting and production build. Clearly distinguish checks run from checks unavailable.
- Report the modified files, routes covered and any routes needing attention. Do not invent a successful full build if only the partial pages ZIP is available.
```

## Asset note

The artwork is conceptual. It depicts fictional people and generic objects, not actual staff, workplace events, meetings, documents, survey results or official security certifications.

The images were created for this Drivers Voice design. Their navy, teal, off-white and amber palette matches the supplied globals.css. Files are web-optimised WebP; no text is baked into the artwork.
