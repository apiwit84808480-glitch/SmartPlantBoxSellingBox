// Cart functionality (prices in baht; the server re-prices everything at checkout)
let cart = [];

function loadCart() {
    try {
        const saved = localStorage.getItem('smartPlantCart');
        cart = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(cart)) cart = [];
        // Items saved before prices moved to baht show old dollar amounts: drop them
        const before = cart.length;
        cart = cart.filter(x => x && x.cur === 'THB');
        if (cart.length !== before) localStorage.setItem('smartPlantCart', JSON.stringify(cart));
    } catch (e) {
        console.error('Error loading cart:', e);
        cart = [];
    }
    updateCartCount();
}

function saveCart() {
    try { localStorage.setItem('smartPlantCart', JSON.stringify(cart)); }
    catch (e) { console.error('Error saving cart:', e); }
    updateCartCount();
}

function addToCart(productId) {
    if (typeof products === 'undefined') {
        if (typeof showToast === 'function') showToast(t('Products not loaded — refresh.', 'โหลดสินค้าไม่สำเร็จ กรุณารีเฟรช'));
        return;
    }
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let totalPrice = product.basePrice;
    const selectedSensors = [];
    const sensors = [];   // indexes of optional sensors the customer ticked (sent to the server)
    product.sensors.forEach((s, i) => {
        const cb = document.getElementById(`sensor-${productId}-${i}`);
        if (cb && cb.checked) {
            selectedSensors.push({ name: t(s.name, s.th), price: s.price, included: s.included });
            if (!s.included) { totalPrice += s.price; sensors.push(i); }
        }
    });

    cart.push({
        type: 'product',
        product_id: product.id,
        sensors,
        cur: 'THB',
        id: product.id,
        name: product.name,
        controller: product.controller,
        selectedSensors,
        totalPrice: Math.round(totalPrice * 100) / 100,
        quantity: 1,
        addedAt: new Date().toISOString()
    });
    saveCart();
    if (typeof showToast === 'function') {
        showToast(`${t('Added', 'เพิ่มแล้ว')}: ${product.name} (${baht(totalPrice)})`);
    }
}

function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (!el) return;
    el.textContent = cart.length;
    el.style.transform = 'scale(1.3)';
    setTimeout(() => { el.style.transform = 'scale(1)'; }, 200);
}

function showCart() {
    const modal = document.getElementById('cartModal');
    const body = document.getElementById('cartModalBody');
    if (!modal || !body) return;
    // The cart lives in localStorage, so treat everything in it as untrusted text
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    if (!cart || cart.length === 0) {
        body.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-basket"></i>
                <p>${esc(t('Your cart is empty.', 'ตะกร้าว่างอยู่'))}</p>
            </div>`;
    } else {
        let html = '';
        let total = 0;
        cart.forEach((item, i) => {
            const price = Number(item.totalPrice) || 0;
            total += price;
            const sensors = item.selectedSensors && item.selectedSensors.length
                ? item.selectedSensors.map(s => esc(s && s.name)).join(', ')
                : esc(t('No additional sensors', 'ไม่มีเซนเซอร์เพิ่ม'));
            html += `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <strong>${esc(item.name)}</strong>
                        <small>${sensors}</small>
                        <button class="cart-remove" onclick="removeFromCart(${i})">
                            <i class="fas fa-times"></i> ${esc(t('Remove', 'ลบ'))}
                        </button>
                    </div>
                    <div class="cart-item-price">${baht(price)}</div>
                </div>`;
        });
        html += `<div class="cart-total-row"><span>${esc(t('Total', 'รวม'))}</span><span>${baht(total)}</span></div>`;
        body.innerHTML = html;
    }

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    const modal = document.getElementById('cartModal');
    if (modal) modal.classList.remove('show');
    document.body.style.overflow = '';
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    showCart();
}

function checkoutFromCart() {
    if (!cart || cart.length === 0) {
        if (typeof showToast === 'function') showToast(t('Your cart is empty.', 'ตะกร้าว่างอยู่'));
        return;
    }
    customOrderData = null;
    // Remember where the customer was so "Back" on the order form returns there
    const detail = document.getElementById('useCaseDetail');
    const custom = document.getElementById('customForm');
    window.orderReturnTo = detail && detail.style.display === 'block' ? 'useCaseDetail'
        : custom && custom.style.display === 'block' ? 'customForm' : 'userTypeSection';
    if (typeof showOrderForm === 'function') showOrderForm();
}

function clearCart() {
    cart = [];
    saveCart();
    if (typeof showToast === 'function') showToast(t('Cart cleared.', 'ล้างตะกร้าแล้ว'));
    showCart();
}
