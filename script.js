/* ==========================================
   BOOK OF ZHGUN — SCRIPTS
   ========================================== */

// ── Mobile menu ──────────────────────────────
const burger    = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');

burger?.addEventListener('click', () => {
  const open = mobileMenu.style.display === 'flex';
  mobileMenu.style.display = open ? 'none' : 'flex';
});

function closeMobile() {
  mobileMenu.style.display = 'none';
}

// ── Navbar shrink on scroll ───────────────────
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.style.background = window.scrollY > 60
    ? 'rgba(13, 11, 30, 0.97)'
    : 'rgba(13, 11, 30, 0.85)';
}, { passive: true });

// ── Animated counter ─────────────────────────
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const step = 16;
  const steps = Math.ceil(duration / step);
  let count = 0;

  const increment = target / steps;
  const timer = setInterval(() => {
    count += increment;
    if (count >= target) {
      count = target;
      clearInterval(timer);
    }
    const display = target >= 1_000_000
      ? (count / 1_000_000).toFixed(2) + suffix
      : target >= 1000
        ? count >= target ? target.toLocaleString() : Math.floor(count).toLocaleString()
        : Math.floor(count).toString();
    el.textContent = target >= 1_000_000 ? display : display;
  }, step);
}

// ── Intersection Observer for fade-in & counters ─
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    // fade-in-up
    if (entry.target.classList.contains('fade-in-up')) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }

    // counter
    if (entry.target.classList.contains('stat-value')) {
      animateCounter(entry.target);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.fade-in-up, .stat-value').forEach(el => observer.observe(el));

// Add fade-in-up to cards
document.querySelectorAll(
  '.about-card, .exchange-card, .stat-card, .community-card, .roadmap-phase'
).forEach(el => {
  el.classList.add('fade-in-up');
  observer.observe(el);
});

// ── Copy contract address ─────────────────────
function copyContract() {
  const addr = document.getElementById('contractAddr').textContent;
  navigator.clipboard.writeText(addr).then(() => {
    const label = document.getElementById('copyLabel');
    label.textContent = 'Copied!';
    setTimeout(() => { label.textContent = 'Copy'; }, 2000);
  });
}

// ── Stat counter: override display for large numbers ──
document.querySelectorAll('.stat-value').forEach(el => {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  if (target >= 1_000_000) {
    el.textContent = '0B';
  } else if (target >= 1000) {
    el.textContent = '0';
  }
});

// ── Parallax on hero map ──────────────────────
const heroMap = document.querySelector('.hero__map');
if (heroMap) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    heroMap.style.transform = `translateY(${y * 0.08}px)`;
  }, { passive: true });
}

// ── Smooth active nav link highlighting ───────
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.navbar__links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) {
      current = sec.getAttribute('id');
    }
  });
  navLinks.forEach(link => {
    link.style.color = link.getAttribute('href') === `#${current}`
      ? '#ffffff'
      : '';
  });
}, { passive: true });
