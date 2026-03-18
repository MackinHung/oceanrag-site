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

  // --- 2. 進階權限比較滑桿邏輯 ---
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

  // --- 3. Interactive Consultant Logic (Strictly following 資料範例互動.txt) ---
  const scenario = [
    {
        user: "國內客戶的訂單達交率掉了 12%，列出內部規範中對應的處置方案。",
        ai: `
            <p style="margin-bottom: 12px;">根據內部規範與當前路況數據，針對交期延誤的標準處置措施如下：</p>
            <ol style="list-style: decimal; padding-left: 20px; gap: 8px; display: flex; flex-direction: column; margin-bottom: 8px;">
                <li><strong>啟動分批交貨：</strong> 優先從中南部未受影響的倉儲調撥現有庫存，滿足急用生產線需求。</li>
                <li><strong>物流改道與專案補貼：</strong> 改由台北港進出，或直接透過點對點專車配送。</li>
                <li><strong>替代料件放行：</strong> 檢視 ERP 內是否有規格相容且庫存充足的替代品。</li>
            </ol>
        `,
        confLevel: "信心度", confScore: "85%", confColor: "green",
        sources: [
            { type: 'emerald', text: '[1] 交通部路況-0313' },
            { type: 'blue', text: '[2] ERP內部規範' }
        ],
        metadata: "下午02:18 · AI 引擎 · 2K/345 · 4.2s · #AUD-20260313-112b3c4d"
    },
    {
        user: "目前 ERP 裡台中倉跟高雄倉的可用庫存總和，能補足北部多少缺口？",
        ai: `
            <p style="margin-bottom: 12px;">根據最新庫存快照，台中倉與高雄倉目前的靜態可用庫存總和，約佔北部缺口的 <span class="highlight-ref">45%</span>。</p>
        `,
        confLevel: "信心度", confScore: "38%", confColor: "amber",
        sources: [], 
        metadata: "下午02:19 · AI 引擎 · 2K/565 · 9.7s · #AUD-20260313-35f92a42"
    }
  ];

  let currentStep = 0;

  window.activateConsultantMode = function() {
    const reportPanel = document.getElementById('reportPanel');
    const chatPanel = document.getElementById('chatPanel');
    const reportFooter = document.getElementById('reportFooter');
    const pinnedHeader = document.getElementById('pinnedHeader');
    const input = document.getElementById('consultantInput');

    if (!reportPanel || !chatPanel) return;

    if (window.innerWidth <= 900) {
      chatPanel.classList.add('active');
    } else {
      reportPanel.style.width = '42%';
      reportPanel.style.borderRight = '1px solid #e2e8f0';
      chatPanel.style.width = '58%';
    }
    chatPanel.style.opacity = '1';

    if (reportFooter) reportFooter.style.display = 'none';
    if (pinnedHeader) pinnedHeader.style.display = 'flex';
    
    setTimeout(() => {
        if (input) input.value = scenario[0].user;
    }, 600);
  };

  window.nextChatStep = function() {
    if (currentStep >= scenario.length) return;
    const stepData = scenario[currentStep];
    const msgs = document.getElementById('chatMessages');
    const input = document.getElementById('consultantInput');
    const btn = document.getElementById('consultantSendBtn');

    if (!msgs) return;

    // User message
    const divUser = document.createElement('div');
    divUser.className = 'msg-fade-in';
    divUser.style = 'align-self: flex-end; max-width: 85%;';
    divUser.innerHTML = `
        <div style="background: #2563eb; color: white; padding: 12px 16px; border-radius: 16px 16px 2px 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); font-size: 14px; line-height: 1.6;">
            ${stepData.user}
        </div>
        <div style="text-align: right; font-size: 12px; color: #94a3b8; margin-top: 4px;">${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    msgs.appendChild(divUser);
    if (input) input.value = '';
    if (btn) btn.disabled = true;

    // Typing
    const typingId = 'typing-' + currentStep;
    const divTyping = document.createElement('div');
    divTyping.id = typingId;
    divTyping.className = 'msg-fade-in';
    divTyping.style = 'align-self: flex-start; display: flex; gap: 12px;';
    divTyping.innerHTML = `
        <div style="width: 28px; height: 28px; border-radius: 50%; background: #2563eb; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
            <i class="fa-solid fa-robot" style="font-size: 12px;"></i>
        </div>
        <div style="background: white; border: 1px solid #f1f5f9; padding: 12px 16px; border-radius: 0 12px 12px 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
    `;
    msgs.appendChild(divTyping);
    msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' });

    // AI Reply
    setTimeout(() => {
        const tEl = document.getElementById(typingId);
        if (tEl) tEl.remove();

        const cc = stepData.confColor === 'green' ? 
            { bg: 'rgba(236, 253, 245, 0.5)', icon: '#10b981', text: '#065f46', val: '#059669', border: '#a7f3d0' } : 
            { bg: 'rgba(255, 251, 235, 0.5)', icon: '#f59e0b', text: '#78350f', val: '#d97706', border: '#fde68a' };

        const sourcesHtml = stepData.sources && stepData.sources.length > 0 
            ? stepData.sources.map(s => `<span style="border: 1px solid #e2e8f0; background: #f9fafb; padding: 4px 8px; border-radius: 6px; color: #64748b; display: flex; align-items: center; white-space: nowrap;"><span style="width: 6px; height: 6px; border-radius: 50%; background: ${s.type === 'emerald' ? '#10b981' : '#3b82f6'}; margin-right: 6px;"></span>${s.text}</span>`).join('')
            : `<span style="color: #94a3b8; font-style: italic;">無引用外部資料或最新內部佐證</span>`;

        const divAI = document.createElement('div');
        divAI.className = 'msg-fade-in';
        divAI.style = 'align-self: flex-start; width: 100%; max-width: 95%; display: flex; gap: 12px;';
        divAI.innerHTML = `
            <div style="width: 28px; height: 28px; border-radius: 50%; background: #2563eb; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: white;">
                <i class="fa-solid fa-robot" style="font-size: 12px;"></i>
            </div>
            <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden; width: 100%;">
                <div style="padding: 16px; font-size: 14px; color: #334155; line-height: 1.6;">
                    ${stepData.ai}
                    
                    <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 12px;">
                        <div style="background: ${cc.bg}; border: 1px solid ${cc.border}; border-radius: 8px; padding: 10px; display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-triangle-exclamation" style="color: ${cc.icon};"></i>
                                <span style="color: ${cc.text}; font-weight: 500; font-size: 12px;">${stepData.confLevel}</span>
                            </div>
                            <span style="color: ${cc.val}; font-weight: 700; font-size: 14px; border-bottom: 1px dashed currentColor;">${stepData.confScore}</span>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px;">
                            ${sourcesHtml}
                        </div>
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f8fafc; display: flex; flex-direction: column; gap: 8px;">
                            <div>
                                <button style="display: flex; align-items: center; gap: 6px; background: white; border: 1px solid #e2e8f0; color: #94a3b8; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                    <i class="fa-solid fa-flag" style="font-size: 10px;"></i> 回報
                                </button>
                            </div>
                            <div style="font-size: 11px; color: #cbd5e1; font-family: monospace;">
                                ${stepData.metadata}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        msgs.appendChild(divAI);
        msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' });

        currentStep++;
        if (currentStep < scenario.length) {
            if (input) input.value = scenario[currentStep].user;
            if (btn) btn.disabled = false;
        } else {
            if (input) input.placeholder = "展示結束，可自由對話...";
        }
    }, 1200);
  };

  // --- 4. Agent Demo Automation (展示化) ---
  let demoRunOnce = false;
  
  window.runConsultantDemo = function() {
      if (demoRunOnce) return;
      demoRunOnce = true;

      const cursor = document.getElementById('virtualCursor');
      const pinBtn = document.getElementById('pinBtn');
      const container = document.querySelector('.consultant-grid');
      const appWin = document.getElementById('appContainer');
      
      if (!cursor || !pinBtn || !container) return;

      // Prevent human interaction during demo
      if (appWin) appWin.style.pointerEvents = 'none';

      // Reset and display cursor
      cursor.style.display = 'block';
      cursor.style.left = '0';
      cursor.style.top = '0';
      cursor.style.opacity = '1';
      
      // Start position (bottom right corner of container)
      const startX = container.offsetWidth * 0.9;
      const startY = container.offsetHeight * 0.95;
      cursor.style.transform = `translate(${startX}px, ${startY}px)`;
      cursor.style.transition = 'transform 3s cubic-bezier(0.2, 0, 0.2, 1)'; 

      setTimeout(() => {
          // 1. Move to Pin Button (Takes 3s)
          moveCursorToElement(cursor, pinBtn, container);
          
          setTimeout(() => {
              // 2. Click Pin
              simulateClick(cursor, () => {
                  window.activateConsultantMode();
                  
                  // Wait 3.5s before next major action (Move to Send)
                  setTimeout(() => {
                      const sendBtn = document.getElementById('consultantSendBtn');
                      cursor.style.transition = 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
                      moveCursorToElement(cursor, sendBtn, container);
                      
                      setTimeout(() => {
                          // 3. First Click Send
                          simulateClick(cursor, () => {
                              window.nextChatStep();
                              
                              // Wait 3.5s before second click
                              setTimeout(() => {
                                  // 4. Second Click Send
                                  simulateClick(cursor, () => {
                                      window.nextChatStep();
                                      setTimeout(() => { 
                                          cursor.style.opacity = '0';
                                          setTimeout(() => {
                                              cursor.style.display = 'none';
                                              // Restore human interaction
                                              if (appWin) appWin.style.pointerEvents = 'auto';
                                              const input = document.getElementById('consultantInput');
                                              if (input) input.placeholder = "Demo結束，此環節有使用外網蒐資料";
                                          }, 1000);
                                      }, 2000);
                                  });
                              }, 3500);
                          });
                      }, 1300); // Buffer for movement
                  }, 3500);
              });
          }, 3200); // 3s movement + 200ms buffer
      }, 500);
  };

  function moveCursorToElement(cursor, el, container) {
      if (!el || !container) return;
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const x = eRect.left - cRect.left + (eRect.width / 2);
      const y = eRect.top - cRect.top + (eRect.height / 2);
      cursor.style.transform = `translate(${x}px, ${y}px)`;
  }

  function simulateClick(cursor, callback) {
      cursor.classList.add('clicking');
      setTimeout(() => {
          cursor.classList.remove('clicking');
          if (callback) callback();
      }, 400);
  }

  // Trigger demo when scrolled into view
  const demoObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
          window.runConsultantDemo();
          demoObserver.unobserve(entries[0].target);
      }
  }, { threshold: 0.5 });

  const demoSection = document.querySelector('.consultant-grid');
  if (demoSection) demoObserver.observe(demoSection);

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
