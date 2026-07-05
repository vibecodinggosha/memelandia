/* ==========================================
   ZHGUNLANDIA — Panel / Hotspot Logic
   ========================================== */

const overlay         = document.getElementById('overlay');
const portraitOverlay = document.getElementById('portraitOverlay');
const navMenu         = document.getElementById('navMenu');
const navHamburger    = document.getElementById('navHamburger');
const navMenuClose    = document.getElementById('navMenuClose');
const menuHome        = document.getElementById('menuHome');
const menuLeaderboard = document.getElementById('menuLeaderboard');
const lbSheet         = document.getElementById('lbSheet');
const lbSheetBackdrop = document.getElementById('lbSheetBackdrop');
const lbSheetCopy     = document.getElementById('lbSheetCopy');

let activePanel   = null;
let activeHotspot = null;
let lbLoaded      = false;
let lbRows        = [];
let lbRetryTimer  = null;

/* ---------- portrait / landscape detection ---------- */
const navbar = document.querySelector('.navbar');

function updateOrientation() {
  // Desktops can't be rotated — only gate touch devices behind the flip screen
  const isTouch    = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const isPortrait = window.innerHeight > window.innerWidth;
  if (isPortrait && isTouch) {
    portraitOverlay.classList.add('visible');
    navbar.classList.add('portrait-mode');
  } else {
    portraitOverlay.classList.remove('visible');
    navbar.classList.remove('portrait-mode');
    if (!isPortrait) closeAll();
  }
}

updateOrientation();
window.addEventListener('resize', updateOrientation);
window.addEventListener('orientationchange', () => setTimeout(updateOrientation, 80));

/* ---------- hamburger / nav menu ---------- */
navHamburger.addEventListener('click', () => {
  navMenu.classList.add('open');
});

navMenuClose.addEventListener('click', () => {
  navMenu.classList.remove('open');
});

menuHome.addEventListener('click', e => {
  e.preventDefault();
  navMenu.classList.remove('open');
});

menuLeaderboard.addEventListener('click', e => {
  e.preventDefault();
  navMenu.classList.remove('open');
  openPanel('leaderboard', null);
});

document.getElementById('menuRules')?.addEventListener('click', e => {
  e.preventDefault();
  navMenu.classList.remove('open');
  openPanel('rules', null);
});

/* ---------- cross-panel links ---------- */
document.getElementById('viewLeaderboardBtn')?.addEventListener('click', e => {
  e.preventDefault();
  openPanel('leaderboard', null);
});

document.getElementById('communityRulesBtn')?.addEventListener('click', e => {
  e.preventDefault();
  openPanel('rules', null);
});

/* ---------- panel logic ---------- */
function openPanel(panelId, hotspot) {
  if (activePanel) {
    activePanel.classList.remove('open');
    if (activeHotspot) activeHotspot.classList.remove('active');
  }
  const panel = document.getElementById('panel-' + panelId);
  if (!panel) return;

  panel.classList.add('open');
  overlay.classList.add('show');
  if (hotspot) hotspot.classList.add('active');
  activePanel   = panel;
  activeHotspot = hotspot;
  document.body.style.overflow = 'hidden';

  if (panelId === 'leaderboard' && !lbLoaded) {
    loadLeaderboard();
  }
}

function closeAll() {
  closeTokenSheet();
  if (activePanel)   { activePanel.classList.remove('open'); activePanel = null; }
  if (activeHotspot) { activeHotspot.classList.remove('active'); activeHotspot = null; }
  overlay.classList.remove('show');
  document.body.style.overflow = '';
}

document.querySelectorAll('.hotspot').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const id = btn.dataset.panel;
    if (activePanel && activePanel.id === 'panel-' + id) {
      closeAll();
    } else {
      openPanel(id, btn);
    }
  });
});

document.querySelectorAll('.panel__close').forEach(btn => {
  btn.addEventListener('click', closeAll);
});

overlay.addEventListener('click', closeAll);

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (lbSheet?.classList.contains('open')) {
    closeTokenSheet();
  } else {
    closeAll();
  }
});

/* ---------- token detail sheet ---------- */
let sheetAddr = '';

