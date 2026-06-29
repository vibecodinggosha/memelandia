/* ==========================================
   ZHGUNLANDIA — Panel / Hotspot Logic
   ========================================== */

const overlay    = document.getElementById('overlay');
const rotateScr  = document.getElementById('rotateScreen');
let activePanel   = null;
let activeHotspot = null;

/* ---------- orientation check ---------- */
function checkOrientation() {
  const isMobile = window.innerWidth <= 900 || window.innerHeight <= 900;
  const isPortrait = window.innerHeight > window.innerWidth;
  if (isMobile && isPortrait) {
    rotateScr.style.display = 'flex';
    // close any open panel when rotated back to portrait
    closeAll();
  } else {
    rotateScr.style.display = 'none';
  }
}

window.addEventListener('resize',           checkOrientation, { passive: true });
window.addEventListener('orientationchange', checkOrientation, { passive: true });
checkOrientation(); // run on load

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
  hotspot.classList.add('active');

  activePanel   = panel;
  activeHotspot = hotspot;
  document.body.style.overflow = 'hidden';
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
