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
        new: L('We have your order. Our team will confirm it within 24 hours.', 'ได้รับคำสั่งซื้อแล้ว ทีมงานจะยืนยันคำสั่งซื้อภายใน 24 ชั่วโมง'),
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

    // ---------- paying with PromptPay ----------
    // unpaid → (customer attaches the slip) review → (team checks the bank app) paid · or rejected → attach again
    const PAYABLE = ['new', 'confirmed', 'preparing'];
    const payCache = new Map(); // "REF|mode|payment_status" -> public.order_payment result
    let lookupPhone = '';

    function payBox(o, mode) {
        const ps = o.payment_status || 'unpaid';
        if (ps === 'paid') return `<p class="trk-pay-done"><i class="fas fa-circle-check" aria-hidden="true"></i> ${esc(t('Payment received', 'ได้รับชำระเงินแล้ว'))}${o.paid_at ? ` · ${esc(day(o.paid_at))}` : ''}</p>`;
        if (ps === 'refunded') return `<p class="trk-pay-done refunded"><i class="fas fa-rotate-left" aria-hidden="true"></i> ${esc(t('We have sent your money back', 'ทีมงานโอนเงินคืนให้คุณแล้ว'))}</p>`;
        if (o.status === 'cancelled' || !PAYABLE.includes(o.status)) return '';
        if (ps === 'review') return `<p class="trk-pay-wait"><i class="fas fa-hourglass-half" aria-hidden="true"></i> ${esc(t('Slip received — our team is checking it with the bank (usually within 24 hours).', 'ได้รับสลิปแล้ว ทีมงานกำลังตรวจสอบยอดเงิน (ปกติภายใน 24 ชั่วโมง)'))}</p>`;
        return `<section class="trk-pay" data-pay-ref="${esc(refOf(o.id))}" data-pay-id="${esc(o.id)}" data-pay-mode="${mode === 'lookup' ? 'lookup' : 'own'}" data-pay-status="${esc(ps)}">
            <p class="trk-loading"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i></p></section>`;
    }

    function payHtml(p, mode, id, ref) {
        if (!p || !p.payable) return '';
        if (!p.ready) return `<p class="trk-msg"><i class="fas fa-circle-info" aria-hidden="true"></i> ${esc(t('Our team will contact you about how to pay.', 'ทีมงานจะติดต่อกลับเรื่องวิธีชำระเงิน'))}</p>`;
        const PP = window.PromptPay;
        const img = PP && PP.png(PP.payload(p.promptpay_id, p.amount), 8);
        const amt = money(p.amount);
        return `<h3><i class="fas fa-qrcode" aria-hidden="true"></i> ${esc(t('Pay with PromptPay', 'ชำระเงินด้วยพร้อมเพย์'))}</h3>
            ${p.payment_status === 'rejected' ? `<p class="trk-pay-bad"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> <span>${esc(t('We could not match your last slip with a payment. Check the amount, then attach the slip again.', 'สลิปล่าสุดยังตรวจสอบไม่ผ่าน กรุณาเช็กยอดเงินแล้วแนบสลิปใหม่อีกครั้ง'))}${p.payment_note ? `<br><small>${esc(t('Note from our team', 'หมายเหตุจากทีมงาน'))}: ${esc(p.payment_note)}</small>` : ''}</span></p>` : ''}
            <div class="trk-pay-grid">
                <figure class="trk-qr">
                    ${img ? `<img src="${img}" alt="${esc(t('PromptPay QR code for', 'QR พร้อมเพย์ ยอด'))} ${esc(amt)}" width="232" height="232">` : `<p class="trk-error">${esc(t('Could not draw the QR. Please refresh the page.', 'สร้าง QR ไม่สำเร็จ กรุณารีเฟรชหน้า'))}</p>`}
                    <figcaption><b>PromptPay</b> · ${esc(amt)}</figcaption>
                </figure>
                <div class="trk-pay-info">
                    <dl>
                        <dt>${esc(t('Amount to pay', 'ยอดที่ต้องชำระ'))}</dt><dd class="trk-pay-amt">${esc(amt)}</dd>
                        <dt>${esc(t('Account name', 'ชื่อบัญชีผู้รับ'))}</dt><dd>${esc(p.account_name)}</dd>
                        <dt>${esc(t('PromptPay number', 'พร้อมเพย์'))}</dt><dd>${esc(PP ? PP.pretty(p.promptpay_id) : '')}</dd>
                    </dl>
                    <ol class="trk-pay-steps">
                        <li>${esc(t('Scan the QR with any Thai bank app — or save the picture and open it with the app\'s "scan from photo".', 'สแกน QR ด้วยแอปธนาคารไหนก็ได้ หรือบันทึกรูป QR แล้วเปิดด้วยเมนู "สแกนจากรูปภาพ" ในแอป'))}</li>
                        <li>${esc(t('Check the name and amount match, then pay.', 'ตรวจชื่อบัญชีและยอดเงินให้ตรง แล้วกดชำระ'))}</li>
                        <li>${esc(t('Attach the slip here so our team can check it.', 'แนบสลิปที่นี่ เพื่อให้ทีมงานตรวจสอบ'))}</li>
                    </ol>
                    <div class="trk-pay-actions">
                        ${img ? `<a class="trk-btn ghost" href="${img}" download="smartplantbox-${esc(ref)}-promptpay.png"><i class="fas fa-download" aria-hidden="true"></i> ${esc(t('Save QR', 'บันทึกรูป QR'))}</a>` : ''}
                        ${mode === 'own' ? `<label class="trk-btn"><i class="fas fa-paperclip" aria-hidden="true"></i> ${esc(t('Attach slip', 'แนบสลิป'))}<input type="file" accept="image/*" data-slip-for="${esc(id)}" hidden></label>` : ''}
                    </div>
                    ${mode === 'own' ? '' : `<p class="trk-hint">${esc(t('To attach the slip, open this page on the device you ordered with — or send the slip to our team through Contact us.', 'แนบสลิปได้จากเครื่องที่ใช้สั่งซื้อ หรือส่งสลิปให้ทีมงานทางหน้าติดต่อเรา'))}</p>`}
                </div>
            </div>`;
    }

    // ask the database what to pay (the amount never comes from this page), then draw the QR
    async function hydratePay(root) {
        if (!sb) return;
        for (const el of (root || document).querySelectorAll('[data-pay-ref]')) {
            const { payRef: ref, payId: id, payMode: mode, payStatus: ps } = el.dataset;
            const key = `${ref}|${mode}|${ps}`;
            let p = payCache.get(key);
            if (!p) {
                const { data, error } = await sb.rpc('order_payment', mode === 'own' ? { p_ref: ref } : { p_ref: ref, p_phone: lookupPhone });
                if (error) { el.innerHTML = `<p class="trk-error">${esc(t('Could not load payment details. Please refresh.', 'โหลดข้อมูลการชำระเงินไม่สำเร็จ กรุณารีเฟรช'))}</p>`; continue; }
                p = data || { payable: false };
                payCache.set(key, p);
            }
            if (!el.isConnected) continue;
            const html = payHtml(p, mode, id, ref);
            if (html) el.innerHTML = html; else el.remove();
        }
    }

    // phone photos can be huge and carry the location: redraw as a plain JPEG, at most 1600 px
    function toJpeg(file) {
        return new Promise(resolve => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
                const c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(img.naturalWidth * k));
                c.height = Math.max(1, Math.round(img.naturalHeight * k));
                const g = c.getContext('2d');
                g.fillStyle = '#fff';
                g.fillRect(0, 0, c.width, c.height);
                g.drawImage(img, 0, 0, c.width, c.height);
                URL.revokeObjectURL(url);
                c.toBlob(b => resolve(b), 'image/jpeg', 0.85);
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
            img.src = url;
        });
    }

    async function uploadSlip(input) {
        const file = input.files && input.files[0];
        const id = input.dataset.slipFor;
        input.value = '';
        if (!file || !user || !sb) return;
        if (!/^image\//.test(file.type) || file.size > 25e6) { note(t('Please choose a picture of the slip (JPG or PNG)', 'กรุณาเลือกรูปสลิป (JPG หรือ PNG)')); return; }
        const btn = input.closest('.trk-btn');
        if (btn) btn.classList.add('busy');
        note(t('Sending your slip…', 'กำลังส่งสลิป…'));
        const fail = msg => { if (btn) btn.classList.remove('busy'); note(msg); };
        const jpg = await toJpeg(file);
        if (!jpg) return fail(t('Could not read this picture. Try a screenshot of the slip instead.', 'อ่านรูปนี้ไม่ได้ ลองใช้รูปแคปหน้าจอสลิปแทน'));
        if (jpg.size > 5e6) return fail(t('The picture is too large. Try a screenshot of the slip.', 'รูปใหญ่เกินไป ลองใช้รูปแคปหน้าจอสลิปแทน'));
        const path = `${user.id}/${id}/${Date.now()}.jpg`;
        const up = await sb.storage.from('slips').upload(path, jpg, { contentType: 'image/jpeg', upsert: false });
        if (up.error) return fail(t('Could not send the slip. Please try again.', 'ส่งสลิปไม่สำเร็จ กรุณาลองใหม่'));
        const { error } = await sb.rpc('submit_slip', { p_order: id, p_path: path });
        if (error) return fail(t('Could not send the slip. Please try again.', 'ส่งสลิปไม่สำเร็จ กรุณาลองใหม่'));
        const o = orders.find(x => x.id === id);
        if (o) o.payment_status = 'review';
        renderMine();
        note(t('Slip sent — our team will check it soon', 'ส่งสลิปแล้ว ทีมงานจะตรวจสอบโดยเร็ว'));
    }

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
            ${payBox(o, opts.mode)}
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
            box.innerHTML = orders.map(o => card(o, { mode: 'own', highlight: refOf(o.id) === placed || refOf(o.id) === wantRef, openItems: refOf(o.id) === placed })).join('');
            hydratePay(box);
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
            .select('id, created_at, status, status_log, items, total, carrier, tracking_no, payment_status, payment_note, paid_at')
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
                const was = orders[i].status, wasPay = orders[i].payment_status;
                orders[i] = Object.assign({}, orders[i], payload.new);
                renderMine();
                if (was !== payload.new.status) note(t('Order', 'คำสั่งซื้อ') + ' #' + refOf(payload.new.id) + ' → ' + T(BADGE[payload.new.status] || BADGE.new));
                else if (wasPay !== payload.new.payment_status && payload.new.payment_status === 'paid') note(t('Payment received — thank you!', 'ได้รับชำระเงินแล้ว ขอบคุณที่สนับสนุนเรา'));
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
        lookupPhone = phone;
        out.innerHTML = data
            ? card(data, { mode: 'lookup', highlight: true, openItems: true })
            : `<p class="trk-error">${esc(t('No order matches that number and phone. Check both and try again.', 'ไม่พบคำสั่งซื้อที่ตรงกับเลขและเบอร์โทรนี้ ลองตรวจสอบอีกครั้ง'))}</p>`;
        if (data) hydratePay(out);
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

    document.addEventListener('change', e => {
        const f = e.target.closest('[data-slip-for]');
        if (f) uploadSlip(f);
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
