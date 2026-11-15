// Builds faq/index.html from the AI designer's answers in js/advisor-kb.js,
// so the FAQ page and the chat always say the same thing.
//
//   node tools/build-faq.js
//
// Run it again whenever js/advisor-kb.js changes, then bump ?v= in faq/index.html if style.css changed.
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
global.window = {};
require(path.join(root, 'js', 'advisor-kb.js'));
const K = window.__kb.TOPICS;

const VERSION = process.argv[2] || '20261116j'; // cache tag for style.css / scripts

const GROUPS = [
    { id: 'start', th: 'เริ่มต้น', en: 'Getting started', icon: 'fa-seedling', topics: ['how'] },
    { id: 'sensors', th: 'เซนเซอร์', en: 'Sensors', icon: 'fa-gauge-high', topics: ['npk', 'tds', 'ph', 'soil', 'dht', 'lux', 'level'] },
    { id: 'water', th: 'น้ำและปุ๋ย', en: 'Water & feeding', icon: 'fa-droplet', topics: ['pump', 'mist', 'fert', 'hydro'] },
    { id: 'climate', th: 'อุณหภูมิและอากาศ', en: 'Temperature & air', icon: 'fa-temperature-half', topics: ['fan', 'cooler', 'heater'] },
    { id: 'tech', th: 'ไฟ กล้อง AI บอร์ด', en: 'Lights, cameras, AI & boards', icon: 'fa-microchip', topics: ['lights', 'cameras', 'ai', 'boards'] },
    { id: 'box', th: 'ตัวกล่อง', en: 'The box', icon: 'fa-cube', topics: ['materials'] },
];
const listed = GROUPS.flatMap(g => g.topics);
const missing = Object.keys(K).filter(id => !listed.includes(id));
const unknown = listed.filter(id => !K[id]);
if (missing.length || unknown.length) throw new Error(`FAQ groups out of date — missing: ${missing.join(',') || '-'}; unknown: ${unknown.join(',') || '-'}`);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const L = {
    what: { th: 'คืออะไร', en: 'What it is' },
    why: { th: 'ช่วยอะไร', en: 'What it does for you' },
    fit: { th: 'เหมาะกับใคร', en: 'Who needs it' },
};
// what the button under each answer does (opens the AI designer on that topic, with live prices)
function cta(id, lang) {
    const k = K[id];
    const th = lang === 'th';
    const label = id === 'how' ? (th ? 'ให้ AI ช่วยออกแบบกล่อง' : 'Design my box with AI')
        : k.compare ? (th ? 'ดูตารางเปรียบเทียบพร้อมราคา' : 'Compare them with prices')
        : (th ? 'ดูราคาและเพิ่มลงชุดของคุณ' : 'See the price and add it to a kit');
    const href = id === 'how' ? '/?ai=1' : `/?ask=${id}`;
    return `<a class="faq-ask" href="${href}"><i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i> ${esc(label)}</a>`;
}

