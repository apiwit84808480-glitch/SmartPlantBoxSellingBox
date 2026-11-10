// ============== Smart Plant Box V4 ==============
// Prices adjusted to realistic Thai-market USD pricing.

let currentUserType = '';
let currentSlide = 0;
let slideInterval;
let customOrderData = null;

// Product catalogue (USD priced for Thai market)
const products = [
    {
        id: 1,
        name: "Basic Box - Arduino",
        basePrice: 16,
        controller: "Arduino Uno",
        isBestSeller: false,
        features: ["Arduino Uno Control System", "Soil Moisture Sensor", "Automatic Water Pump", "Misting System", "Plant Growth LED"],
        sensors: [
            { name: "Soil Moisture Sensor", price: 1, included: true },
            { name: "Air Humidity Sensor (DHT11)", price: 1.2, included: true },
            { name: "Temperature Sensor", price: 1.2, included: true },
            { name: "Light Sensor (LDR)", price: 0.8, included: false },
            { name: "NPK Sensor", price: 12, included: false }
        ]
    },
    {
        id: 2,
        name: "Standard Box - ESP32",
        basePrice: 24,
        controller: "ESP32",
        isBestSeller: true,
        features: ["ESP32 Control (WiFi + Bluetooth)", "Mobile App Control", "Precision Moisture Sensor", "Adjustable Misting System", "Full Spectrum LED"],
        sensors: [
            { name: "Capacitive Soil Moisture Sensor", price: 1.5, included: true },
            { name: "DHT22 Air Humidity Sensor", price: 2.5, included: true },
            { name: "DS18B20 Temperature Sensor", price: 1.5, included: true },
            { name: "BH1750 Light Sensor", price: 1.5, included: true },
            { name: "RS485 NPK Sensor", price: 16, included: false }
        ]
    },
    {
        id: 3,
        name: "Pro Box - Raspberry Pi",
        basePrice: 48,
        controller: "Raspberry Pi 4",
        isBestSeller: false,
        features: ["Raspberry Pi 4 Control", "7-inch Touchscreen", "Growth Monitoring Camera", "AI Plant Health Analysis", "Cloud Data Storage"],
        sensors: [
            { name: "Industrial Soil Moisture Sensor", price: 3, included: true },
            { name: "BME280 Air Humidity Sensor", price: 3.5, included: true },
            { name: "Precision Temperature Sensor", price: 3, included: true },
            { name: "High-Precision NPK Sensor", price: 20, included: true },
            { name: "Soil pH Sensor", price: 8, included: true }
        ]
    },
    {
        id: 4,
        name: "Emergency Box - Arduino Nano",
        basePrice: 11,
        controller: "Arduino Nano",
        isBestSeller: true,
        features: ["Perfect for Disaster Victims", "Quick and Easy Setup", "Basic Water Pump System", "Soil Moisture Sensor", "Budget-Friendly Plastic Box"],
        sensors: [
            { name: "Soil Moisture Sensor", price: 1, included: true },
            { name: "Temperature Sensor", price: 1.2, included: false },
            { name: "Light Sensor", price: 0.8, included: false }
        ]
    },
    {
        id: 5,
        name: "Condo Box - ESP8266",
        basePrice: 20,
        controller: "ESP8266",
        isBestSeller: false,
        features: ["Designed for Small Spaces", "WiFi Mobile Control", "Automatic Watering System", "Energy-Efficient LED", "Silent Operation"],
        sensors: [
            { name: "Soil Moisture Sensor", price: 1.2, included: true },
            { name: "Air Humidity Sensor", price: 1.8, included: true },
            { name: "Temperature Sensor", price: 1.2, included: true },
            { name: "Light Sensor", price: 1, included: false }
        ]
    },
    {
        id: 6,
        name: "Agriculture Box - ESP32 Dual",
        basePrice: 55,
        controller: "ESP32 Dual Core",
        isBestSeller: false,
        features: ["For Professional Farmers", "Multi-Zone Control (4 Zones)", "Automatic Water & Fertilizer", "Line/Email Reports", "IP65 Waterproof Box"],
        sensors: [
            { name: "Soil Moisture Sensors (4 units)", price: 5, included: true },
            { name: "NPK Sensor", price: 12, included: true },
            { name: "pH Sensor", price: 6, included: true },
            { name: "EC Sensor", price: 7, included: true },
            { name: "Water Level Sensor", price: 1.5, included: false }
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
    if (message) toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    else toast.innerHTML = `<i class="fas fa-check-circle"></i> Copied to clipboard!`;
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
                    ${sensor.name}
                    ${!sensor.included ? `(+$${sensor.price})` : '<span class="included-tag">(Included)</span>'}
                </label>
            </div>`;
    });

    const badge = product.isBestSeller ? '<span class="best-seller">⭐ Best Seller</span>' : '';

    card.innerHTML = `
        ${badge}
        <div class="product-header">
            <div>
                <div class="product-name">${product.name}</div>
                <div class="product-controller">Controller: ${product.controller}</div>
            </div>
            <div class="product-price" id="price-${product.id}">$${product.basePrice}</div>
        </div>
        <div class="product-features">
            ${product.features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
        </div>
        <div class="sensor-options">
            <h4><i class="fas fa-microchip"></i> Sensors</h4>
            ${sensorsHtml}
        </div>
        <div class="product-actions">
            <button class="btn-add-to-cart" onclick="addToCart(${product.id})">
                <i class="fas fa-shopping-cart"></i> Add to Cart
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
    if (el) el.textContent = `$${total.toFixed(total % 1 ? 2 : 0)}`;
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

    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = `$${v.toFixed(2)}`; };
    set('componentsTotal', componentsTotal);
    set('boxMaterialTotal', boxMaterialTotal);
    set('grandTotal', grandTotal);

    return { microcontroller, watering, light, temperature, mist, camera, boxMaterial, width, length, height, componentsTotal, boxMaterialTotal, grandTotal };
}

function showCustomOrderForm() {
    const d = calculateCustomPrice();
    if (d.grandTotal <= 0) { showToast('Please select at least one component'); return; }

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
        total: d.grandTotal
    };
    window.orderReturnTo = 'customForm';
    showOrderForm();
}

// ========== ORDER ==========
function proceedToOrder() {
    if (!cart || cart.length === 0) { showToast('Please add products to cart first'); return; }
    customOrderData = null;
    showOrderForm();
}

function showOrderForm() {
    const sd = document.getElementById('orderSummary');
    if (!sd) return;
    let html = '<h3 class="summary-heading">Order Summary</h3>';

    if (customOrderData) {
        const row = (l, v) => `<div class="summary-item"><span>${l}:</span><span>${v}</span></div>`;
        html += row('Configuration', 'Custom Build');
        html += row('Microcontroller', customOrderData.microcontroller);
        html += row('Watering', customOrderData.watering);
        html += row('Light', customOrderData.light);
        html += row('Temperature', customOrderData.temperature);
        html += row('Mist', customOrderData.mist);
        html += row('Camera', customOrderData.camera);
        html += row('Box Material', customOrderData.boxMaterial);
        html += row('Dimensions', `${customOrderData.width} × ${customOrderData.length} × ${customOrderData.height} cm`);
        html += `<div class="summary-item summary-total"><span>Total:</span><span>$${customOrderData.total.toFixed(2)}</span></div>`;
    } else if (cart && cart.length > 0) {
        cart.forEach((item, i) => {
            html += `
                <div class="summary-item" style="flex-direction:column;align-items:flex-start;gap:0.5rem;">
                    <div style="display:flex;justify-content:space-between;width:100%;">
                        <strong>${i + 1}. ${item.name}</strong>
                        <span class="summary-price">$${item.totalPrice}</span>
                    </div>
                    <div class="summary-sub">
                        ${item.selectedSensors && item.selectedSensors.length ? item.selectedSensors.map(s => `• ${s.name}`).join('<br>') : 'No additional sensors'}
                        ${item.notes && item.notes.length ? `<div class="summary-notes">${item.notes.map(n => String(n).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))).join('<br>')}</div>` : ''}
                    </div>
                </div>`;
        });
        const total = cart.reduce((s, x) => s + (x.totalPrice || 0), 0);
        html += `<div class="summary-item summary-total"><span>Total:</span><span>$${total.toFixed(2)}</span></div>`;
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
        showToast('Please fill in all required fields');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const orig = submitBtn ? submitBtn.innerHTML : 'Confirm Order';
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;
    }

    const orderData = {
        firstName, lastName, phone, email, address,
        comments: document.getElementById('comments')?.value || '',
        orderType: customOrderData ? 'Custom' : 'Preset Product',
        customConfig: customOrderData,
        cart: cart || [],
        total: customOrderData ? customOrderData.total : (cart ? cart.reduce((s, x) => s + (x.totalPrice || 0), 0) : 0),
        timestamp: new Date().toISOString()
    };

    try {
        await sendToGoogleSheets(orderData);
        showToast('Order received! We will contact you within 24 hours.');
        cart = [];
        customOrderData = null;
        localStorage.removeItem('smartPlantCart');
        if (typeof updateCartCount === 'function') updateCartCount();
        setTimeout(() => location.reload(), 1500);
    } catch (err) {
        console.error(err);
        showToast('Submission failed, please try again.');
        if (submitBtn) { submitBtn.innerHTML = orig; submitBtn.disabled = false; }
    }
}

async function sendToGoogleSheets(data) {
    const url = 'https://script.google.com/macros/s/AKfycbzpqBxJ6FAuxLIJ8EjGOndFRmvHkplPAscmyqxFzTyzoxt6QwMBnP3iAewUz_UZ853E/exec';
    return fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
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
