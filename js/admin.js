// ============== Admin page: every order, live, with status updates ==============
// Security note: this page is public HTML, but the data is not. The database only
// returns all orders (and only allows status changes) for emails in public.admins.

(function () {
    const SUPABASE_URL = 'https://gjsfhgsbrdfftytdfkyt.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_GJ2OSOL0VpllgcH2Q9lQww_wqg5aqEj';
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const STATUSES = ['new', 'confirmed', 'shipped', 'cancelled'];
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const money = v => '$' + Number(v || 0).toFixed(2);
    const when = d => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    let orders = [];
    let filter = 'all';
    let query = '';
    const open = new Set();
    const fresh = new Set();
    let channel = null;

    // ---------- toast ----------
    function toast(msg) {
        const t = $('toast');
        t.innerHTML = `<i class="fas fa-check-circle"></i> ${esc(msg)}`;
        t.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => t.classList.remove('show'), 2600);
    }

    // ---------- gate ----------
    function gate(title, text, { google = false, home = false } = {}) {
        $('gate').hidden = false;
        $('dash').hidden = true;
        $('gateTitle').textContent = title;
        $('gateText').textContent = text;
        $('gateGoogle').hidden = !google;
        $('gateHome').hidden = !home;
    }

    async function start(session) {
        const user = session && session.user;
        $('signOutBtn').hidden = !user;
        $('admUser').textContent = user && !user.is_anonymous ? user.email : '';
        if (!user || user.is_anonymous) {
            gate('Sign in to see orders', 'Use the Google account that is on the team list.', { google: true, home: true });
            return;
        }
        const { data: isAdmin, error } = await sb.rpc('is_admin');
        if (error || isAdmin !== true) {
            gate('This account is not an admin', `${user.email} isn't on the team list. Sign out and use a team account.`, { home: true });
            return;
        }
        $('gate').hidden = true;
        $('dash').hidden = false;
        loadEmailAlerts();
        await load();
        subscribe();
    }

    // ---------- data ----------
    async function load() {
        const { data, error } = await sb.from('orders')
            .select('id, created_at, status, order_type, customer, items, total')
            .order('created_at', { ascending: false })
            .limit(500);
        if (error) { $('list').innerHTML = `<p class="adm-empty">Could not load orders: ${esc(error.message)}</p>`; return; }
        orders = data;
        render();
    }

    function subscribe() {
        if (channel) return;
        channel = sb.channel('orders-admin')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
                const o = payload.new;
                if (orders.some(x => x.id === o.id)) return;
                orders.unshift(o);
                fresh.add(o.id);
                render();
                const c = o.customer || {};
                toast(`New order ${money(o.total)} from ${c.firstName || ''} ${c.lastName || ''}`);
                ping();
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('New order ' + money(o.total), { body: `${c.firstName || ''} ${c.lastName || ''}`.trim() });
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
                const i = orders.findIndex(x => x.id === payload.new.id);
                if (i >= 0) { orders[i] = { ...orders[i], ...payload.new }; render(); }
            })
            .subscribe(status => { $('liveDot').hidden = status !== 'SUBSCRIBED'; });
    }

    // ---------- email alerts (each admin opts in for themselves) ----------
    let emailOn = false;
    function showEmailAlerts(on) {
        emailOn = on === true;
        $('emailBtn').setAttribute('aria-pressed', String(emailOn));
        $('emailLabel').textContent = `Email alerts: ${emailOn ? 'On' : 'Off'}`;
    }
    async function loadEmailAlerts() {
        const { data, error } = await sb.rpc('my_order_alerts');
        if (!error) showEmailAlerts(data);
    }
    async function toggleEmailAlerts() {
        const btn = $('emailBtn');
        btn.disabled = true;
        const { data, error } = await sb.rpc('set_my_order_alerts', { p_on: !emailOn });
        btn.disabled = false;
        if (error) { toast('Could not change email alerts: ' + error.message); return; }
        showEmailAlerts(data);
        toast(data ? 'Email alerts on — every new order will be emailed to you' : 'Email alerts off for your account');
    }

    async function setStatus(id, status) {
        const prev = orders.find(o => o.id === id);
        const { error } = await sb.from('orders').update({ status }).eq('id', id);
        if (error) { toast('Could not update: ' + error.message); render(); return; }
        if (prev) prev.status = status;
        render();
        toast(`Order #${id.slice(0, 8)} → ${status}`);
    }

    // A short chime for new orders (browsers allow sound after the page was clicked once)
    function ping() {
        try {
            const ctx = ping.ctx || (ping.ctx = new (window.AudioContext || window.webkitAudioContext)());
            [880, 1320].forEach((f, i) => {
                const o = ctx.createOscillator(), g = ctx.createGain();
                o.frequency.value = f;
                g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.15);
                g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.15 + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.15 + 0.3);
                o.connect(g).connect(ctx.destination);
                o.start(ctx.currentTime + i * 0.15);
                o.stop(ctx.currentTime + i * 0.15 + 0.32);
            });
        } catch (e) { /* sound is optional */ }
    }

    // ---------- render ----------
    function matches(o) {
        if (filter !== 'all' && o.status !== filter) return false;
        if (!query) return true;
        const c = o.customer || {};
        const hay = [o.id, c.firstName, c.lastName, c.phone, c.email, c.address].join(' ').toLowerCase();
        return hay.includes(query);
    }

    function render() {
        const count = s => orders.filter(o => o.status === s).length;
        $('cAll').textContent = orders.length;
        $('cNew').textContent = $('stNew').textContent = count('new');
        $('cConfirmed').textContent = $('stConfirmed').textContent = count('confirmed');
        $('cShipped').textContent = $('stShipped').textContent = count('shipped');
        $('cCancelled').textContent = count('cancelled');
        $('stRevenue').textContent = money(orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total || 0), 0));

        const list = orders.filter(matches);
        if (!list.length) {
            $('list').innerHTML = `<p class="adm-empty">${orders.length ? 'No orders match.' : 'No orders yet. New orders will appear here automatically.'}</p>`;
            return;
        }
        $('list').innerHTML = list.map(o => {
            const c = o.customer || {};
            const items = Array.isArray(o.items) ? o.items : [];
            const summary = items.map(i => i && i.name).filter(Boolean).join(', ') || o.order_type;
            const isOpen = open.has(o.id);
            const tel = String(c.phone || '').replace(/[^\d+]/g, '');
            return `
            <article class="adm-order${isOpen ? ' open' : ''}${fresh.has(o.id) ? ' fresh' : ''}" data-id="${esc(o.id)}">
                <div class="adm-row" data-toggle="${esc(o.id)}" role="button" tabindex="0" aria-expanded="${isOpen}">
                    <span class="adm-status s-${esc(o.status)}">${esc(o.status)}</span>
                    <div class="adm-who">
                        <strong>${esc(c.firstName)} ${esc(c.lastName)}</strong>
                        <small>#${esc(o.id.slice(0, 8))} · ${esc(when(o.created_at))}</small>
                    </div>
                    <div class="adm-what">${esc(summary)}</div>
                    <div class="adm-total">${money(o.total)}</div>
                    <i class="fas fa-chevron-down adm-chev"></i>
                </div>
                ${isOpen ? `
                <div class="adm-detail">
                    <div class="adm-contact">
                        <a href="tel:${esc(tel)}"><i class="fas fa-phone"></i> ${esc(c.phone)}</a>
                        <a href="mailto:${esc(c.email)}"><i class="fas fa-envelope"></i> ${esc(c.email)}</a>
                        <span><i class="fas fa-location-dot"></i> ${esc(c.address)}</span>
                        ${c.comments ? `<span><i class="fas fa-comment"></i> ${esc(c.comments)}</span>` : ''}
                    </div>
                    <div class="adm-items">
                        ${items.map(i => `
                        <div class="adm-item">
                            <div class="adm-item-head"><strong>${esc(i.name)}</strong>${i.useCase ? `<em>${esc(i.useCase)}</em>` : ''}<span>${money(i.price)}</span></div>
                            ${(Array.isArray(i.lines) ? i.lines : []).map(l => `<div class="adm-line"><span>${esc(l.name)}</span><span>${money(l.price)}</span></div>`).join('')}
                            ${Array.isArray(i.notes) && i.notes.length ? `<div class="adm-notes">${i.notes.map(esc).join('<br>')}</div>` : ''}
                        </div>`).join('')}
                    </div>
                    <div class="adm-actions">
                        <label>Status
                            <select data-status-for="${esc(o.id)}">
                                ${STATUSES.map(s => `<option value="${s}"${s === o.status ? ' selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </label>
                        <span class="adm-total-big">Total ${money(o.total)}</span>
                    </div>
                </div>` : ''}
            </article>`;
        }).join('');
    }

    // ---------- events ----------
    document.addEventListener('click', e => {
        const row = e.target.closest('[data-toggle]');
        if (row) {
            const id = row.dataset.toggle;
            if (open.has(id)) open.delete(id); else open.add(id);
            fresh.delete(id);
            render();
            return;
        }
        const tab = e.target.closest('#tabs button');
        if (tab) {
            filter = tab.dataset.status;
            document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b === tab));
            render();
        }
    });
    document.addEventListener('keydown', e => {
        const row = e.target.closest && e.target.closest('[data-toggle]');
        if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); row.click(); }
    });
    document.addEventListener('change', e => {
        const sel = e.target.closest('[data-status-for]');
        if (sel) setStatus(sel.dataset.statusFor, sel.value);
    });
    $('search').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); render(); });
    $('gateGoogle').addEventListener('click', async () => {
        const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/admin/' } });
        if (error) toast('Google sign-in is not available right now');
    });
    $('signOutBtn').addEventListener('click', async () => {
        await sb.auth.signOut();
        if (channel) { sb.removeChannel(channel); channel = null; }
        orders = [];
        $('liveDot').hidden = true;
    });
    $('emailBtn').addEventListener('click', toggleEmailAlerts);
    $('notifyBtn').addEventListener('click', async () => {
        if (!('Notification' in window)) { toast('This browser does not support desktop alerts'); return; }
        const p = await Notification.requestPermission();
        toast(p === 'granted' ? 'Desktop alerts on' : 'Desktop alerts are blocked in this browser');
        ping();
    });

    sb.auth.onAuthStateChange((_event, session) => { start(session); });
})();