function article(lang) {
    const th = lang === 'th';
    const suffix = th ? '' : '-en';
    const T = v => (v && typeof v === 'object' ? (th ? v.th : v.en) : v);
    const chips = GROUPS.map(g => `<a class="faq-chip" href="#${g.id}${suffix}"><i class="fas ${g.icon}" aria-hidden="true"></i> ${esc(th ? g.th : g.en)}</a>`).join('\n                ');
    const groups = GROUPS.map(g => `
            <section class="faq-group" id="${g.id}${suffix}">
                <h2><i class="fas ${g.icon}" aria-hidden="true"></i> ${esc(th ? g.th : g.en)}</h2>
${g.topics.map(id => {
        const k = K[id];
        return `                <details class="faq-item" id="${id}${suffix}">
                    <summary><span class="faq-ico"><i class="fas ${esc(k.icon)}" aria-hidden="true"></i></span><span class="faq-q">${esc(T(k.title))}</span><i class="fas fa-chevron-down faq-chev" aria-hidden="true"></i></summary>
                    <div class="faq-a">
                        <p><b>${esc(L.what[lang])}</b> ${esc(T(k.what))}</p>
                        <p><b>${esc(L.why[lang])}</b> ${esc(T(k.why))}</p>
                        <p><b>${esc(L.fit[lang])}</b> ${esc(T(k.fit))}</p>
                        ${cta(id, lang)}
                    </div>
                </details>`;
    }).join('\n')}
            </section>`).join('\n');
    return `
        <article class="pv-doc faq-doc pv-${lang}" lang="${lang}">
            <p class="pv-eyebrow">${th ? 'คำถามที่พบบ่อย · FAQ' : 'Frequently asked questions'}</p>
            <h1>${th ? 'ถามเรื่องกล่องปลูกและอุปกรณ์' : 'Questions about the box and its parts'}</h1>
            <p class="pv-updated">${th ? 'คำตอบชุดเดียวกับที่ AI ออกแบบกล่องใช้ตอบ ราคาล่าสุดดูได้จากปุ่มใต้แต่ละคำตอบ' : 'The same answers our AI box designer gives. Tap the button under an answer for live prices.'}</p>

            <label class="faq-search">
                <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
                <input type="search" data-faq-search placeholder="${th ? 'ค้นหาคำถาม เช่น NPK, ปั๊ม, ESP32' : 'Search, e.g. NPK, pump, ESP32'}" aria-label="${th ? 'ค้นหาคำถาม' : 'Search questions'}">
            </label>
            <div class="faq-chips" role="navigation" aria-label="${th ? 'หมวดคำถาม' : 'Question groups'}">
                ${chips}
            </div>
            <p class="faq-none" data-faq-none hidden>${th ? 'ไม่พบคำถามที่ตรงกัน ลองถาม AI ด้านล่างได้เลย' : 'No matching question — ask the AI below.'}</p>
${groups}

            <div class="faq-more">
                <h2>${th ? 'ยังไม่เจอคำตอบ?' : "Didn't find your answer?"}</h2>
                <p>${th ? 'พิมพ์ถาม AI ออกแบบกล่องได้เลย หรือติดต่อทีมงานโดยตรง' : 'Ask our AI box designer, or contact the team directly.'}</p>
                <div class="faq-more-actions">
                    <a class="faq-ask" href="/?ai=1"><i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i> ${th ? 'ถาม AI ออกแบบกล่อง' : 'Ask the AI box designer'}</a>
                    <a class="faq-ask ghost" href="/?page=contact"><i class="fas fa-envelope" aria-hidden="true"></i> ${th ? 'ติดต่อทีมงาน' : 'Contact the team'}</a>
                </div>
            </div>
        </article>`;
}

// structured data: Google reads the questions and answers (Thai)
const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GROUPS.flatMap(g => g.topics).map(id => ({
        '@type': 'Question',
        name: K[id].title.th,
        acceptedAnswer: { '@type': 'Answer', text: `${K[id].what.th} ${K[id].why.th} ${K[id].fit.th}` },
    })),
};

const html = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Generated by tools/build-faq.js from js/advisor-kb.js — edit those, not this file -->
    <title>คำถามที่พบบ่อย — Smart Plant Box Selling Website</title>
    <meta name="description" content="เซนเซอร์ NPK คืออะไร ESP32 ต่างจาก Arduino ยังไง ไฟปลูกต้นไม้แบบไหนดี — คำตอบเรื่องกล่องปลูกพืชอัตโนมัติ Smart Plant Box และอุปกรณ์ทุกชิ้น">
    <meta name="theme-color" content="#1d3a2a">
    <link rel="canonical" href="https://www.smartplantbox.com/faq/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Smart Plant Box">
    <meta property="og:title" content="คำถามที่พบบ่อย — Smart Plant Box">
    <meta property="og:description" content="เซนเซอร์ NPK คืออะไร ESP32 ต่างจาก Arduino ยังไง — คำตอบเรื่องกล่องปลูกพืชอัตโนมัติและอุปกรณ์ทุกชิ้น">
    <meta property="og:url" content="https://www.smartplantbox.com/faq/">
    <meta property="og:image" content="https://www.smartplantbox.com/images/og-image.jpg">
    <link rel="icon" href="/favicon.ico?v=4" sizes="any">
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=4">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4">
    <script type="application/ld+json">
