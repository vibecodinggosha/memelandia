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
function updateOrientation() {
  const isPortrait = window.innerHeight > window.innerWidth;
  if (isPortrait) {
    portraitOverlay.classList.add('visible');
  } else {
    portraitOverlay.classList.remove('visible');
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

  lbLoading.style.display = 'block';
  lbLoading.textContent   = 'LOADING DATA...';
  lbList.innerHTML = '';

  try {
    // Step 1: fetch token metadata + top pool addresses
    const addrs  = TOKENS.map(t => t.addr).join(',');
    const gtJson = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/ton/tokens/multi/${addrs}`
    ).then(r => r.json());
    const gtData = gtJson.data || [];

    const tokenInfo = TOKENS.map(t => {
      const gt      = gtData.find(d =>
        (d.attributes?.address || '').toLowerCase() === t.addr.toLowerCase()
      );
      const poolId  = gt?.relationships?.top_pools?.data?.[0]?.id || '';
      const poolAddr = poolId.startsWith('ton_') ? poolId.slice(4) : '';
      return { addr: t.addr, attr: gt?.attributes || {}, poolAddr };
    });

    // Step 2: resolve pool addresses — use relationship data or fetch separately
    const poolAddrPromises = tokenInfo.map(t => {
      if (t.poolAddr) return Promise.resolve(t.poolAddr);
      return fetch(
        `https://api.geckoterminal.com/api/v2/networks/ton/tokens/${encodeURIComponent(t.addr)}/pools?limit=1`
      ).then(r => r.json())
        .then(j => {
          const id = j?.data?.[0]?.id || '';
          return id.startsWith('ton_') ? id.slice(4) : '';
        })
        .catch(() => '');
    });

    // Step 3: holders + pool addresses in parallel, then OHLCV
    const [poolAddrs, holderResults] = await Promise.all([
      Promise.all(poolAddrPromises),
      Promise.all(TOKENS.map(t =>
        fetch(`https://tonapi.io/v2/jettons/${encodeURIComponent(t.addr)}`)
          .then(r => r.json()).catch(() => null)
      )),
    ]);

    // Fetch real 7d USD volume via OHLCV (currency=usd gives USD-denominated candles)
    const ohlcvResults = await Promise.all(
      poolAddrs.map(addr =>
        addr
          ? fetch(`https://api.geckoterminal.com/api/v2/networks/ton/pools/${addr}/ohlcv/day?limit=7&currency=usd`)
              .then(r => r.json()).catch(() => null)
          : Promise.resolve(null)
      )
    );

    const rows = tokenInfo.map((t, i) => {
      const attr    = t.attr;
      const name    = attr.symbol || attr.name || t.addr.slice(0, 6) + '…';
      const mcap    = parseFloat(attr.market_cap_usd || attr.fdv_usd || 0);

      // Sum 7 daily candles — index [5] is volume, in USD thanks to currency=usd param
      const candles = ohlcvResults[i]?.data?.attributes?.ohlcv_list;
      const vol7d   = candles && candles.length
        ? candles.reduce((s, c) => s + (parseFloat(c[5]) || 0), 0)
        : parseFloat(attr.volume_usd?.h24 || 0) * 7; // fallback only if pool missing

      const hData   = holderResults[i];
      const holders = hData?.holders_count || 0;
      let logo      = hData?.metadata?.image || '';
      if (logo.startsWith('ipfs://')) logo = 'https://ipfs.io/ipfs/' + logo.slice(7);

      return { name, mcap, vol7d, holders, logo };
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
      const meta  = `MCAP $${fmt(r.mcap)} · VOL 7D $${fmt(r.vol7d)} · HOLDERS ${fmt(r.holders)}`;
      const logoHtml = r.logo
        ? `<img class="lb-logo" src="${r.logo}" alt="" onerror="this.style.display='none'" />`
        : `<div class="lb-logo"></div>`;
      return `
        <div class="lb-item">
          <div class="lb-rank ${cls}">${label}</div>
          ${logoHtml}
          <div class="lb-info">
            <div class="lb-name">${r.name}</div>
            <div class="lb-meta">${meta}</div>
            <div class="lb-bar-wrap"><div class="lb-bar-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="lb-score">${pct}</div>
        </div>`;
    }).join('');

    lbLoaded = true;
  } catch (err) {
    lbLoading.textContent = 'FAILED TO LOAD DATA.';
    console.error(err);
  }
}

setInterval(() => {
  if (activePanel && activePanel.id === 'panel-leaderboard') {
    lbLoaded = false;
    loadLeaderboard();
  }
}, 10 * 60 * 1000);