function openTokenSheet(i) {
  const r = lbRows[i];
  if (!r || !lbSheet) return;

  const logo = document.getElementById('lbSheetLogo');
  logo.style.visibility = r.logo ? 'visible' : 'hidden';
  logo.src = r.logo || '';

  document.getElementById('lbSheetName').textContent    = r.name;
  document.getElementById('lbSheetRank').textContent    = '#' + (i + 1);
  document.getElementById('lbSheetMcap').textContent    = '$' + fmt(r.mcap);
  document.getElementById('lbSheetVol').textContent     = (r.volReal ? '$' : '~$') + fmt(r.vol7d);
  document.getElementById('lbSheetHolders').textContent = r.holdersKnown ? fmt(r.holders) : '—';
  document.getElementById('lbSheetScore').textContent   = r.score.toFixed(1);
  document.getElementById('lbSheetAddr').textContent    = r.addr;
  sheetAddr = r.addr;
  lbSheetCopy.textContent = '⧉';

  lbSheetBackdrop.classList.add('show');
  lbSheet.classList.add('open');
}

function closeTokenSheet() {
  if (!lbSheet) return;
  lbSheet.classList.remove('open');
  lbSheetBackdrop.classList.remove('show');
}

document.getElementById('lbList').addEventListener('click', e => {
  const item = e.target.closest('.lb-item');
  if (item) openTokenSheet(+item.dataset.i);
});

// Guard: with a stale cached index.html the sheet markup may be missing —
// skip wiring instead of crashing the whole script on a null element.
if (lbSheet) {

document.getElementById('lbSheetClose').addEventListener('click', closeTokenSheet);
lbSheetBackdrop.addEventListener('click', closeTokenSheet);

lbSheetCopy.addEventListener('click', () => {
  const done = () => {
    lbSheetCopy.textContent = '✓';
    setTimeout(() => { lbSheetCopy.textContent = '⧉'; }, 1200);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(sheetAddr).then(done).catch(() => {});
  } else {
    const ta = document.createElement('textarea');
    ta.value = sheetAddr;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    done();
  }
});

}

/* ---------- leaderboard ---------- */
const TOKENS = [
  { addr: 'EQA6nxLSnCkr9lKWg6sdBiPxU33xkaZc-A-fu7qwhRaej12-', name: '' },
  { addr: 'EQA6t28UniHhfdXLf4CrdW8oR4RpE7WULd9IuugX8FscLhLn', name: '' },
  { addr: 'EQA60Fa8RTvHct9PQvxvh-1gMiRsFCRErsg5YKsHdkACRy8S', name: '' },
  { addr: 'EQBfrmOdSsdLOk1tizzx37JKoAW7G0LHOvt0Zb8pVnk57rAJ', name: '' },
  { addr: 'EQA6lk2GdC4uosxR0T-ydAqvazkxxlOSjGbouHLj2TWJRDmZ', name: '' },
  { addr: 'EQCQ7EU7td3ITY4AR_I-U-Q-KhJn1BrmnwS8W0Fz0qEbetLu', name: '' },
  { addr: 'EQCwvVKjYvXaNJkPCK8c80CBd1xzx2r1hwOhKHbIFnSaT4dP', name: '' },
  { addr: 'EQA6D_09XfX9wHBJJZxCiyt3N24LOIcrYjXp6OqScWxoV4Sb', name: '' },
  { addr: 'EQA6bzaGz8jyWoqk272WrnJeeXXnT4X4x3o12MZ1Yk3Ee5YE', name: '' },
  { addr: 'EQDjvPHOvpnoyHRISFWkRtA3U15yE6QI7jZ3iDG1PHWjiaq5', name: '' },
  { addr: 'EQA6ulHH35svS8QQz0l5EetinJLSHAFKHRMJ2E7Ax14Rluc2', name: '' },
  { addr: 'EQAmvp1Vrr0zY2--STdH-0X_mP5iCD61p2vNVJYwHlgBni2C', name: '' },
  { addr: 'EQA6FNQzTeFvY395QVg5GhKNexiK4hECAmBbfuLY5TXyvCX2', name: '' },
];

/* Hidden from the leaderboard by token symbol (accents ignored: KOTÉ → KOTE) */
const LB_EXCLUDE = ['KOTE', 'SKITTY'];

/* Wallet whose GRAM balance forms the weekly prize fund (split 50/30/20) */
const PRIZE_WALLET = 'UQBgKrxmTXfFQvvmlyU95kuRqkjsX5YNyCBFMfX0DMaUJcgG';

