// ============== Cookie notice + "I accept the privacy policy" ==============
// One record (localStorage spbCookieOk) is shared by:
//   - the notice at the bottom of the screen ("ตกลง")
//   - the checkbox at the end of /privacy/      ([data-consent-box])
//   - the checkbox above "Confirm order"         ([data-consent-box])
// Ticking any of them ticks the others; unticking the one on /privacy/ withdraws it:
// the site still works (it only uses necessary storage), the notice comes back next visit,
// and an order can't be placed until it is ticked again.

(function () {
    const KEY = 'spbCookieOk';
    const th = (document.documentElement.lang || 'th') !== 'en';
    const get = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
    let bar = null;

    function set(on) {
        try {
            if (on) localStorage.setItem(KEY, new Date().toISOString().slice(0, 10));
            else localStorage.removeItem(KEY);
        } catch (e) { /* private mode: not remembered */ }
        if (on) hideBar();
        syncBoxes();
        document.dispatchEvent(new CustomEvent('consent:changed', { detail: { accepted: on } }));
    }
    window.spbConsent = { accepted: get, set };

    function syncBoxes() {
        const on = get();
        document.querySelectorAll('[data-consent-box]').forEach(b => { b.checked = on; });
    }

    // ---- the notice ----
    const measure = () => { if (bar) document.documentElement.style.setProperty('--cookie-h', bar.offsetHeight + 'px'); };
    function hideBar() {
        if (!bar) return;
        window.removeEventListener('resize', measure);
        document.body.classList.remove('has-cookie-bar');
        bar.remove();
        bar = null;
    }
    function showBar() {
        bar = document.createElement('div');
        bar.className = 'cookie-bar';
        bar.setAttribute('role', 'region');
        bar.setAttribute('aria-label', th ? 'ประกาศเรื่องคุกกี้' : 'Cookie notice');
        bar.innerHTML = `
            <i class="fas fa-cookie-bite cookie-bar-ico" aria-hidden="true"></i>
            <p>${th
                ? 'เว็บไซต์นี้ใช้คุกกี้และพื้นที่จัดเก็บในเบราว์เซอร์เท่าที่จำเป็น เพื่อจำตะกร้าสินค้า ภาษา และการเข้าสู่ระบบ ไม่มีคุกกี้โฆษณาหรือคุกกี้ติดตาม'
                : 'This site uses only necessary cookies and browser storage — to remember your cart, language and sign-in. No advertising or tracking cookies.'}
                <a href="/privacy/">${th ? 'อ่านนโยบายความเป็นส่วนตัว' : 'Read our privacy policy'}</a></p>
            <button type="button" class="cookie-bar-ok">${th ? 'ตกลง' : 'I agree'}</button>`;
        bar.querySelector('.cookie-bar-ok').addEventListener('click', () => set(true));
        document.body.appendChild(bar);
        document.body.classList.add('has-cookie-bar');
        measure();
        window.addEventListener('resize', measure, { passive: true });
    }

    function init() {
        syncBoxes();
        document.addEventListener('change', e => {
            const b = e.target.closest && e.target.closest('[data-consent-box]');
            if (b) set(b.checked);
        });
        if (!get()) showBar();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
