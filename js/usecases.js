// ============== Use-case pages ==============
// Each use case shows recommended boxes (with real photos) plus a "customize" option that
// starts from our recommended parts, so customers can untick, add, or resize.
// Farmers first answer a short survey; their answers decide the recommended parts.
//
// NOTE: product details and prices for the new boxes are placeholders until the team
// confirms the real specs.

(function () {
    // ---------- catalogue for the preset configurator ----------
    const CONTROLLERS = [
        { id: 'nano', name: 'Arduino Nano', price: 3 },
        { id: 'uno', name: 'Arduino Uno', price: 3.5 },
        { id: 'esp32', name: 'ESP32 (Wi-Fi app control)', price: 5 },
        { id: 'pi4', name: 'Raspberry Pi 4 (AI camera ready)', price: 50 },
    ];
    const PARTS = [
        { id: 'ledRB', group: 'Light', name: 'Red + blue LED grow strips', price: 6 },
        { id: 'ledFull', group: 'Light', name: 'Dimmable full-spectrum LED panel', price: 11 },
        { id: 'pump', group: 'Water', name: 'Automatic watering pump + hose', price: 5 },
        { id: 'mist', group: 'Water', name: 'Misting system (2 nozzles + pump)', price: 12 },
        { id: 'fert', group: 'Water', name: 'Fertilizer doser', price: 7 },
        { id: 'hydro', group: 'Water', name: 'Hydroponic reservoir + air pump', price: 9 },
        { id: 'fan', group: 'Climate', name: 'Exhaust fan', price: 6 },
        { id: 'cooler', group: 'Climate', name: 'Cooling fan', price: 10 },
        { id: 'heater', group: 'Climate', name: 'Heater', price: 9 },
        { id: 'soil', group: 'Sensors', name: 'Soil moisture sensor', price: 1.5 },
        { id: 'dht', group: 'Sensors', name: 'Temperature & humidity sensor', price: 2.5 },
        { id: 'lux', group: 'Sensors', name: 'Light sensor', price: 1.5 },
        { id: 'level', group: 'Sensors', name: 'Water level sensor', price: 1.5 },
        { id: 'ph', group: 'Sensors', name: 'pH sensor', price: 8 },
        { id: 'npk', group: 'Sensors', name: 'NPK soil nutrient sensor', price: 16 },
        { id: 'cam', group: 'Camera', name: 'Camera (ESP32-CAM)', price: 6 },
        { id: 'camAI', group: 'Camera', name: 'Camera + AI plant disease detection', price: 14 },
    ];
    const MATERIALS = [
        { id: 'none', name: 'No enclosure (open plot)', rate: 0 },
        { id: 'plastic', name: 'Plastic', rate: 0.0015 },
        { id: 'acrylic', name: 'Acrylic', rate: 0.003 },
        { id: 'glass', name: 'Glass', rate: 0.004 },
    ];

    // ---------- use cases ----------
    const UC = {
        disaster: {
            num: '01', eyebrow: 'Relief', title: 'For Disaster Victims', short: 'Relief',
            cover: { img: 'images/usecases/disaster-cover.webp' },
            lead: 'Boxes that families can set up in minutes after a flood or storm, with the pump, sensors and power supply already wired. Pick the size that fits your household.',
            optionsTitle: 'Choose by household size',
            options: [
                {
                    id: 'relief-s', name: 'Relief Box S', tag: 'Household of 2–4', price: 18, controller: 'Arduino Nano',
                    img: 'images/usecases/disaster-small.webp', alt: 'Small clear storage box with two potted plants, a power supply and a controller box on the lid',
                    features: ['Clear storage box with lid', 'Holds 2 pots', 'Automatic watering pump', 'Soil moisture sensor', 'Plug-in power supply'],
                },
                {
                    id: 'relief-l', name: 'Relief Box L', tag: 'Household of 4+', price: 34, controller: 'ESP32',
                    img: 'images/usecases/disaster-large.webp', alt: 'Large clear storage box with several potted plants and a misting pipe along the top',
                    features: ['Large clear storage box', 'Holds 4–6 pots', 'Misting pipe with 3 nozzles', 'Temperature & humidity sensor', 'Wi-Fi alerts to your phone'],
                },
            ],
            preset: { controller: 'nano', parts: ['ledRB', 'pump', 'soil', 'dht'], material: 'plastic', size: [45, 32, 30] },
        },
        farmer: {
            num: '02', eyebrow: 'Agriculture', title: 'For Farmers', short: 'Farm',
            cover: { video: 'videos/farmer.mp4', poster: 'images/usecases/farmer-poster.webp' },
            lead: 'Tell us about your farm and we will match the system to your plot, the way you grow, and your budget.',
            optionsTitle: 'Matched to your farm',
            survey: true,
            options: [
                {
                    id: 'farmer-vision', name: 'Farmer Vision', tag: 'Soil & hydroponic plots', price: 55, priceNote: 'from', controller: 'ESP32 Dual Core',
                    img: 'images/usecases/farmer-vision.webp', alt: 'Hydroponic growing room lit by pink LED grow lights',
                    features: ['Red + blue LED grow lights', 'Automatic water & fertilizer', 'Misting for humidity', 'Camera with AI plant disease detection', 'Multi-zone control + Line/email reports'],
                },
            ],
            preset: { controller: 'esp32', parts: ['ledFull', 'pump', 'fert', 'soil', 'dht'], material: 'none', size: [100, 100, 60] },
        },
        household: {
            num: '03', eyebrow: 'Home', title: 'For Households', short: 'Home',
            cover: { video: 'videos/household.mp4', poster: 'images/usecases/household-poster.webp' },
            lead: 'A grow tent for your home that lights, waters and mists your plants by itself.',
            optionsTitle: 'Our home box',
            options: [
                {
                    id: 'home-tent', name: 'Home Grow Tent', tag: 'Balcony, porch or living room', price: 24, controller: 'ESP32',
                    img: 'images/usecases/household-tent.webp', alt: 'PVC frame grow tent with mesh walls and a pink LED light above a potted plant',
                    features: ['PVC frame with mesh walls', 'Clip-on LED grow light', 'Misting nozzles on both sides', 'Water pump + reservoir', 'App control over Wi-Fi'],
                },
            ],
            preset: { controller: 'esp32', parts: ['ledRB', 'mist', 'pump', 'soil', 'dht'], material: 'plastic', size: [60, 60, 60] },
        },
        condo: {
            num: '04', eyebrow: 'Small spaces', title: 'For Condominiums', short: 'Condo',
            cover: { img: 'images/build-side.webp' },
            lead: 'Compact, quiet boxes for small rooms and balconies. Add the sensors you need to each kit.',
            optionsTitle: 'Kits for small spaces',
            legacyProducts: [5, 2, 1],
            preset: { controller: 'esp32', parts: ['ledFull', 'pump', 'soil', 'dht', 'fan'], material: 'acrylic', size: [40, 30, 50] },
        },
        commercial: {
            num: '05', eyebrow: 'Premium crops', title: 'Commercial & High-Value Crops', short: 'Commercial',
            cover: { img: 'images/usecases/commercial-hydro.webp' },
            lead: 'Precision chambers for plants worth protecting. Every input is measured, controlled and logged.',
            optionsTitle: 'Our innovations',
            options: [
                {
                    id: 'hydro-cube', name: 'Hydro Cube', tag: 'Hydroponic chamber', price: 68, controller: 'ESP32',
                    img: 'images/usecases/commercial-hydro.webp', alt: 'Acrylic chamber with red and blue LED strips, a plant on a shelf and a water tank below',
                    features: ['Acrylic chamber with built-in water tank', 'Hydroponic reservoir + pump', 'Red + blue LED strips', 'Cooling fan & misting', 'pH & water-level sensors'],
                },
                {
                    id: 'v4-pro', name: 'Smart Plant Box V4', tag: 'Full climate control', price: 48, controller: 'Raspberry Pi 4',
                    img: 'images/build-front.webp', alt: 'Smart Plant Box V4 with its pink LED canopy switched on',
                    features: ['Acrylic chamber on aluminium feet', 'Full red + blue LED canopy', 'Fans, misting & automatic pump', 'Camera + AI plant health analysis', 'Cloud data & app control'],
                },
            ],
            preset: { controller: 'pi4', parts: ['ledRB', 'hydro', 'ph', 'level', 'dht', 'cooler', 'mist', 'camAI'], material: 'acrylic', size: [40, 32, 56] },
        },
    };

    // Farmer survey choices and the parts each answer recommends
    const PROBLEMS = [
        { id: 'pests', label: 'Pests & plant disease', parts: ['camAI'] },
        { id: 'water', label: 'Not enough water', parts: ['pump', 'soil', 'level'] },
        { id: 'heat', label: 'Too hot', parts: ['fan', 'cooler'] },
        { id: 'yield', label: 'Low yield', parts: ['ledFull', 'npk'] },
        { id: 'labour', label: 'Not enough workers', parts: ['pump', 'fert'] },
        { id: 'nutrients', label: 'Poor soil nutrients', parts: ['npk', 'fert'] },
    ];
    const SYSTEMS = [
        { id: 'soil', label: 'Soil', parts: ['soil', 'npk'] },
        { id: 'hydro', label: 'Hydroponics', parts: ['hydro', 'ph', 'level'] },
        { id: 'both', label: 'Both', parts: ['soil', 'npk', 'hydro', 'ph', 'level'] },
    ];
    const FUNCTIONS = [
        { id: 'light', label: 'Grow lights', icon: 'fa-lightbulb', parts: ['ledFull'] },
        { id: 'water', label: 'Automatic watering', icon: 'fa-droplet', parts: ['pump', 'fert'] },
        { id: 'mist', label: 'Misting', icon: 'fa-cloud', parts: ['mist'] },
        { id: 'camera', label: 'Camera + plant disease detection', icon: 'fa-camera', parts: ['camAI'] },
    ];

    // ---------- state ----------
    let current = null;     // use-case key
    let cfg = null;         // { controller, parts: Set, material, size: [w, l, h] }
    let recommended = null; // the preset we started from
    let survey = null;      // farmer answers

    const $ = (sel, root = document) => root.querySelector(sel);
    const round2 = v => Math.round(v * 100) / 100;
    const money = v => `$${Number.isInteger(round2(v)) ? round2(v) : round2(v).toFixed(2)}`;
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- open a use case ----------
    function openUseCase(key) {
        const uc = UC[key];
        const section = document.getElementById('useCaseDetail');
        if (!uc || !section) return;
        current = key;
        survey = null;
        setPreset(uc.preset);
        section.innerHTML = renderPage(uc);

        if (uc.legacyProducts && typeof createProductCard === 'function' && typeof products !== 'undefined') {
            const grid = $('.uc-options', section);
            const customize = $('.uc-customize', grid);
            uc.legacyProducts.forEach(id => {
                const p = products.find(x => x.id === id);
                if (p) grid.insertBefore(createProductCard(p), customize);
            });
        }

        ['userTypeSection', 'customForm', 'orderForm', 'configForm', 'productSelection'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        section.style.display = 'block';
        const video = $('.uc-hero video', section);
        if (video && !reduceMotion) video.play().catch(() => {});
        section.scrollIntoView({ behavior: 'smooth' });
    }

    function setPreset(preset) {
        recommended = { controller: preset.controller, parts: [...preset.parts], material: preset.material, size: [...preset.size] };
        cfg = { controller: preset.controller, parts: new Set(preset.parts), material: preset.material, size: [...preset.size] };
    }

    // ---------- rendering ----------
    function renderPage(uc) {
        const media = uc.cover.video
            ? `<video class="uc-hero-media" muted loop playsinline preload="auto" poster="${uc.cover.poster}" aria-hidden="true"><source src="${uc.cover.video}" type="video/mp4"></video>`
            : `<img class="uc-hero-media" src="${uc.cover.img}" alt="" aria-hidden="true">`;
        const options = (uc.options || []).map(renderOption).join('');
        return `
            <button class="back-btn" type="button" onclick="backToUserType()"><i class="fas fa-arrow-left"></i> Back</button>
            <header class="uc-hero">
                ${media}
                <div class="uc-hero-shade"></div>
                <div class="uc-hero-text">
                    <span class="eyebrow">${uc.num} — ${esc(uc.eyebrow)}</span>
                    <h2>${esc(uc.title)}</h2>
                    <p>${esc(uc.lead)}</p>
                </div>
            </header>
            <div class="uc-body">
                ${uc.survey ? renderSurvey() : ''}
                <div class="uc-results"${uc.survey ? ' hidden' : ''}>
                    <div class="uc-section-head">
                        <span class="eyebrow">${uc.survey ? 'Step 2 — Our recommendation' : 'Recommended'}</span>
                        <h3>${esc(uc.optionsTitle)}</h3>
                    </div>
                    <div class="uc-survey-summary" hidden></div>
                    <div class="uc-options">
                        ${options}
                        <div class="uc-option uc-customize">
                            <div class="uc-customize-icon"><i class="fas fa-sliders"></i></div>
                            <h4>Customize this setup</h4>
                            <p>Start from the parts we recommend for ${esc(uc.short.toLowerCase())} growing. Untick what you don't need, add extras, or change the size.</p>
                            <button class="btn btn-ghost" type="button" data-action="customize">Customize <i class="fas fa-arrow-down"></i></button>
                        </div>
                    </div>
                    <div class="uc-config" id="ucConfig" hidden></div>
                </div>
            </div>`;
    }

    function renderOption(o) {
        return `
            <article class="uc-option">
                <div class="uc-option-media">
                    <img src="${o.img}" alt="${esc(o.alt)}" loading="lazy">
                    <span class="uc-option-tag">${esc(o.tag)}</span>
                </div>
                <div class="uc-option-body">
                    <div class="uc-option-head">
                        <h4>${esc(o.name)}</h4>
                        <span class="uc-price">${o.priceNote ? `<small>${o.priceNote}</small>` : ''}${money(o.price)}</span>
                    </div>
                    <p class="uc-ctrl">Controller: ${esc(o.controller)}</p>
                    <ul class="uc-features">${o.features.map(f => `<li><i class="fas fa-check"></i>${esc(f)}</li>`).join('')}</ul>
                    <div class="uc-option-actions">
                        <button class="btn btn-ghost" type="button" data-action="add" data-id="${o.id}"><i class="fas fa-bag-shopping"></i> Add to cart</button>
                        <button class="btn" type="button" data-action="order" data-id="${o.id}">Order now</button>
                    </div>
                </div>
            </article>`;
    }

    function renderSurvey() {
        const chips = (name, list, type) => list.map(o => `
            <label class="chip"><input type="${type}" name="${name}" value="${o.id}"${type === 'radio' && o.id === 'soil' ? ' checked' : ''}>
            <span>${o.icon ? `<i class="fas ${o.icon}"></i>` : ''}${esc(o.label)}</span></label>`).join('');
        return `
            <form class="uc-survey" id="farmSurvey" novalidate>
                <div class="uc-section-head">
                    <span class="eyebrow">Step 1 — Tell us about your farm</span>
                    <h3>A few questions first</h3>
                </div>
                <div class="survey-grid">
                    <label class="field">
                        <span class="field-label">Farm or plot size</span>
                        <span class="input-unit">
                            <input class="uc-input" type="number" id="sArea" min="1" step="any" placeholder="e.g. 200" required>
                            <select class="uc-input" id="sAreaUnit" aria-label="Area unit"><option value="m²">m²</option><option value="rai">rai</option></select>
                        </span>
                    </label>
                    <label class="field">
                        <span class="field-label">Most you can spend</span>
                        <span class="input-unit"><span class="unit-prefix">$</span>
                            <input class="uc-input" type="number" id="sBudget" min="1" step="any" placeholder="e.g. 150" required>
                        </span>
                    </label>
                    <fieldset class="field full">
                        <legend class="field-label">What problems do you have?</legend>
                        <div class="chip-group">${chips('problem', PROBLEMS, 'checkbox')}</div>
                        <input class="uc-input" type="text" id="sProblemOther" placeholder="Anything else? (optional)">
                    </fieldset>
                    <fieldset class="field">
                        <legend class="field-label">How do you grow?</legend>
                        <div class="chip-group">${chips('system', SYSTEMS, 'radio')}</div>
                    </fieldset>
                    <fieldset class="field">
                        <legend class="field-label">Which functions do you want?</legend>
                        <div class="chip-group">${chips('func', FUNCTIONS, 'checkbox')}</div>
                    </fieldset>
                </div>
                <p class="survey-error" role="alert" hidden></p>
                <button class="btn" type="submit">See my recommendation <i class="fas fa-arrow-right"></i></button>
            </form>`;
    }

    // ---------- farmer survey ----------
    function submitSurvey(form) {
        const area = parseFloat($('#sArea', form).value);
        const budget = parseFloat($('#sBudget', form).value);
        const err = $('.survey-error', form);
        if (!(area > 0) || !(budget > 0)) {
            err.textContent = 'Please enter your plot size and the most you can spend.';
            err.hidden = false;
            return;
        }
        err.hidden = true;
        const checked = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
        const problems = checked('problem');
        const system = checked('system')[0] || 'soil';
        const funcs = checked('func');
        survey = {
            area, areaUnit: $('#sAreaUnit', form).value, budget,
            problems: problems.map(id => PROBLEMS.find(p => p.id === id).label),
            problemOther: $('#sProblemOther', form).value.trim(),
            system: SYSTEMS.find(s => s.id === system).label,
            functions: funcs.map(id => FUNCTIONS.find(f => f.id === id).label),
        };

        // Recommended parts come straight from the answers
        const parts = new Set(['dht']);
        SYSTEMS.find(s => s.id === system).parts.forEach(p => parts.add(p));
        problems.forEach(id => PROBLEMS.find(p => p.id === id).parts.forEach(x => parts.add(x)));
        funcs.forEach(id => FUNCTIONS.find(f => f.id === id).parts.forEach(x => parts.add(x)));
        setPreset({ controller: parts.has('camAI') ? 'pi4' : 'esp32', parts: [...parts], material: 'none', size: [100, 100, 60] });

        const section = document.getElementById('useCaseDetail');
        const results = $('.uc-results', section);
        const summary = $('.uc-survey-summary', section);
        summary.innerHTML = `<span>Based on your answers:</span>${surveyNotes().map(n => `<span class="pill">${esc(n)}</span>`).join('')}`;
        summary.hidden = false;
        results.hidden = false;
        const configEl = $('#ucConfig', section);
        if (!configEl.hidden) renderConfig();
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function surveyNotes() {
        if (!survey) return [];
        const notes = [`Plot: ${survey.area} ${survey.areaUnit}`, `Budget: up to ${money(survey.budget)}`, `Grows in: ${survey.system}`];
        if (survey.problems.length) notes.push(`Problems: ${survey.problems.join(', ')}`);
        if (survey.problemOther) notes.push(`Other: ${survey.problemOther}`);
        if (survey.functions.length) notes.push(`Wants: ${survey.functions.join(', ')}`);
        return notes;
    }

    // ---------- preset configurator ----------
    function renderConfig() {
        const uc = UC[current];
        const el = document.getElementById('ucConfig');
        const rec = new Set(recommended.parts);
        const groups = [...new Set(PARTS.map(p => p.group))];
        const option = (type, name, value, on, label, price, isRec) => `
            <label class="cfg-option ${type}${on ? ' is-on' : ''}">
                <input type="${type}" name="${name}" value="${value}"${on ? ' checked' : ''}>
                <span class="cfg-check" aria-hidden="true"></span>
                <span class="cfg-name">${esc(label)}${isRec ? '<em>Recommended</em>' : ''}</span>
                <span class="cfg-price">${money(price)}</span>
            </label>`;
        const showSize = cfg.material !== 'none';
        el.innerHTML = `
            <div class="uc-config-head">
                <div>
                    <span class="eyebrow">Customize</span>
                    <h3>Your ${esc(uc.short.toLowerCase())} setup</h3>
                    <p>We've ticked what we recommend. Untick anything you don't need, add extras, or change the size.</p>
                </div>
                <button class="btn btn-ghost" type="button" data-action="reset"><i class="fas fa-rotate-left"></i> Reset to recommended</button>
            </div>
            <div class="uc-config-grid">
                <form class="uc-config-main" id="ucConfigForm" onsubmit="return false">
                    <fieldset class="cfg-group">
                        <legend>Controller</legend>
                        <div class="cfg-options">${CONTROLLERS.map(c => option('radio', 'cfgController', c.id, cfg.controller === c.id, c.name, c.price, recommended.controller === c.id)).join('')}</div>
                    </fieldset>
                    ${groups.map(g => `
                    <fieldset class="cfg-group">
                        <legend>${g}</legend>
                        <div class="cfg-options">${PARTS.filter(p => p.group === g).map(p => option('checkbox', 'cfgPart', p.id, cfg.parts.has(p.id), p.name, p.price, rec.has(p.id))).join('')}</div>
                    </fieldset>`).join('')}
                    <fieldset class="cfg-group">
                        <legend>Enclosure & size</legend>
                        <div class="cfg-size">
                            <label class="field"><span class="field-label">Material</span>
                                <select class="uc-input" id="cfgMaterial">${MATERIALS.map(m => `<option value="${m.id}"${cfg.material === m.id ? ' selected' : ''}>${m.name}${m.rate ? ` ($${m.rate}/cm²)` : ''}</option>`).join('')}</select>
                            </label>
                            ${['Width', 'Length', 'Height'].map((lab, i) => `
                            <label class="field cfg-dim"${showSize ? '' : ' hidden'}><span class="field-label">${lab} (cm)</span>
                                <input class="uc-input" type="number" min="10" max="400" step="1" data-dim="${i}" value="${cfg.size[i]}">
                            </label>`).join('')}
                        </div>
                    </fieldset>
                </form>
                <aside class="uc-summary" aria-live="polite"></aside>
            </div>`;
        el.hidden = false;
        renderSummary();
    }

    function lines() {
        const out = [];
        const c = CONTROLLERS.find(x => x.id === cfg.controller);
        if (c) out.push({ name: c.name, price: c.price });
        PARTS.forEach(p => { if (cfg.parts.has(p.id)) out.push({ name: p.name, price: p.price }); });
        const m = MATERIALS.find(x => x.id === cfg.material);
        if (m && m.rate) {
            const [w, l, h] = cfg.size.map(v => Math.max(0, v || 0));
            const area = 2 * (w * l + w * h + l * h);
            out.push({ name: `${m.name} box ${w}×${l}×${h} cm`, price: round2(area * m.rate) });
        }
        return out;
    }

    function renderSummary() {
        const aside = $('.uc-summary', document.getElementById('ucConfig'));
        if (!aside) return;
        const items = lines();
        const total = round2(items.reduce((s, x) => s + x.price, 0));
        const over = survey && total > survey.budget ? total - survey.budget : 0;
        aside.innerHTML = `
            <span class="eyebrow">Your setup</span>
            <ul class="uc-lines">${items.map(i => `<li><span>${esc(i.name)}</span><span>${money(i.price)}</span></li>`).join('')}</ul>
            <div class="uc-total"><span>Total</span><span>${money(total)}</span></div>
            ${survey ? `<p class="uc-budget${over ? ' over' : ''}">${over
                ? `<i class="fas fa-triangle-exclamation"></i> ${money(over)} over your ${money(survey.budget)} budget. Untick a few items to bring it down.`
                : `<i class="fas fa-circle-check"></i> Within your ${money(survey.budget)} budget.`}</p>` : ''}
            <div class="uc-summary-actions">
                <button class="btn btn-ghost" type="button" data-action="custom-add"><i class="fas fa-bag-shopping"></i> Add to cart</button>
                <button class="btn" type="button" data-action="custom-order">Order now <i class="fas fa-arrow-right"></i></button>
            </div>`;
    }

    // ---------- cart ----------
    function pushToCart(item) {
        if (typeof cart === 'undefined' || typeof saveCart !== 'function') return false;
        cart.push(Object.assign({ quantity: 1, addedAt: new Date().toISOString(), useCase: UC[current].title }, item));
        saveCart();
        return true;
    }

    function addOption(id, andOrder) {
        const o = (UC[current].options || []).find(x => x.id === id);
        if (!o) return;
        const ok = pushToCart({
            type: 'option', option_id: o.id,
            id: o.id, name: o.name, controller: o.controller,
            selectedSensors: o.features.map(f => ({ name: f, price: 0, included: true })),
            totalPrice: o.price,
            notes: survey ? surveyNotes() : undefined,
            survey: survey || undefined,
        });
        if (!ok) return;
        if (andOrder) goToOrder();
        else if (typeof showToast === 'function') showToast(`Added: ${o.name} (${money(o.price)})`);
    }

    function addCustom(andOrder) {
        const items = lines();
        const ctrl = CONTROLLERS.find(c => c.id === cfg.controller);
        const total = round2(items.reduce((s, x) => s + x.price, 0));
        if (items.length < 2) {
            if (typeof showToast === 'function') showToast('Pick at least one part to go with the controller');
            return;
        }
        const ok = pushToCart({
            // What the server prices: chosen controller, parts, material and size
            type: 'build',
            build: { label: UC[current].short, controller: cfg.controller, parts: [...cfg.parts], material: cfg.material, size: [...cfg.size] },
            id: `custom-${current}`, name: `Custom ${UC[current].short} Box`, controller: ctrl ? ctrl.name : '',
            selectedSensors: items.map(i => ({ name: `${i.name} (${money(i.price)})`, price: i.price, included: false })),
            totalPrice: total,
            notes: survey ? surveyNotes() : undefined,
            survey: survey || undefined,
        });
        if (!ok) return;
        if (andOrder) goToOrder();
        else if (typeof showToast === 'function') showToast(`Added: Custom ${UC[current].short} Box (${money(total)})`);
    }

    function goToOrder() {
        window.orderReturnTo = 'useCaseDetail';
        if (typeof proceedToOrder === 'function') proceedToOrder();
    }

    // ---------- events (delegated) ----------
    document.addEventListener('click', e => {
        const btn = e.target.closest('#useCaseDetail [data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === 'add') addOption(btn.dataset.id, false);
        else if (action === 'order') addOption(btn.dataset.id, true);
        else if (action === 'customize') {
            renderConfig();
            document.getElementById('ucConfig').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (action === 'reset') {
            setPreset(recommended);
            renderConfig();
        } else if (action === 'custom-add') addCustom(false);
        else if (action === 'custom-order') addCustom(true);
    });

    document.addEventListener('submit', e => {
        if (e.target.id === 'farmSurvey') { e.preventDefault(); submitSurvey(e.target); }
    });

    function onConfigChange(e) {
        const t = e.target;
        if (!t.closest('#ucConfigForm')) return;
        if (t.name === 'cfgController') {
            cfg.controller = t.value;
            t.closest('.cfg-options').querySelectorAll('.cfg-option').forEach(l => l.classList.toggle('is-on', l.querySelector('input').checked));
        } else if (t.name === 'cfgPart') {
            if (t.checked) cfg.parts.add(t.value); else cfg.parts.delete(t.value);
            t.closest('.cfg-option').classList.toggle('is-on', t.checked);
        } else if (t.id === 'cfgMaterial') {
            cfg.material = t.value;
            document.querySelectorAll('#ucConfig .cfg-dim').forEach(d => { d.hidden = cfg.material === 'none'; });
        } else if (t.dataset.dim) {
            cfg.size[+t.dataset.dim] = Math.max(0, parseFloat(t.value) || 0);
        } else return;
        renderSummary();
    }
    document.addEventListener('change', onConfigChange);
    document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.dim) onConfigChange(e); });

    // ---------- card videos: play only while on screen ----------
    function initCardVideos() {
        const videos = document.querySelectorAll('.uc-card video');
        if (!videos.length || reduceMotion || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) en.target.play().catch(() => {});
                else en.target.pause();
            });
        }, { threshold: 0.35 });
        videos.forEach(v => io.observe(v));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCardVideos);
    else initCardVideos();

    window.openUseCase = openUseCase;
})();
