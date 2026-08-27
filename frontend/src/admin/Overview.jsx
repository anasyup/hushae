import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Chart from 'chart.js/auto';
import AdminLayout from './AdminLayout';
import styles from './Overview.module.css';

/* ============================================================================
 * OVERVIEW — HUSHAE admin dashboard.
 *
 * Exact port of the polished ATELIER single-file design
 * (overview_polished.html): same markup, same classes (now a CSS module),
 * same canvas IDs (salesOverview, salesChannel, revChart, ordersDonut,
 * custChart, spark1-6) and same data.
 *
 * Chart.js 4.4.1 comes from npm (the inlined UMD build from the design
 * file is not shipped). All page logic from the design's <script> runs in
 * useEffect: chart initialisation, count-up, category bars, live visitor
 * bars, dropdowns, search filter, modals/toast, ⌘K + Esc shortcuts.
 * Toast and modals are portaled to <body> so the admin layout can never
 * break their fixed positioning.
 * ========================================================================== */

const BASE_HEIGHTS = [12, 22, 8, 28, 18, 30, 14, 20, 26, 10, 24, 16, 28, 12, 20, 22, 8, 26, 18, 14, 24, 10, 28, 16, 20, 12, 22, 18, 26, 14, 18, 22, 12, 28, 16, 20, 14, 24, 10, 26];

/* Design palette (light) + dark-admin equivalent for the admin theme toggle. */
const PALETTES = {
  light: { main: '#111', g2: '#555', g3: '#8a8a8a', g4: '#d6d6d6', mutedLine: '#c8c8c8', grid: '#f2f2f2', grid2: '#f5f5f5', tick: '#9ca3af', cardBg: '#fff', tooltip: '#111', d2: '#6b7280', d3: '#b5b5b5', d4: '#e5e7eb' },
  dark: { main: '#f4f4f5', g2: '#a1a1aa', g3: '#71717a', g4: '#3f3f46', mutedLine: '#52525b', grid: '#26262c', grid2: '#1d1d21', tick: '#71717a', cardBg: '#111113', tooltip: '#27272a', d2: '#71717a', d3: '#52525b', d4: '#3f3f46' },
};

const isDarkAdmin = () => document.documentElement.classList.contains('dark-admin');
const P = () => (isDarkAdmin() ? PALETTES.dark : PALETTES.light);

/* ---- page logic (1:1 from the design's <script>, class names via module) ---- */

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toastText').textContent = msg;
  t.classList.add(styles.show);
  clearTimeout(window._ovwToastTimer);
  window._ovwToastTimer = setTimeout(() => t.classList.remove(styles.show), 2800);
}

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add(styles.show);
  document.body.style.overflow = 'hidden';
}

function closeModal(e, id) {
  if (e && e.target !== e.currentTarget) return;
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove(styles.show);
    document.body.style.overflow = '';
  }
}

function markRead() {
  const b = document.getElementById('notifBadge');
  if (b) b.style.display = 'none';
  showToast('All notifications marked as read');
  closeModal(null, 'notifModal');
}

function toggleDropdown(id) {
  const dd = document.getElementById(id);
  if (!dd) return;
  const isShow = dd.classList.contains(styles.show);
  document.querySelectorAll('.' + styles.dropdown).forEach((d) => d.classList.remove(styles.show));
  document.querySelectorAll('.' + styles.pill).forEach((p) => p.classList.remove(styles.active));
  if (!isShow) {
    dd.classList.add(styles.show);
    dd.parentElement.classList.add(styles.active);
  }
}

function setDate(txt) {
  const pill = document.getElementById('datePill');
  if (pill && pill.firstElementChild) pill.firstElementChild.textContent = txt;
  showToast('Date changed to ' + txt);
  document.querySelectorAll('.' + styles.dropdown).forEach((d) => d.classList.remove(styles.show));
}

function setCompare(txt) {
  const el = document.getElementById('compareText');
  if (el) el.textContent = 'Compare: ' + txt;
  showToast('Comparison: ' + txt);
  document.querySelectorAll('.' + styles.dropdown).forEach((d) => d.classList.remove(styles.show));
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => showToast('Fullscreen ON')).catch(() => showToast('Fullscreen not supported'));
  } else {
    document.exitFullscreen();
    showToast('Fullscreen OFF');
  }
}

function handleSearch(e) {
  const q = e.target.value.toLowerCase();
  if (e.key === 'Enter' && q) showToast('Searching: ' + q);
  const prodRows = document.querySelectorAll('#productTable tbody tr');
  const orderRows = document.querySelectorAll('#ordersTable tbody tr');
  let found = 0;
  prodRows.forEach((r) => {
    const match = r.textContent.toLowerCase().includes(q);
    r.style.display = match || q === '' ? '' : 'none';
    if (match && q !== '') {
      r.classList.add(styles.highlight);
      found++;
      setTimeout(() => r.classList.remove(styles.highlight), 1500);
    }
  });
  orderRows.forEach((r) => {
    const match = r.textContent.toLowerCase().includes(q);
    r.style.display = match || q === '' ? '' : 'none';
  });
  if (q && found > 0) showToast(found + ' products found');
}

let revChartInstance = null;
let currentRevType = 'revenue';

function switchRev(el) {
  document.querySelectorAll('.' + styles['rev-tab']).forEach((x) => {
    x.classList.remove(styles.active);
    x.classList.add(styles.idle);
  });
  el.classList.remove(styles.idle);
  el.classList.add(styles.active);
  currentRevType = el.dataset.type;
  const pal = P();
  if (revChartInstance) {
    if (currentRevType === 'revenue') {
      revChartInstance.data.datasets[0].data = [38, 46, 58, 68, 44, 38, 58];
      revChartInstance.data.datasets[0].backgroundColor = pal.main;
    } else {
      revChartInstance.data.datasets[0].data = [80, 110, 140, 160, 100, 90, 130];
      revChartInstance.data.datasets[0].backgroundColor = pal.g2;
    }
    revChartInstance.update();
    showToast('Switched to ' + el.textContent);
  }
}

