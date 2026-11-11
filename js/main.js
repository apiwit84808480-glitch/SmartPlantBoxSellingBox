// ============== Smart Plant Box V4 ==============
// Prices are in Thai baht and must match public.price_list (the server re-prices every order).

let currentUserType = '';
let currentSlide = 0;
let slideInterval;
let customOrderData = null;

const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Product catalogue (baht). Names stay in English; features and sensors have Thai versions.
const products = [
    {
        id: 1,
        name: "Basic Box - Arduino",
        basePrice: 560,
        controller: "Arduino Uno",
        isBestSeller: false,
        features: ["Arduino Uno Control System", "Soil Moisture Sensor", "Automatic Water Pump", "Misting System", "Plant Growth LED"],
        features_th: ["ระบบควบคุม Arduino Uno", "เซนเซอร์ความชื้นในดิน", "ปั๊มน้ำอัตโนมัติ", "ระบบพ่นหมอก", "ไฟ LED ปลูกพืช"],
        sensors: [
            { name: "Soil Moisture Sensor", th: "เซนเซอร์ความชื้นในดิน", price: 35, included: true },
            { name: "Air Humidity Sensor (DHT11)", th: "เซนเซอร์ความชื้นอากาศ (DHT11)", price: 40, included: true },
            { name: "Temperature Sensor", th: "เซนเซอร์อุณหภูมิ", price: 40, included: true },
            { name: "Light Sensor (LDR)", th: "เซนเซอร์แสง (LDR)", price: 30, included: false },
            { name: "NPK Sensor", th: "เซนเซอร์ NPK", price: 420, included: false }
        ]
    },
    {
        id: 2,
        name: "Standard Box - ESP32",
        basePrice: 840,
        controller: "ESP32",
        isBestSeller: true,
        features: ["ESP32 Control (WiFi + Bluetooth)", "Mobile App Control", "Precision Moisture Sensor", "Adjustable Misting System", "Full Spectrum LED"],
        features_th: ["ควบคุมด้วย ESP32 (WiFi + Bluetooth)", "ควบคุมผ่านแอปมือถือ", "เซนเซอร์ความชื้นแม่นยำ", "ระบบพ่นหมอกปรับได้", "ไฟ LED ฟูลสเปกตรัม"],
        sensors: [
            { name: "Capacitive Soil Moisture Sensor", th: "เซนเซอร์ความชื้นในดินแบบ Capacitive", price: 55, included: true },
            { name: "DHT22 Air Humidity Sensor", th: "เซนเซอร์ความชื้นอากาศ DHT22", price: 90, included: true },
            { name: "DS18B20 Temperature Sensor", th: "เซนเซอร์อุณหภูมิ DS18B20", price: 55, included: true },
            { name: "BH1750 Light Sensor", th: "เซนเซอร์แสง BH1750", price: 55, included: true },
            { name: "RS485 NPK Sensor", th: "เซนเซอร์ NPK แบบ RS485", price: 560, included: false }
        ]
    },
    {
        id: 3,
        name: "Pro Box - Raspberry Pi",
        basePrice: 1680,
        controller: "Raspberry Pi 4",
        isBestSeller: false,
        features: ["Raspberry Pi 4 Control", "7-inch Touchscreen", "Growth Monitoring Camera", "AI Plant Health Analysis", "Cloud Data Storage"],
        features_th: ["ควบคุมด้วย Raspberry Pi 4", "จอสัมผัส 7 นิ้ว", "กล้องติดตามการเจริญเติบโต", "AI วิเคราะห์สุขภาพพืช", "เก็บข้อมูลบนคลาวด์"],
        sensors: [
            { name: "Industrial Soil Moisture Sensor", th: "เซนเซอร์ความชื้นในดินเกรดอุตสาหกรรม", price: 105, included: true },
            { name: "BME280 Air Humidity Sensor", th: "เซนเซอร์ความชื้นอากาศ BME280", price: 125, included: true },
            { name: "Precision Temperature Sensor", th: "เซนเซอร์อุณหภูมิความแม่นยำสูง", price: 105, included: true },
            { name: "High-Precision NPK Sensor", th: "เซนเซอร์ NPK ความแม่นยำสูง", price: 700, included: true },
            { name: "Soil pH Sensor", th: "เซนเซอร์ pH ดิน", price: 280, included: true }
        ]
    },
    {
        id: 4,
        name: "Emergency Box - Arduino Nano",
        basePrice: 385,
        controller: "Arduino Nano",
        isBestSeller: true,
        features: ["Perfect for Disaster Victims", "Quick and Easy Setup", "Basic Water Pump System", "Soil Moisture Sensor", "Budget-Friendly Plastic Box"],
        features_th: ["เหมาะสำหรับผู้ประสบภัย", "ติดตั้งง่ายและเร็ว", "ระบบปั๊มน้ำพื้นฐาน", "เซนเซอร์ความชื้นในดิน", "กล่องพลาสติกราคาประหยัด"],
        sensors: [
            { name: "Soil Moisture Sensor", th: "เซนเซอร์ความชื้นในดิน", price: 35, included: true },
            { name: "Temperature Sensor", th: "เซนเซอร์อุณหภูมิ", price: 40, included: false },
            { name: "Light Sensor", th: "เซนเซอร์แสง", price: 30, included: false }
        ]
    },
    {
        id: 5,
        name: "Condo Box - ESP8266",
        basePrice: 700,
        controller: "ESP8266",
        isBestSeller: false,
        features: ["Designed for Small Spaces", "WiFi Mobile Control", "Automatic Watering System", "Energy-Efficient LED", "Silent Operation"],
        features_th: ["ออกแบบสำหรับพื้นที่เล็ก", "ควบคุมผ่านมือถือด้วย WiFi", "ระบบรดน้ำอัตโนมัติ", "ไฟ LED ประหยัดพลังงาน", "ทำงานเงียบ"],
        sensors: [
            { name: "Soil Moisture Sensor", th: "เซนเซอร์ความชื้นในดิน", price: 40, included: true },
            { name: "Air Humidity Sensor", th: "เซนเซอร์ความชื้นอากาศ", price: 65, included: true },
            { name: "Temperature Sensor", th: "เซนเซอร์อุณหภูมิ", price: 40, included: true },
            { name: "Light Sensor", th: "เซนเซอร์แสง", price: 35, included: false }
        ]
    },
    {
        id: 6,
        name: "Agriculture Box - ESP32 Dual",
        basePrice: 1925,
        controller: "ESP32 Dual Core",
        isBestSeller: false,
        features: ["For Professional Farmers", "Multi-Zone Control (4 Zones)", "Automatic Water & Fertilizer", "Line/Email Reports", "IP65 Waterproof Box"],
        features_th: ["สำหรับเกษตรกรมืออาชีพ", "ควบคุมหลายโซน (4 โซน)", "รดน้ำและให้ปุ๋ยอัตโนมัติ", "รายงานทาง Line/อีเมล", "กล่องกันน้ำ IP65"],
        sensors: [
            { name: "Soil Moisture Sensors (4 units)", th: "เซนเซอร์ความชื้นในดิน (4 ตัว)", price: 175, included: true },
            { name: "NPK Sensor", th: "เซนเซอร์ NPK", price: 420, included: true },
            { name: "pH Sensor", th: "เซนเซอร์ pH", price: 210, included: true },
            { name: "EC Sensor", th: "เซนเซอร์ EC", price: 245, included: true },
            { name: "Water Level Sensor", th: "เซนเซอร์ระดับน้ำ", price: 55, included: false }
        ]
    }
];

