// ============== Cookie notice ==============
// The site only uses necessary cookies / browser storage (cart, language, sign-in), so this is a
// notice with an OK button, not a consent choice. Once OK is clicked it stays hidden
// (remembered in localStorage as spbCookieOk). Details: /privacy/#cookies

(function () {
    const KEY = 'spbCookieOk';
    try { if (localStorage.getItem(KEY)) return; } catch (e) { /* private mode: still show it */ }

    const th = (document.documentElement.lang || 'th') !== 'en';
    const bar = document.createElement('div');
    bar.className = 'cookie-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', th ? 'ประกาศเรื่องคุกกี้' : 'Cookie notice');
    bar.innerHTML = `
        <i class="fas fa-cookie-bite cookie-bar-ico" aria-hidden="true"></i>
        <p>${th
            ? 'เว็บไซต์นี้ใช้คุกกี้และพื้นที่จัดเก็บในเบราว์เซอร์เท่าที่จำเป็น เพื่อจำตะกร้าสินค้า ภาษา และการเข้าสู่ระบบ ไม่มีคุกกี้โฆษณาหรือคุกกี้ติดตาม'
            : 'This site uses only necessary cookies and browser storage — to remember your cart, language and sign-in. No advertising or tracking cookies.'}
            <a href="/privacy/#${th ? 'cookies' : 'cookies-en'}">${th ? 'อ่านนโยบายความเป็นส่วนตัว' : 'Read our privacy policy'}</a></p>
        <button type="button" class="cookie-bar-ok">${th ? 'ตกลง' : 'OK'}</button>`;

    // keep the AI button above the notice on phones
    const measure = () => document.documentElement.style.setProperty('--cookie-h', bar.offsetHeight + 'px');
    function show() {
        document.body.appendChild(bar);
        document.body.classList.add('has-cookie-bar');
        measure();
        window.addEventListener('resize', measure, { passive: true });
    }
    bar.querySelector('.cookie-bar-ok').addEventListener('click', () => {
        try { localStorage.setItem(KEY, new Date().toISOString().slice(0, 10)); } catch (e) { /* ignore */ }
        window.removeEventListener('resize', measure);
        document.body.classList.remove('has-cookie-bar');
        bar.remove();
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
    else show();
})();
