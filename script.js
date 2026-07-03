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

let activePanel   = null;
let activeHotspot = null;
let lbLoaded      = false;

/* ---------- portrait / landscape detection ---------- */
const navbar = document.querySelector('.navbar');

function updateOrientation() {
  const isPortrait = window.innerHeight > window.innerWidth;
  if (isPortrait) {
    portraitOverlay.classList.add('visible');
    navbar.classList.add('portrait-mode');
  } else {
    portraitOverlay.classList.remove('visible');
    navbar.classList.remove('portrait-mode');
    closeAll();
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
  if (e.key === 'Escape') closeAll();
});

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
];

function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

async function loadLeaderboard() {
  const lbLoading = document.getElementById('lbLoading');
  const lbList    = document.getElementById('lbList');

  // On auto-refresh keep the old list visible; only show LOADING on first load
  const firstLoad = !lbList.children.length;
  if (firstLoad) {
    lbLoading.style.display = 'block';
    lbLoading.textContent   = 'LOADING DATA...';
  }

  try {
    // Step 1: token metadata + top pool addresses.
    // include=top_pools is required — without it the relationships are empty
    // and we'd need 12 extra pool-lookup calls that blow the rate limit.
    const addrs  = TOKENS.map(t => t.addr).join(',');
    const gtJson = await fetchJson(
      `https://api.geckoterminal.com/api/v2/networks/ton/tokens/multi/${addrs}?include=top_pools`
    );
    const gtData = gtJson?.data || [];

    const tokenInfo = TOKENS.map(t => {
      const gt      = gtData.find(d =>
        (d.attributes?.address || '').toLowerCase() === t.addr.toLowerCase()
      );
      const poolId  = gt?.relationships?.top_pools?.data?.[0]?.id || '';
      const poolAddr = poolId.startsWith('ton_') ? poolId.slice(4) : '';
      return { addr: t.addr, attr: gt?.attributes || {}, poolAddr };
    });

    // Step 2: real 7d USD volume (7 daily OHLCV candles) + holders, in parallel.
    // Rare fallback: pool missing from relationships → resolve via /pools first.
    const ohlcvPromises = tokenInfo.map(async t => {
      let poolAddr = t.poolAddr;
      if (!poolAddr) {
        const j  = await fetchJson(
          `https://api.geckoterminal.com/api/v2/networks/ton/tokens/${encodeURIComponent(t.addr)}/pools?page=1`
        );
        const id = j?.data?.[0]?.id || '';
        poolAddr = id.startsWith('ton_') ? id.slice(4) : '';
      }
      if (!poolAddr) return null;
      return fetchJson(
        `https://api.geckoterminal.com/api/v2/networks/ton/pools/${poolAddr}/ohlcv/day?limit=7&currency=usd`
      );
    });
    const holderPromises = TOKENS.map(t =>
      fetchJson(`https://tonapi.io/v2/jettons/${encodeURIComponent(t.addr)}`)
    );
    const [ohlcvResults, holderResults] = await Promise.all([
      Promise.all(ohlcvPromises),
      Promise.all(holderPromises),
    ]);

    const rows = tokenInfo.map((t, i) => {
      const attr    = t.attr;
      const name    = attr.symbol || attr.name || t.addr.slice(0, 6) + '…';
      const mcap    = parseFloat(attr.market_cap_usd || attr.fdv_usd || 0);

      // Sum 7 daily candles — index [5] is volume, USD-denominated (currency=usd)
      const candles = ohlcvResults[i]?.data?.attributes?.ohlcv_list;
      const volReal = candles && candles.length;
      const vol7d   = volReal
        ? candles.reduce((s, c) => s + (parseFloat(c[5]) || 0), 0)
        : parseFloat(attr.volume_usd?.h24 || 0) * 7;

      const hData   = holderResults[i];
      const holders = hData?.holders_count || 0;
      let logo      = hData?.metadata?.image || '';
      if (logo.startsWith('ipfs://')) logo = 'https://ipfs.io/ipfs/' + logo.slice(7);

      return { name, mcap, vol7d, volReal, holders, logo };
    });

    const maxMcap    = Math.max(...rows.map(r => r.mcap),    1);
    const maxVol     = Math.max(...rows.map(r => r.vol7d),   1);
    const maxHolders = Math.max(...rows.map(r => r.holders), 1);

    rows.forEach(r => {
      r.score = (r.mcap / maxMcap * 0.5 + r.vol7d / maxVol * 0.3 + r.holders / maxHolders * 0.2) * 100;
    });
    rows.sort((a, b) => b.score - a.score);

    lbLoading.style.display = 'none';
    lbList.innerHTML = rows.map((r, i) => {
      const rank  = i + 1;
      const cls   = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
      const label = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      const pct   = r.score.toFixed(1);
      const vol   = (r.volReal ? '$' : '~$') + fmt(r.vol7d);
      const logoHtml = r.logo
        ? `<img class="lb-logo" src="${esc(r.logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />`
        : `<div class="lb-logo"></div>`;
      return `
        <div class="lb-item">
          <div class="lb-rank ${cls}">${label}</div>
          ${logoHtml}
          <div class="lb-info">
            <div class="lb-name">${esc(r.name)}</div>
            <div class="lb-meta">
              <span>MCAP <b>$${fmt(r.mcap)}</b></span>
              <span>VOL 7D <b>${vol}</b></span>
              <span>HOLDERS <b>${fmt(r.holders)}</b></span>
            </div>
            <div class="lb-bar-wrap"><div class="lb-bar-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="lb-score">${pct}</div>
        </div>`;
    }).join('');

    const upd = document.getElementById('lbUpdated');
    if (upd) {
      const now = new Date();
      upd.textContent = 'UPDATED ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0');
    }

    lbLoaded = true;
  } catch (err) {
    if (firstLoad) lbLoading.textContent = 'FAILED TO LOAD DATA.';
    console.error(err);
  }
}

/* fetch → parsed JSON, null on network error or non-2xx (e.g. 429 rate limit) */
function fetchJson(url) {
  return fetch(url)
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null);
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
