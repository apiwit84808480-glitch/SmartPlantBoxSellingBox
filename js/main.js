// ============== Smart Plant Box V4 ==============
// Prices are in Thai baht and must match public.price_list (the server re-prices every order).

let currentUserType = '';
let currentSlide = 0;
let slideInterval;
let customOrderData = null;

const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ========== PAGE NAVIGATION ==========
// While a box page, the custom builder or the order form is open, the sections above it
// (hero, numbers, problem picker) are hidden, so that page starts at the very top and
// the customer can't scroll past it and lose the Back button.
const DETAIL_VIEWS = ['configForm', 'customForm', 'productSelection', 'orderForm', 'useCaseDetail'];
function setDetailMode(on) {
    document.body.classList.toggle('detail-mode', !!on);
}
const jumpTo = top => window.scrollTo({ top, behavior: 'instant' });

function showMainPage() {
    hideAllPages();
    document.getElementById('main-page').classList.add('active');
    // Home always means the start of the page, not a box page left open
    DETAIL_VIEWS.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    const u = document.getElementById('userTypeSection');
    if (u) u.style.display = 'block';
    setDetailMode(false);
    jumpTo(0);
}

function showAboutPage() {
    hideAllPages();
    document.getElementById('about-page').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(initScrollReveal, 50);
}

function showContactPage() {
    hideAllPages();
    document.getElementById('contact-page').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(initScrollReveal, 50);
}

function showProductsSection() {
    showMainPage();
    backToUserType();
}

function hideAllPages() {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
}

// ========== SLIDER ==========
function initSlider() { if (document.querySelector('.slide')) startSlideTimer(); }
function startSlideTimer() { slideInterval = setInterval(() => changeSlide(1), 8000); }
function resetSlideTimer() { clearInterval(slideInterval); startSlideTimer(); }

function changeSlide(direction) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    if (!slides.length) return;
    slides[currentSlide].classList.remove('active');
    if (dots[currentSlide]) dots[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + direction + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
    if (dots[currentSlide]) dots[currentSlide].classList.add('active');
    resetSlideTimer();
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    if (!slides.length) return;
    slides[currentSlide].classList.remove('active');
    if (dots[currentSlide]) dots[currentSlide].classList.remove('active');
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    if (dots[currentSlide]) dots[currentSlide].classList.add('active');
    resetSlideTimer();
}

