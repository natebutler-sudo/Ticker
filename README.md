# ISG ICS/OT & Regulatory Watch

Energy-sector ICS/OT advisories and NERC/FERC regulatory activity, read live from
CISA and the Federal Register.

Static single page. No build, no dependencies, no backend, no scheduled job.

## Deploy

```bash
git init && git add -A && git commit -m "ISG ICS/OT and regulatory watch"
gh repo create <org>/isg-watch --public --source=. --push
```

Then **Settings → Pages → deploy from branch `main`, folder `/ (root)`**.

Published at `https://<org>.github.io/isg-watch/`.

## Check the sources are healthy

```bash
node tools/check-sources.mjs
```

Hits both endpoints and reports advisory counts, energy-sector hits, and what the
Federal Register filter keeps. Node 18+, no install needed.

## Files

| Path | What |
|---|---|
| `index.html` | The whole page — markup, styles, logic, fallback snapshot |
| `assets/isg-watch-tile.png` | 1280×720 hero tile for SharePoint |
| `tools/check-sources.mjs` | Source health check |
| `CLAUDE.md` | Full context and constraints — **read this before changing anything** |
| `.nojekyll` | Keeps GitHub Pages from running Jekyll. Do not remove. |

## Sources

- CISA ICS advisories in CSAF — `github.com/cisagov/CSAF`
- Federal Register API — `federalregister.gov/developers/documentation/api/v1`

Public data only. Nothing confidential belongs in this repo — GitHub Pages is
world-readable.