// ========== PAGE NAVIGATION ==========
function showMainPage() {
    hideAllPages();
    document.getElementById('main-page').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setTimeout(backToUserType, 120);
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
    ['configForm', 'customForm', 'productSelection', 'orderForm', 'useCaseDetail'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const u = document.getElementById('userTypeSection');
    if (u) { u.style.display = 'block'; u.scrollIntoView({ behavior: 'smooth' }); }
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
    const back = document.getElementById(window.orderReturnTo || 'userTypeSection');
    if (of) of.style.display = 'none';
    if (back) { back.style.display = 'block'; back.scrollIntoView({ behavior: 'smooth' }); }
    else backToUserType();
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
function loadProducts() { return products; }

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
    if (cuf) { cuf.style.display = 'block'; cuf.scrollIntoView({ behavior: 'smooth' }); }
}

function showProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    let filtered = [...products];
    if (currentUserType === 'disaster') filtered = products.filter(p => [4, 1, 5].includes(p.id));
    else if (currentUserType === 'condo') filtered = products.filter(p => [5, 2, 1].includes(p.id));
    else if (currentUserType === 'farmer') filtered = products.filter(p => [2, 3, 6].includes(p.id));

    if (!filtered.length) {
        grid.innerHTML = '<p class="empty-note">No products found for this category.</p>';
    } else {
        filtered.forEach(p => grid.appendChild(createProductCard(p)));
    }

    const cf = document.getElementById('configForm');
    const cuf = document.getElementById('customForm');
    const ps = document.getElementById('productSelection');
    if (cf) cf.style.display = 'none';
    if (cuf) cuf.style.display = 'none';
    if (ps) { ps.style.display = 'block'; ps.scrollIntoView({ behavior: 'smooth' }); }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.id = `product-card-${product.id}`;

    let sensorsHtml = '';
    product.sensors.forEach((sensor, i) => {
        sensorsHtml += `
            <div class="checkbox-group">
                <input type="checkbox" id="sensor-${product.id}-${i}"
                       ${sensor.included ? 'checked disabled' : ''}
                       onchange="updatePrice(${product.id})">
                <label for="sensor-${product.id}-${i}">
                    ${escHtml(t(sensor.name, sensor.th))}
                    ${!sensor.included ? `(+${baht(sensor.price)})` : `<span class="included-tag">(${escHtml(t('Included', 'รวมในชุด'))})</span>`}
                </label>
            </div>`;
    });

    const badge = product.isBestSeller ? `<span class="best-seller">${escHtml(t('Best Seller', 'ขายดี'))}</span>` : '';
    const features = LANG === 'th' && product.features_th ? product.features_th : product.features;

    card.innerHTML = `
        ${badge}
        <div class="product-header">
            <div>
                <div class="product-name">${escHtml(product.name)}</div>
                <div class="product-controller">${escHtml(t('Controller', 'บอร์ดควบคุม'))}: ${escHtml(product.controller)}</div>
            </div>
            <div class="product-price" id="price-${product.id}">${baht(product.basePrice)}</div>
        </div>
        <div class="product-features">
            ${features.map(f => `<span class="feature-tag">${escHtml(f)}</span>`).join('')}
        </div>
        <div class="sensor-options">
            <h4><i class="fas fa-microchip"></i> ${escHtml(t('Sensors', 'เซนเซอร์'))}</h4>
            ${sensorsHtml}
        </div>
        <div class="product-actions">
            <button class="btn-add-to-cart" onclick="addToCart(${product.id})">
                <i class="fas fa-shopping-cart"></i> ${escHtml(t('Add to Cart', 'ใส่ตะกร้า'))}
            </button>
        </div>`;
    return card;
}