// ========== NAV / SCROLL ==========
function scrollToSection(id) {
    const el = document.getElementById(id);
    // The use-case list is hidden while a use-case page or form is open: bring it back first
    if (id === 'userTypeSection' && el && el.style.display === 'none') return backToUserType();
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

function backToUserType() {
    DETAIL_VIEWS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    setDetailMode(false);
    const u = document.getElementById('userTypeSection');
    if (u) { u.style.display = 'block'; jumpTo(u.getBoundingClientRect().top + window.scrollY - 70); }
    currentUserType = '';
}

function backToConfig() {
    const ps = document.getElementById('productSelection');
    const of = document.getElementById('orderForm');
    const cf = document.getElementById('configForm');
    if (ps) ps.style.display = 'none';
    if (of) of.style.display = 'none';
    if (cf) { cf.style.display = 'block'; cf.scrollIntoView({ behavior: 'smooth' }); }
}

// Back from the order form: return to whichever step sent the customer there
function backToProducts() {
    const of = document.getElementById('orderForm');
    const backId = window.orderReturnTo || 'userTypeSection';
    const back = document.getElementById(backId);
    if (!back || backId === 'userTypeSection') return backToUserType();
    if (of) of.style.display = 'none';
    back.style.display = 'block';
    setDetailMode(true);
    jumpTo(0);
}

// ========== CONTACT ==========
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(showToast).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast(); } catch (e) {}
    document.body.removeChild(ta);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const text = typeof message === 'string' && message ? message : t('Copied to clipboard!', 'คัดลอกแล้ว!');
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${escHtml(text)}`;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

function showContactTab(tabName, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const team = document.getElementById('team-contacts');
    const adv = document.getElementById('advisors-contacts');
    if (tabName === 'team') {
        if (team) team.style.display = 'block';
        if (adv) adv.style.display = 'none';
    } else {
        if (team) team.style.display = 'none';
        if (adv) adv.style.display = 'block';
    }
    setTimeout(initScrollReveal, 50);
}

// ========== PRODUCTS ==========
function selectUserType(type) {
    currentUserType = type;

    // Disaster / farmer / household / condo / commercial each have their own page (js/usecases.js)
    if (type !== 'custom' && typeof openUseCase === 'function') {
        openUseCase(type);
        return;
    }

    // Custom: the full configurator where every part can be chosen
    ['userTypeSection', 'useCaseDetail', 'orderForm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const cuf = document.getElementById('customForm');
    if (cuf) { cuf.style.display = 'block'; setDetailMode(true); jumpTo(0); }
}

// ========== CUSTOM ==========
// AI needs a board; Arduino boards (list positions 1-3) can't run Model 3 (position 3)
const ARDUINO_BOARDS = [1, 2, 3];
function applyAiRules() {
    const mc = document.getElementById('microcontroller'), ai = document.getElementById('ai');
    if (!mc || !ai) return;
    const board = mc.selectedIndex || 0;
    ai.disabled = board === 0;
    if (ai.disabled) ai.selectedIndex = 0;
    const arduino = ARDUINO_BOARDS.includes(board);
    ai.options[3].disabled = arduino;
    if (arduino && ai.selectedIndex === 3) {
        ai.selectedIndex = 2;
        showToast(t("Arduino can't run AI Model 3 — switched to Model 2", 'Arduino ใช้ AI Model 3 ไม่ได้ จึงเปลี่ยนเป็น Model 2'));
    }
}

// Quantities in the Custom form: every piece is charged (AI is one per box; the box is priced by size)
const QTY_KEYS = ['microcontroller', 'watering', 'light', 'temperature', 'mist', 'camera'];
const customQty = {};
const qtyMax = id => (id === 'microcontroller' ? 10 : 50);
function qtyOf(id) { return customQty[id] || 1; }
function setCustomQty(id, n) {
    customQty[id] = Math.min(qtyMax(id), Math.max(1, parseInt(n, 10) || 1));
    calculateCustomPrice();
}
function renderCustomQty() {
    QTY_KEYS.forEach(id => {
        const box = document.getElementById(id + 'Qty'), sel = document.getElementById(id);
        if (!box || !sel) return;
        box.hidden = !(sel.selectedIndex > 0 && parseFloat(sel.value) > 0);
        const q = qtyOf(id);
        box.querySelector('b').textContent = id === 'mist' ? t(`${q} set${q > 1 ? 's' : ''}`, `${q} ชุด`) : t(`${q} pc${q > 1 ? 's' : ''}`, `${q} ชิ้น`);
        box.querySelector('[data-d="-1"]').disabled = q <= 1;
        box.querySelector('[data-d="1"]').disabled = q >= qtyMax(id);
    });
}
function initCustomQty() {
    QTY_KEYS.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel || document.getElementById(id + 'Qty')) return;
        const box = document.createElement('div');
        box.className = 'cf-qty';
        box.id = id + 'Qty';
        box.hidden = true;
        box.innerHTML = `<span>${escHtml(t('Quantity', 'จำนวน'))}</span><button type="button" data-d="-1" aria-label="${escHtml(t('Fewer', 'ลดจำนวน'))}">−</button><b></b><button type="button" data-d="1" aria-label="${escHtml(t('More', 'เพิ่มจำนวน'))}">+</button>`;
        box.addEventListener('click', e => { const b = e.target.closest('button[data-d]'); if (b) setCustomQty(id, qtyOf(id) + Number(b.dataset.d)); });
        sel.insertAdjacentElement('afterend', box);
    });
    renderCustomQty();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCustomQty);
else initCustomQty();

// ⓘ in the Custom form: explains what was chosen in that list (texts from js/advisor-kb.js)
const INFO_KEYS = ['microcontroller', 'watering', 'light', 'temperature', 'mist', 'camera', 'ai', 'boxMaterial'];
function infoTopicsFor(id) {
    const i = document.getElementById(id)?.selectedIndex || 0;
    switch (id) {
        case 'microcontroller': return i ? ['boards'] : [];
        case 'watering': return i === 3 || i === 5 ? ['mist'] : i === 4 ? ['pump'] : i >= 6 && i <= 9 ? ['fert'] : i === 10 ? ['hydro'] : [];
        case 'light': return i >= 2 ? ['lights'] : [];
        case 'temperature': return i === 2 ? ['cooler', 'heater', 'fan'] : i === 3 ? ['cooler'] : i === 4 ? ['heater'] : i === 5 ? ['fan'] : [];
        case 'mist': return i >= 2 ? ['mist'] : [];
        case 'camera': return i >= 2 ? ['cameras'] : [];
        case 'ai': return i >= 1 ? ['ai'] : [];
        case 'boxMaterial': return ['materials'];
        default: return [];
    }
}
function renderCustomInfo() {
    INFO_KEYS.forEach(id => {
        const btn = document.getElementById(id + 'Info'), panel = document.getElementById(id + 'Explain');
        if (!btn) return;
        const topics = infoTopicsFor(id);
        btn.hidden = !topics.length;
        if (panel && !panel.hidden) {
            if (!topics.length || typeof window.kbCardsHtml !== 'function') panel.hidden = true;
            else panel.innerHTML = window.kbCardsHtml(topics, { tables: ['boards', 'ai', 'cameras', 'materials'] });
        }
    });
}
function initCustomInfo() {
    INFO_KEYS.forEach(id => {
        const sel = document.getElementById(id);
        const label = sel && sel.closest('.form-group') && sel.closest('.form-group').querySelector('label');
        if (!label || document.getElementById(id + 'Info')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = id + 'Info';
        btn.className = 'cf-info-btn';
        btn.textContent = 'i';
        btn.setAttribute('aria-label', id === 'boxMaterial' ? t('Compare the materials', 'วัสดุต่างกันยังไง') : t('What is this?', 'คืออะไร'));
        btn.hidden = true;
        label.appendChild(btn);
        const panel = document.createElement('div');
        panel.id = id + 'Explain';
        panel.className = 'cf-explain';
        panel.hidden = true;
        sel.closest('.form-group').appendChild(panel);
        btn.addEventListener('click', e => {
            e.preventDefault();
            if (panel.hidden) { panel.hidden = false; renderCustomInfo(); } else panel.hidden = true;
        });
    });
    renderCustomInfo();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCustomInfo);
else initCustomInfo();

function calculateCustomPrice() {
    applyAiRules();
    renderCustomQty();
    if (typeof renderCustomInfo === 'function') renderCustomInfo();
    const num = id => (parseFloat(document.getElementById(id)?.value) || 0) * (QTY_KEYS.includes(id) ? qtyOf(id) : 1);
    const microcontroller = num('microcontroller');
    const watering = num('watering');
    const light = num('light');
    const temperature = num('temperature');
    const mist = num('mist');
    const camera = num('camera');
    const ai = num('ai');
    const boxMaterial = num('boxMaterial');
    const width = num('boxWidth');
    const length = num('boxLength');
    const height = num('boxHeight');

    const componentsTotal = microcontroller + watering + light + temperature + mist + camera + ai;
    let boxMaterialTotal = 0;
    if (boxMaterial > 0 && width > 0 && length > 0 && height > 0) {
        const surface = 2 * (width * length + width * height + length * height);
        boxMaterialTotal = surface * boxMaterial;
    }
    const grandTotal = componentsTotal + boxMaterialTotal;

    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = baht(v); };
    set('componentsTotal', componentsTotal);
    set('boxMaterialTotal', boxMaterialTotal);
    set('grandTotal', grandTotal);

    return { microcontroller, watering, light, temperature, mist, camera, ai, boxMaterial, width, length, height, componentsTotal, boxMaterialTotal, grandTotal };
}

function showCustomOrderForm() {
    const d = calculateCustomPrice();
    if (d.grandTotal <= 0) { showToast(t('Please select at least one component', 'กรุณาเลือกอุปกรณ์อย่างน้อย 1 อย่าง')); return; }

    const txt = id => {
        const s = document.getElementById(id);
        const label = s ? (s.options[s.selectedIndex]?.text || '') : '';
        return QTY_KEYS.includes(id) && s && s.selectedIndex > 0 && qtyOf(id) > 1 ? `${label} × ${qtyOf(id)}` : label;
    };

    customOrderData = {
        type: 'custom',
        microcontroller: txt('microcontroller'),
        watering: txt('watering'),
        light: txt('light'),
        temperature: txt('temperature'),
        mist: txt('mist'),
        camera: txt('camera'),
        ai: txt('ai'),
        boxMaterial: txt('boxMaterial'),
        width: document.getElementById('boxWidth')?.value || '',
        length: document.getElementById('boxLength')?.value || '',
        height: document.getElementById('boxHeight')?.value || '',
        total: d.grandTotal,
        // What the server needs to price it: which option was picked in each list (not the price)
        choices: Object.fromEntries(['microcontroller', 'watering', 'light', 'temperature', 'mist', 'camera', 'ai', 'boxMaterial']
            .map(id => [id, document.getElementById(id)?.selectedIndex || 0])),
        qty: Object.fromEntries(QTY_KEYS.filter(id => qtyOf(id) > 1).map(id => [id, qtyOf(id)])),
        size: ['boxWidth', 'boxLength', 'boxHeight'].map(id => parseFloat(document.getElementById(id)?.value) || 0)
    };
    window.orderReturnTo = 'customForm';
    showOrderForm();
}

// ========== ORDER ==========
function proceedToOrder() {
    if (!cart || cart.length === 0) { showToast(t('Please add products to cart first', 'กรุณาเพิ่มสินค้าลงตะกร้าก่อน')); return; }
    customOrderData = null;
    showOrderForm();
}

function showOrderForm() {
    const sd = document.getElementById('orderSummary');
    if (!sd) return;
    let html = `<h3 class="summary-heading">${escHtml(t('Order Summary', 'สรุปรายการสั่งซื้อ'))}</h3>`;

    if (customOrderData) {
        const row = (l, v) => `<div class="summary-item"><span>${escHtml(l)}:</span><span>${escHtml(v)}</span></div>`;
        html += row(t('Configuration', 'รูปแบบ'), t('Custom Build', 'สร้างเอง'));
        html += row(t('Microcontroller', 'บอร์ดควบคุม'), customOrderData.microcontroller);
        html += row(t('Watering', 'ระบบรดน้ำ'), customOrderData.watering);
        html += row(t('Light', 'ไฟ'), customOrderData.light);
        html += row(t('Temperature', 'อุณหภูมิ'), customOrderData.temperature);
        html += row(t('Mist', 'พ่นหมอก'), customOrderData.mist);
        html += row(t('Camera', 'กล้อง'), customOrderData.camera);
        html += row(t('AI', 'AI'), customOrderData.ai);
        html += row(t('Box Material', 'วัสดุกล่อง'), customOrderData.boxMaterial);
        html += row(t('Dimensions', 'ขนาด'), `${customOrderData.width} × ${customOrderData.length} × ${customOrderData.height} ${t('cm', 'ซม.')}`);
        html += `<div class="summary-item summary-total"><span>${escHtml(t('Total', 'รวม'))}:</span><span>${baht(customOrderData.total)}</span></div>`;
    } else if (cart && cart.length > 0) {
        cart.forEach((item, i) => {
            const sensors = (item.selectedSensors || []).map(s => escHtml(s && s.name));
            html += `
                <div class="summary-item summary-line">
                    <div class="summary-line-head">
                        <strong>${i + 1}. ${escHtml(item.name)}</strong>
                        <span class="summary-price">${baht(item.totalPrice)}</span>
                    </div>
                    <div class="summary-sub">
                        ${sensors.length ? sensors.map(s => `• ${s}`).join('<br>') : escHtml(t('No additional sensors', 'ไม่มีเซนเซอร์เพิ่ม'))}
                        ${item.notes && item.notes.length ? `<div class="summary-notes">${item.notes.map(escHtml).join('<br>')}</div>` : ''}
                    </div>
                </div>`;
        });
        const total = cart.reduce((s, x) => s + (Number(x.totalPrice) || 0), 0);
        html += `<div class="summary-item summary-total"><span>${escHtml(t('Total', 'รวม'))}:</span><span>${baht(total)}</span></div>`;
    }

    sd.innerHTML = html;

    const of = document.getElementById('orderForm');
    closeCart();
    ['productSelection', 'customForm', 'useCaseDetail', 'userTypeSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    if (of) { of.style.display = 'block'; setDetailMode(true); jumpTo(0); }
}

// ========== SCROLL REVEAL ==========
function initScrollReveal() {
    const reveals = document.querySelectorAll('.scroll-reveal');
    reveals.forEach((el, i) => setTimeout(() => el.classList.add('active'), i * 80));
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', function() {
    initSlider();
    if (typeof loadCart === 'function') loadCart();

    const cf = document.getElementById('checkoutForm');
    if (cf) cf.addEventListener('submit', handleCheckout);

    setTimeout(initScrollReveal, 400);
});

// ========== CHECKOUT ==========
async function handleCheckout(e) {
    e.preventDefault();
    const v = id => document.getElementById(id)?.value.trim();
    const firstName = v('firstName'), lastName = v('lastName'),
          phone = v('phone'), email = v('email'), address = v('address');

    if (!firstName || !lastName || !phone || !email || !address) {
        showToast(t('Please fill in all required fields', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ'));
        return;
    }
    // the box is ticked already if they pressed "ตกลง" on the cookie notice (js/consent.js)
    const consent = document.getElementById('orderConsent');
    if (consent && !consent.checked) {
        showToast(t('Please tick that you accept the privacy policy before ordering', 'กรุณาติ๊กยอมรับนโยบายความเป็นส่วนตัวก่อนสั่งซื้อ'));
        consent.focus();
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const orig = submitBtn ? submitBtn.innerHTML : 'Confirm Order';
    if (submitBtn) {
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${escHtml(t('Processing...', 'กำลังส่ง...'))}`;
        submitBtn.disabled = true;
    }

    const customer = {
        firstName, lastName, phone, email, address,
        comments: document.getElementById('comments')?.value || ''
    };

    // Send only WHAT was chosen. The server looks up every price itself, so a
    // tampered price in the browser can't change what the customer pays.
    let items;
    if (customOrderData) {
        items = [{ type: 'custom', choices: customOrderData.choices, qty: customOrderData.qty || {}, size: customOrderData.size }];
    } else {
        items = (cart || []).map(toServerItem);
        if (items.some(x => !x)) {
            showToast(t('Some cart items are from an older version of the site. Please clear the cart and add them again.', 'มีสินค้าในตะกร้าจากเว็บเวอร์ชันเก่า กรุณาล้างตะกร้าแล้วเพิ่มใหม่'));
            if (submitBtn) { submitBtn.innerHTML = orig; submitBtn.disabled = false; }
            return;
        }
    }

    try {
        if (typeof window.placeOrder !== 'function') throw new Error(t('Ordering is temporarily unavailable', 'ระบบสั่งซื้อปิดชั่วคราว'));
        const result = await window.placeOrder(customer, items);
        showToast(t(`Order received! Total ${baht(result.total)}. Opening your order to pay…`,
            `ได้รับคำสั่งซื้อแล้ว! ยอดรวม ${baht(result.total)} กำลังเปิดหน้าชำระเงิน…`));
        cart = [];
        customOrderData = null;
        localStorage.removeItem('smartPlantCart');
        if (typeof updateCartCount === 'function') updateCartCount();
        // follow the new order on the tracking page
        const ref = String(result.id || '').slice(0, 8).toUpperCase();
        setTimeout(() => { location.href = ref ? '/orders/?placed=' + ref : '/orders/'; }, 1500);
    } catch (err) {
        console.error(err);
        showToast((err && err.message) ? `${t('Could not place the order', 'สั่งซื้อไม่สำเร็จ')}: ${err.message}` : t('Submission failed, please try again.', 'ส่งไม่สำเร็จ กรุณาลองใหม่'));
        if (submitBtn) { submitBtn.innerHTML = orig; submitBtn.disabled = false; }
    }
}

