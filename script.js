/* ==========================================
   ZHGUNLANDIA — Panel / Hotspot Logic
   ========================================== */

const overlay       = document.getElementById('overlay');
const portraitOverlay = document.getElementById('portraitOverlay');
let activePanel   = null;
let activeHotspot = null;

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
