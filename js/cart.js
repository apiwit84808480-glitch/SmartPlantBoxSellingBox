// Cart functionality
let cart = [];

function loadCart() {
    try {
        const saved = localStorage.getItem('smartPlantCart');
        cart = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(cart)) cart = [];
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
        if (typeof showToast === 'function') showToast('Products not loaded — refresh.');
        return;
    }
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let totalPrice = product.basePrice;
    const selectedSensors = [];
    product.sensors.forEach((s, i) => {
        const cb = document.getElementById(`sensor-${productId}-${i}`);
        if (cb && cb.checked) {
            selectedSensors.push({ name: s.name, price: s.price, included: s.included });
            if (!s.included) totalPrice += s.price;
        }
    });

    cart.push({
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
        showToast(`Added: ${product.name} ($${totalPrice.toFixed(2)})`);
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

    if (!cart || cart.length === 0) {
        body.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-basket"></i>
                <p>Your cart is empty.</p>
            </div>`;
    } else {
        let html = '';
        let total = 0;
        cart.forEach((item, i) => {
            total += item.totalPrice || 0;
            const sensors = item.selectedSensors && item.selectedSensors.length
                ? item.selectedSensors.map(s => s.name).join(', ')
                : 'No additional sensors';
            html += `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <strong>${item.name}</strong>
                        <small>${sensors}</small>
                        <button class="cart-remove" onclick="removeFromCart(${i})">
                            <i class="fas fa-times"></i> Remove
                        </button>
                    </div>
                    <div class="cart-item-price">$${item.totalPrice}</div>
                </div>`;
        });
        html += `<div class="cart-total-row"><span>Total</span><span>$${total.toFixed(2)}</span></div>`;
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
        if (typeof showToast === 'function') showToast('Your cart is empty.');
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
    if (typeof showToast === 'function') showToast('Cart cleared.');
    showCart();
}