function animateCount(el) {
  const target = parseFloat(el.dataset.target);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  let current = 0;
  const duration = 1200;
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    current = target * ease;
    if (progress < 1) {
      if (target >= 1000) {
        el.textContent = prefix + Math.floor(current).toLocaleString() + (target % 1 !== 0 ? '.' + (target.toString().split('.')[1] || '00').slice(0, 2) : '') + suffix;
      } else if (target % 1 !== 0) {
        el.textContent = prefix + current.toFixed(2) + suffix;
      } else {
        el.textContent = prefix + Math.floor(current).toLocaleString() + suffix;
      }
      requestAnimationFrame(update);
    } else {
      if (prefix === '$' && target >= 1000) {
        el.textContent = prefix + target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + suffix;
      } else if (suffix === '%') {
        el.textContent = prefix + target.toFixed(2) + suffix;
      } else if (target % 1 !== 0) {
        el.textContent = prefix + target.toFixed(2) + suffix;
      } else {
        el.textContent = prefix + target.toLocaleString() + suffix;
      }
    }
  }
  requestAnimationFrame(update);
}

/* Tracks the admin light/dark toggle so charts can re-render with the
   right palette (same behaviour as the previous Overview build). */
function useAdminDark() {
  const [dark, setDark] = useState(isDarkAdmin);
  useEffect(() => {
    const io = new MutationObserver(() => setDark(isDarkAdmin()));
    io.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => io.disconnect();
  }, []);
  return dark;
}

const cx = (...names) => names.map((n) => styles[n]).join(' ');

