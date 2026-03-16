document.addEventListener('DOMContentLoaded', () => {

    // ─── 1. Sidebar Toggle ────────────────────────────────────────
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function isMobile() { return window.innerWidth <= 900; }

    function openSidebar() {
        sidebar.classList.add('active');
        sidebar.classList.remove('collapsed');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function toggleSidebar() {
        if (isMobile()) {
            if (sidebar.classList.contains('active')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        } else {
            // Desktop: collapse/expand in-flow
            sidebar.classList.toggle('collapsed');
        }
    }

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Close sidebar when overlay is tapped
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar when a nav item is clicked on mobile
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (isMobile()) closeSidebar();
        });
    });

    // Re-evaluate on resize
    window.addEventListener('resize', () => {
        if (!isMobile()) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // ─── 2. Search ──────────────────────────────────────────────
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const searchKbd = document.getElementById('searchKbd');
    const mainReader = document.querySelector('.main-reader');

    // Build search index from page sections
    const searchIndex = [];
    document.querySelectorAll('.content-canvas section[id]').forEach(section => {
        const heading = section.querySelector('h1, h2, h3');
        const sectionTitle = heading ? heading.textContent.trim() : '';
        // Collect all text paragraphs and list items
        const textEls = section.querySelectorAll('p, li, td, th');
        textEls.forEach(el => {
            const text = el.textContent.trim();
            if (text.length > 15) {
                searchIndex.push({
                    sectionId: section.id,
                    sectionTitle,
                    text,
                    el,
                });
            }
        });
        // Also index headings themselves
        if (sectionTitle) {
            searchIndex.push({
                sectionId: section.id,
                sectionTitle,
                text: sectionTitle,
                el: heading,
            });
        }
    });

    let searchTimeout = null;

    function doSearch(query) {
        searchResults.innerHTML = '';
        if (!query || query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }

        const q = query.toLowerCase();
        const matches = [];
        const seen = new Set();

        for (const item of searchIndex) {
            if (matches.length >= 12) break;
            const idx = item.text.toLowerCase().indexOf(q);
            if (idx === -1) continue;

            // Deduplicate by section + rough text match
            const key = item.sectionId + '|' + item.text.slice(0, 60);
            if (seen.has(key)) continue;
            seen.add(key);

            // Extract snippet around match
            const start = Math.max(0, idx - 30);
            const end = Math.min(item.text.length, idx + query.length + 50);
            let snippet = (start > 0 ? '...' : '') +
                item.text.slice(start, end) +
                (end < item.text.length ? '...' : '');

            matches.push({ ...item, snippet, matchIdx: idx - start + (start > 0 ? 3 : 0) });
        }

        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="search-no-result">找不到相關內容</div>';
            searchResults.classList.add('active');
            return;
        }

        matches.forEach(m => {
            const div = document.createElement('div');
            div.className = 'search-result-item';

            // Highlight match in snippet
            const before = escapeHtml(m.snippet.slice(0, m.matchIdx));
            const match = escapeHtml(m.snippet.slice(m.matchIdx, m.matchIdx + query.length));
            const after = escapeHtml(m.snippet.slice(m.matchIdx + query.length));

            div.innerHTML = `
                <div class="result-section">${escapeHtml(m.sectionTitle)}</div>
                <div class="result-text">${before}<mark>${match}</mark>${after}</div>
            `;

            div.addEventListener('click', () => {
                searchResults.classList.remove('active');
                searchInput.value = '';
                // Scroll to element
                if (m.el && mainReader) {
                    const rect = m.el.getBoundingClientRect();
                    const readerRect = mainReader.getBoundingClientRect();
                    const scrollOffset = mainReader.scrollTop + (rect.top - readerRect.top) - 80;
                    mainReader.scrollTo({ top: scrollOffset, behavior: 'smooth' });
                    // Brief highlight
                    m.el.style.transition = 'background 0.3s';
                    m.el.style.background = 'rgba(0, 77, 128, 0.08)';
                    m.el.style.borderRadius = '4px';
                    setTimeout(() => { m.el.style.background = ''; }, 2000);
                }
            });

            searchResults.appendChild(div);
        });

        searchResults.classList.add('active');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    if (searchInput && searchResults) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => doSearch(searchInput.value.trim()), 150);
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            const bar = document.getElementById('searchBar');
            if (!searchResults.contains(e.target) && !bar.contains(e.target)) {
                searchResults.classList.remove('active');
            }
        });

        // Keyboard shortcut: "/" to focus search
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
            if (e.key === 'Escape') {
                searchInput.blur();
                searchResults.classList.remove('active');
            }
        });

        // Hide kbd hint when focused
        searchInput.addEventListener('focus', () => {
            if (searchKbd) searchKbd.style.display = 'none';
        });
        searchInput.addEventListener('blur', () => {
            if (searchKbd && !searchInput.value) searchKbd.style.display = '';
        });
    }

    // ─── 3. Dark Mode Toggle ──────────────────────────────────────
    const modeToggle = document.getElementById('modeToggle');
    if (modeToggle) {
        modeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = modeToggle.querySelector('i');
            if (document.body.classList.contains('dark-mode')) {
                icon.classList.replace('fa-moon', 'fa-sun');
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
            }
        });
    }

    // ─── 4. Copy Link Button ──────────────────────────────────────
    const copyBtn = document.getElementById('copyLinkBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href).then(() => {
                const orig = copyBtn.innerHTML;
                copyBtn.innerHTML = `<i class="fa-solid fa-check"></i>`;
                copyBtn.style.color = '#10b981';
                setTimeout(() => {
                    copyBtn.innerHTML = orig;
                    copyBtn.style.color = '';
                }, 2000);
            });
        });
    }

    // ─── 5. Version Switcher ──────────────────────────────────────
    const techBtn   = document.getElementById('techBtn');
    const clientBtn = document.getElementById('clientBtn');
    const techVer   = document.getElementById('techVersion');
    const clientVer = document.getElementById('clientVersion');

    if (techBtn && clientBtn && techVer && clientVer) {
        techBtn.addEventListener('click', () => {
            techVer.style.display = 'block';
            clientVer.style.display = 'none';
            techBtn.classList.add('active');
            clientBtn.classList.remove('active');
        });
        clientBtn.addEventListener('click', () => {
            techVer.style.display = 'none';
            clientVer.style.display = 'block';
            clientBtn.classList.add('active');
            techBtn.classList.remove('active');
        });
    }

    // ─── 6. Sidebar Active-State via IntersectionObserver ────────
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('section[id]');

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navItems.forEach(item => {
                    const match = item.getAttribute('href') === `#${id}`;
                    item.classList.toggle('active', match);
                });
            }
        });
    }, {
        root: mainReader,
        rootMargin: '-15% 0px -70% 0px',
        threshold: 0
    });

    sections.forEach(section => sectionObserver.observe(section));

    // ─── 7. Mobile Nav (hamburger) ────────────────────────────────
    const menuToggle = document.getElementById('menuToggle');
    const navLinks   = document.getElementById('navLinks');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // ─── 8. Smooth Scroll for Anchor Links ───────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target && mainReader) {
                e.preventDefault();
                const rect = target.getBoundingClientRect();
                const readerRect = mainReader.getBoundingClientRect();
                const scrollOffset = mainReader.scrollTop + (rect.top - readerRect.top) - 20;
                mainReader.scrollTo({ top: scrollOffset, behavior: 'smooth' });
            }
        });
    });
});