${JSON.stringify(ld, null, 1).replace(/</g, '\\u003c')}
    </script>
    <script>
        (function () {
            var l = 'th';
            try { l = localStorage.getItem('spbLang') || 'th'; } catch (e) {}
            document.documentElement.lang = l === 'en' ? 'en' : 'th';
            if (l === 'en') document.title = 'FAQ — Smart Plant Box Selling Website';
        })();
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha384-iw3OoTErCYJJB9mCa8LNS2hbsQ7M3C0EpIsO/H5+EGAkPGc6rk+V8i04oW/K5xq0" crossorigin="anonymous" referrerpolicy="no-referrer">
    <link rel="stylesheet" href="/css/style.css?v=${VERSION}">
</head>
<body class="pv-page">
    <header class="pv-bar">
        <a class="pv-back" href="/"><i class="fas fa-arrow-left" aria-hidden="true"></i> <span class="pv-th">กลับหน้าแรก</span><span class="pv-en">Back to home</span></a>
        <a class="pv-brand" href="/" aria-label="Smart Plant Box"><span class="pv-mark"><i class="fas fa-seedling"></i></span><span class="pv-brand-name">Smart Plant Box</span></a>
        <div class="pv-lang" role="group" aria-label="Language">
            <button type="button" data-lang-btn="th" onclick="setLang('th')" lang="th">ไทย</button>
            <button type="button" data-lang-btn="en" onclick="setLang('en')" lang="en">EN</button>
        </div>
    </header>

    <main class="pv-main">${article('th')}
${article('en')}
    </main>

    <footer class="pv-foot">
        <p><span class="pv-th">&copy; 2026 Smart Plant Box V4 · เว็บไซต์จำหน่ายนวัตกรรม</span><span class="pv-en">&copy; 2026 Smart Plant Box V4 · Innovations Selling Website</span></p>
        <span class="pv-foot-links"><a href="/privacy/"><span class="pv-th">ความเป็นส่วนตัว</span><span class="pv-en">Privacy</span></a></span>
    </footer>

    <script src="/js/i18n.js?v=${VERSION}"></script>
    <script src="/js/consent.js?v=${VERSION}"></script>
    <script>
        // search box + open the question a link points to (#npk)
        (function () {
            var en = document.documentElement.lang === 'en';
            var doc = document.querySelector('.faq-doc.pv-' + (en ? 'en' : 'th'));
            if (!doc) return;
            function openHash() {
                var id = decodeURIComponent(location.hash.slice(1));
                if (!id) return;
                var el = document.getElementById(en && !/-en$/.test(id) ? id + '-en' : id);
                if (el && el.tagName === 'DETAILS') { el.open = true; el.scrollIntoView({ block: 'start' }); }
            }
            openHash();
            window.addEventListener('hashchange', openHash);
            var box = doc.querySelector('[data-faq-search]'), none = doc.querySelector('[data-faq-none]');
            box.addEventListener('input', function () {
                var q = box.value.trim().toLowerCase(), shown = 0;
                doc.querySelectorAll('.faq-item').forEach(function (d) {
                    var hit = !q || d.textContent.toLowerCase().indexOf(q) !== -1;
                    d.hidden = !hit;
                    if (hit) shown++;
                    if (q && hit) d.open = true;
                });
                doc.querySelectorAll('.faq-group').forEach(function (g) { g.hidden = !g.querySelector('.faq-item:not([hidden])'); });
                none.hidden = shown > 0;
            });
        })();
    </script>
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'faq'), { recursive: true });
fs.writeFileSync(path.join(root, 'faq', 'index.html'), html);
console.log(`faq/index.html: ${listed.length} questions, version ${VERSION}`);