async function loadPrizeFund() {
  // GRAM jetton balance of the prize wallet; falls back to the wallet's
  // native TON balance while it holds no GRAM.
  const [jettons, account] = await Promise.all([
    fetchJson(`https://tonapi.io/v2/accounts/${PRIZE_WALLET}/jettons`),
    fetchJson(`https://tonapi.io/v2/accounts/${PRIZE_WALLET}`),
  ]);

  let total = 0, unit = '';
  const gram = jettons?.balances?.find(x => (x.jetton?.symbol || '').toUpperCase() === 'GRAM');
  if (gram && Number(gram.balance) > 0) {
    total = Number(gram.balance) / Math.pow(10, gram.jetton.decimals ?? 9);
    unit  = 'GRAM';
  } else if (account && Number(account.balance) > 0) {
    total = Number(account.balance) / 1e9; // nanoTON
    unit  = 'TON';
  }
  if (!Number.isFinite(total) || total <= 0) return;

  document.getElementById('lbFundTotal').textContent = fmt(total) + ' ' + unit;
  document.getElementById('lbPrize1').textContent = '🥇 ' + fmt(total * 0.5) + ' ' + unit;
  document.getElementById('lbPrize2').textContent = '🥈 ' + fmt(total * 0.3) + ' ' + unit;
  document.getElementById('lbPrize3').textContent = '🥉 ' + fmt(total * 0.2) + ' ' + unit;
}

/* Next Sunday 15:00 Central European time (CET/CEST via Europe/Berlin) as UTC ms */
function nextResultsTs() {
  const now   = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin', hour12: false,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', weekday: 'short', timeZoneName: 'shortOffset',
  }).formatToParts(now).reduce((o, p) => { o[p.type] = p.value; return o; }, {});

  let offMin = 120;
  const m = /GMT([+-])(\d+)(?::(\d+))?/.exec(parts.timeZoneName || '');
  if (m) offMin = (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10));

  const dow       = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday] ?? 0;
  const daysAhead = (7 - dow) % 7;

  // Berlin wall-clock 15:00 on that day, converted to UTC
  let target = Date.UTC(+parts.year, parts.month - 1, +parts.day, 15, 0, 0)
             - offMin * 60000 + daysAhead * 86400000;
  if (target <= now.getTime()) target += 7 * 86400000;

  // First round ends 12 Jul 2026 15:00 CEST — skip this week's Sunday,
  // then continue weekly.
  const FIRST_RESULTS = Date.UTC(2026, 6, 12, 13, 0, 0);
  if (target < FIRST_RESULTS) target = FIRST_RESULTS;
  return target;
}

const lbTimerEl = document.getElementById('lbTimer');
if (lbTimerEl) {
  let resultsAt = nextResultsTs();
  const pad2 = n => String(n).padStart(2, '0');
  const tick = () => {
    let ms = resultsAt - Date.now();
    if (ms <= 0) { resultsAt = nextResultsTs(); ms = resultsAt - Date.now(); }
    const d = Math.floor(ms / 86400000);
    const h = Math.floor(ms / 3600000) % 24;
    const mi = Math.floor(ms / 60000) % 60;
    const s = Math.floor(ms / 1000) % 60;
    lbTimerEl.textContent = `${d}D ${pad2(h)}:${pad2(mi)}:${pad2(s)}`;
  };
  tick();
  setInterval(tick, 1000);
}

