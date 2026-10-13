# Site navigation — one configuration for ten locales

- Site is hosted at https://global.rentbikehanoi.com/ with CNAME protected.
- The 4 Hub / 8 Supporting hierarchy is taken from `data/seo/master-matrix.json`.
- Single renderer: `scripts/navigation.mjs`; CSS: `assets/navigation.css`.
- Header and footer share the same content hierarchy and are localized.
- Existing published pages (/ and all locale roots/checklists and legal pages) remain stable.
- IDEA categories are displayed only as disabled, clearly marked labels and must never generate a link, 404 page, sitemap entry or hreflang reference. A future publication process may activate a URL only after research, QA and the actual HTML page exist.
- Edit once, regenerate all: `node scripts/build.mjs`.
- QA: `node scripts/build.mjs --check && node scripts/seo/validate-plan.mjs && node scripts/nav-qa.mjs`.
