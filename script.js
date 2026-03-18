/* ============================================================
   OceanRAG 2.0 — script.js
   Progressive Disclosure & Interactive Demo logic
   Light Theme updates
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Progressive Disclosure (Fade in / Slide up)
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -100px 0px',
    threshold: 0.1
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Staggered delay based on index or custom logic
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, 100); 
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const revealElements = document.querySelectorAll('.reveal-wrapper');
  revealElements.forEach(el => revealObserver.observe(el));


  // Mouse-following Glow for Pain Cards
  const painCards = document.querySelectorAll('.pain-card');
  painCards.forEach(card => {
    let mouseTicking = false;
    card.addEventListener('mousemove', (e) => {
      if (!mouseTicking) {
        window.requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--mouse-x', `${x}px`);
          card.style.setProperty('--mouse-y', `${y}px`);
          mouseTicking = false;
        });
        mouseTicking = true;
      }
    });
  });

  // --- 2. Cost Section Toggle & Chart ---
  const toggleLocal = document.getElementById('toggleLocal');
  const toggleCloud = document.getElementById('toggleCloud');
  const panelLocal = document.getElementById('panelLocal');
  const panelCloud = document.getElementById('panelCloud');
  const costSubtitle = document.getElementById('costSubtitle');
  let chartInstance = null;

  function switchCostMode(mode) {
    const isLocal = mode === 'local';
    toggleLocal.classList.toggle('active', isLocal);
    toggleCloud.classList.toggle('active', !isLocal);
    panelLocal.classList.toggle('active', isLocal);
    panelCloud.classList.toggle('active', !isLocal);
    costSubtitle.textContent = isLocal
      ? '只需要花 2 萬元的硬體，你就有 24 小時的數位員工'
      : '用極具吸引力的用量控制，保證最穩定和精準的輸出結果';

    if (!isLocal && !chartInstance) initCostChart();
  }

  if (toggleLocal && toggleCloud) {
    toggleLocal.addEventListener('click', () => switchCostMode('local'));
    toggleCloud.addEventListener('click', () => switchCostMode('cloud'));
  }

  function initCostChart() {
    const canvas = document.getElementById('costChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');

    const pages = [10,20,40,70,100,150,200,300,400,500,700,1000,1500,2000,3000,5000];
    const TPP = 450;
    const IN_PRICE = 2.50, OUT_PRICE = 10.00;

    function plainCost(p) {
      const inT = p * TPP;
      const outT = inT * 0.20;
      return (inT * IN_PRICE + outT * OUT_PRICE) / 1e6;
    }
    function plainAcc(p) {
      if (p <= 100) return Math.max(85, 92 - Math.log10(p / 10) * 7);
      return Math.max(25, 85 - Math.log10(p / 100) * 35);
    }
    function ragAcc(p) {
      return Math.max(80, 94 - Math.log10(p / 10) * 5);
    }

    const dPC = pages.map(plainCost);
    const startValue = dPC[0];
    const dRC = pages.map((p, i) => i === 0 ? startValue : plainCost(p) * 0.10);
    const dPA = pages.map(plainAcc);
    const dRA = pages.map(ragAcc);

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: pages.map(p => p >= 1000 ? (p / 1000) + 'k' : String(p)),
        datasets: [
          { label: '一般AI應用 成本', data: dPC, borderColor: '#dc2626', borderWidth: 3, pointRadius: 0, tension: 0.35, fill: false, yAxisID: 'yC' },
          { label: 'OceanRAG 成本', data: dRC, borderColor: '#004d80', borderWidth: 3, pointRadius: 0, tension: 0.1, fill: false, yAxisID: 'yC' },
          { label: '一般AI應用 精準度', data: dPA, borderColor: '#dc2626', borderWidth: 2, borderDash: [7, 5], pointRadius: 0, tension: 0.4, fill: false, yAxisID: 'yA' },
          { label: 'OceanRAG 精準度', data: dRA, borderColor: '#004d80', borderWidth: 2, borderDash: [7, 5], pointRadius: 0, tension: 0.35, fill: false, yAxisID: 'yA' },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 28, right: 4, bottom: 7, left: 4 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#ffffff',
            titleColor: '#0f172a',
            bodyColor: '#475569',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              title: function(ctx) {
                var p = pages[ctx[0].dataIndex];
                return p.toLocaleString() + ' 頁　≈ ' + Math.round(p * TPP / 1000) + 'k tokens';
              },
              label: function(ctx) {
                var v = ctx.parsed.y, l = ctx.dataset.label;
                if (l.includes('精準度')) return l + '：' + v.toFixed(1) + '%';
                if (v >= 1)    return l + '：$' + v.toFixed(2) + ' / 次';
                if (v >= 0.01) return l + '：$' + v.toFixed(4) + ' / 次';
                return l + '：$' + v.toFixed(5) + ' / 次';
              }
            }
          }
        },
        scales: {
          x: { display: false },
          yC: { type: 'linear', min: 0, max: 2.5, display: false },
          yA: { min: 0, max: 100, display: false, position: 'right' }
        }
      }
    });
  }

  // --- 3. 進階權限比較滑桿邏輯 ---
  const permContainer = document.getElementById('permSliderContainer');
  const staffView = document.getElementById('staffViewLayer');
  const sliderHandle = document.getElementById('permSliderHandle');

  if (permContainer && staffView && sliderHandle) {
    let isDragging = false;

    const updateSlider = (clientX) => {
      const rect = permContainer.getBoundingClientRect();
      let x = clientX - rect.left;
      let percentage = (x / rect.width) * 100;
      percentage = Math.max(0, Math.min(percentage, 100));

      staffView.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
      sliderHandle.style.left = percentage + '%';
      sliderHandle.setAttribute('aria-valuenow', Math.round(percentage));
    };

    const onMouseDown = (e) => {
      isDragging = true;
      updateSlider(e.clientX);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      updateSlider(e.clientX);
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onTouchMove = (e) => {
      if (!isDragging) return;
      updateSlider(e.touches[0].clientX);
    };

    permContainer.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    permContainer.addEventListener('touchstart', (e) => {
      isDragging = true;
      updateSlider(e.touches[0].clientX);
    });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);
  }

  // --- 4. Pipeline Step Animation ---
  const pipelineEl = document.getElementById('demoPipeline');
  if (pipelineEl) {
    const stepCards = pipelineEl.querySelectorAll('.pipe-step-card');
    const pipeObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        stepCards.forEach((card, i) => {
          setTimeout(() => card.classList.add('visible'), 200 + i * 300);
        });
        pipeObserver.unobserve(entries[0].target);
      }
    }, { threshold: 0.3 });
    pipeObserver.observe(pipelineEl);
  }

  // --- 5. Mobile Menu Toggle & Navbar Hide-on-Scroll ---
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  const header = document.querySelector('.header');
  let lastScrollY = window.scrollY;
  const scrollThreshold = 100;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;

        // Show header when scrolling up or at the very top
        if (currentScrollY < lastScrollY || currentScrollY < scrollThreshold) {
          header.classList.remove('header-hidden');
        }
        // Hide header when scrolling down and passed the threshold
        else if (currentScrollY > lastScrollY && currentScrollY > scrollThreshold) {
          // Don't hide if menu is open
          if (menuToggle && !menuToggle.classList.contains('active')) {
            header.classList.add('header-hidden');
          }
        }

        lastScrollY = currentScrollY;
        ticking = false;
      });

      ticking = true;
    }
  }, { passive: true });

  if (menuToggle && navLinks) {
    const navLinksItems = navLinks.querySelectorAll('a');

    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
      document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    navLinksItems.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }
});
