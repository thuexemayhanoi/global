# Business reference + anti-fabrication fact guard

Canonical facts for **Thuê Xe Máy Hà Nội Nguyễn Tú** live in one file: `data/business/reference.json`. Every language uses the generated `data/business/reference.localized.json` (never typed by hand).

| Field | Canonical value | Evidence (2026-10-14) |
|---|---|---|
| Address | 112 Nguyễn Văn Cừ, Bồ Đề, Long Biên, Hà Nội | Google Business Profile, thuexemaynguyentu.com, Facebook, Trang Vàng, LinkedIn |
| Phone | 0942 467 674 (+84942467674) | Google Business Profile, thuexemaynguyentu.com and listings |
| Hours | 09:00–21:00 every day | Owner + Google Business Profile |
| Daily / weekly / monthly | 150,000–200,000 / 700,000–1,000,000 / 900,000–2,000,000 VND | Owner; matches the per-model table on thuexemaynguyentu.com |
| Deposit | 2,000,000–5,000,000 VND depending on the motorbike | Owner + site table |
| Delivery | 20,000–100,000 VND depending on location | Owner statement only |
| Late return | 20,000 VND per hour; more than 6 hours may count as an extra day | Owner statement only |

Per-model prices (Wave, Vision, Air Blade, Click/Mio, 50cc) come from the official site's table and must stay inside the summary ranges.

## Conflicts for the owner to resolve (not changed by this repository)

| ID | Issue | Status |
|---|---|---|
| C1-hours | thuexemaynguyentu.com shows **08:00–21:30**; owner and Google Business Profile say **09:00–21:00** | OWNER_TO_RESOLVE |
| C2-delivery | The site says contracts under 800,000 VND are not delivered; delivery from 800,000 VND with a fee confirmed in advance | OWNER_TO_CONFIRM |
| C3-name | Google Business Profile title is "Thuê xe máy ở Hà Nội - Nguyễn Tú" | OWNER_TO_CONFIRM |

`/global` always uses the canonical column. The other website, the Business Profile and the listings are outside this repository.

## Publication flags

`publication.site_display_approved` and `publication.business_schema_approved` are **false**. `/global` is an independent editorial guide: its About and Contact pages say it takes no reservations and publishes no address or phone. Displaying this NAP or these prices on live pages, or adding LocalBusiness/AutoRental schema, is a separate owner decision. Until a flag is set to true in a reviewed PR, the guard fails any page that does it.

## What the guard enforces (`node scripts/seo/fact-guard.mjs`, CI)

- **Reference consistency:** phone formats agree, opening < closing, ranges are ordered, per-model prices fit the summary ranges, weekly/monthly averages per day do not exceed shorter periods, late fee × 6 h stays below the cheapest day, owner statements match the model table, and every NAP field has dated evidence.
- **Nguyễn Tú facts in content (always FAIL):** within a paragraph or section that names the brand, its aliases, phone or full address, every VND amount must be a reference value. Also fails: foreign-currency conversions, a different phone, house number or hours, and "no deposit / free delivery / 24h" claims.
- **Other amounts and phones:** they need an inline source (link, URL or legal instrument number) in the same paragraph. Without one they **fail** for live pages, site copy, Matrix, topical map and `content/articles`, and **warn** in Writer QA. Cited third-party rental prices warn for a dated editorial re-check.
- **Pages:** no NAP display and no business schema while the flags are false. When a flag is true, the schema must match the reference.

Parsing covers 10 languages, all common separators, multipliers (k, nghìn, triệu, Millionen, millions, 万, 만…), ranges (–, ~, đến, bis, à, tot, até, 至, 에서) and currency symbols. URL digits are ignored.

## Integration

- `scripts/articles.mjs` `checkArticle(..., {factMode})`: `"warn"` for Writer QA (`writer-lanes verify-all`), `"strict"` for `publish-batch.mjs` and stored `content/articles`.
- Writer prompts W1–W3: Nguyễn Tú facts only by copying lines from `reference.localized.json`.
- Updating prices or NAP: edit `data/business/reference.json`, add dated evidence, run `node scripts/seo/fact-guard.mjs --write`, then `node scripts/seo/fact-guard.mjs` and `node --test tests/fact-guard.test.mjs`, and open a reviewed PR.

The 14 protected W1 drafts (PR #17) pass. Their cited third-party prices (DE-H02, EN-H03, KO-H02, NL-H02) are flagged for dated review before publication.
