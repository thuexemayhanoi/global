# Markdown/JSON editorial intake (no API)

External AI applications may write either **canonical article JSON** directly or a **Markdown draft with strict JSON frontmatter**. The Markdown body becomes `body_markdown` in the JSON schema; the converter does not auto-approve anything.

```sh
# Write/edit private-drafts/EN-H01.md in an AI app with GitHub or local file support
node scripts/seo/import-markdown.mjs --file private-drafts/EN-H01.md
node scripts/seo/import-markdown.mjs --file private-drafts/EN-H01.md --write --out private-drafts/EN-H01.json
node scripts/seo/content-factory.mjs validate --file private-drafts/EN-H01.json
# Only after independent factual review and explicit owner approval:
node scripts/seo/publish-batch.mjs --file private-drafts/EN-H01.json
```

The importer **only writes gitignored private-drafts JSON**; no HTTP calls, model APIs, Git push, Matrix mutation or publishing. It refuses to overwrite existing packets, unknown schema keys or traversal paths. Sample: `examples/article-draft.sample.md` (intentional placeholders, not publishable).
