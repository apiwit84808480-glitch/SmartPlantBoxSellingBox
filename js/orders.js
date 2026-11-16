// ============== /orders/: follow your box ==============
// Signed-in customers (Google or guest on this device) see every order they placed, live.
// Anyone can look one order up with its number + the phone used to order (public.track_order),
// which returns only the steps, items and tracking — never names or addresses.

(function () {
    const SUPABASE_URL = 'https://gjsfhgsbrdfftytdfkyt.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_GJ2OSOL0VpllgcH2Q9lQww_wqg5aqEj';
    const lib = window.supabase;
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const L = (en, th) => ({ en, th });
    const money = v => baht(Number(v) || 0);
    const refOf = id => String(id || '').slice(0, 8).toUpperCase();
    const day = d => new Date(d).toLocaleDateString(LANG === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short' });
    const dayFull = d => new Date(d).toLocaleDateString(LANG === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const STEPS = [
        { id: 'new', label: L('Ordered', 'สั่งซื้อ'), icon: 'fa-receipt' },
        { id: 'confirmed', label: L('Confirmed', 'ยืนยัน'), icon: 'fa-circle-check' },
        { id: 'preparing', label: L('Building', 'ประกอบ'), icon: 'fa-screwdriver-wrench' },
        { id: 'shipped', label: L('Shipped', 'จัดส่ง'), icon: 'fa-truck-fast' },
        { id: 'delivered', label: L('Delivered', 'ได้รับ'), icon: 'fa-house-circle-check' },
    ];
    const BADGE = {
        new: L('Waiting for confirmation', 'รอทีมงานยืนยัน'),
        confirmed: L('Confirmed', 'ยืนยันแล้ว'),
        preparing: L('Building your box', 'กำลังประกอบกล่อง'),
        shipped: L('On its way', 'กำลังจัดส่ง'),
        delivered: L('Delivered', 'ได้รับสินค้าแล้ว'),
        cancelled: L('Cancelled', 'ยกเลิกแล้ว'),
    };
    const NOW = {
        new: L('We have your order. Our team will contact you within 24 hours to confirm the total and how to pay.', 'ได้รับคำสั่งซื้อแล้ว ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง เพื่อยืนยันยอดและวิธีชำระเงิน'),
        confirmed: L('Your order is confirmed. We are getting the parts ready.', 'ยืนยันคำสั่งซื้อแล้ว ทีมงานกำลังเตรียมชิ้นส่วนให้คุณ'),
        preparing: L('Our team is building and testing your box.', 'ทีมงานกำลังประกอบและทดสอบกล่องของคุณ'),
        shipped: L('Your box is on its way. Use the tracking number below with the carrier.', 'กล่องของคุณออกเดินทางแล้ว ใช้เลขพัสดุด้านล่างติดตามกับบริษัทขนส่งได้'),
        delivered: L('Delivered — thank you for supporting a Thai innovation!', 'ส่งถึงแล้ว ขอบคุณที่สนับสนุนนวัตกรรมไทย'),
        cancelled: L('This order was cancelled. Questions? Use Contact us on our website.', 'คำสั่งซื้อนี้ถูกยกเลิก หากมีข้อสงสัย ติดต่อทีมงานได้ที่หน้าติดต่อเรา'),
    };
    const CARRIERS = {
        thailandpost: { name: L('Thailand Post', 'ไปรษณีย์ไทย'), url: 'https://track.thailandpost.co.th/' },
        kex: { name: L('KEX (Kerry Express)', 'KEX (Kerry Express)'), url: 'https://th.kex-express.com/' },
        flash: { name: L('Flash Express', 'Flash Express'), url: 'https://www.flashexpress.co.th/' },
        jt: { name: L('J&T Express', 'J&T Express'), url: 'https://www.jtexpress.co.th/' },
        self: { name: L('Delivered by our team', 'ทีมงานจัดส่งเอง') },
        other: { name: L('Carrier', 'บริษัทขนส่ง') },
    };

    // when each step happened (the latest time a step was reached)
    function stepTimes(o) {
        const at = {};
        (Array.isArray(o.status_log) ? o.status_log : []).forEach(e => { if (e && e.status && e.at) at[e.status] = e.at; });
        if (!at.new && o.created_at) at.new = o.created_at;
        return at;
    }

    function tracker(status, at, sample) {
        if (status === 'cancelled') return `<p class="trk-cancelled"><i class="fas fa-circle-xmark" aria-hidden="true"></i> ${esc(T(NOW.cancelled))}</p>`;
        const now = Math.max(0, STEPS.findIndex(s => s.id === status));
        return `<ol class="trk-steps" aria-label="${esc(t('Order progress', 'ความคืบหน้าคำสั่งซื้อ'))}">${STEPS.map((s, i) => `
            <li class="${i < now ? 'done' : i === now ? 'done now' : ''}"${i === now ? ' aria-current="step"' : ''}>
                <span class="trk-dot"><i class="fas ${i < now || (i === now && status === 'delivered') ? 'fa-check' : s.icon}" aria-hidden="true"></i></span>
                <b>${esc(T(s.label))}</b>
                <small>${sample ? '&nbsp;' : at[s.id] && i <= now ? esc(day(at[s.id])) : '&nbsp;'}</small>
            </li>`).join('')}</ol>`;
    }

    function trackingBox(o) {
        if (!o.tracking_no) return '';
        const c = CARRIERS[o.carrier] || CARRIERS.other;
        return `<div class="trk-parcel">
            <div><small>${esc(t('Tracking number', 'เลขพัสดุ'))} · ${esc(T(c.name))}</small><b>${esc(o.tracking_no)}</b></div>
            <div class="trk-parcel-actions">
                <button type="button" class="trk-btn ghost" data-copy="${esc(o.tracking_no)}"><i class="fas fa-copy" aria-hidden="true"></i> ${esc(t('Copy', 'คัดลอก'))}</button>
                ${c.url ? `<a class="trk-btn" href="${esc(c.url)}" target="_blank" rel="noopener"><i class="fas fa-up-right-from-square" aria-hidden="true"></i> ${esc(t('Track with the carrier', 'ติดตามกับขนส่ง'))}</a>` : ''}
            </div>
        </div>`;
    }

    function card(o, opts = {}) {
        const st = BADGE[o.status] ? o.status : 'new';
        const items = Array.isArray(o.items) ? o.items : [];
        const at = stepTimes(o);
        return `<article class="trk-card${opts.highlight ? ' highlight' : ''}" id="o-${esc(refOf(o.id))}">
            <header class="trk-head">
                <div><span class="trk-no">${esc(t('Order', 'คำสั่งซื้อ'))} #${esc(refOf(o.id))}</span>
                <small>${esc(t('Ordered', 'สั่งเมื่อ'))} ${esc(dayFull(o.created_at))} · ${esc(money(o.total))}</small></div>
                <span class="trk-badge s-${esc(st)}">${esc(T(BADGE[st]))}</span>
            </header>
            ${tracker(st, at)}
            ${st !== 'cancelled' ? `<p class="trk-msg"><i class="fas fa-circle-info" aria-hidden="true"></i> ${esc(T(NOW[st]))}</p>` : ''}
            ${trackingBox(o)}
            <details class="trk-items"${opts.openItems ? ' open' : ''}>
                <summary>${esc(t('Items', 'รายการสินค้า'))} (${items.length}) <i class="fas fa-chevron-down" aria-hidden="true"></i></summary>
                <ul>${items.map(i => `<li><span>${esc(i.name)}</span><span>${esc(money(i.price))}</span></li>`).join('')}
                    <li class="total"><span>${esc(t('Total', 'รวม'))}</span><span>${esc(money(o.total))}</span></li></ul>
            </details>
        </article>`;
    }

    // what tracking looks like, for people with no orders yet
    function sampleCard() {
        return `<div class="trk-sample" aria-hidden="true">
            <span class="trk-sample-tag">${esc(t('Example', 'ตัวอย่าง'))}</span>
            ${tracker('preparing', {}, true)}
            <p class="trk-msg"><i class="fas fa-circle-info"></i> ${esc(T(NOW.preparing))}</p>
        </div>`;
    }

    // ---------- page ----------
    const q = new URLSearchParams(location.search);
    const placed = (q.get('placed') || '').replace(/[^0-9a-f]/gi, '').slice(0, 8).toUpperCase();
    const wantRef = (q.get('ref') || '').replace(/[^0-9a-f]/gi, '').slice(0, 8).toUpperCase();
    let sb = null, user = null, orders = [], channel = null;

    function renderMine() {
        const box = $('trkMine');
        if (placed) {
            $('trkPlaced').hidden = false;
            $('trkPlacedRef').textContent = '#' + placed;
        }
        if (orders.length) {
            box.innerHTML = orders.map(o => card(o, { highlight: refOf(o.id) === placed || refOf(o.id) === wantRef, openItems: refOf(o.id) === placed })).join('');
            return;
        }
        const guest = user && user.is_anonymous;
        box.innerHTML = `<div class="trk-empty">
            <h2>${esc(user ? t('No orders on this account yet', 'ยังไม่มีคำสั่งซื้อในบัญชีนี้') : t('Sign in to see your orders', 'เข้าสู่ระบบเพื่อดูคำสั่งซื้อของคุณ'))}</h2>
            <p>${esc(t('After you order, every step of your box shows here — and it updates the moment our team moves it along.', 'เมื่อสั่งซื้อแล้ว ทุกขั้นตอนของกล่องคุณจะแสดงที่นี่ และอัปเดตทันทีที่ทีมงานเปลี่ยนสถานะ'))}</p>
            ${sampleCard()}
            <div class="trk-empty-actions">
                <a class="trk-btn" href="/?page=products"><i class="fas fa-box-open" aria-hidden="true"></i> ${esc(t('Choose a box', 'เลือกซื้อกล่อง'))}</a>
                ${!user || guest ? `<button type="button" class="trk-btn ghost" data-google><i class="fab fa-google" aria-hidden="true"></i> ${esc(t('Sign in with Google', 'เข้าสู่ระบบด้วย Google'))}</button>` : ''}
            </div>
            <p class="trk-hint">${esc(t('Ordered on another device or without signing in? Look it up below with your order number and phone.', 'สั่งจากเครื่องอื่นหรือไม่ได้เข้าสู่ระบบ? ค้นหาด้านล่างด้วยเลขคำสั่งซื้อและเบอร์โทร'))}</p>
        </div>`;
    }

    async function loadMine() {
        const box = $('trkMine');
        if (!user) { orders = []; renderMine(); return; }
        const { data, error } = await sb.from('orders')
            .select('id, created_at, status, status_log, items, total, carrier, tracking_no')
            .eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
        if (error) { box.innerHTML = `<p class="trk-error">${esc(t('Could not load your orders. Please try again.', 'โหลดคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่'))}</p>`; return; }
        orders = data || [];
        renderMine();
        const focus = document.getElementById('o-' + (placed || wantRef));
        if (focus) focus.scrollIntoView({ block: 'start' });
        subscribe();
    }

    // live: the card changes as soon as the team updates the order
    function subscribe() {
        if (channel || !user || !orders.length) return;
        channel = sb.channel('my-orders')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: 'user_id=eq.' + user.id }, payload => {
                const i = orders.findIndex(o => o.id === payload.new.id);
                if (i < 0) return;
                const was = orders[i].status;
                orders[i] = Object.assign({}, orders[i], payload.new);
                renderMine();
                if (was !== payload.new.status) note(t('Order', 'คำสั่งซื้อ') + ' #' + refOf(payload.new.id) + ' → ' + T(BADGE[payload.new.status] || BADGE.new));
            })
            .subscribe();
    }

    function note(msg) {
        const n = $('trkToast');
        n.textContent = msg;
        n.classList.add('show');
        clearTimeout(note._t);
        note._t = setTimeout(() => n.classList.remove('show'), 3200);
    }

    // ---------- look up with order number + phone ----------
    async function lookup(e) {
        e.preventDefault();
        const ref = $('trkRef').value.replace(/[^0-9a-f]/gi, '');
        const phone = $('trkPhone').value.replace(/\D/g, '');
        const out = $('trkFound');
        if (ref.length !== 8 || phone.length < 9) {
            out.innerHTML = `<p class="trk-error">${esc(t('Enter the 8-character order number (e.g. 1A2B3C4D) and the phone number you ordered with.', 'กรอกเลขคำสั่งซื้อ 8 ตัว (เช่น 1A2B3C4D) และเบอร์โทรที่ใช้สั่งซื้อ'))}</p>`;
            return;
        }
        const btn = $('trkFind');
        btn.disabled = true;
        const { data, error } = await sb.rpc('track_order', { p_ref: ref, p_phone: phone });
        btn.disabled = false;
        if (error) { out.innerHTML = `<p class="trk-error">${esc(t('Could not search right now. Please try again.', 'ค้นหาไม่ได้ในขณะนี้ กรุณาลองใหม่'))}</p>`; return; }
        out.innerHTML = data
            ? card(data, { highlight: true, openItems: true })
            : `<p class="trk-error">${esc(t('No order matches that number and phone. Check both and try again.', 'ไม่พบคำสั่งซื้อที่ตรงกับเลขและเบอร์โทรนี้ ลองตรวจสอบอีกครั้ง'))}</p>`;
    }

    document.addEventListener('click', async e => {
        const c = e.target.closest('[data-copy]');
        if (c) {
            try { await navigator.clipboard.writeText(c.dataset.copy); note(t('Tracking number copied', 'คัดลอกเลขพัสดุแล้ว')); }
            catch (err) { note(c.dataset.copy); }
            return;
        }
        if (e.target.closest('[data-google]') && sb) {
            const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/orders/' } });
            if (error) note(t('Google sign-in is not available right now', 'เข้าสู่ระบบด้วย Google ไม่ได้ในขณะนี้'));
        }
    });

    function start() {
        $('trkForm').addEventListener('submit', lookup);
        if (wantRef) $('trkRef').value = wantRef;
        if (!lib || !lib.createClient) { $('trkMine').innerHTML = `<p class="trk-error">${esc(t('Could not load. Please refresh the page.', 'โหลดไม่สำเร็จ กรุณารีเฟรชหน้า'))}</p>`; return; }
        sb = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
        sb.auth.getSession().then(({ data }) => {
            user = data.session ? data.session.user : null;
            loadMine().then(() => {
                // came from an email for an order that isn't on this device: start the lookup for them
                if (wantRef && !orders.some(o => refOf(o.id) === wantRef)) $('trkPhone').focus();
            });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
