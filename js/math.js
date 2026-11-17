// ============== /math/: the three formulas, live ==============
// 1) V = [a(g − h)s] + [(1 − a)(k·c·m·F)/2]          water per watering (twice a day)
// 2) dm/dt = r·m·(1 − m/K)                             logistic growth rate
// 3) m(t) = K / (1 + e^−(rt + C)),  C = ln(m0/(K − m0)) mass on day t (the solution of 2)

(function () {
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // numbers as people write them: 1,234.5 · 0.000168 · −3.89
    const num = (v, d = 2) => {
        if (!Number.isFinite(v)) return '—';
        const a = Math.abs(v);
        const digits = a !== 0 && a < 0.01 ? Math.min(8, d + Math.ceil(-Math.log10(a))) : d;
        return v.toLocaleString('en-US', { maximumFractionDigits: digits }).replace(/^-/, '−');
    };
    const tt = (en, th) => (window.t ? window.t(en, th) : en);

    // ---------- inputs: a slider + a number box per variable ----------
    // vars: [{ k, sym, name: [en, th], unit: [en, th], min, max, step, v }]
    function buildVars(box, vars, onChange) {
        box.innerHTML = vars.map(x => `
            <div class="mx-var" data-var="${x.k}">
                <label for="v-${box.id}-${x.k}">
                    <i class="mx-sym">${x.sym}</i>
                    <span>${esc(tt(x.name[0], x.name[1]))}</span>
                    <small>${esc(tt(x.unit[0], x.unit[1]))}</small>
                </label>
                <input type="number" id="v-${box.id}-${x.k}" inputmode="decimal" min="${x.min}" max="${x.max}" step="${x.step}" value="${x.v}">
                <input type="range" min="${x.min}" max="${x.max}" step="${x.step}" value="${x.v}" aria-label="${esc(x.sym.replace(/<[^>]+>/g, ''))}" tabindex="-1">
            </div>`).join('');
        box.querySelectorAll('.mx-var').forEach(row => {
            const n = row.querySelector('input[type=number]'), r = row.querySelector('input[type=range]');
            r.addEventListener('input', () => { n.value = r.value; onChange(); });
            n.addEventListener('input', () => { if (n.value !== '' && Number.isFinite(Number(n.value))) { r.value = n.value; onChange(); } });
        });
        const api = {
            raw: k => Number(box.querySelector(`[data-var="${k}"] input[type=number]`).value),
            // typed values are kept inside the allowed range, so ln(0) or ÷0 can't happen
            get: k => { const i = box.querySelector(`[data-var="${k}"] input[type=number]`); return Math.min(Number(i.max), Math.max(Number(i.min), Number(i.value) || 0)); },
            set: (k, v) => { const row = box.querySelector(`[data-var="${k}"]`); row.querySelector('input[type=number]').value = v; row.querySelector('input[type=range]').value = v; },
            limit: (k, max) => { const row = box.querySelector(`[data-var="${k}"]`); row.querySelectorAll('input').forEach(i => { i.max = max; }); if (api.raw(k) > max) api.set(k, max); },
        };
        return api;
    }

    // ---------- small SVG line chart ----------
    // series: [{ pts: [[x, y]...], cls }], extra: raw SVG drawn on top (use X()/Y() given back)
    function chart(el, { xMax, yMin = 0, yMax, xLabel, yLabel, series, extra, label }) {
        const W = 520, H = 280, L = 58, R = 16, Tp = 22, B = 44;
        const X = x => L + (x / xMax) * (W - L - R);
        const Y = y => H - B - ((y - yMin) / (yMax - yMin)) * (H - Tp - B);
        const ticks = (max, n) => { const step = nice(max / n); const out = []; for (let v = 0; v <= max + 1e-9; v += step) out.push(v); return out; };
        const xs = ticks(xMax, 6), ys = ticks(yMax, 4);
        const path = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
        el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
            ${ys.map(v => `<line class="mx-grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="mx-tick" x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${num(v, v < 10 ? 2 : 0)}</text>`).join('')}
            ${xs.map(v => `<text class="mx-tick" x="${X(v)}" y="${H - B + 18}" text-anchor="middle">${num(v, v < 10 ? 2 : 0)}</text>`).join('')}
            <line class="mx-axis" x1="${L}" x2="${W - R}" y1="${Y(yMin)}" y2="${Y(yMin)}"/><line class="mx-axis" x1="${L}" x2="${L}" y1="${Tp}" y2="${H - B}"/>
            <text class="mx-axis-label" x="${W - R}" y="${H - 4}" text-anchor="end">${esc(xLabel)}</text>
            <text class="mx-axis-label" x="${L - 46}" y="${Tp - 4}">${esc(yLabel)}</text>
            ${series.map(s => `<path class="${s.cls}" d="${path(s.pts)}"/>`).join('')}
            ${extra ? extra(X, Y, { W, H, L, R, Tp, B }) : ''}
        </svg>`;
    }
    function nice(x) { const p = Math.pow(10, Math.floor(Math.log10(x || 1))); const f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }

    // ---------- 1) water ----------
    const water = buildVars($('waterVars'), [
        { k: 'a', sym: 'a', name: ['Sensor reliability', 'ความน่าเชื่อถือของเซนเซอร์'], unit: ['0 – 1', '0 – 1'], min: 0, max: 1, step: 0.05, v: 0.7 },
        { k: 'g', sym: 'g', name: ['Target soil moisture', 'ความชื้นในดินที่ต้องการ'], unit: ['%', '%'], min: 0, max: 100, step: 1, v: 40 },
        { k: 'h', sym: 'h', name: ['Current soil moisture', 'ความชื้นในดิน ณ ปัจจุบัน'], unit: ['%', '%'], min: 0, max: 100, step: 1, v: 28 },
        { k: 's', sym: 's', name: ['Soil volume in the pot', 'ปริมาตรดินในกระถาง'], unit: ['m³', 'm³'], min: 0.0005, max: 0.02, step: 0.0005, v: 0.002 },
        { k: 'k', sym: 'k', name: ['Plant water-need constant', 'ค่าคงที่ความต้องการน้ำของพืช'], unit: ['ml / g / day', 'มล. / ก. / วัน'], min: 0, max: 3, step: 0.05, v: 0.8 },
        { k: 'c', sym: 'c', name: ['Plant-age multiplier', 'ตัวคูณตามอายุพืช'], unit: ['×', '×'], min: 0.1, max: 2, step: 0.05, v: 1 },
        { k: 'm', sym: 'm', name: ['Plant mass', 'มวลพืช'], unit: ['g', 'กรัม'], min: 0, max: 2000, step: 1, v: 60 },
        { k: 'F', sym: 'F', name: ['Temperature multiplier', 'ตัวคูณตามอุณหภูมิ'], unit: ['×', '×'], min: 0.5, max: 2, step: 0.05, v: 1.1 },
    ], updateWater);

    function updateWater() {
        const a = water.get('a'), g = water.get('g'), h = water.get('h'), s = water.get('s');
        const k = water.get('k'), c = water.get('c'), m = water.get('m'), F = water.get('F');
        const G = g / 100, Hh = h / 100;
        const partA_m3 = a * (G - Hh) * s;           // m³
        const partA = partA_m3 * 1e6;                 // ml
        const partB = (1 - a) * (k * c * m * F) / 2;  // ml
        const V = partA + partB;
        const ml = tt('ml', 'มล.');
        if (V > 0) {
            $('waterV').textContent = `${num(V, 1)} ${ml}`;
            $('waterDay').textContent = tt(`Twice a day = ${num(2 * V, 1)} ml a day (${num(2 * V / 1000, 2)} litres)`, `รดวันละ 2 ครั้ง = วันละ ${num(2 * V, 1)} มล. (${num(2 * V / 1000, 2)} ลิตร)`);
        } else {
            $('waterV').textContent = `0 ${ml}`;
            $('waterDay').textContent = tt(`V = ${num(V, 1)} ml ≤ 0 — the soil is already wetter than needed, so the box skips this watering.`, `V = ${num(V, 1)} มล. ≤ 0 ดินชื้นเกินพอแล้ว กล่องจะงดรดน้ำรอบนี้`);
        }
        // how much each part adds
        const pa = Math.max(0, partA), pb = Math.max(0, partB), tot = pa + pb || 1;
        const bar = $('waterBar');
        bar.querySelector('.a').style.width = (pa / tot * 100) + '%';
        bar.querySelector('.b').style.width = (pb / tot * 100) + '%';
        $('waterSteps').innerHTML = `
            <p class="mx-steps-title">${esc(tt('Substitute the values', 'แทนค่า'))}</p>
            <p>V = <span class="mx-ta">[${num(a)} × (${num(G)} − ${num(Hh)}) × ${num(s, 4)}]</span></p>
            <p>&nbsp;&nbsp;+ <span class="mx-tb">[(1 − ${num(a)}) × (${num(k)} × ${num(c)} × ${num(m)} × ${num(F)}) / 2]</span></p>
            <p>&nbsp;&nbsp;= <span class="mx-ta">${num(partA_m3, 6)} m³</span> + <span class="mx-tb">${num(partB, 2)} ${ml}</span></p>
            <p>&nbsp;&nbsp;= <span class="mx-ta">${num(partA, 1)} ${ml}</span> + <span class="mx-tb">${num(partB, 1)} ${ml}</span> = <b>${num(V, 1)} ${ml}</b></p>`;
    }

    // ---------- 2) growth rate ----------
    const rate = buildVars($('rateVars'), [
        { k: 'r', sym: 'r', name: ['Initial relative growth rate', 'อัตราการโตสัมพัทธ์ตอนต้น'], unit: ['per day', 'ต่อวัน'], min: 0.01, max: 0.5, step: 0.01, v: 0.12 },
        { k: 'K', sym: 'K', name: ['Plant mass when fully grown', 'มวลพืช ณ ตอนโตเต็มที่'], unit: ['g', 'กรัม'], min: 10, max: 2000, step: 10, v: 250 },
        { k: 'm', sym: 'm', name: ['Plant mass now', 'มวลพืชตอนนี้'], unit: ['g', 'กรัม'], min: 0, max: 250, step: 1, v: 60 },
    ], updateRate);

    function updateRate() {
        const r = rate.get('r'), K = rate.get('K');
        rate.limit('m', K);
        const m = rate.get('m');
        const d = r * m * (1 - m / K);
        const g = tt('g/day', 'กรัม/วัน');
        $('rateOut').textContent = `${num(d, 2)} ${g}`;
        $('rateMax').textContent = tt(`Fastest possible: ${num(r * K / 4, 2)} g/day, when m = K/2 = ${num(K / 2, 1)} g`, `เร็วที่สุดที่เป็นไปได้: ${num(r * K / 4, 2)} กรัม/วัน เมื่อ m = K/2 = ${num(K / 2, 1)} กรัม`);
        const pts = [];
        for (let i = 0; i <= 100; i++) { const x = K * i / 100; pts.push([x, r * x * (1 - x / K)]); }
        const top = r * K / 4;
        chart($('rateChart'), {
            xMax: K, yMax: top * 1.15 || 1,
            xLabel: tt('m (g)', 'm (กรัม)'), yLabel: 'dm/dt',
            label: tt(`Parabola of dm/dt against m, highest at m = ${num(K / 2)} g`, `กราฟพาราโบลาของ dm/dt เทียบกับ m สูงสุดที่ m = ${num(K / 2)} กรัม`),
            series: [{ pts, cls: 'mx-line' }],
            extra: (X, Y) => `
                <line class="mx-guide" x1="${X(K / 2)}" x2="${X(K / 2)}" y1="${Y(0)}" y2="${Y(top)}"/>
                <circle class="mx-peak" cx="${X(K / 2)}" cy="${Y(top)}" r="5"/>
                <text class="mx-note" x="${X(K / 2)}" y="${Y(top) - 10}" text-anchor="middle">K/2</text>
                <circle class="mx-dot" cx="${X(m)}" cy="${Y(d)}" r="7"/>`,
        });
        $('rateSteps').innerHTML = `
            <p class="mx-steps-title">${esc(tt('Substitute the values', 'แทนค่า'))}</p>
            <p>dm/dt = ${num(r)} × ${num(m)} × (1 − ${num(m)} / ${num(K)})</p>
            <p>&nbsp;&nbsp;= ${num(r * m, 3)} × ${num(1 - m / K, 4)} = <b>${num(d, 2)} ${g}</b></p>`;
    }

    // ---------- 3) mass on day t ----------
    const mass = buildVars($('massVars'), [
        { k: 'K', sym: 'K', name: ['Plant mass when fully grown', 'มวลพืช ณ ตอนโตเต็มที่'], unit: ['g', 'กรัม'], min: 10, max: 2000, step: 10, v: 250 },
        { k: 'm0', sym: 'm<sub>0</sub>', name: ['Starting mass (day 0)', 'มวลเริ่มต้น (วันที่ 0)'], unit: ['g', 'กรัม'], min: 0.5, max: 249, step: 0.5, v: 5 },
        { k: 'r', sym: 'r', name: ['Initial relative growth rate', 'อัตราการโตสัมพัทธ์ตอนต้น'], unit: ['per day', 'ต่อวัน'], min: 0.01, max: 0.5, step: 0.01, v: 0.12 },
        { k: 't', sym: 't', name: ['Time', 'เวลา'], unit: ['days', 'วัน'], min: 0, max: 120, step: 1, v: 30 },
    ], updateMass);

    let lastMass = null;
    function updateMass() {
        const K = mass.get('K');
        mass.limit('m0', Math.max(0.5, K - 0.5));
        const m0 = mass.get('m0'), r = mass.get('r');
        const C = Math.log(m0 / (K - m0));
        // show the curve until it is 99% grown (at least 10 days, at most a year)
        const T = Math.min(365, Math.max(10, Math.ceil(((Math.log(99) - C) / r) * 1.08)));
        mass.limit('t', T);
        const t = mass.get('t');
        const mt = tm => K / (1 + Math.exp(-(r * tm + C)));
        const m = mt(t);
        const d = r * m * (1 - m / K);
        const tStar = -C / r;
        const t90 = (Math.log(9) - C) / r;
        lastMass = m;
        const gram = tt('g', 'กรัม');
        $('massLabel').textContent = tt(`Plant mass on day ${num(t, 0)}`, `มวลพืช ณ วันที่ ${num(t, 0)}`);
        $('massOut').textContent = `${num(m, 1)} ${gram}`;
        $('massRate').textContent = tt(`Growing ${num(d, 2)} g/day on that day (formula 2) · ${num(m / K * 100, 1)}% of fully grown`, `วันนั้นโตวันละ ${num(d, 2)} กรัม (จากสูตรที่ 2) · ${num(m / K * 100, 1)}% ของตอนโตเต็มที่`);
        const pts = [];
        for (let i = 0; i <= 160; i++) { const x = T * i / 160; pts.push([x, mt(x)]); }
        const span = T * 0.12;
        chart($('massChart'), {
            xMax: T, yMax: K * 1.08,
            xLabel: tt('t (days)', 't (วัน)'), yLabel: tt('m (g)', 'm (กรัม)'),
            label: tt(`S-shaped growth curve from ${num(m0)} g towards ${num(K)} g; on day ${num(t, 0)} the plant weighs ${num(m, 1)} g`, `กราฟการเติบโตรูปตัว S จาก ${num(m0)} กรัม เข้าใกล้ ${num(K)} กรัม วันที่ ${num(t, 0)} พืชหนัก ${num(m, 1)} กรัม`),
            series: [{ pts, cls: 'mx-line' }],
            extra: (X, Y, g) => `
                <line class="mx-cap" x1="${g.L}" x2="${g.W - g.R}" y1="${Y(K)}" y2="${Y(K)}"/>
                <text class="mx-note" x="${g.W - g.R - 4}" y="${Y(K) - 6}" text-anchor="end">K = ${num(K)}</text>
                ${tStar > 0 && tStar < T ? `<line class="mx-guide" x1="${X(tStar)}" x2="${X(tStar)}" y1="${Y(0)}" y2="${Y(K / 2)}"/>
                <circle class="mx-peak" cx="${X(tStar)}" cy="${Y(K / 2)}" r="5"/>
                <text class="mx-note" x="${X(tStar) + 8}" y="${Y(K / 2) + 16}">t* ≈ ${num(tStar, 1)}</text>` : ''}
                <line class="mx-tangent" x1="${X(Math.max(0, t - span))}" y1="${Y(m - d * (t - Math.max(0, t - span)))}" x2="${X(Math.min(T, t + span))}" y2="${Y(m + d * (Math.min(T, t + span) - t))}"/>
                <circle class="mx-dot" cx="${X(t)}" cy="${Y(m)}" r="7"/>`,
        });
        $('massFacts').innerHTML = [
            tt(`C = ln(${num(m0)} / (${num(K)} − ${num(m0)})) = ${num(C, 3)}`, `C = ln(${num(m0)} / (${num(K)} − ${num(m0)})) = ${num(C, 3)}`),
            tStar > 0 ? tt(`Fastest growth on day t* = −C / r ≈ ${num(tStar, 1)}, at ${num(K / 2)} g`, `โตเร็วที่สุดวันที่ t* = −C / r ≈ ${num(tStar, 1)} ตอนหนัก ${num(K / 2)} กรัม`)
                      : tt('It already started above K/2, so it is slowing down from day 0.', 'เริ่มต้นหนักเกิน K/2 แล้ว จึงโตช้าลงตั้งแต่วันแรก'),
            t90 > 0 ? tt(`Reaches 90% of K (${num(K * 0.9)} g) on day ≈ ${num(t90, 1)}`, `ถึง 90% ของ K (${num(K * 0.9)} กรัม) วันที่ ≈ ${num(t90, 1)}`) : '',
        ].filter(Boolean).map(s => `<li>${esc(s)}</li>`).join('');
        $('massSteps').innerHTML = `
            <p class="mx-steps-title">${esc(tt('Substitute the values', 'แทนค่า'))}</p>
            <p>m(${num(t, 0)}) = ${num(K)} / (1 + e<sup>−(${num(r)} × ${num(t, 0)} + (${num(C, 3)}))</sup>)</p>
            <p>&nbsp;&nbsp;= ${num(K)} / (1 + e<sup>${num(-(r * t + C), 3)}</sup>) = ${num(K)} / ${num(1 + Math.exp(-(r * t + C)), 4)} = <b>${num(m, 1)} ${esc(gram)}</b></p>`;
        $('useMass').querySelector('span').textContent = tt(`Use ${num(m, 0)} g in formula 1 (water)`, `ใช้มวล ${num(m, 0)} กรัม ในสูตรที่ 1 (ปริมาณน้ำ)`);
    }

    // formula 3 → formula 1: the water follows the plant's size
    $('useMass').addEventListener('click', () => {
        if (lastMass == null) return;
        water.set('m', Math.round(lastMass));
        updateWater();
        const card = $('water');
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const row = $('waterVars').querySelector('[data-var="m"]');
        row.classList.remove('flash');
        void row.offsetWidth;
        row.classList.add('flash');
    });

    updateWater();
    updateRate();
    updateMass();
})();
