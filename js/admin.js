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
    const money = v => { const n = Math.round((Number(v) || 0) * 100) / 100; return '฿' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
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
        toast(`Order #${id.slice(0, 8)} → ${status}${EMAILED.includes(status) ? ' · the customer gets an email' : ''}`);
    }
    // the database emails the customer when an order moves to one of these (private.notify_customer_status)
    const EMAILED = ['confirmed', 'shipped', 'cancelled'];

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
        if (view === 'sales') renderSales();

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
                        <small class="adm-hint"><i class="fas fa-envelope"></i> Confirmed, shipped and cancelled email the customer${c.email ? ` (${esc(c.email)})` : ''}</small>
                        <span class="adm-total-big">Total ${money(o.total)}</span>
                    </div>
                </div>` : ''}
            </article>`;
        }).join('');
    }

    // ---------- sections: Orders · Sales summary · Prices ----------
    let view = 'orders';
    const VIEWS = {
        orders: { eyebrow: 'Orders', title: 'Who ordered what' },
        sales: { eyebrow: 'Sales', title: 'Sales summary' },
        prices: { eyebrow: 'Prices', title: 'Change prices here' },
    };
    function showView(v) {
        if (!VIEWS[v]) return;
        if (view === 'prices' && v !== 'prices' && dirtyCount() && !confirm('You have unsaved price changes. Leave without saving?')) return;
        view = v;
        document.querySelectorAll('#views button').forEach(b => { const on = b.dataset.view === v; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
        $('viewOrders').hidden = v !== 'orders';
        $('viewSales').hidden = v !== 'sales';
        $('viewPrices').hidden = v !== 'prices';
        $('viewEyebrow').textContent = VIEWS[v].eyebrow;
        $('viewTitle').textContent = VIEWS[v].title;
        if (v === 'sales') renderSales();
        if (v === 'prices') loadPrices();
    }

    // ---------- sales summary ----------
    const BKK = { timeZone: 'Asia/Bangkok' };
    const monthKey = d => new Date(d).toLocaleDateString('en-CA', { ...BKK, year: 'numeric', month: '2-digit' }); // 2026-11
    const monthLabel = k => new Date(k + '-15T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    const dateTime = d => new Date(d).toLocaleString('en-GB', { ...BKK, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    // "Soil moisture sensor × 30" -> ["Soil moisture sensor", 30]
    const splitQty = name => { const m = String(name || '').match(/^(.*?) × (\d+)$/); return m ? [m[1], Number(m[2])] : [String(name || ''), 1]; };
    const sumBy = (list, keyOf, valOf) => {
        const m = new Map();
        list.forEach(x => { const k = keyOf(x); const v = valOf(x); const cur = m.get(k) || { n: 0, total: 0 }; cur.n += v.n; cur.total += v.total; m.set(k, cur); });
        return [...m.entries()];
    };

    function renderSales() {
        const box = $('viewSales');
        const live = orders.filter(o => o.status !== 'cancelled');
        const revenue = live.reduce((s, o) => s + Number(o.total || 0), 0);
        const items = live.flatMap(o => (Array.isArray(o.items) ? o.items : []));
        const months = sumBy(live, o => monthKey(o.created_at), o => ({ n: 1, total: Number(o.total || 0) })).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
        const top = sumBy(items, i => i.name || 'Item', i => ({ n: 1, total: Number(i.price || 0) })).sort((a, b) => b[1].total - a[1].total).slice(0, 12);
        // what to buy / build for orders that aren't shipped yet
        const waiting = orders.filter(o => o.status === 'new' || o.status === 'confirmed');
        const parts = sumBy(waiting.flatMap(o => (Array.isArray(o.items) ? o.items : []).flatMap(i => (Array.isArray(i.lines) ? i.lines : []))),
            l => splitQty(l.name)[0], l => ({ n: splitQty(l.name)[1], total: Number(l.price || 0) })).sort((a, b) => b[1].n - a[1].n);
        const table = (head, rows, empty) => rows.length
            ? `<table class="adm-table"><thead><tr>${head.map((h, i) => `<th${i ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`
            : `<p class="adm-empty small">${esc(empty)}</p>`;
        box.innerHTML = `
            <div class="adm-stats">
                <div class="adm-stat"><span>Revenue (not cancelled)</span><strong>${money(revenue)}</strong></div>
                <div class="adm-stat"><span>Orders (not cancelled)</span><strong>${live.length}</strong></div>
                <div class="adm-stat"><span>Average order</span><strong>${money(live.length ? revenue / live.length : 0)}</strong></div>
                <div class="adm-stat"><span>Cancelled</span><strong>${orders.length - live.length}</strong></div>
            </div>
            <div class="adm-downloads">
                <button class="btn adm-small" type="button" data-download="orders"><i class="fas fa-file-excel"></i> Download orders (Excel)</button>
                <button class="btn btn-ghost adm-small" type="button" data-download="lines"><i class="fas fa-file-excel"></i> Download every item line (Excel)</button>
                <small>Opens in Excel or Google Sheets (.csv, Thai text kept). Covers the latest ${orders.length} orders.</small>
            </div>
            <div class="adm-sales-grid">
                <section class="adm-panel"><h2>By month</h2>
                    ${table(['Month', 'Orders', 'Revenue'], months.map(([k, v]) => `<tr><td>${esc(monthLabel(k))}</td><td class="num">${v.n}</td><td class="num">${money(v.total)}</td></tr>`), 'No sales yet.')}
                </section>
                <section class="adm-panel"><h2>Best sellers</h2>
                    ${table(['Box / kit', 'Sold', 'Revenue'], top.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v.n}</td><td class="num">${money(v.total)}</td></tr>`), 'No sales yet.')}
                </section>
                <section class="adm-panel wide"><h2>Parts to prepare <small>new + confirmed orders</small></h2>
                    ${table(['Part', 'Pieces', 'Value'], parts.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v.n}</td><td class="num">${money(v.total)}</td></tr>`), 'Nothing waiting — no new or confirmed orders.')}
                </section>
            </div>`;
    }

    // Excel-friendly CSV: UTF-8 with BOM (Thai shows correctly), and cells that start with = + - @
    // get a leading ' so a customer can't plant a formula in their name or address
    function csvCell(v) {
        let s = v == null ? '' : String(v);
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
        return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }
    function download(kind) {
        const rows = [];
        if (kind === 'orders') {
            rows.push(['Order #', 'Date (Bangkok)', 'Status', 'First name', 'Last name', 'Phone', 'Email', 'Address', 'Comments', 'Items', 'Total (THB)']);
            orders.forEach(o => {
                const c = o.customer || {};
                const items = (Array.isArray(o.items) ? o.items : []).map(i => i && i.name).filter(Boolean).join(' | ');
                rows.push([o.id.slice(0, 8), dateTime(o.created_at), o.status, c.firstName, c.lastName, c.phone, c.email, c.address, c.comments, items, Number(o.total || 0)]);
            });
        } else {
            rows.push(['Order #', 'Date (Bangkok)', 'Status', 'Box / kit', 'Item line', 'Pieces', 'Price (THB)']);
            orders.forEach(o => (Array.isArray(o.items) ? o.items : []).forEach(i => (Array.isArray(i.lines) && i.lines.length ? i.lines : [{ name: i.name, price: i.price }]).forEach(l => {
                const [name, n] = splitQty(l.name);
                rows.push([o.id.slice(0, 8), dateTime(o.created_at), o.status, i.name, name, n, Number(l.price || 0)]);
            })));
        }
        const csv = '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        a.download = `smartplantbox-${kind === 'orders' ? 'orders' : 'item-lines'}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        toast(`Downloaded ${rows.length - 1} rows`);
    }

    // ---------- prices (public.price_list is the only place prices live) ----------
    let prices = [];
    const edits = new Map(); // key -> new price
    const dirtyCount = () => edits.size;
    const PRICE_GROUPS = [
        { p: 'option:', title: 'Ready-made boxes', note: 'The boxes on each category page.' },
        { p: 'controller:', title: 'Control boards', note: 'Box pages, the AI designer and the Customize builder.' },
        { p: 'part:', title: 'Parts', note: 'Price per piece (misting = per set of 2 nozzles).' },
        { p: 'material:', title: 'Box materials', note: '฿ per cm² of box surface.', step: '0.01' },
        { p: 'cf:', title: 'Custom form (05)', note: 'The drop-down lists on the Custom (05) form. ฿ per piece; box material is ฿ per cm².' },
    ];
    async function loadPrices() {
        const box = $('viewPrices');
        if (!prices.length) box.innerHTML = '<p class="adm-empty">Loading prices…</p>';
        const { data, error } = await sb.from('price_list').select('key, name, price, updated_at').order('key');
        if (error) { box.innerHTML = `<p class="adm-empty">Could not load prices: ${esc(error.message)}</p>`; return; }
        prices = data || [];
        edits.clear();
        renderPrices();
    }
    function cfSort(a, b) { // cf:light:10 after cf:light:9
        const [, fa, ia] = a.key.split(':'), [, fb, ib] = b.key.split(':');
        return fa === fb ? Number(ia) - Number(ib) : fa.localeCompare(fb);
    }
    function renderPrices() {
        const box = $('viewPrices');
        const row = r => {
            const val = edits.has(r.key) ? edits.get(r.key) : Number(r.price);
            const rate = r.key.startsWith('material:') || r.key.startsWith('cf:boxMaterial:');
            return `<div class="adm-price${edits.has(r.key) ? ' dirty' : ''}">
                <div><b>${esc(r.name)}</b><small>${esc(r.key)}${r.updated_at ? ` · changed ${esc(new Date(r.updated_at).toLocaleDateString('en-GB', { ...BKK, day: 'numeric', month: 'short', year: 'numeric' }))}` : ''}</small></div>
                <label><span>฿</span><input type="number" inputmode="decimal" min="0" max="1000000" step="${rate ? '0.01' : '1'}" value="${val}" data-price-key="${esc(r.key)}" aria-label="Price of ${esc(r.name)}"></label>
            </div>`;
        };
        box.innerHTML = `
            <p class="adm-note"><i class="fas fa-circle-info"></i> This is the only place prices live. A saved price is used straight away by the server for new orders, and shows on the website the next time a page is opened (carts in customers' browsers are re-priced too).</p>
            ${PRICE_GROUPS.map(g => {
                const rows = prices.filter(r => r.key.startsWith(g.p) && !(g.p === 'cf:' && /:0$/.test(r.key)));
                if (g.p === 'cf:') rows.sort(cfSort);
                return rows.length ? `<section class="adm-panel"><h2>${esc(g.title)} <small>${esc(g.note)}</small></h2><div class="adm-prices">${rows.map(row).join('')}</div></section>` : '';
            }).join('')}
            <div class="adm-savebar" id="saveBar" ${edits.size ? '' : 'hidden'}>
                <span id="saveCount">${edits.size} unsaved change${edits.size === 1 ? '' : 's'}</span>
                <button class="btn btn-ghost adm-small" type="button" id="discardPrices">Discard</button>
                <button class="btn adm-small" type="button" id="savePrices"><i class="fas fa-floppy-disk"></i> Save prices</button>
            </div>`;
    }
    function onPriceInput(input) {
        const key = input.dataset.priceKey;
        const r = prices.find(x => x.key === key);
        const v = input.value === '' ? NaN : Number(input.value);
        const ok = isFinite(v) && v >= 0 && v <= 1000000;
        input.classList.toggle('bad', !ok);
        if (ok && r && Math.abs(v - Number(r.price)) > 0.0001) edits.set(key, Math.round(v * 100) / 100);
        else edits.delete(key);
        input.closest('.adm-price').classList.toggle('dirty', edits.has(key));
        $('saveBar').hidden = !edits.size;
        $('saveCount').textContent = `${edits.size} unsaved change${edits.size === 1 ? '' : 's'}`;
    }
    async function savePrices() {
        if (document.querySelector('#viewPrices input.bad')) { toast('Fix the prices marked in red first (0 – 1,000,000)'); return; }
        const btn = $('savePrices');
        btn.disabled = true;
        let saved = 0;
        const failed = [];
        for (const [key, price] of edits) {
            const { data, error } = await sb.from('price_list').update({ price }).eq('key', key).select('key');
            if (error || !data || !data.length) failed.push(key); else saved++;
        }
        btn.disabled = false;
        toast(failed.length ? `Saved ${saved}, could not save ${failed.length}: ${failed.join(', ')}` : `Saved ${saved} price${saved === 1 ? '' : 's'} — the shop uses them now`);
        await loadPrices();
    }
    window.addEventListener('beforeunload', e => { if (dirtyCount()) { e.preventDefault(); e.returnValue = ''; } });

    // ---------- events ----------
    document.addEventListener('click', e => {
        const v = e.target.closest('#views button');
        if (v) { showView(v.dataset.view); return; }
        const dl = e.target.closest('[data-download]');
        if (dl) { download(dl.dataset.download); return; }
        if (e.target.closest('#savePrices')) { savePrices(); return; }
        if (e.target.closest('#discardPrices')) { edits.clear(); renderPrices(); return; }
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
    document.addEventListener('input', e => {
        const p = e.target.closest('[data-price-key]');
        if (p) onPriceInput(p);
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