// Turn a cart entry into the "what was chosen" shape the server prices
function toServerItem(item) {
    const base = { notes: item.notes || undefined, useCase: item.useCase || undefined };
    if (item.type === 'option' && item.option_id) return { ...base, type: 'option', option_id: item.option_id };
    if (item.type === 'build' && item.build) return { ...base, type: 'build', ...item.build };
    return null;
}

// ========== SCROLL REVEAL & BACK-TO-TOP ==========
window.addEventListener('scroll', function() {
    const btn = document.getElementById('backToTop');
    if (btn) {
        if (window.scrollY > 300) btn.classList.add('show');
        else btn.classList.remove('show');
    }
    const reveals = document.querySelectorAll('.scroll-reveal:not(.active)');
    reveals.forEach(el => {
        const t = el.getBoundingClientRect().top;
        if (t < window.innerHeight - 120) el.classList.add('active');
    });
});

// links from other pages: /?page=contact or /?page=about open that section
(function () {
    let p;
    try { p = new URLSearchParams(location.search).get('page'); } catch (e) { return; }
    const go = { contact: 'showContactPage', about: 'showAboutPage', products: 'showProductsSection' }[p];
    if (!go) return;
    const run = () => {
        if (typeof window[go] === 'function') window[go]();
        try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* old browser */ }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
})();
