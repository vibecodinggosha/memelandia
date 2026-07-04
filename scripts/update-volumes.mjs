/* Volume tracker: snapshots 24h DEX volume for the leaderboard tokens from
   DeDust, accumulates daily history in data/volume-history.json ("cached and
   added on top in our db"), and writes the summed 7d USD volume per token to
   data/vol7d.json which the site consumes. Runs on a GitHub Actions schedule.

   Sources, in order:
   1. DeDust api /v2/pools — 24h volume of every TON pool holding the token
   2. GeckoTerminal h24 — fallback when a token has no DeDust pool
   Backfill: on the first runs (history shorter than 7 days) previous days are
   seeded from GeckoTerminal daily OHLCV candles so vol7d is complete from
   day one instead of growing over a week. */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const TOKENS = [
  'EQA6nxLSnCkr9lKWg6sdBiPxU33xkaZc-A-fu7qwhRaej12-',
  'EQA6t28UniHhfdXLf4CrdW8oR4RpE7WULd9IuugX8FscLhLn',
  'EQA60Fa8RTvHct9PQvxvh-1gMiRsFCRErsg5YKsHdkACRy8S',
  'EQBfrmOdSsdLOk1tizzx37JKoAW7G0LHOvt0Zb8pVnk57rAJ',
  'EQA6lk2GdC4uosxR0T-ydAqvazkxxlOSjGbouHLj2TWJRDmZ',
  'EQCQ7EU7td3ITY4AR_I-U-Q-KhJn1BrmnwS8W0Fz0qEbetLu',
  'EQCwvVKjYvXaNJkPCK8c80CBd1xzx2r1hwOhKHbIFnSaT4dP',
  'EQA6D_09XfX9wHBJJZxCiyt3N24LOIcrYjXp6OqScWxoV4Sb',
  'EQA6bzaGz8jyWoqk272WrnJeeXXnT4X4x3o12MZ1Yk3Ee5YE',
  'EQDjvPHOvpnoyHRISFWkRtA3U15yE6QI7jZ3iDG1PHWjiaq5',
  'EQA6ulHH35svS8QQz0l5EetinJLSHAFKHRMJ2E7Ax14Rluc2',
  'EQAmvp1Vrr0zY2--STdH-0X_mP5iCD61p2vNVJYwHlgBni2C',
];

const HIST_FILE = 'data/volume-history.json';
const OUT_FILE  = 'data/vol7d.json';
const KEEP_DAYS = 9;

/* EQ… friendly address → raw "0:hex" as used by the DeDust API */
export function friendlyToRaw(addr) {
  const b  = Buffer.from(addr.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const wc = b.readInt8(1);
  return `${wc}:${b.subarray(2, 34).toString('hex')}`;
}

async function getJson(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.json();
}

async function tonPriceUsd() {
  const d = await getJson('https://tonapi.io/v2/rates?tokens=ton&currencies=usd');
  const p = d?.rates?.TON?.prices?.USD;
  if (!p) throw new Error('TON price missing from tonapi response');
  return p;
}

/* 24h USD volume per token across all its DeDust TON pools */
export function dedustVolumes(pools, tonPrice, rawToFriendly) {
  const out = {};
  for (const p of pools) {
    const assets = p?.assets;
    if (!Array.isArray(assets) || assets.length !== 2) continue;
    const ni = assets.findIndex(a => a?.type === 'native');
    if (ni === -1) continue;
    const jetton   = assets[1 - ni];
    const friendly = jetton?.address && rawToFriendly.get(String(jetton.address).toLowerCase());
    if (!friendly) continue;
    const nanoTon = Number(p?.stats?.volume?.[ni]);
    if (!Number.isFinite(nanoTon)) continue;
    out[friendly] = (out[friendly] || 0) + (nanoTon / 1e9) * tonPrice;
  }
  return out;
}

async function gtMulti() {
  const d = await getJson(
    `https://api.geckoterminal.com/api/v2/networks/ton/tokens/multi/${TOKENS.join(',')}?include=top_pools`
  );
  const out = {};
  for (const t of d?.data || []) {
    const addr = t?.attributes?.address;
    if (!addr) continue;
    out[addr] = {
      h24: parseFloat(t.attributes?.volume_usd?.h24 || 0),
      pools: (t.relationships?.top_pools?.data || [])
        .map(x => (x.id || '').replace(/^ton_/, ''))
        .filter(Boolean),
    };
  }
  return out;
}

async function gtDailyCandles(poolAddr) {
  const d = await getJson(
    `https://api.geckoterminal.com/api/v2/networks/ton/pools/${poolAddr}/ohlcv/day?limit=8&currency=usd`
  );
  return d?.data?.attributes?.ohlcv_list || [];
}

const utcDay = ts => new Date(ts).toISOString().slice(0, 10);
const sleep  = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const today = utcDay(Date.now());
  const hist  = existsSync(HIST_FILE) ? JSON.parse(readFileSync(HIST_FILE, 'utf8')) : {};

  const rawToFriendly = new Map(TOKENS.map(a => [friendlyToRaw(a).toLowerCase(), a]));

  let dedust = {};
  try {
    const [pools, price] = await Promise.all([getJson('https://api.dedust.io/v2/pools'), tonPriceUsd()]);
    dedust = dedustVolumes(pools, price, rawToFriendly);
    console.log(`dedust: matched ${Object.keys(dedust).length}/${TOKENS.length} tokens, TON=$${price}`);
  } catch (e) {
    console.log(`dedust unavailable (${e.message}), falling back to GeckoTerminal for all`);
  }

  const gt = await gtMulti();

  for (const addr of TOKENS) {
    const entries = (hist[addr] || []).filter(e => e.date !== today);

    // backfill early days from GT daily candles so vol7d is complete from day one
    if (entries.length < 7 && gt[addr]?.pools?.length) {
      try {
        const candles = await gtDailyCandles(gt[addr].pools[0]);
        await sleep(2500); // stay well inside GT's 30 req/min
        for (const c of candles) {
          const date = utcDay((c[0] || 0) * 1000);
          if (date === today || entries.some(e => e.date === date)) continue;
          entries.push({ date, vol: Math.round(parseFloat(c[5]) || 0), src: 'gt-ohlcv' });
        }
      } catch (e) {
        console.log(`backfill failed for ${addr}: ${e.message}`);
      }
    }

    const vol24 = dedust[addr] ?? gt[addr]?.h24 ?? 0;
    entries.push({ date: today, vol: Math.round(vol24), src: addr in dedust ? 'dedust' : 'gt-h24' });
    entries.sort((a, b) => a.date.localeCompare(b.date));
    hist[addr] = entries.slice(-KEEP_DAYS);
  }

  const vol7d = {};
  for (const addr of TOKENS) {
    vol7d[addr] = hist[addr].slice(-7).reduce((s, e) => s + e.vol, 0);
  }

  mkdirSync('data', { recursive: true });
  writeFileSync(HIST_FILE, JSON.stringify(hist, null, 1));
  writeFileSync(OUT_FILE, JSON.stringify({ updated: new Date().toISOString(), vol7d }, null, 1));
  console.log('vol7d:', JSON.stringify(vol7d));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch(e => { console.error(e); process.exit(1); });
}
