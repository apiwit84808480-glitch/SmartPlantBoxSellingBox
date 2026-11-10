// ============== Small UI helpers: nav state, mobile menu, keyboard cards ==============
(function () {
    const nav = document.getElementById('siteNav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    function onScroll() {
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function setMenu(open) {
        if (!nav || !toggle) return;
        nav.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    if (toggle) toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    if (links) links.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

    // Cards that act as buttons: Enter / Space activates them
    document.addEventListener('keydown', e => {
        const card = e.target.closest && e.target.closest('[role="button"][tabindex]');
        if (card && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            card.click();
        }
    });
})();
