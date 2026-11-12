// Cart functionality (prices in baht; the server re-prices everything at checkout)
let cart = [];

function loadCart() {
    try {
        const saved = localStorage.getItem('smartPlantCart');
        cart = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(cart)) cart = [];
        // Items saved under an older price list show old amounts: drop them (bump THB3 when prices change)
        const before = cart.length;
        cart = cart.filter(x => x && x.cur === 'THB3');
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
