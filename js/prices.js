// ============== Live prices: change them in one place ==============
// Prices live in the database (public.price_list) and are changed on /admin → Prices.
// The server prices every order from that table. This file loads the same table when a page opens
// and updates every price the shop shows:
//   - the box / part catalogue in js/usecases.js (also used by the AI designer and the builder)
//   - the Custom (05) form (<option value> is the price, and the label shows it)
//   - "from ฿…" labels: [data-uc-from="disaster"] (cheapest box in a category), [data-price-key="option:relief-s"]
//   - carts already saved in this browser
// The prices written in the code are only a fallback for when the database can't be reached.

(function () {
    const URL = 'https://gjsfhgsbrdfftytdfkyt.supabase.co/rest/v1/price_list?select=key,price';
    const KEY = 'sb_publishable_GJ2OSOL0VpllgcH2Q9lQww_wqg5aqEj'; // public key, same as js/auth.js
    const CUSTOM_IDS = ['microcontroller', 'watering', 'light', 'temperature', 'mist', 'camera', 'ai', 'boxMaterial'];
    const has = (m, k) => Object.prototype.hasOwnProperty.call(m, k);
    const money = v => (typeof baht === 'function' ? baht(v) : '฿' + v);

    function load() {
        const ctl = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = ctl && setTimeout(() => ctl.abort(), 8000);
        return fetch(URL, { headers: { apikey: KEY }, cache: 'no-store', signal: ctl ? ctl.signal : undefined })
            .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
            .then(rows => {
                const m = {};
                (Array.isArray(rows) ? rows : []).forEach(r => {
                    const v = Number(r && r.price);
                    if (r && typeof r.key === 'string' && isFinite(v) && v >= 0) m[r.key] = v;
                });
                return m;
            })
            .finally(() => { if (timer) clearTimeout(timer); });
    }

    function patchCatalog(m) {
        const C = window.__catalog;
        if (!C) return 0;
        let n = 0;
        const set = (obj, field, key) => { if (has(m, key) && obj[field] !== m[key]) { obj[field] = m[key]; n++; } };
        C.CONTROLLERS.forEach(c => set(c, 'price', 'controller:' + c.id));
        C.PARTS.forEach(p => set(p, 'price', 'part:' + p.id));
        C.MATERIALS.forEach(x => { if (x.id !== 'none') set(x, 'rate', 'material:' + x.id); });
        Object.values(C.UC || {}).forEach(u => (u.options || []).forEach(o => set(o, 'price', 'option:' + o.id)));
        return n;
    }

    // "Arduino Nano (฿120)" -> "Arduino Nano (฿135)"; "อะคริลิก (฿0.08/ตร.ซม.)" -> "อะคริลิก (฿0.09/ตร.ซม.)"
    function patchCustomForm(m) {
        let n = 0;
        CUSTOM_IDS.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            Array.prototype.forEach.call(sel.options, (o, i) => {
                const key = `cf:${id}:${i}`;
                if (i === 0 || !has(m, key)) return;
                const v = m[key];
                if (Number(o.value) !== v) { o.value = String(v); n++; }
                const fix = s => s.replace(/฿\s?[\d,]+(?:\.\d+)?/, money(v));
                if (o.textContent.indexOf('฿') !== -1) o.textContent = fix(o.textContent);
                const th = o.getAttribute('data-th');
                if (th && th.indexOf('฿') !== -1) o.setAttribute('data-th', fix(th));
            });
        });
        if (n && typeof calculateCustomPrice === 'function') calculateCustomPrice();
        return n;
    }

    function patchLabels(m) {
        const C = window.__catalog;
        document.querySelectorAll('[data-uc-from]').forEach(el => {
            const u = C && C.UC && C.UC[el.getAttribute('data-uc-from')];
            const ps = u ? (u.options || []).map(o => Number(o.price)).filter(v => isFinite(v) && v > 0) : [];
            if (ps.length) el.textContent = money(Math.min.apply(null, ps));
        });
        document.querySelectorAll('[data-price-key]').forEach(el => {
            const k = el.getAttribute('data-price-key');
            if (has(m, k)) el.textContent = money(m[k]);
        });
    }

    // what an item in the cart costs now (same maths as the server's place_order)
    function priceOfItem(item, m) {
        if (!item) return null;
        if (item.type === 'option' && item.option_id) return has(m, 'option:' + item.option_id) ? m['option:' + item.option_id] : null;
        const b = item.type === 'build' && item.build;
        if (!b) return null;
        const get = k => (has(m, k) ? m[k] : NaN);
        let t = get('controller:' + b.controller) * (Number(b.controllerQty) || 1);
        (Array.isArray(b.parts) ? b.parts : []).forEach(p => {
            const id = typeof p === 'string' ? p : p && p.id;
            const q = typeof p === 'string' ? 1 : Number(p && p.qty) || 1;
            t += get('part:' + id) * q;
        });
        if (b.material && b.material !== 'none') {
            const s = (Array.isArray(b.size) ? b.size : []).map(Number);
            t += Math.round(2 * (s[0] * s[1] + s[0] * s[2] + s[1] * s[2]) * get('material:' + b.material) * 100) / 100;
        }
        return isFinite(t) ? Math.round(t * 100) / 100 : null;
    }
    function repriceCart(m) {
        if (typeof cart === 'undefined' || !Array.isArray(cart) || !cart.length) return 0; // eslint-disable-line no-undef
        let n = 0;
        cart.forEach(item => { // eslint-disable-line no-undef
            const p = priceOfItem(item, m);
            if (p != null && Math.abs(p - (Number(item.totalPrice) || 0)) > 0.004) { item.totalPrice = p; n++; }
        });
        if (n && typeof saveCart === 'function') saveCart();
        return n;
    }

    const domReady = new Promise(res => {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(res, 0));
        else setTimeout(res, 0);
    });
    window.__livePrices = Promise.all([load(), domReady])
        .then(([m]) => {
            const changed = { catalog: patchCatalog(m), form: patchCustomForm(m), cart: repriceCart(m) };
            patchLabels(m);
            document.dispatchEvent(new CustomEvent('prices:updated', { detail: changed }));
            return { prices: m, changed };
        })
        .catch(err => { console.warn('Live prices unavailable, using built-in prices:', err && err.message); return null; });
})();