function updatePrice(productId) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    let total = p.basePrice;
    p.sensors.forEach((s, i) => {
        const cb = document.getElementById(`sensor-${productId}-${i}`);
        if (cb && cb.checked && !s.included) total += s.price;
    });
    const el = document.getElementById(`price-${productId}`);
    if (el) el.textContent = baht(total);
}

// ========== CUSTOM ==========
function calculateCustomPrice() {
    const num = id => parseFloat(document.getElementById(id)?.value) || 0;
    const microcontroller = num('microcontroller');
    const watering = num('watering');
    const light = num('light');
    const temperature = num('temperature');
    const mist = num('mist');
    const camera = num('camera');
    const boxMaterial = num('boxMaterial');
    const width = num('boxWidth');
    const length = num('boxLength');
    const height = num('boxHeight');

    const componentsTotal = microcontroller + watering + light + temperature + mist + camera;
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

    return { microcontroller, watering, light, temperature, mist, camera, boxMaterial, width, length, height, componentsTotal, boxMaterialTotal, grandTotal };
}

function showCustomOrderForm() {
    const d = calculateCustomPrice();
    if (d.grandTotal <= 0) { showToast(t('Please select at least one component', 'กรุณาเลือกอุปกรณ์อย่างน้อย 1 อย่าง')); return; }

    const txt = id => {
        const s = document.getElementById(id);
        return s ? (s.options[s.selectedIndex]?.text || '') : '';
    };

    customOrderData = {
        type: 'custom',
        microcontroller: txt('microcontroller'),
        watering: txt('watering'),
        light: txt('light'),
        temperature: txt('temperature'),
        mist: txt('mist'),
        camera: txt('camera'),
        boxMaterial: txt('boxMaterial'),
        width: document.getElementById('boxWidth')?.value || '',
        length: document.getElementById('boxLength')?.value || '',
        height: document.getElementById('boxHeight')?.value || '',
        total: d.grandTotal,
        // What the server needs to price it: which option was picked in each list (not the price)
        choices: Object.fromEntries(['microcontroller', 'watering', 'light', 'temperature', 'mist', 'camera', 'boxMaterial']
            .map(id => [id, document.getElementById(id)?.selectedIndex || 0])),
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
    if (of) { of.style.display = 'block'; of.scrollIntoView({ behavior: 'smooth' }); }
}

// ========== SCROLL REVEAL ==========
function initScrollReveal() {
    const reveals = document.querySelectorAll('.scroll-reveal');
    reveals.forEach((el, i) => setTimeout(() => el.classList.add('active'), i * 80));
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', function() {
    initSlider();
    loadProducts();
    if (typeof loadCart === 'function') loadCart();

    const bf = document.getElementById('budgetForm');
    if (bf) bf.addEventListener('submit', e => { e.preventDefault(); showProducts(); });

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
        items = [{ type: 'custom', choices: customOrderData.choices, size: customOrderData.size }];
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
        showToast(t(`Order received! Total ${baht(result.total)}. We will contact you within 24 hours.`,
            `ได้รับคำสั่งซื้อแล้ว! ยอดรวม ${baht(result.total)} ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง`));
        cart = [];
        customOrderData = null;
        localStorage.removeItem('smartPlantCart');
        if (typeof updateCartCount === 'function') updateCartCount();
        setTimeout(() => location.reload(), 2500);
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
    if (item.type === 'product' || (typeof item.id === 'number' && products.some(p => p.id === item.id))) {
        return { ...base, type: 'product', product_id: item.product_id || item.id, sensors: item.sensors || [] };
    }
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