function normName(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

function renderRows(rows, when) {
  lbRows = rows;
  document.getElementById('lbList').innerHTML = rows.map((r, i) => {
    const rank  = i + 1;
    const cls   = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
    const label = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    const pct   = r.score.toFixed(1);
    const vol   = (r.volReal ? '$' : '~$') + fmt(r.vol7d);
    const logoHtml = r.logo
      ? `<img class="lb-logo" src="${esc(r.logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />`
      : `<div class="lb-logo"></div>`;
    return `
      <div class="lb-item" data-i="${i}">
        <div class="lb-rank ${cls}">${label}</div>
        ${logoHtml}
        <div class="lb-info">
          <div class="lb-name">${esc(r.name)}</div>
          <div class="lb-meta">
            <span>MCAP <b>$${fmt(r.mcap)}</b></span>
            <span>VOL 7D <b>${vol}</b></span>
            <span>HOLDERS <b>${r.holdersKnown ? fmt(r.holders) : '—'}</b></span>
          </div>
          <div class="lb-bar-wrap"><div class="lb-bar-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="lb-score">${pct}</div>
      </div>`;
  }).join('');

  const upd = document.getElementById('lbUpdated');
  if (upd) {
    upd.textContent = 'UPDATED ' +
      String(when.getHours()).padStart(2, '0') + ':' +
      String(when.getMinutes()).padStart(2, '0');
  }
}

async function loadLeaderboard() {
  loadPrizeFund();

  const lbLoading = document.getElementById('lbLoading');
  const lbList    = document.getElementById('lbList');

  // On auto-refresh keep the old list visible; only show LOADING on first load
  const firstLoad = !lbList.children.length;
  if (firstLoad) {
    lbLoading.style.display = 'block';
    lbLoading.textContent   = 'LOADING DATA...';

    // Instant paint from the previous visit while fresh data loads in background
    try {
      const c = JSON.parse(localStorage.getItem('lbCache') || 'null');
      if (c && Array.isArray(c.rows) && c.rows.length &&
          Date.now() - c.t < 24 * 3600 * 1000) {
        renderRows(c.rows, new Date(c.t));
        lbLoading.style.display = 'none';
      }
    } catch (e) { /* corrupt cache — ignore */ }
  }

  try {
    // Step 1: token metadata + top pool addresses.
    // include=top_pools is required — without it the relationships are empty
    // and we'd need 12 extra pool-lookup calls that blow the rate limit.
    const addrs  = TOKENS.map(t => t.addr).join(',');
    const gtJson = await fetchJsonRetry(
      `https://api.geckoterminal.com/api/v2/networks/ton/tokens/multi/${addrs}?include=top_pools`,
      3
    );
    const gtData = gtJson?.data || [];

    // Without this call there are no names, mcaps or pools — rendering would
    // produce a garbage $0 leaderboard ranked by holders only. Bail out:
    // first load shows a retry message, auto-refresh keeps the previous list.
    if (!gtData.length) throw new Error('geckoterminal unavailable');

    // Per-pool 24h volume from the included pool objects — used to pick
    // each token's most active pools when it trades on several DEXes.
    const poolVol24 = {};
    (gtJson?.included || []).forEach(p => {
      poolVol24[p.id] = parseFloat(p.attributes?.volume_usd?.h24 || 0);
    });

    const tokenInfo = TOKENS.map(t => {
      const gt      = gtData.find(d =>
        (d.attributes?.address || '').toLowerCase() === t.addr.toLowerCase()
      );
      const poolIds = (gt?.relationships?.top_pools?.data || []).map(d => d.id);
      return { addr: t.addr, attr: gt?.attributes || {}, poolIds };
    });

    // Precomputed 7d volumes: a GitHub Action snapshots DeDust 24h volumes
    // daily and sums the last 7 days into data/vol7d.json. When that file is
    // fresh, use it and skip the per-pool OHLCV calls entirely.
    const volFile  = await fetchJson('data/vol7d.json?t=' + Date.now());
    const volFresh = !!(volFile?.vol7d && volFile.updated &&
                        Date.now() - Date.parse(volFile.updated) < 48 * 3600 * 1000);

    // Step 2: real 7d USD volume + holders, in parallel.
    // Fallback path when vol7d.json is missing/stale: a token may trade on
    // several DEXes, so sum the 7 daily OHLCV candles across its pools —
    // capped at 2 most active pools per token to stay inside GeckoTerminal's
    // 30 req/min limit (1 + 12*2 = 25).
    const vol7dPromises = tokenInfo.map(async t => {
      if (volFresh && volFile.vol7d[t.addr] != null) {
        return { sum: volFile.vol7d[t.addr], real: true };
      }
      let ids = t.poolIds;
      if (!ids.length) {
        const j = await fetchJson(
          `https://api.geckoterminal.com/api/v2/networks/ton/tokens/${encodeURIComponent(t.addr)}/pools?page=1`
        );
        ids = (j?.data || []).map(d => d.id);
      }
      ids = ids
        .sort((a, b) => (poolVol24[b] || 0) - (poolVol24[a] || 0))
        .slice(0, 2);

      const results = await Promise.all(ids.map(id => {
        const poolAddr = id.startsWith('ton_') ? id.slice(4) : id;
        return fetchJson(
          `https://api.geckoterminal.com/api/v2/networks/ton/pools/${poolAddr}/ohlcv/day?limit=7&currency=usd`
        );
      }));

      let sum = 0, real = false;
      results.forEach(r => {
        const candles = r?.data?.attributes?.ohlcv_list;
        if (candles && candles.length) {
          real = true;
          // candle format: [ts, open, high, low, close, volume] — USD (currency=usd)
          candles.forEach(c => { sum += parseFloat(c[5]) || 0; });
        }
      });
      return { sum, real };
    });
    // Holders + logos come pre-cached in vol7d.json (refreshed by the same
    // GitHub Action every 6h); tonapi is only queried for tokens missing there.
    // tonapi.io allows ~1 req/sec without a key — 12 parallel calls get 429s
    // (missing avatars, HOLDERS 0). Fetch sequentially with a gap + one retry.
    const fileMeta = (volFresh && volFile.meta) || {};
    const fetchHolders = async () => {
      const out = [];
      for (const t of TOKENS) {
        const m = fileMeta[t.addr];
        if (m) {
          out.push({ holders_count: m.holders, metadata: { image: m.logo } });
          continue;
        }
        const url = `https://tonapi.io/v2/jettons/${encodeURIComponent(t.addr)}`;
        let j = await fetchJson(url);
        if (!j) {
          await sleep(1100);
          j = await fetchJson(url);
        }
        out.push(j);
        await sleep(220);
      }
      return out;
    };

    const [vol7dResults, holderResults] = await Promise.all([
      Promise.all(vol7dPromises),
      fetchHolders(),
    ]);

    const rows = tokenInfo.map((t, i) => {
      const attr    = t.attr;
      const name    = attr.symbol || attr.name || t.addr.slice(0, 6) + '…';
      const mcap    = parseFloat(attr.market_cap_usd || attr.fdv_usd || 0);

      const volReal = vol7dResults[i].real;
      const vol7d   = volReal
        ? vol7dResults[i].sum
        : parseFloat(attr.volume_usd?.h24 || 0) * 7;

      const hData        = holderResults[i];
      const holdersKnown = hData != null;
      const holders      = hData?.holders_count || 0;
      let logo           = hData?.metadata?.image || '';
      if (logo.startsWith('ipfs://')) logo = 'https://ipfs.io/ipfs/' + logo.slice(7);

      return { addr: t.addr, name, mcap, vol7d, volReal, holders, holdersKnown, logo };
    }).filter(r => !LB_EXCLUDE.includes(normName(r.name)));

    const maxMcap    = Math.max(...rows.map(r => r.mcap),    1);
    const maxVol     = Math.max(...rows.map(r => r.vol7d),   1);
    const maxHolders = Math.max(...rows.map(r => r.holders), 1);

    rows.forEach(r => {
      r.score = (r.mcap / maxMcap * 0.5 + r.vol7d / maxVol * 0.3 + r.holders / maxHolders * 0.2) * 100;
    });
    rows.sort((a, b) => b.score - a.score);

    lbLoading.style.display = 'none';
    renderRows(rows, new Date());
    try {
      localStorage.setItem('lbCache', JSON.stringify({ t: Date.now(), rows }));
    } catch (e) { /* storage full/blocked — cache is optional */ }

    lbLoaded = true;
  } catch (err) {
    console.error(err);
    // Show the failure only when nothing is on screen (no cached render either)
    if (!lbList.children.length) {
      lbLoading.textContent = 'FAILED TO LOAD DATA — RETRYING...';
      if (!lbRetryTimer) {
        lbRetryTimer = setTimeout(() => {
          lbRetryTimer = null;
          loadLeaderboard();
        }, 20000);
      }
    }
  }
}

/* fetchJson with retries — GeckoTerminal 429s recover after a short pause */
async function fetchJsonRetry(url, tries) {
  for (let i = 0; i < tries; i++) {
    const j = await fetchJson(url);
    if (j) return j;
    if (i < tries - 1) await sleep(1600 * (i + 1));
  }
  return null;
}

/* fetch → parsed JSON, null on network error or non-2xx (e.g. 429 rate limit) */
function fetchJson(url) {
  return fetch(url)
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

setInterval(() => {
  if (activePanel && activePanel.id === 'panel-leaderboard') {
    lbLoaded = false;
    loadLeaderboard();
  }
}, 10 * 60 * 1000);
