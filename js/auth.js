// ============== Accounts (Supabase): Google sign-in, guest mode, saved orders ==============
// The publishable key is safe to ship in the browser; row-level security in the
// database makes sure each person can only read and create their own orders.

(function () {
    const SUPABASE_URL = 'https://gjsfhgsbrdfftytdfkyt.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_GJ2OSOL0VpllgcH2Q9lQww_wqg5aqEj';

    const lib = window.supabase;
    if (!lib || !lib.createClient) { console.warn('Supabase library not loaded; accounts disabled'); return; }
    const sb = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.sb = sb;

    let user = null;
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const toast = m => (typeof showToast === 'function' ? showToast(m) : alert(m));
    const isGuest = u => !!(u && u.is_anonymous);
    const redirectTo = () => window.location.origin + window.location.pathname;

    // ---------- nav button ----------
    function renderNav() {
        const btn = $('accountBtn');
        if (!btn) return;
        if (!user) {
            btn.innerHTML = `<i class="fas fa-user"></i><span>${esc(t('Sign in', 'เข้าสู่ระบบ'))}</span>`;
            btn.classList.remove('signed-in');
            return;
        }
        const meta = user.user_metadata || {};
        const name = isGuest(user) ? t('Guest', 'ผู้เยี่ยมชม') : (meta.full_name || meta.name || user.email || 'Account');
        const avatar = !isGuest(user) && (meta.avatar_url || meta.picture);
        btn.innerHTML = avatar
            ? `<img src="${esc(avatar)}" alt="" referrerpolicy="no-referrer"><span>${esc(name.split(' ')[0])}</span>`
            : `<span class="acct-initial">${esc(name[0].toUpperCase())}</span><span>${esc(name.split(' ')[0])}</span>`;
        btn.classList.add('signed-in');
    }

    // ---------- modal ----------
    function openModal(view) {
        const modal = $('accountModal');
        if (!modal) return;
        renderModal(view || (user ? 'account' : 'signin'));
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    function closeModal() {
        const modal = $('accountModal');
        if (modal) modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    window.openAccount = openModal;
    window.closeAccount = closeModal;

    function renderModal(view) {
        const body = $('accountModalBody');
        const title = $('accountModalTitle');
        if (!body) return;
        if (view === 'signin' || !user) {
            title.textContent = t('Sign in', 'เข้าสู่ระบบ');
            body.innerHTML = `
                <p class="acct-lead">${esc(t('Sign in to keep track of your orders. Or continue as a guest and sign in with Google later — your orders come with you.', 'เข้าสู่ระบบเพื่อติดตามคำสั่งซื้อ หรือใช้งานแบบผู้เยี่ยมชมก่อนแล้วค่อยเข้าสู่ระบบด้วย Google ทีหลัง คำสั่งซื้อจะตามไปด้วย'))}</p>
                <button class="acct-google" type="button" data-acct="google">
                    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                    ${esc(t('Continue with Google', 'เข้าสู่ระบบด้วย Google'))}
                </button>
                <div class="acct-or"><span>${esc(t('or', 'หรือ'))}</span></div>
                <button class="btn btn-ghost acct-guest" type="button" data-acct="guest"><i class="fas fa-user-secret"></i> ${esc(t('Continue as guest', 'ใช้งานแบบผู้เยี่ยมชม'))}</button>`;
            return;
        }
        title.textContent = isGuest(user) ? t('Guest account', 'บัญชีผู้เยี่ยมชม') : t('Your account', 'บัญชีของคุณ');
        const meta = user.user_metadata || {};
        body.innerHTML = `
            <div class="acct-who">
                <span class="acct-initial big">${esc((isGuest(user) ? 'G' : (meta.full_name || user.email || 'A')[0]).toUpperCase())}</span>
                <div><strong>${esc(isGuest(user) ? t('Guest', 'ผู้เยี่ยมชม') : (meta.full_name || meta.name || t('Signed in', 'เข้าสู่ระบบแล้ว')))}</strong>
                <small>${esc(isGuest(user) ? t('Orders are saved on this device until you sign in with Google', 'คำสั่งซื้อจะเก็บไว้ในเครื่องนี้จนกว่าจะเข้าสู่ระบบด้วย Google') : (user.email || ''))}</small></div>
            </div>
            ${isGuest(user) ? `<button class="acct-google" type="button" data-acct="link"><svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M24 20v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5H24z"/></svg> ${esc(t('Save my orders with Google', 'บันทึกคำสั่งซื้อด้วย Google'))}</button>` : ''}
            <div id="acctAdmin"></div>
            <div class="acct-orders-head"><span class="eyebrow">${esc(t('My orders', 'คำสั่งซื้อของฉัน'))}</span></div>
            <div class="acct-orders" id="acctOrders"><p class="acct-muted">${esc(t('Loading…', 'กำลังโหลด…'))}</p></div>
            <button class="btn btn-ghost acct-signout" type="button" data-acct="signout"><i class="fas fa-arrow-right-from-bracket"></i> ${esc(t('Sign out', 'ออกจากระบบ'))}</button>`;
        loadOrders();
        if (!isGuest(user)) showAdminLink();
    }

    // Team members get a shortcut to the admin page (the database decides who is an admin)
    async function showAdminLink() {
        const { data } = await sb.rpc('is_admin');
        const box = $('acctAdmin');
        if (data === true && box) {
            box.innerHTML = '<a class="btn acct-admin" href="/admin/"><i class="fas fa-gauge"></i> ' + esc(t('Open admin page', 'เปิดหน้าแอดมิน')) + '</a>';
        }
    }

    async function loadOrders() {
        const box = $('acctOrders');
        if (!box) return;
        // Only this person's orders (admins can read every order, so filter explicitly)
        const { data, error } = await sb.from('orders').select('id, created_at, status, order_type, items, custom_config, total')
            .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
        if (error) { box.innerHTML = `<p class="acct-muted">${esc(t('Could not load your orders. Please try again.', 'โหลดคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่'))}</p>`; return; }
        if (!data.length) { box.innerHTML = `<p class="acct-muted">${esc(t('No orders yet.', 'ยังไม่มีคำสั่งซื้อ'))}</p>`; return; }
        box.innerHTML = data.map(o => {
            const names = (o.items || []).map(i => i.name).filter(Boolean);
            const what = names.length ? names.join(', ') : (o.custom_config ? t('Custom build', 'สร้างเอง') : o.order_type);
            const date = new Date(o.created_at).toLocaleDateString(LANG === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            return `<div class="acct-order"><div><strong>${esc(what)}</strong><small>${esc(date)} · #${esc(o.id.slice(0, 8))}</small></div>
                <div class="acct-order-right"><span class="acct-status s-${esc(o.status)}">${esc(o.status)}</span><span class="acct-total">${baht(o.total)}</span></div></div>`;
        }).join('');
    }

    // ---------- actions ----------
    async function signInGoogle() {
        const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
        if (error) toast(t('Google sign-in is not available yet. Please try again later.', 'เข้าสู่ระบบด้วย Google ไม่ได้ในขณะนี้ กรุณาลองใหม่ภายหลัง'));
    }
    async function signInGuest() {
        const { error } = await sb.auth.signInAnonymously();
        if (error) { toast(t('Guest mode is not available right now.', 'โหมดผู้เยี่ยมชมใช้ไม่ได้ในขณะนี้')); return false; }
        toast(t('You are browsing as a guest', 'คุณกำลังใช้งานแบบผู้เยี่ยมชม'));
        closeModal();
        return true;
    }
    async function linkGoogle() {
        // Turns the guest account into a Google account, keeping its orders
        const { error } = await sb.auth.linkIdentity({ provider: 'google', options: { redirectTo: redirectTo() } });
        if (error) toast(t('Could not link Google right now. Please try again later.', 'เชื่อมบัญชี Google ไม่ได้ในขณะนี้ กรุณาลองใหม่ภายหลัง'));
    }
    async function signOut() {
        await sb.auth.signOut();
        closeModal();
        toast(t('Signed out', 'ออกจากระบบแล้ว'));
    }

    document.addEventListener('click', e => {
        const a = e.target.closest('[data-acct]');
        if (!a) return;
        const act = a.dataset.acct;
        if (act === 'google') signInGoogle();
        else if (act === 'guest') signInGuest();
        else if (act === 'link') linkGoogle();
        else if (act === 'signout') signOut();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // ---------- checkout: the server prices and saves the order ----------
    // Called from handleCheckout() in main.js. Customers who never signed in become guests.
    // `items` says only what was chosen; place_order() looks up every price in the database.
    window.placeOrder = async function (customer, items) {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) {
            const { error } = await sb.auth.signInAnonymously();
            if (error) throw new Error(t('Could not start a guest session', 'เริ่มใช้งานแบบผู้เยี่ยมชมไม่ได้'));
        }
        const { data, error } = await sb.rpc('place_order', { p_customer: customer, p_items: items });
        if (error) throw new Error(error.message || 'Order failed');
        return data;
    };

    // Prefill the order form from the Google profile
    function prefill() {
        if (!user || isGuest(user)) return;
        const meta = user.user_metadata || {};
        const set = (id, v) => { const el = $(id); if (el && !el.value && v) el.value = v; };
        const parts = (meta.full_name || meta.name || '').split(' ');
        set('firstName', parts[0]);
        set('lastName', parts.slice(1).join(' '));
        set('email', user.email);
    }

    sb.auth.onAuthStateChange((_event, session) => {
        user = session ? session.user : null;
        renderNav();
        prefill();
        const modal = $('accountModal');
        if (modal && modal.classList.contains('show')) renderModal();
    });
    sb.auth.getSession().then(({ data }) => { user = data.session ? data.session.user : null; renderNav(); prefill(); });
})();