export default function Overview() {
  const dark = useAdminDark();

  /* Inject the design's Inter font once (idempotent). */
  useEffect(() => {
    if (document.querySelector('link[data-ovw-inter]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    l.setAttribute('data-ovw-inter', '1');
    document.head.appendChild(l);
  }, []);

  /* All dynamic behaviour of the design, in one place. Re-runs on theme
     change (charts rebuild with the matching palette). */
  useEffect(() => {
    const pal = P();
    const timers = [];
    const after = (ms, fn) => timers.push(setTimeout(fn, ms));
    const charts = [];
    const chart = (id, cfg) => {
      const el = document.getElementById(id);
      if (el) charts.push(new Chart(el, cfg));
    };

    /* Sparklines */
    const spark = (id, data) =>
      chart(id, {
        type: 'line',
        data: { labels: data.map((_, i) => i), datasets: [{ data, borderColor: pal.main, borderWidth: 1.4, pointRadius: 0, tension: 0.4, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { point: { radius: 0 } }, animation: { duration: 1000, easing: 'easeOutQuart' } },
      });
    spark('spark1', [8, 12, 6, 10, 14, 7, 16, 9, 13, 5, 15, 18]);
    spark('spark2', [12, 14, 10, 8, 13, 11, 7, 15, 9, 12, 6, 14]);
    spark('spark3', [10, 8, 12, 6, 14, 10, 12, 8, 16, 12, 10, 18]);
    spark('spark4', [14, 10, 12, 8, 10, 14, 8, 12, 10, 8, 14, 10]);
    spark('spark5', [12, 8, 14, 10, 8, 12, 6, 10, 14, 8, 12, 16]);
    spark('spark6', [10, 14, 8, 12, 6, 10, 14, 8, 12, 10, 6, 12]);

    /* Sales Overview (two lines) */
    chart('salesOverview', {
      type: 'line',
      data: {
        labels: ['May 20', 'May 21', 'May 22', 'May 23', 'May 24', 'May 25', 'May 26'],
        datasets: [
          { label: 'This Period', data: [18, 40, 65, 55, 65, 52, 92], borderColor: pal.main, backgroundColor: pal.main, borderWidth: 2.2, tension: 0.35, pointRadius: 4, pointBackgroundColor: pal.main, pointBorderWidth: 2, pointHoverRadius: 6 },
          { label: 'Previous Period', data: [8, 22, 42, 32, 48, 31, 67], borderColor: pal.mutedLine, backgroundColor: pal.mutedLine, borderWidth: 1.5, borderDash: [4, 4], tension: 0.35, pointRadius: 0 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1400, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tooltip, titleFont: { size: 11 }, bodyFont: { size: 11 }, padding: 8, cornerRadius: 8, displayColors: false } },
        scales: {
          y: { min: 0, max: 100, grid: { color: pal.grid, borderDash: [3, 3] }, ticks: { callback: (v) => '$' + v + 'K', font: { size: 10 }, color: pal.tick, stepSize: 25 }, border: { display: false } },
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: pal.tick }, border: { display: false } },
        },
      },
    });

    /* Sales by Channel (doughnut) */
    chart('salesChannel', {
      type: 'doughnut',
      data: { labels: ['Online Store', 'Mobile App', 'Marketplace', 'Others'], datasets: [{ data: [69.6, 16.8, 8.7, 4.7], backgroundColor: [pal.main, pal.g2, pal.g3, pal.g4], borderWidth: 0, hoverOffset: 5 }] },
      options: { cutout: '70%', animation: { animateRotate: true, duration: 1300, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tooltip, padding: 8, cornerRadius: 8, displayColors: false } }, responsive: true, maintainAspectRatio: false },
    });

    /* Revenue & Orders (bar, kept as instance for the tab switch) */
    revChartInstance = document.getElementById('revChart') && new Chart(document.getElementById('revChart'), {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{ data: [38, 46, 58, 68, 44, 38, 58], backgroundColor: pal.main, borderRadius: { topLeft: 4, topRight: 4 }, barThickness: 18, hoverBackgroundColor: isDarkAdmin() ? '#a1a1aa' : '#222' }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1000, delay: (ctx) => ctx.dataIndex * 70, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tooltip, cornerRadius: 8, padding: 8, displayColors: false } },
        scales: {
          y: { min: 0, max: 80, grid: { color: pal.grid2 }, ticks: { callback: (v) => '$' + v + 'K', font: { size: 10 }, color: pal.tick }, border: { display: false } },
          y1: { position: 'right', min: 0, max: 200, grid: { display: false }, ticks: { font: { size: 10 }, color: pal.tick }, border: { display: false } },
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: pal.tick }, border: { display: false } },
        },
      },
    });
    if (revChartInstance) charts.push(revChartInstance);

    /* Orders Status (doughnut) */
    chart('ordersDonut', {
      type: 'doughnut',
      data: { datasets: [{ data: [65, 20, 10, 5], backgroundColor: [pal.main, pal.d2, pal.d3, pal.d4], borderWidth: 0, hoverOffset: 4 }] },
      options: { cutout: '70%', animation: { duration: 1200, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tooltip } }, responsive: true, maintainAspectRatio: false },
    });

    /* Customer Overview (line) */
    chart('custChart', {
      type: 'line',
      data: {
        labels: Array(12).fill(''),
        datasets: [{ data: [30, 25, 40, 20, 35, 15, 28, 38, 30, 45, 35, 40], borderColor: pal.main, borderWidth: 1.3, tension: 0.4, pointRadius: 3, pointBackgroundColor: pal.cardBg, pointBorderColor: pal.main, pointBorderWidth: 1.5, fill: false, pointHoverRadius: 5 }],
      },
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 1200, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tooltip } }, scales: { x: { display: false }, y: { display: false } } },
    });

    /* Live visitor bars + number walk */
    const liveInterval = setInterval(() => {
      document.querySelectorAll('#liveBars div').forEach((div) => {
        const nh = Math.floor(8 + Math.random() * 26);
        div.style.height = nh + 'px';
      });
      const el = document.getElementById('liveNum');
      if (el) {
        let cur = parseInt(el.textContent) || 128;
        cur += Math.random() > 0.5 ? 1 : -1;
        if (cur < 110) cur = 110;
        if (cur > 160) cur = 160;
        el.textContent = cur;
        el.style.transform = 'scale(1.1)';
        after(200, () => { el.style.transform = 'scale(1)'; });
      }
    }, 1800);

    /* Count-up KPI values */
    document.querySelectorAll('.' + styles['count-up']).forEach((el, i) => {
      after(200 + i * 80, () => animateCount(el));
    });

    /* Category bars (staggered width animation) */
    after(600, () => {
      document.querySelectorAll('.' + styles['cat-bar'] + ' div').forEach((div, i) => {
        after(i * 120, () => { div.style.width = div.dataset.w; });
      });
    });

    /* Shortcuts: ⌘K focus search, Esc closes modals/dropdowns */
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
        showToast('Search focused (⌘K)');
      }
      if (e.key === 'Escape') {
        document.querySelectorAll('.' + styles.modal + '.' + styles.show).forEach((m) => m.classList.remove(styles.show));
        document.body.style.overflow = '';
        document.querySelectorAll('.' + styles.dropdown + '.' + styles.show).forEach((d) => d.classList.remove(styles.show));
      }
    };
    const onDocClick = (e) => {
      if (!e.target.closest('.' + styles.pill)) {
        document.querySelectorAll('.' + styles.dropdown).forEach((d) => d.classList.remove(styles.show));
        document.querySelectorAll('.' + styles.pill).forEach((p) => p.classList.remove(styles.active));
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDocClick);

    /* Final load toast */
    after(600, () => showToast('Dashboard loaded — all features working ✓'));

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(liveInterval);
      charts.forEach((c) => c.destroy());
      revChartInstance = null;
      currentRevType = 'revenue';
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDocClick);
    };
  }, [dark]);

  return (
    <AdminLayout title="Overview">
      <div className={styles.ovw}>
        <div className={styles.wrap}>
          {/* ------------------------------ top bar ------------------------------ */}
          <div className={styles.topbar}>
            <div className={styles['top-left']}>
              <div className={styles.hamburger} onClick={() => showToast('Sidebar toggle — hidden as per request')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
              </div>
              <div className={styles['top-title']}>
                <h1>Overview</h1>
                <p>Here's what's happening with your store today.</p>
              </div>
            </div>
            <div className={styles['top-right']}>
              <div className={styles.search}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></svg>
                <input id="searchInput" placeholder="Search orders, products, customers..." onKeyUp={(e) => handleSearch(e)} onFocus={() => showToast('Type to filter products & orders')} />
                <span className={styles.kbd}>⌘ K</span>
              </div>
              <div className={styles.pill} id="datePill" onClick={() => toggleDropdown('dateDrop')}>
                <span>May 20 – May 26, 2025</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                <div className={styles.dropdown} id="dateDrop">
                  <div onClick={() => setDate('May 20 – May 26, 2025')}>May 20 – May 26, 2025</div>
                  <div onClick={() => setDate('May 13 – May 19, 2025')}>May 13 – May 19, 2025</div>
                  <div onClick={() => setDate('May 6 – May 12, 2025')}>May 6 – May 12, 2025</div>
                  <div onClick={() => setDate('Apr 29 – May 5, 2025')}>Apr 29 – May 5, 2025</div>
                </div>
              </div>
              <div className={styles.pill} id="comparePill" onClick={() => toggleDropdown('compareDrop')}>
                <span id="compareText">Compare: Previous 7 days</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                <div className={styles.dropdown} id="compareDrop">
                  <div onClick={() => setCompare('Previous 7 days')}>Previous 7 days</div>
                  <div onClick={() => setCompare('Previous 30 days')}>Previous 30 days</div>
                  <div onClick={() => setCompare('Same period last year')}>Same period last year</div>
                  <div onClick={() => setCompare('No comparison')}>No comparison</div>
                </div>
              </div>
              <button className={styles['btn-black']} onClick={() => openModal('addModal')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                Add New
              </button>
              <div className={styles['icon-btn']} onClick={() => openModal('notifModal')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 7 6 5 6 10H0s6-3 6-10" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
                <div className={styles.badge} id="notifBadge">3</div>
              </div>
              <div className={styles['icon-btn']} onClick={() => toggleFullscreen()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
              </div>
            </div>
          </div>

          {/* ------------------------------ KPI stats ---------------------------- */}
          <div className={styles.stats}>
            <div className={styles.stat} onClick={() => showToast('Total Sales: $128,450.60 — up 18.6%')}>
              <div className={styles['stat-head']}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                Total Sales
              </div>
              <div className={cx('stat-val', 'count-up')} data-target="128450.60" data-prefix="$">$0</div>
              <div className={styles['stat-foot']}>
                <div>
                  <div className={styles['stat-change']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> 18.6%</div>
                  <div className={styles['stat-vs']}>vs May 13 – May 19</div>
                </div>
                <canvas className={styles.spark} id="spark1" />
              </div>
            </div>
            <div className={styles.stat} onClick={() => showToast('Orders: 1,248')}>
              <div className={styles['stat-head']}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                Orders
              </div>
              <div className={cx('stat-val', 'count-up')} data-target="1248">0</div>
              <div className={styles['stat-foot']}>
                <div>
                  <div className={styles['stat-change']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> 15.3%</div>
                  <div className={styles['stat-vs']}>vs May 13 – May 19</div>
                </div>
                <canvas className={styles.spark} id="spark2" />
              </div>
            </div>
            <div className={styles.stat} onClick={() => showToast('Customers: 856')}>
              <div className={styles['stat-head']}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                Customers
              </div>
              <div className={cx('stat-val', 'count-up')} data-target="856">0</div>
              <div className={styles['stat-foot']}>
                <div>
                  <div className={styles['stat-change']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> 22.7%</div>
                  <div className={styles['stat-vs']}>vs May 13 – May 19</div>
                </div>
                <canvas className={styles.spark} id="spark3" />
              </div>
            </div>
            <div className={styles.stat}>
              <div className={styles['stat-head']}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                Avg. Order Value
              </div>
              <div className={cx('stat-val', 'count-up')} data-target="102.90" data-prefix="$">$0</div>
              <div className={styles['stat-foot']}>
                <div>
                  <div className={styles['stat-change']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> 8.7%</div>
                  <div className={styles['stat-vs']}>vs May 13 – May 19</div>
                </div>
                <canvas className={styles.spark} id="spark4" />
              </div>
            </div>
            <div className={styles.stat}>
              <div className={styles['stat-head']}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                Conversion Rate
              </div>
              <div className={cx('stat-val', 'count-up')} data-target="2.35" data-suffix="%">0%</div>
              <div className={styles['stat-foot']}>
                <div>
                  <div className={styles['stat-change']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> 6.7%</div>
                  <div className={styles['stat-vs']}>vs May 13 – May 19</div>
                </div>
                <canvas className={styles.spark} id="spark5" />
              </div>
            </div>
            <div className={styles.stat}>
              <div className={styles['stat-head']}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                Net Profit
              </div>
              <div className={cx('stat-val', 'count-up')} data-target="21245.10" data-prefix="$">$0</div>
              <div className={styles['stat-foot']}>
                <div>
                  <div className={styles['stat-change']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> 20.4%</div>
                  <div className={styles['stat-vs']}>vs May 13 – May 19</div>
                </div>
                <canvas className={styles.spark} id="spark6" />
              </div>
            </div>
          </div>

          {/* --------------------------- charts row 1 --------------------------- */}
          <div className={styles.grid3}>
            <div className={styles.card}>
              <div className={styles['card-h']}>
                <div className={styles['card-t']}>Sales Overview <span className={styles.info} onClick={() => showToast('Sales comparison: this week vs last week')}>i</span></div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className={styles['btn-sm']} onClick={() => toggleDropdown('weekDrop')} style={{ position: 'relative' }}>This Week ▾
                    <div className={styles.dropdown} id="weekDrop" style={{ right: 0, left: 'auto' }}>
                      <div onClick={() => showToast('This Week')}>This Week</div>
                      <div onClick={() => showToast('This Month')}>This Month</div>
                      <div onClick={() => showToast('Last 30 Days')}>Last 30 Days</div>
                    </div>
                  </button>
                  <button className={styles['btn-sm']} onClick={() => showToast('Chart options')}>⋮</button>
                </div>
              </div>
              <div className={styles.legend}>
                <span><b style={{ background: '#111' }} /> This Period</span>
                <span><b style={{ background: '#c8c8c8' }} /> Previous Period</span>
              </div>
              <div className={styles['chart-main']}><canvas id="salesOverview" /></div>
            </div>
            <div className={styles.card}>
              <div className={styles['card-h']}><span className={styles['card-t']}>Sales by Channel</span></div>
              <div className={styles['donut-row']}>
                <div className={styles.donut}>
                  <canvas id="salesChannel" />
                  <div className={styles['donut-center']}><b>$128,450.60</b><span>Total Sales</span></div>
                </div>
                <div className={styles['ch-list']}>
                  <div className={styles['ch-item']}><div className={styles.dot} style={{ background: '#111' }} /> Online Store <span className={styles.pct}>69.6%</span><span className={styles.val}>$89,450.60</span></div>
                  <div className={styles['ch-item']}><div className={styles.dot} style={{ background: '#555' }} /> Mobile App <span className={styles.pct}>16.8%</span><span className={styles.val}>$21,640.20</span></div>
                  <div className={styles['ch-item']}><div className={styles.dot} style={{ background: '#8a8a8a' }} /> Marketplace <span className={styles.pct}>8.7%</span><span className={styles.val}>$11,230.00</span></div>
                  <div className={styles['ch-item']}><div className={styles.dot} style={{ background: '#d6d6d6' }} /> Others <span className={styles.pct}>4.7%</span><span className={styles.val}>$6,110.00</span></div>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: 14 }}>
                <button className={styles['btn-sm']} onClick={() => openModal('reportModal')}>View full report</button>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles['live-top']}><span className={styles['card-t']}>Live Visitors</span><span style={{ fontSize: 10, color: '#0e9f6e', display: 'flex', alignItems: 'center', gap: 5 }}><span className={styles['live-dot']} /> Live</span></div>
              <div className={styles['live-num']} id="liveNum">128</div>
              <div className={styles['live-sub']}>Visitors right now</div>
              <div className={styles['live-bars']} id="liveBars">
                {BASE_HEIGHTS.map((h, i) => <div key={i} style={{ height: h + 'px' }} />)}
              </div>
              <div className={styles.pages}>
                <div className={cx('page-row', 'head')}><span>Top Pages</span><span /></div>
                <div className={styles['page-row']}><span>/</span><span>32</span></div>
                <div className={styles['page-row']}><span>/collections/all</span><span>14</span></div>
                <div className={styles['page-row']}><span>/products/xyz</span><span>11</span></div>
                <div className={styles['page-row']}><span>/cart</span><span>9</span></div>
                <div className={styles['page-row']}><span>/checkout</span><span>8</span></div>
              </div>
              <div style={{ marginTop: 10 }}>
                <button className={styles['btn-sm']} style={{ width: '100%' }} onClick={() => openModal('realtimeModal')}>View real time</button>
              </div>
            </div>
          </div>

          {/* --------------------------- tables row ----------------------------- */}
          <div className={styles.grid4}>
            <div className={styles.card}>
              <div className={styles['card-h']}><span className={styles['card-t']}>Today at a Glance</span></div>
              <div className={styles.glance}>
                <div className={styles['g-item']} onClick={() => showToast('24 New Orders — view list')}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" /></svg></div>
                  <b>24</b><span>New Orders</span>
                </div>
                <div className={styles['g-item']} onClick={() => showToast('8 Pending Payments')}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M12 8v4l3 3" /></svg></div>
                  <b>8</b><span>Pending Payments</span>
                </div>
                <div className={styles['g-item']} onClick={() => showToast('3 Low Stock Alerts — restock needed')}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg></div>
                  <b>3</b><span>Low Stock Alerts</span>
                </div>
                <div className={styles['g-item']} onClick={() => showToast('5 New Customers today')}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><circle cx="12" cy="7" r="3" /><path d="M5 21v-2a5 5 0 0 1 10 0v2" /><circle cx="18" cy="10" r="2" /><path d="M20 21v-1a3 3 0 0 0-3-3" /></svg></div>
                  <b>5</b><span>New Customers</span>
                </div>
              </div>
              <div className={styles['view-all']} onClick={() => openModal('notifModal')}>View all notifications
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles['card-h']}>
                <span className={styles['card-t']}>Top Selling Products</span>
                <span style={{ fontSize: 10.5, color: '#6b7280', cursor: 'pointer' }} onClick={() => showToast('All products — 128 items')}>View all</span>
              </div>
              <table className={styles.tbl} id="productTable">
                <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  <tr onClick={() => showToast('Wireless Headphones — 512 sold')}>
                    <td><div className={styles.prod}><span className={styles['prod-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.5"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg></span> Wireless Headphones</div></td>
                    <td>512</td><td>$25,600</td>
                  </tr>
                  <tr>
                    <td><div className={styles.prod}><span className={styles['prod-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.5"><circle cx="12" cy="12" r="7" /><polyline points="12 9 12 12 13.5 13.5" /></svg></span> Smart Watch Series 9</div></td>
                    <td>412</td><td>$18,560</td>
                  </tr>
                  <tr>
                    <td><div className={styles.prod}><span className={styles['prod-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.5"><path d="M2 18h1.4c1.3 0 2.6-.6 3.5-1.7L9 14l5 2 4.5-3.5A5 5 0 0 1 22 16v2" /><path d="M22 16a5 5 0 0 0-5-5h-1" /></svg></span> Running Shoes</div></td>
                    <td>365</td><td>$14,600</td>
                  </tr>
                  <tr>
                    <td><div className={styles.prod}><span className={styles['prod-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.5"><path d="M5 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z" /><path d="M5 8l2-3h10l2 3" /><path d="M12 12a2 2 0 0 0 0 4 2 2 0 0 0 0-4z" /></svg></span> Backpack</div></td>
                    <td>280</td><td>$8,960</td>
                  </tr>
                  <tr>
                    <td><div className={styles.prod}><span className={styles['prod-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.5"><circle cx="6" cy="15" r="4" /><circle cx="18" cy="15" r="4" /><path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2" /><path d="M2 8l3-3h14l3 3v2a2 2 0 0 1-2 2h-1" /></svg></span> Sunglasses</div></td>
                    <td>210</td><td>$6,720</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={styles.card}>
              <div className={styles['card-h']}>
                <span className={styles['card-t']}>Recent Orders</span>
                <span style={{ fontSize: 10.5, color: '#6b7280', cursor: 'pointer' }} onClick={() => showToast('All 1,248 orders')}>View all</span>
              </div>
              <table className={styles.tbl} id="ordersTable">
                <tbody>
                  <tr onClick={() => showToast('Order #ORD-1250 — John Doe $248 Paid')}>
                    <td><div className={styles.prod}><span className={styles['prod-ico']} style={{ background: '#f0f0f0', fontSize: 9, fontWeight: 700 }}>JD</span> #ORD-1250</div></td>
                    <td>John Doe</td><td>$248.00</td><td><span className={styles['badge-paid']}>Paid</span></td>
                  </tr>
                  <tr>
                    <td><div className={styles.prod}><span className={styles['prod-ico']} style={{ background: '#f0f0f0', fontSize: 9, fontWeight: 700 }}>SW</span> #ORD-1249</div></td>
                    <td>Sarah Williams</td><td>$38.00</td><td><span className={styles['badge-paid']}>Paid</span></td>
                  </tr>
                  <tr>
                    <td><div className={styles.prod}><span className={styles['prod-ico']} style={{ background: '#f0f0f0', fontSize: 9, fontWeight: 700 }}>MB</span> #ORD-1248</div></td>
                    <td>Michael Brown</td><td>$147.64</td><td><span className={styles['badge-pending']}>Pending</span></td>
                  </tr>
                  <tr>
                    <td><div className={styles.prod}><span className={styles['prod-ico']} style={{ background: '#f0f0f0', fontSize: 9, fontWeight: 700 }}>EJ</span> #ORD-1247</div></td>
                    <td>Emma Johnson</td><td>$32.00</td><td><span className={styles['badge-paid']}>Paid</span></td>
                  </tr>
                  <tr>
                    <td><div className={styles.prod}><span className={styles['prod-ico']} style={{ background: '#f0f0f0', fontSize: 9, fontWeight: 700 }}>DS</span> #ORD-1246</div></td>
                    <td>David Smith</td><td>$53.90</td><td><span className={styles['badge-paid']}>Paid</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ------------------------- charts row 2 + categories ---------------- */}
          <div className={styles.grid4b}>
            <div className={styles.card}>
              <div className={styles['card-h']}>
                <span className={styles['card-t']}>Revenue &amp; Orders</span>
                <button className={styles['btn-sm']} onClick={() => toggleDropdown('revDrop')} style={{ position: 'relative' }}>This Week ▾
                  <div className={styles.dropdown} id="revDrop" style={{ right: 0, left: 'auto' }}>
                    <div onClick={() => showToast('This Week revenue')}>This Week</div>
                    <div onClick={() => showToast('This Month revenue')}>This Month</div>
                  </div>
                </button>
              </div>
              <div className={styles['rev-tabs']}>
                <span className={cx('rev-tab', 'active')} data-type="revenue" onClick={(e) => switchRev(e.currentTarget)}>Revenue</span>
                <span className={cx('rev-tab', 'idle')} data-type="orders" onClick={(e) => switchRev(e.currentTarget)}>Orders</span>
                <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> 18.6%
                </span>
              </div>
              <div className={styles['rev-chart']}><canvas id="revChart" /></div>
            </div>
            <div className={styles.card}>
              <div className={styles['card-h']}><span className={styles['card-t']}>Orders Status</span></div>
              <div className={styles['orders-flex']}>
                <div className={styles['orders-donut']}>
                  <canvas id="ordersDonut" />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <b style={{ fontSize: 13 }}>1,248</b>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>Total Orders</span>
                  </div>
                </div>
                <div className={styles['orders-legend']}>
                  <div className={styles['ol-item']}><div className={styles['ol-dot']} style={{ background: '#111' }} /> Delivered <span style={{ marginLeft: 6 }}>65% (812)</span></div>
                  <div className={styles['ol-item']}><div className={styles['ol-dot']} style={{ background: '#555' }} /> Processing <span style={{ marginLeft: 6 }}>20% (250)</span></div>
                  <div className={styles['ol-item']}><div className={styles['ol-dot']} style={{ background: '#9ca3af' }} /> Pending <span style={{ marginLeft: 6 }}>10% (124)</span></div>
                  <div className={styles['ol-item']}><div className={styles['ol-dot']} style={{ background: '#e5e7eb' }} /> Cancelled <span style={{ marginLeft: 6 }}>5% (62)</span></div>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <button className={styles['btn-sm']} onClick={() => openModal('ordersModal')}>View all orders ▾</button>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles['card-h']}><span className={styles['card-t']}>Customer Overview</span></div>
              <div className={styles['cust-head']}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>Total Customers</div>
                  <div className={styles['cust-big']}>12,850</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={styles['cust-growth']}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> 24.5%</div>
                  <div className={styles['cust-sub']}>vs Apr 20 – Apr 26</div>
                </div>
              </div>
              <div className={styles['cust-line']}><canvas id="custChart" /></div>
              <div className={styles['cust-bottom']}>
                <div className={styles['cust-b']}>
                  <div style={{ fontSize: 9, color: 'var(--muted)' }}>New Customers</div>
                  <b>856</b> <span style={{ fontSize: 10, color: 'var(--green)' }}>↑ 22.7%</span>
                </div>
                <div className={styles['cust-b']}>
                  <div style={{ fontSize: 9, color: 'var(--muted)' }}>Returning Customers</div>
                  <b>2,450</b> <span style={{ fontSize: 10, color: 'var(--green)' }}>↑ 18.3%</span>
                </div>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles['card-h']}>
                <span className={styles['card-t']}>Top Categories</span>
                <span style={{ fontSize: 10.5, color: 'var(--muted)', cursor: 'pointer' }} onClick={() => showToast('All categories')}>View all</span>
              </div>
              <div>
                <div className={styles['cat-row']}><span className={styles['cat-name']}>Electronics</span><div className={styles['cat-bar']}><div data-w="90%" /></div><span className={styles['cat-val']}>$48,250.60</span></div>
                <div className={styles['cat-row']}><span className={styles['cat-name']}>Fashion</span><div className={styles['cat-bar']}><div data-w="66%" /></div><span className={styles['cat-val']}>$32,140.20</span></div>
                <div className={styles['cat-row']}><span className={styles['cat-name']}>Home &amp; Living</span><div className={styles['cat-bar']}><div data-w="38%" /></div><span className={styles['cat-val']}>$18,500.00</span></div>
                <div className={styles['cat-row']}><span className={styles['cat-name']}>Beauty</span><div className={styles['cat-bar']}><div data-w="25%" /></div><span className={styles['cat-val']}>$12,120.40</span></div>
                <div className={styles['cat-row']}><span className={styles['cat-name']}>Sports</span><div className={styles['cat-bar']}><div data-w="15%" /></div><span className={styles['cat-val']}>$7,439.40</span></div>
              </div>
            </div>
          </div>

          {/* ---------------------------- quick actions ------------------------- */}
          <div className={styles.card} style={{ marginBottom: 10 }}>
            <div className={styles['card-h']}><span className={styles['card-t']}>Quick Actions</span></div>
            <div className={styles.quick}>
              <button className={styles['q-btn']} onClick={() => openModal('createOrderModal')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14h6M12 11v6" /></svg>
                <span>Create Order</span>
              </button>
              <button className={styles['q-btn']} onClick={() => openModal('addProductModal')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                <span>Add Product</span>
              </button>
              <button className={styles['q-btn']} onClick={() => showToast('Discount created: SAVE10')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 12V8H6a2 2 0 0 1 2-2c0-1.1.9-2 2-2a2 2 0 0 1 2 2c0-1.1.9-2 2-2a2 2 0 0 1 2 2c0-1.1.9-2 2-2a2 2 0 0 1 2 2v4" /><path d="M20 12v4H6a2 2 0 0 0-2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0 1.1.9 2 2 2a2 2 0 0 0 2-2v-4" /><circle cx="12" cy="12" r="2" /></svg>
                <span>Add Discount</span>
              </button>
              <button className={styles['q-btn']} onClick={() => showToast('New Collection created')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
                <span>Create Collection</span>
              </button>
              <button className={styles['q-btn']} onClick={() => showToast('Email sent to 856 customers')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                <span>Send Email</span>
              </button>
              <button className={styles['q-btn']} onClick={() => openModal('reportModal')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 6-6" /></svg>
                <span>View Reports</span>
              </button>
              <button className={styles['q-btn']} onClick={() => showToast('Inventory alert set for 3 products')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 8a6 6 0 0 1 12 0c0 7 6 5 6 10H0s6-3 6-10" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
                <span>Inventory Alert</span>
              </button>
              <button className={styles['q-btn']} onClick={() => openModal('supportModal')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                <span>Support Ticket</span>
              </button>
            </div>
          </div>

          {/* --------------------------- smart insights ------------------------- */}
          <div className={styles.card}>
            <div className={styles['card-h']}><span className={styles['card-t']}>• Smart Insights</span></div>
            <div className={styles.insights}>
              <div className={styles['ins-card']} onClick={() => showToast('High Demand: Wireless Headphones +32%')}>
                <div className={styles['ins-left']}>
                  <div className={styles['ins-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.3L12 16.5 5.8 21l2.4-7.3L2 9.2h7.6z" /></svg></div>
                  <div><b>High Demand</b><p>"Wireless Headphones" sales increased by 32% compared to last week.</p></div>
                </div>
                <div className={styles['ins-arrow']}>→</div>
              </div>
              <div className={styles['ins-card']} onClick={() => showToast('Low Stock: 3 products need restock')}>
                <div className={styles['ins-left']}>
                  <div className={styles['ins-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14l2 2 4-4" /></svg></div>
                  <div><b>Low Stock</b><p>3 products are running low on stock.</p></div>
                </div>
                <div className={styles['ins-link']} onClick={() => openModal('stockModal')}>View products →</div>
              </div>
              <div className={styles['ins-card']} onClick={() => showToast('Abandoned Carts: 128 pending')}>
                <div className={styles['ins-left']}>
                  <div className={styles['ins-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg></div>
                  <div><b>Abandoned Carts</b><p>128 carts are pending recovery.</p></div>
                </div>
                <div className={styles['ins-link']} onClick={() => showToast('Recovering 128 carts... Email sent')}>Recover now →</div>
              </div>
              <div className={styles['ins-card']} onClick={() => showToast('Best day: Thursday — $12,450')}>
                <div className={styles['ins-left']}>
                  <div className={styles['ins-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
                  <div><b>Best Selling Day</b><p>Thursday generated the highest sales.</p></div>
                </div>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                  <div style={{ width: 4, height: 12, background: '#111', borderRadius: 2 }} />
                  <div style={{ width: 4, height: 18, background: '#555', borderRadius: 2 }} />
                  <div style={{ width: 4, height: 24, background: '#111', borderRadius: 2 }} />
                </div>
              </div>
              <div className={styles['ins-card']} onClick={() => showToast('Conversion +6.7% Great job!')}>
                <div className={styles['ins-left']}>
                  <div className={styles['ins-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg></div>
                  <div><b>Conversion Boost</b><p>Your conversion rate is up 6.7% this week. Great job!</p></div>
                </div>
                <div className={styles['ins-arrow']}>→</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast + modals: portaled to <body> so fixed positioning is safe */}
      {createPortal(
        <div className={styles.toast} id="toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          <span id="toastText">Done</span>
        </div>,
        document.body,
      )}
      {createPortal(
        <>
          <div className={styles.modal} id="addModal" onClick={(e) => closeModal(e, 'addModal')}>
            <div className={styles['modal-box']}><h3>Add New</h3><p>Create a new order, product, customer or collection. Choose what you want to add.</p>
              <div className={styles['modal-actions']}><button onClick={() => closeModal(null, 'addModal')}>Cancel</button><button className={styles.primary} onClick={() => { showToast('New item creation opened'); closeModal(null, 'addModal'); }}>Create</button></div>
            </div>
          </div>
          <div className={styles.modal} id="reportModal" onClick={(e) => closeModal(e, 'reportModal')}>
            <div className={styles['modal-box']}><h3>Full Report</h3><p>Detailed sales report from May 20-26, 2025. Total $128,450.60 across 4 channels. Online Store leads with 69.6%.</p>
              <div className={styles['modal-actions']}><button onClick={() => closeModal(null, 'reportModal')}>Close</button><button className={styles.primary} onClick={() => { showToast('Report downloaded as PDF'); closeModal(null, 'reportModal'); }}>Download PDF</button></div>
            </div>
          </div>
          <div className={styles.modal} id="realtimeModal" onClick={(e) => closeModal(e, 'realtimeModal')}>
            <div className={styles['modal-box']}><h3>Live Visitors — Real Time</h3><p>128 visitors right now. Top page: / (32). Real-time tracking active. Updates every 2 seconds.</p>
              <div className={styles['modal-actions']}><button onClick={() => closeModal(null, 'realtimeModal')}>Close</button><button className={styles.primary} onClick={() => { showToast('Live view opened in new tab'); closeModal(null, 'realtimeModal'); }}>Open Live View</button></div>
            </div>
          </div>
          <div className={styles.modal} id="notifModal" onClick={(e) => closeModal(e, 'notifModal')}>
            <div className={styles['modal-box']}><h3>Notifications (3 new)</h3><p>• 24 New Orders<br />• 8 Pending Payments<br />• 3 Low Stock Alerts<br />• 5 New Customers</p>
              <div className={styles['modal-actions']}><button onClick={() => closeModal(null, 'notifModal')}>Close</button><button className={styles.primary} onClick={() => markRead()}>Mark all as read</button></div>
            </div>
          </div>
          <div className={styles.modal} id="createOrderModal" onClick={(e) => closeModal(e, 'createOrderModal')}>
            <div className={styles['modal-box']}><h3>Create Order</h3><p>New order form — customer, products, payment. Order #ORD-1251 will be created.</p>
              <div className={styles['modal-actions']}><button onClick={() => closeModal(null, 'createOrderModal')}>Cancel</button><button className={styles.primary} onClick={() => { showToast('Order #ORD-1251 created'); closeModal(null, 'createOrderModal'); }}>Create Order</button></div>
            </div>
          </div>
          <div className={styles.modal} id="addProductModal" onClick={(e) => closeModal(e, 'addProductModal')}>
            <div className={styles['modal-box']}><h3>Add Product</h3><p>Add a new product to your catalog — name, price, stock, images.</p>
              <div className={styles['modal-actions']}><button onClick={() => closeModal(null, 'addProductModal')}>Cancel</button><button className={styles.primary} onClick={() => { showToast('Product added successfully'); closeModal(null, 'addProductModal'); }}>Add Product</button></div>
            </div>
          </div>
          <div className={styles.modal} id="ordersModal" onClick={(e) => closeModal(e, 'ordersModal')}>
            <div className={styles['modal-box']}><h3>All Orders — 1,248</h3><p>Delivered 812, Processing 250, Pending 124, Cancelled 62. Export or filter orders.</p>
              <div className={styles['modal-actions']}><button onClick={() => closeModal(null, 'ordersModal')}>Close</button><button className={styles.primary} onClick={() => showToast('Orders exported to CSV')}>Export CSV</button></div>
            </div>
          </div>
          <div className={styles.modal} id="stockModal" onClick={(e) => closeModal(e, 'stockModal')}>
            <div className={styles['modal-box']}><h3>Low Stock — 3 Products</h3><p>• Wireless Headphones — 4 left<br />• Running Shoes — 7 left<br />• Backpack — 2 left</p>
              <div className={styles['modal-actions']}><button onClick={() => closeModal(null, 'stockModal')}>Close</button><button className={styles.primary} onClick={() => showToast('Restock order placed')}>Restock</button></div>
            </div>
          </div>
          <div className={styles.modal} id="supportModal" onClick={(e) => closeModal(e, 'supportModal')}>
            <div className={styles['modal-box']}><h3>Support Ticket</h3><p>Contact support — average response time 2 hours. Our team is online.</p>
              <div className={styles['modal-actions']}><button onClick={() => closeModal(null, 'supportModal')}>Cancel</button><button className={styles.primary} onClick={() => { showToast('Support ticket #ST-889 created'); closeModal(null, 'supportModal'); }}>Create Ticket</button></div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </AdminLayout>
  );
}
