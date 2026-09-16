# ISG ICS/OT & Regulatory Watch

Context for anyone — human or Claude — picking this up. Read before changing anything;
several of the constraints below were established the hard way and are not obvious from
the code.

## What this is

A single static page listing **energy-sector ICS/OT advisories** and **NERC/FERC
regulatory activity**, for 3HUE Executive Consulting's ISG (Information Security Group)
delivery team. Built as 3HUE moves into the power sector.

It reads two public sources **directly from the visitor's browser** on every load. There
is no build step, no backend, no scheduled job, no database, no API key. That is the
whole design goal — it was explicitly chosen over a Power Automate flow because the
requirement was "implement once and then it's good."

**Deploy target:** a standalone GitHub Pages repo.
**Do NOT put this in `3HUE/3HUE-Website`.** That was tried and rejected — it's the
marketing site and this doesn't belong there.

## The two data sources

| Source | Endpoint | CORS | Auth |
|---|---|---|---|
| CISA ICS advisories (CSAF) | `raw.githubusercontent.com/cisagov/CSAF/develop/csaf_files/OT/white/` | Yes | none |
| NERC / FERC activity | `www.federalregister.gov/api/v1/documents.json` | Yes | none |

Both were CORS-verified from a real browser before this was built. Run
`node tools/check-sources.mjs` to confirm they still behave.

### Things that will save you a wrong turn

**CISA retired its RSS feeds on May 12, 2025.** The KEV feed and the cybersecurity
advisory feeds are gone. Anything you find online telling you to subscribe to a CISA RSS
URL is out of date. The CSAF repository is the machine-readable channel that replaced
them.

**Use `changes.csv`, not the GitHub API.** `csaf_files/OT/white/changes.csv` is a
newest-first index of every advisory (~3,900 lines, ~227 KB). The GitHub contents API
would also work but is rate-limited to 60 requests/hour per IP unauthenticated, and caps
directory listings at 1,000 entries. `changes.csv` has neither problem and is one fetch.

**The Energy filter is a note title, not a field.** Each CSAF advisory carries
`document.notes[]`, and one of those notes has the title `Critical infrastructure
sectors`. Its text is a comma-separated list. Keep the advisory when that text contains
`Energy`. Roughly 35–40% of recent OT advisories qualify.

**FERC results are mostly noise without a second filter.** An unfiltered FERC query
returns overwhelmingly `Commission Information Collection Activities` notices —
Paperwork Reduction Act filings, not news. In one sample, 19 of 20 NERC-matched FERC
documents were that. Excluding titles containing `Information Collection` takes the lane
down to roughly one genuine item a month.

**KEV cannot be cross-referenced client-side.** `www.cisa.gov` serves the Known Exploited
Vulnerabilities catalog **without CORS headers**, so a browser cannot read it from another
origin. This was tested and confirmed blocked. A KEV badge would require a server-side
fetch, which defeats the point of this design. It is documented as a known limit on the
page. Do not "fix" it by adding a proxy without a deliberate decision to accept a moving
part.

## Constraints that are not negotiable

**No web fonts.** 3HUE's working agreements state: *"No web fonts on anything we host."*
The reasoning is a privacy one — sending every visitor's IP to a font CDN is not a
defensible trade for a privacy practice. System font stacks only.

**Client work product never appears here.** Everything on this page is public CISA and
Federal Register data. GitHub Pages is world-readable (private Pages requires GitHub
Enterprise), so nothing confidential can go on it, ever.

**US English and US date conventions.** House standard. Dates read `October 1, 2025`.

## How the page behaves

1. Paints immediately from cache, or from a bundled 30-item snapshot on first visit
2. Skips the network entirely if the cache is under 4 hours old
3. Otherwise reads `changes.csv`, pulls the 45 newest ICS advisories in parallel,
   filters to Energy, and renders progressively as they arrive
4. Fetches the Federal Register lane alongside
5. Writes the merged result to `localStorage` under `isg-watch-v1`
6. If both sources fail, keeps showing whatever it has rather than rendering empty

All `localStorage` access is wrapped in try/catch — private-mode browsers degrade to the
bundled snapshot instead of erroring.

Severity bands: CVSS ≥9.0 critical, ≥7.0 high, ≥4.0 medium, below that low. Regulatory
items carry no score.

## Tuning knobs

In the `CONFIG` block near the top of the page script:

- `SCAN` — how many recent advisories to inspect per refresh (default 45). Higher means
  more energy hits and a bigger payload; each advisory is roughly 40 KB.
- `CACHE_H` — cache lifetime in hours (default 4)
- The sector regex — change `/energy/i` to widen beyond Energy

## Open question you may inherit

**There are three different 3HUE palettes in circulation and nobody has picked one.**

| Where | Dark | Accent |
|---|---|---|
| 3hue.net (live, measured from its CSS variables) | `#0F172A` | `#44A8D9` |
| The house-format doc in the project pack | `#0B2138` | `#1A8FE3` |
| The SharePoint banner artwork | ~`#001028` | — |

**This page uses the 3hue.net values**, on the reasoning that it is a web page. That is a
choice, not a resolution. If the brand question gets settled, the tokens are all declared
in one `:root` block at the top and it is a one-line change.

## Deploying

```bash
git init && git add -A && git commit -m "ISG ICS/OT and regulatory watch"
gh repo create <org>/isg-watch --public --source=. --push
# then: Settings → Pages → deploy from branch main, / (root)
```

`.nojekyll` is present, so GitHub Pages serves the files verbatim with no Jekyll
processing. Do not remove it.

**The page is indexable.** It originally carried `<meta name="robots"
content="noindex, follow">` as a conservative default. That tag was removed on
September 16, 2026, when the open question above was settled: the page is wanted as a
public shopfront while 3HUE moves into the power sector, on the reasoning that it is
worth more indexed than hidden.

## The SharePoint side

`assets/isg-watch-tile.png` (1280×720) is a hero tile for the ISG Service Delivery Team
SharePoint site. It uses 3HUE's 3D ISG mark.

On the SharePoint homepage: **Hero** web part → tile image → link to the published URL.
It is a plain link, so it needs no Embed web part, no HTML Field Security allowlist entry,
and no admin request.

**Why a link and not an embed:** that SharePoint site is a group-connected Team site with
`AddAndCustomizePages` denied, so pages cannot run script. The Embed web part was tested
and the tenant enforces a domain allowlist (`"Embedding content from this website isn't
allowed"`). A link sidesteps all of it.
