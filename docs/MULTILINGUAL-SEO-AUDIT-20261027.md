# Multilingual SEO audit, 2026-10-27

Full audit of every generated page of https://global.rentbikehanoi.com/ in the 10 locales (vi, en, de, fr, es, nl, zh, pt, ko, ja). It is a read-only audit of the HTML, sitemaps and Matrix. It says nothing about Google indexation, rankings, traffic or AI citations; none of those were measured.

## Evidence

| Check | Commit | Result |
|---|---|---|
| Live Markup QA, every PUBLISHED URL plus `/search/` and `/404.html`, deployed HTML compared byte for byte with the committed build (run 40554474870) | `b8a0115d` | `checked 1070, identical 1070, mismatched 0` |
| Post-Publish Live HTTP QA: status, lang, canonical, sitemap, robots, 404, Search, frozen SEO fingerprints, NAP / business schema (run 40554461970) | `b8a0115d` | PASS |
| `node scripts/build.mjs --check` | `f70d2e04` | 1,097 static files verified |
| `node scripts/seo/seo-guard.mjs` | `f70d2e04` | PASS: 1,068 frozen URLs, 1,068 published, 3,296 planned URLs guarded, 0 FAIL, 193 WARN (all `ANCHOR_DIVERSITY`) |
| `node scripts/seo/fact-guard.mjs` | `f70d2e04` | PASS, 0 FAIL |
| `node scripts/nav-qa.mjs` | `f70d2e04` | PASS: 10 locales, 4 Hubs and 8 child labels each, zero IDEA hyperlinks |
| `node scripts/seo/validate-plan.mjs` | `f70d2e04` | Matrix valid: 2,130 rows, 1,068 published |
| `node scripts/seo/audit-static.mjs --fail-p0` | `f70d2e04` | 0 P0; 1 P1, a false positive fixed in this PR (see below) |
| `node scripts/seo/audit-ai-search.mjs` | `f70d2e04` | 1,068 valid schema graphs |
| `node scripts/seo/language-audit.mjs` (new, this PR) | `f70d2e04` | PASS: 1,070 pages, 0 FAIL, 0 WARN |

The live run proves that the deployed site is the committed build. The repository checks below therefore describe production at `b8a0115d`.

## URL inventory

The inventory was reconciled from four sources: the Matrix, the generated HTML, the sitemap index and its shards, and the internal link graph.

| | root | vi | en | de | fr | es | nl | zh | pt | ko | ja | total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| HTML pages | 7 | 91 | 97 | 238 | 96 | 86 | 91 | 91 | 91 | 91 | 91 | 1,070 |

- Matrix PUBLISHED rows: 1,068. Every one has its page, and every one is in exactly one sitemap shard of its own locale (`sitemap-main.xml` for `/`, `/about/`, `/contact/`, `/privacy/`, `/terms/`). The sitemap index lists 11 shards with 1,068 URLs and no duplicates.
- The 2 pages outside the sitemap are `/search/` and `/404.html`, both `noindex,follow` by design.
- No IDEA or planned URL has a page, a sitemap entry, a hreflang annotation or an inbound link (3,296 planned URLs guarded).
- Internal links: 0 broken, 0 links to unpublished URLs.

## Language signals (B1 1)

- `<html lang>` matches the locale of the path on all 1,070 pages. It equals `content/locales.json` → `htmlLang`.
- Body language was checked with deterministic script and function-word counts on the visible main text, without navigation, header, footer, code or the source list. The declared language matched on 1,063 of 1,063 locale pages: de 238/238, en 97/97, es 86/86, fr 96/96, ja 91/91, ko 91/91, nl 91/91, pt 91/91, vi 91/91, zh 91/91. No German article is declared as English, and no page body is in another language.
- Vietnamese text on foreign-language pages occurs only in the source lists. Sources are cited by their original titles, for example a Vietnamese court journal or a decree, which is correct citation practice. Outside the source lists, no page has a run of 12 or more Vietnamese words.
- `zh-CN` is kept. All 91 zh pages are written in Simplified Chinese: a character sample found 0 Traditional-only characters against 42,226 Simplified-only ones. `htmlLang`, the hreflang code of `/zh/` and the `inLanguage` of `/` all say `zh-CN`, so the region variant matches the content and the audience the site writes for. Changing it would rewrite 91 frozen fingerprints without an SEO benefit.
- No other locale declares a region variant (`pt`, `es`, `en` and the rest are bare language codes), so the site claims no `pt-BR`, `en-US` or similar audience it does not target.

## hreflang (B1 2)

- 21 pages carry hreflang: `/` (10 languages plus `x-default` to itself), the 10 locale homes, and the 10 `/xx/checklist/` pages, which are true translations of each other.
- Every annotation is absolute, has a valid code equal to the target locale's `htmlLang`, and points at a live, indexable, self-canonical page. Every one is reciprocal, and every page lists itself. `/` is the language selector and carries only `x-default` for itself, which is correct.
- No Hub or Supporting article carries hreflang. These articles are written natively per locale; they are not translations of each other. AGENTS.md forbids them to auto-claim hreflang, and hreflang is a frozen fingerprint field. Pages without an equivalent therefore have no alternates, as recommended.

## Canonical (B1 3)

- Exactly one canonical tag on every indexable page, self-referencing, `https://global.rentbikehanoi.com` plus the page path. No page is canonicalised to another language.
- `og:url` equals the canonical on every page.

## Open Graph and structured data (B1 4)

- `og:locale` is not used anywhere. It needs a language_TERRITORY value (`de_DE`, `pt_PT` or `pt_BR` …), and the site does not target a territory for most languages. Adding it would claim audiences the site does not serve, so it stays absent.
- Every JSON-LD `inLanguage` equals the page's `<html lang>`. The only list is the multilingual `WebSite` entity of `/`, which names the 10 site languages.
- All JSON-LD parses. Breadcrumbs point only at existing pages; Pillars and checklists start at `/` (Global) by design. No LocalBusiness, AutoRental or other business type appears while `publication.business_schema_approved` is false.

## Sitemaps (B1 5)

- The sitemap index has 10 locale shards plus `sitemap-main.xml`. Each shard contains only PUBLISHED, indexable, self-canonical URLs of its own locale.
- No unpublished, noindex, redirecting or missing URL appears in any shard, and no URL appears twice.

## Findings fixed in this PR

1. `scripts/seo/audit-static.mjs` reported `BROKEN_INTERNAL_LINK` for `/` → `/hero-hanoi.webp`. That is the `<link rel="preload">` of the hero image, which exists. Root-level static files are now treated as assets: they are checked for existence and not looked up as pages.
2. New `scripts/seo/language-audit.mjs` adds the language checks above as a permanent read-only guard. It runs in `qa.yml` with `--fail` and is covered by `tests/language-audit.test.mjs`, which uses synthetic wrong-language pages and runs over the committed site.

## Warnings left as they are

- `ANCHOR_DIVERSITY` (193 WARN, seo-guard): the related-guide lists link to a page with its full title as anchor, so 9–11 pages share an identical anchor. The anchors are descriptive and in the page language; this is an optimisation note, not an error.
- AI-search readiness notes (`audit-ai-search`): 25 non-article pages (`/`, Pillars, checklists, legal pages) have no article dates or citation links, and 5 have no visible FAQ. That fits their role.

## Out of scope / not measured

- Search Console, indexation, rankings, traffic, backlinks and AI citations: no data source is connected for global.rentbikehanoi.com (`NOT_CONNECTED`).
- The six new Hubs (owner authorization of 2026-10-27) change navigation on every page. This audit must be re-run after that change ships.
