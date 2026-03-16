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
            // Restore desktop state: remove mobile-only classes
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // ─── 2. TOC Floating Panel ────────────────────────────────────
    const tocTrigger = document.getElementById('tocTrigger');
    const tocPanel = document.getElementById('tocPanel');

    if (tocTrigger && tocPanel) {
        tocTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            tocPanel.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!tocPanel.contains(e.target) && !tocTrigger.contains(e.target)) {
                tocPanel.classList.remove('active');
            }
        });
        // Close TOC when a link inside is clicked
        tocPanel.querySelectorAll('.toc-link').forEach(link => {
            link.addEventListener('click', () => tocPanel.classList.remove('active'));
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

    const observer = new IntersectionObserver((entries) => {
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
        root: document.querySelector('.main-reader'),
        rootMargin: '-15% 0px -70% 0px',
        threshold: 0
    });

    sections.forEach(section => observer.observe(section));

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
    // Use main-reader as scroll container since body overflow is hidden
    const mainReader = document.querySelector('.main-reader');

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
