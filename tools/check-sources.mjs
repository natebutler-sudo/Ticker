#!/usr/bin/env node
// Confirms the two live data sources still behave as the page expects.
// No dependencies. Node 18+.
//
//   node tools/check-sources.mjs

const CSAF = 'https://raw.githubusercontent.com/cisagov/CSAF/develop/csaf_files/OT/white/';
const FR   = 'https://www.federalregister.gov/api/v1/documents.json';
const SCAN = 30;

const ok = (s) => `\x1b[32m${s}\x1b[0m`;
const bad = (s) => `\x1b[31m${s}\x1b[0m`;

async function advisories() {
  const t0 = Date.now();
  const csv = await (await fetch(CSAF + 'changes.csv')).text();
  const paths = [];
  for (const line of csv.split(/\r?\n/)) {
    const m = line.match(/^"([^"]+)"/);
    if (m && m[1].includes('/icsa-')) paths.push(m[1]);
    if (paths.length >= SCAN) break;
  }
  const docs = await Promise.all(paths.map(p =>
    fetch(CSAF + p).then(r => r.ok ? r.json() : null).catch(() => null)));

  let energy = 0, crit = 0, newest = '';
  for (const a of docs) {
    if (!a) continue;
    const d = a.document || {}, notes = d.notes || [];
    const sec = (notes.find(n => /critical infrastructure sectors/i.test(n.title || '')) || {}).text || '';
    if (!/energy/i.test(sec)) continue;
    energy++;
    const scores = (a.vulnerabilities || []).flatMap(v => (v.scores || []).map(s =>
      (s.cvss_v4?.baseScore) ?? (s.cvss_v3?.baseScore) ?? 0));
    if (scores.length && Math.max(...scores) >= 9) crit++;
    const dt = (d.tracking?.current_release_date || '').slice(0, 10);
    if (dt > newest) newest = dt;
  }
  return { index: csv.split('\n').length, scanned: paths.length, energy, crit, newest, ms: Date.now() - t0 };
}

async function regulatory() {
  const qs = 'per_page=25&order=newest&conditions[term]=NERC'
           + '&conditions[agencies][]=federal-energy-regulatory-commission'
           + '&fields[]=title&fields[]=publication_date';
  const res = await fetch(FR + '?' + qs);
  const body = await res.text();
  let j;
  try { j = JSON.parse(body); }
  catch {
    // A non-JSON body here almost always means a network egress policy or proxy
    // intercepted the request, not that the API changed.
    throw new Error(`expected JSON, got ${res.status} "${body.slice(0, 40).trim()}…" `
      + '— likely a proxy or egress restriction on this machine, not an API change. '
      + 'Confirm from a normal browser before changing the code.');
  }
  const kept = (j.results || [])
    .filter(d => !/information collection/i.test(d.title || ''))
    .filter(d => /reliability standard|CIP-\d|bulk[- ]power|cyber|physical security/i.test(d.title || ''));
  return { total: j.count, returned: (j.results || []).length, kept: kept.length, newest: kept[0] };
}

console.log('Checking live sources…\n');
try {
  const a = await advisories();
  console.log(ok('  OK  ') + `CISA CSAF — ${a.index} advisories in index, scanned ${a.scanned}, ` +
              `${a.energy} energy-sector, ${a.crit} critical, newest ${a.newest} (${a.ms}ms)`);
  if (!a.energy) console.log(bad('  WARN') + ' no energy-sector hits — check the sector filter');
} catch (e) { console.log(bad('  FAIL') + ' CISA CSAF — ' + e.message); }

try {
  const r = await regulatory();
  console.log(ok('  OK  ') + `Federal Register — ${r.total} matches, ${r.returned} returned, ${r.kept} kept after filtering`);
  if (r.newest) console.log(`        newest: ${r.newest.publication_date}  ${r.newest.title.slice(0, 78)}`);
} catch (e) { console.log(bad('  FAIL') + ' Federal Register — ' + e.message); }

console.log('\nNote: cisa.gov (KEV catalog) is NOT checked — it serves no CORS headers,');
console.log('so the page cannot read it from a browser. That is by design, not a gap.');
