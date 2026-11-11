// ============== Language (Thai / English) + baht prices ==============
// Thai is the default. Static text: put the Thai version in data-th="…" next to the English
// (data-th-ph for placeholders, data-th-aria for aria-labels, data-th-alt for alt text).
// Scripts use t('English', 'ไทย') and T({ en, th }), and baht(123) for prices.

(function () {
    const KEY = 'spbLang';
    let lang = 'th';
    try { lang = localStorage.getItem(KEY) || 'th'; } catch (e) { /* private mode */ }
    if (lang !== 'th' && lang !== 'en') lang = 'th';

    window.LANG = lang;
    window.t = (en, th) => (lang === 'th' && th != null ? th : en);
    window.T = v => (v && typeof v === 'object' && !Array.isArray(v) && 'en' in v ? (lang === 'th' && v.th != null ? v.th : v.en) : v);
    window.baht = v => {
        const n = Math.round((Number(v) || 0) * 100) / 100;
        return '฿' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
    };

    window.setLang = next => {
        if (next === lang) return;
        try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
        location.reload();
    };

    function apply(root) {
        root = root || document;
        if (lang === 'th') {
            root.querySelectorAll('[data-th]').forEach(el => { el.innerHTML = el.getAttribute('data-th'); });
            root.querySelectorAll('[data-th-ph]').forEach(el => el.setAttribute('placeholder', el.getAttribute('data-th-ph')));
            root.querySelectorAll('[data-th-aria]').forEach(el => el.setAttribute('aria-label', el.getAttribute('data-th-aria')));
            root.querySelectorAll('[data-th-alt]').forEach(el => el.setAttribute('alt', el.getAttribute('data-th-alt')));
        }
        root.querySelectorAll('[data-lang-btn]').forEach(b => b.classList.toggle('active', b.dataset.langBtn === lang));
    }
    window.applyLang = apply;

    document.documentElement.lang = lang;
    apply(document);
    document.documentElement.classList.remove('i18n-wait');
})();
