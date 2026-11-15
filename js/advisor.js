// ============== Box design assistant ==============
// The customer describes what they want in their own words (Thai or English). We read it
// with keyword rules (no paid AI service), then route in this order:
//   1. a ready-made box fits      -> recommend that box
//   2. a category fits            -> open that category's builder with the parts pre-ticked
//   3. nothing fits / very custom -> open the big Custom form (05) with every field filled in
// Every pick carries a one-line reason. Prices come from the same catalogue the server uses.

(function () {
    const L = (en, th) => ({ en, th });
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const cat = () => window.__catalog;

    // ---------------------------------------------------------------- reading the text
    const NEG = '(?:ไม่เอา|ไม่ต้องการ|ไม่ต้องมี|ไม่ต้องใช้|ไม่ใช้|ไม่ต้อง|ไม่อยากได้|no|without|don\'t want|dont want|don\'t need|dont need|not need)\\s*';
    const W = {
        disaster: ['น้ำท่วม', 'ภัยพิบัติ', 'ประสบภัย', 'พักพิง', 'อพยพ', 'พายุ', 'น้ำป่า', 'ดินถล่ม', 'บริจาค', 'flood', 'disaster', 'shelter', 'relief', 'evacu', 'storm', 'refugee', 'donat'],
        farmer: ['ฟาร์ม', 'ไร่', 'เกษตรกร', 'แปลง', 'โรงเรือน', 'กรีนเฮาส์', 'ปลูกขาย', 'ทำเกษตร', 'สวนผัก', 'ชาวสวน', 'ชาวไร่', 'farm', 'greenhouse', 'field', /\bplots?\b/, 'grower', 'acre'],
        household: ['บ้าน', 'ครัวเรือน', 'คอนโด', 'ห้อง', 'ระเบียง', 'ในครัว', 'อพาร์ต', 'หอพัก', 'กินเอง', 'home', 'house', 'condo', 'apartment', 'balcony', 'kitchen', 'indoor', 'bedroom', 'dorm', /\broom\b/],
        commercial: ['มูลค่าสูง', 'พืชเศรษฐกิจ', 'ราคาสูง', 'พรีเมียม', 'เมลอน', 'สตรอว์เบอร์รี', 'สตรอเบอร์รี', 'สตอเบอรี', 'วาซาบิ', 'หญ้าฝรั่น', 'ส่งออก', 'ห้องแล็บ', 'งานวิจัย', 'premium', 'high-value', 'high value', 'melon', 'strawberr', 'wasabi', 'saffron', 'export', 'precision', /\blab\b/, 'research', 'commercial'],
        indoor: ['คอนโด', 'ห้อง', 'ในบ้าน', 'อพาร์ต', 'หอพัก', 'condo', 'apartment', 'indoor', 'bedroom', 'dorm', /\broom\b/, 'inside'],

        veg: ['ผัก', 'สลัด', 'คะน้า', 'ผักบุ้ง', 'กวางตุ้ง', 'ไมโครกรีน', 'ต้นอ่อน', 'lettuce', 'salad', 'vegetable', 'veggie', 'kale', 'spinach', 'microgreen'],
        herb: ['สมุนไพร', 'กะเพรา', 'โหระพา', 'สะระแหน่', 'ตะไคร้', 'มิ้นต์', 'มินต์', 'ผักชี', 'herb', 'basil', 'mint', 'coriander', 'cilantro', 'parsley'],
        flower: ['ดอกไม้', 'ไม้ดอก', 'กุหลาบ', 'ดาวเรือง', 'ทานตะวัน', 'กล้วยไม้', 'flower', 'rose', 'sunflower', 'orchid'],
        fruit: ['ผลไม้', 'มะเขือเทศ', 'พริก', 'เมลอน', 'สตรอ', 'สตอ', 'แตง', 'fruit', 'tomato', 'chili', 'chilli', 'pepper', 'melon', 'strawberr', 'cucumber'],
        seedling: ['ต้นกล้า', 'เพาะกล้า', 'เพาะเมล็ด', 'ต้นยืด', 'seedling', 'sprout', 'germinat'],

        lowlight: ['แดดน้อย', 'แสงน้อย', 'แดดไม่ถึง', 'แสงไม่ถึง', 'แสงไม่พอ', 'แดดไม่พอ', 'ไม่มีแดด', 'ไม่โดนแดด', 'ไม่ค่อยมีแดด', 'ไม่ค่อยโดนแดด', 'ในร่ม', 'มืด', 'ทึบ', 'ต้นยืด', 'ไฟปลูก', /\bled\b/, 'grow light', 'low light', 'little sun', 'no sun', 'not enough light', 'not much sun', 'shade', 'shady', 'dark'],
        heat: ['ร้อน', 'อุณหภูมิสูง', 'แดดแรง', 'แดดจัด', 'เหี่ยว', /\bhot\b/, 'heat', 'overheat', 'too warm', 'wilt', 'scorch'],
        cold: ['หนาว', 'เย็นเกิน', 'อากาศเย็น', 'ฮีตเตอร์', 'ทำความร้อน', 'ให้ความอบอุ่น', 'ภาคเหนือ', 'บนดอย', 'cold', 'freez', 'frost', 'winter', 'heater', 'chilly'],
        cool: ['ทำความเย็น', 'พัดลม', 'ระบายอากาศ', 'อับ', 'ลมไม่ถ่าย', /\bfans?\b/, 'cooling', 'ventilat', 'airflow', 'stuffy'],
        dry: ['ลืมรดน้ำ', 'ไม่มีเวลารดน้ำ', 'ไม่ค่อยอยู่บ้าน', 'ไม่อยู่บ้าน', 'เดินทางบ่อย', 'ไปต่างจังหวัด', 'ต้นไม้แห้ง', 'ดินแห้ง', 'รดน้ำอัตโนมัติ', 'รดน้ำเอง', 'รดน้ำให้', 'ขี้เกียจรดน้ำ', 'ไม่มีเวลา', 'ทำงานทั้งวัน', 'ปั๊ม', 'forget to water', 'forgot to water', /\baway\b/, 'travel', 'busy', 'dry out', 'dries out', 'auto water', 'automatic water', 'self-water', 'watering', 'vacation', 'pump'],
        humid: ['อากาศแห้ง', 'ความชื้นต่ำ', 'พ่นหมอก', 'หมอก', 'ละออง', 'เขตร้อน', 'ชอบชื้น', 'ต้องการความชื้น', 'กล้วยไม้', 'tropical', 'mist', /\bfog/, 'dry air', 'low humidity', 'humidity', 'orchid'],
        disease: ['โรค', 'เชื้อรา', 'ใบจุด', /ใบ.{0,8}จุด/, /จุด.{0,6}ใบ/, 'ใบไหม้', 'ใบเหลือง', 'ใบด่าง', 'แมลง', 'เพลี้ย', 'หนอน', 'ศัตรูพืช', 'ราน้ำค้าง', 'disease', 'fung', 'mold', 'mould', 'pest', 'insect', 'aphid', 'leaf spot', 'blight'],
        camera: ['กล้อง', 'ดูต้นไม้', 'ถ่ายรูป', 'ถ่ายภาพ', 'ดูภาพ', 'ไทม์แลปส์', 'camera', 'photo', 'picture', 'see my plant', 'watch my plant', 'cctv', 'timelapse', 'time-lapse'],
        ai: [/\bai\b/, 'เอไอ', 'ปัญญาประดิษฐ์', 'ตรวจโรค', 'วินิจฉัย', 'detect', 'diagnos'],
        precise: ['แม่นยำสูง', 'แม่นที่สุด', 'แม่นยำที่สุด', 'ความแม่นยำสูง', 'แม่น ๆ', 'แม่นๆ', '90%', 'most accurate', 'high accuracy', 'very accurate', 'best accuracy'],
        phone: ['มือถือ', 'โทรศัพท์', 'แอป', 'แอพ', 'ไวไฟ', 'ออนไลน์', 'แจ้งเตือน', 'รีโมท', 'ระยะไกล', 'ที่ไหนก็ได้', 'wifi', 'wi-fi', 'phone', 'mobile', /\bapps?\b/, 'remote', 'notif', 'alert', 'online', 'internet', /\biot\b/, /\bline\b/],
        hydro: ['ไฮโดร', 'ปลูกในน้ำ', 'ไม่ใช้ดิน', 'ไร้ดิน', 'hydro', 'soilless', 'aquapon', /\bnft\b/, /\bdwc\b/],
        nutrients: ['ดินไม่ดี', 'ดินเสื่อม', 'ดินขาด', 'ขาดธาตุ', 'ธาตุอาหาร', 'ดินจืด', 'โตช้า', 'ไม่ค่อยโต', 'ไม่โต', /\bnpk\b/, 'poor soil', 'nutrient', 'slow growth', 'stunted', 'not growing'],
        fert: ['ปุ๋ย', 'fertili', /\bfeed/],
        labour: ['แรงงาน', 'คนงาน', 'ไม่มีคนดูแล', 'ประหยัดแรง', 'labour', 'labor', 'worker', 'manpower'],
        yield: ['ผลผลิต', 'yield', 'harvest'],
        cheap: ['ราคาถูก', 'ถูกที่สุด', 'ถูกๆ', 'ถูก ๆ', 'ประหยัด', 'ไม่แพง', 'งบน้อย', 'งบจำกัด', 'cheap', 'affordable', 'low cost', 'low-cost', 'inexpensive'],
        unlimited: ['ไม่จำกัดงบ', 'งบไม่จำกัด', 'ไม่อั้น', 'no budget limit', 'unlimited', 'money is no'],
        small: ['เล็ก', 'กะทัดรัด', 'small', 'compact', 'mini', 'tiny'],
        large: ['ใหญ่', 'large', /\bbig\b/],
        custom: ['ออกแบบเอง', 'สั่งทำ', 'คัสตอม', 'ตามสั่ง', 'กำหนดเอง', 'เลือกเองทุก', 'ขนาดพิเศษ', 'custom', 'made to order', 'tailor'],
        noBox: ['ไม่เอากล่อง', 'ไม่ต้องมีกล่อง', 'ไม่มีกล่อง', 'ไม่ใช้กล่อง', 'ไม่ต้องใช้กล่อง', 'แปลงเปิด', 'กลางแจ้ง', 'no box', 'no enclosure', 'without a box', 'open plot', 'open field', 'outdoor'],
        glass: ['กระจก', 'glass'],
        acrylic: ['อะคริลิก', 'อะคริลิค', 'อคริลิค', 'กล่องใส', 'acrylic'],
        plastic: ['พลาสติก', 'plastic'],
        rgbw: ['rgbw'],
        rgb: [/\brgb\b/, 'ไฟสี', 'เปลี่ยนสี'],
        dim: ['หรี่', 'ปรับความสว่าง', 'ปรับระดับ', 'dimm'],
        redblue: ['แดงน้ำเงิน', 'แดง-น้ำเงิน', 'แดง น้ำเงิน', 'red blue', 'red + blue', 'red and blue', 'red/blue'],
        nano: ['nano', 'นาโน'], uno: [/\buno\b/, 'อูโน่', 'อูโน'], arduino: ['arduino', 'อาดุยโน่', 'อาร์ดุยโน', 'อาดุยโน'],
        unoOfficial: ['official', 'ของแท้', 'แท้'],
        esp32: ['esp32', 'esp 32', 'esp-32'], espcam: ['esp32-cam', 'esp32 cam', 'esp-32 cam', 'esp32cam'],
        pi: ['raspberry', 'ราสเบอร์รี่', 'ราสเบอรี่', 'ราสเบอรี', /\bpi\s?[345]\b/, /\bpi\b/],
        pi5: [/\bpi\s?5\b/], pi3: [/\bpi\s?3\b/], zero: ['pi zero', 'zero 2', 'zero w'], pico: ['pico'],
        gb8: [/8\s?gb/], gb2: [/2\s?gb/],
    };
    const hit = (txt, list) => list.some(w => (w instanceof RegExp ? w.test(txt) : txt.includes(w)));
    const count = (txt, list) => list.reduce((n, w) => n + ((w instanceof RegExp ? w.test(txt) : txt.includes(w)) ? 1 : 0), 0);
    const negated = (txt, words) => new RegExp(NEG + '(?:' + words.join('|') + ')', 'i').test(txt);

    const THAI_NUM = { หนึ่ง: 1, สอง: 2, สาม: 3, สี่: 4, ห้า: 5, หก: 6, เจ็ด: 7, แปด: 8, เก้า: 9, สิบ: 10 };
    const UNIT = { ร้อย: 100, พัน: 1000, หมื่น: 10000, แสน: 100000, k: 1000 };

    function parseBudget(txt) {
        if (hit(txt, W.unlimited)) return { unlimited: true };
        let best = null;
        const re = /(งบ|budget|ไม่เกิน|ราคา|under|below|within|max|ประมาณ|ราว|around|about)?\s*(฿)?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k\b|พัน|หมื่น|แสน|บาท|baht|฿|thb)?/gi;
        let m;
        while ((m = re.exec(txt))) {
            const [, pre, sym, num, suf] = m;
            const after = txt.slice(re.lastIndex, re.lastIndex + 6);
            if (/^\s*(คน|people|person|ต้น|กระถาง|pots?|plants?|%|ไร่|rai|ตร|m2|m²|ซม|cm|เซน|x|×|\*|วัน|days?|ชม|hours?)/i.test(after) && !suf) continue;
            if (/[x×*]\s*$/.test(txt.slice(0, m.index + (pre ? pre.length : 0)))) continue;
            if (!pre && !sym && !suf) continue;
            let v = parseFloat(num.replace(/,/g, ''));
            const s = (suf || '').toLowerCase();
            if (UNIT[s]) v *= UNIT[s];
            if (v >= 50 && v <= 5000000) best = Math.max(best || 0, v);
        }
        const tw = txt.match(/(หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ)?(ร้อย|พัน|หมื่น|แสน)(หนึ่ง|นึง|เดียว|ห้า)?/);
        if (!best && tw && /(งบ|ไม่เกิน|ราคา|บาท|ประมาณ|ราว)/.test(txt)) {
            let v = (THAI_NUM[tw[1]] || 1) * UNIT[tw[2]];
            if (tw[3] === 'ห้า') v += UNIT[tw[2]] / 2;
            best = v;
        }
        return best ? { amount: Math.round(best) } : null;
    }

    function parseSize(txt) {
        const m = txt.match(/(\d{2,3})\s*(?:cm|ซม\.?)?\s*[x×*]\s*(\d{2,3})\s*(?:cm|ซม\.?)?(?:\s*[x×*]\s*(\d{2,3}))?/i);
        if (m) return [+m[1], +m[2], +(m[3] || Math.max(+m[1], +m[2]))];
        const g = re => { const x = txt.match(re); return x ? +x[1] : null; };
        const w = g(/(?:กว้าง|width|wide)\s*(\d{2,3})/i), l = g(/(?:ยาว|length|long|ลึก|depth|deep)\s*(\d{2,3})/i), h = g(/(?:สูง|height|tall|high)\s*(\d{2,3})/i);
        return (w || l || h) ? [w || l || 50, l || w || 50, h || 60] : null;
    }

    function read(raw) {
        const txt = ' ' + String(raw || '').toLowerCase().replace(/\s+/g, ' ') + ' ';
        // "เครื่องทำความร้อน" is a heater, not "it's hot"; "ทำความเย็น" is cooling, not "it's cold"
        const heatTxt = txt.replace(/ทำความร้อน|ฮีตเตอร์|heater/g, ' ');
        const s = {
            text: raw,
            score: { disaster: count(txt, W.disaster), farmer: count(txt, W.farmer), household: count(txt, W.household), commercial: count(txt, W.commercial) },
            indoor: hit(txt, W.indoor),
            crop: ['seedling', 'herb', 'flower', 'fruit', 'veg'].find(k => hit(txt, W[k])) || null,
            lowlight: hit(txt, W.lowlight) && !negated(txt, ['ไฟ', 'light', 'led']),
            heat: hit(heatTxt, W.heat),
            cold: hit(txt, W.cold),
            cool: hit(txt, W.cool),
            dry: hit(txt, W.dry),
            humid: hit(txt, W.humid) && !negated(txt, ['พ่นหมอก', 'หมอก', 'mist']),
            disease: hit(txt, W.disease),
            camera: hit(txt, W.camera) && !negated(txt, ['กล้อง', 'camera']),
            ai: hit(txt, W.ai) && !negated(txt, ['ai', 'เอไอ']),
            precise: hit(txt, W.precise),
            phone: hit(txt, W.phone) && !negated(txt, ['มือถือ', 'แอป', 'wifi', 'app', 'phone']),
            hydro: hit(txt, W.hydro),
            nutrients: hit(txt, W.nutrients),
            fert: hit(txt, W.fert) && !negated(txt, ['ปุ๋ย', 'fertili']),
            labour: hit(txt, W.labour),
            yield: hit(txt, W.yield),
            cheap: hit(txt, W.cheap),
            small: hit(txt, W.small), large: hit(txt, W.large),
            wantsCustom: hit(txt, W.custom),
            material: hit(txt, W.noBox) ? 'none' : hit(txt, W.glass) ? 'glass' : hit(txt, W.acrylic) ? 'acrylic' : hit(txt, W.plastic) ? 'plastic' : null,
            light: hit(txt, W.rgbw) ? 'rgbw' : hit(txt, W.rgb) ? 'rgb' : hit(txt, W.redblue) ? 'redblue' : null,
            dim: hit(txt, W.dim),
            board: null, boardDetail: null,
            budget: parseBudget(txt),
            size: parseSize(txt),
            people: (() => { const m = txt.match(/(\d{1,2})\s*(?:คน|people|persons?|members?)/); return m ? +m[1] : (/(ครอบครัวใหญ่|big family|large family)/.test(txt) ? 6 : null); })(),
        };
        if (hit(txt, W.espcam)) { s.board = 'esp32'; s.boardDetail = 'espcam'; }
        else if (hit(txt, W.esp32)) s.board = 'esp32';
        else if (hit(txt, W.pi)) {
            s.board = 'pi4';
            s.boardDetail = hit(txt, W.pi5) ? 'pi5' : hit(txt, W.pi3) ? 'pi3' : hit(txt, W.zero) ? 'zero' : hit(txt, W.pico) ? 'pico' : 'pi4';
        } else if (hit(txt, W.nano)) s.board = 'nano';
        else if (hit(txt, W.uno) || hit(txt, W.arduino)) { s.board = 'uno'; if (hit(txt, W.unoOfficial)) s.boardDetail = 'unoOfficial'; }
        if (s.board === 'pi4' && hit(txt, W.gb8)) s.boardDetail = s.boardDetail === 'pi5' ? 'pi5-8' : 'pi4-8';
        else if (s.board === 'pi4' && hit(txt, W.gb2) && s.boardDetail === 'pi4') s.boardDetail = 'pi4-2';
        if (s.disease && !hit(txt, ['ไม่มีโรค', 'no disease'])) { /* keep */ } else s.disease = false;
        if (s.crop === 'seedling') s.lowlight = true;
        // What the customer is asking the box to do
        const n = new Set();
        if (s.lowlight || s.yield) n.add('light');
        if (s.heat || s.cool) n.add('heat');
        if (s.cold) n.add('cold');
        if (s.dry || s.labour) n.add('water');
        if (s.humid) n.add('mist');
        if (s.disease || s.ai) { n.add('camera'); n.add('ai'); }
        if (s.camera) n.add('camera');
        if (s.phone) n.add('phone');
        if (s.hydro) n.add('hydro');
        if (s.nutrients) n.add('nutrients');
        if (s.fert || s.labour || s.yield) n.add('fert');
        s.needs = n;
        return s;
    }

    // ---------------------------------------------------------------- deciding
    const CATS = ['disaster', 'commercial', 'farmer', 'household']; // tie-break order
    const CAT_NAME = {
        disaster: L('01 · For disaster victims', '01 · สำหรับผู้ประสบภัย'),
        farmer: L('02 · For farmers', '02 · สำหรับเกษตรกร'),
        household: L('03 · For households', '03 · สำหรับครัวเรือน'),
        commercial: L('04 · Commercial & high-value crops', '04 · พืชเศรษฐกิจมูลค่าสูง'),
    };
    const NEED_NAME = {
        light: L('More light', 'แสงไม่พอ'), heat: L('Too hot', 'ร้อนเกินไป'), cold: L('Too cold', 'หนาวเกินไป'),
        water: L('Automatic watering', 'รดน้ำอัตโนมัติ'), mist: L('Humidity / misting', 'ความชื้น/พ่นหมอก'),
        camera: L('Camera', 'กล้อง'), ai: L('AI disease check', 'AI ตรวจโรค'), phone: L('Phone control', 'ดูผ่านมือถือ'),
        hydro: L('Hydroponics', 'ไฮโดรโปนิกส์'), nutrients: L('Soil nutrients', 'ดินขาดธาตุอาหาร'), fert: L('Automatic fertilizer', 'ให้ปุ๋ยอัตโนมัติ'),
    };
    const CROP_NAME = { veg: L('Vegetables', 'ผัก'), herb: L('Herbs', 'สมุนไพร'), flower: L('Flowers', 'ไม้ดอก'), fruit: L('Fruit', 'ผลไม้'), seedling: L('Seedlings', 'ต้นกล้า') };
    // What each ready-made box can do (matched against the needs above)
    const BOX = {
        'relief-s': { cat: 'disaster', does: ['water'] },
        'relief-l': { cat: 'disaster', does: ['mist', 'heat', 'phone'] },
        'home-tent': { cat: 'household', does: ['light', 'mist', 'water', 'phone'] },
        'farmer-vision': { cat: 'farmer', does: ['light', 'water', 'fert', 'mist', 'heat', 'camera', 'ai', 'phone'] },
        'hydro-cube': { cat: 'commercial', does: ['hydro', 'light', 'heat', 'mist', 'water', 'phone'] },
        'v4-pro': { cat: 'commercial', does: ['light', 'heat', 'mist', 'water', 'camera', 'ai', 'phone', 'hydro'] },
    };
    const optionById = id => { for (const k of Object.keys(cat().UC)) { const o = cat().UC[k].options.find(x => x.id === id); if (o) return o; } return null; };

    function pickCategory(s) {
        let best = null, bestScore = 0;
        CATS.forEach(c => { if (s.score[c] > bestScore) { best = c; bestScore = s.score[c]; } });
        if (!best && s.indoor) best = 'household';
        return best;
    }

    function needsCustomForm(s) {
        return s.wantsCustom || !!s.size || ['pi5', 'pi3', 'zero', 'pico', 'unoOfficial', 'pi5-8', 'pi4-8', 'pi4-2', 'espcam'].includes(s.boardDetail)
            || s.material === 'glass' || s.light === 'rgb' || s.light === 'rgbw' || s.dim || (s.heat && s.cold);
    }

    function decide(s, force) {
        const c = force && force !== 'custom' ? force : pickCategory(s);
        if (force === 'custom') return { route: 'custom', cat: c, s, form: buildForm(s, c) };
        if (!c && !s.needs.size && !s.crop && !s.budget) return { route: 'ask', s };
        if (!force && (needsCustomForm(s) || !c)) return { route: 'custom', cat: c, s, form: buildForm(s, c) };

        const kit = buildKit(s, c);
        const budget = s.budget && s.budget.amount;
        const wanted = [...s.needs];
        let box = null, near = null, nearWhy = null;
        const candidates = cat().UC[c].options.map(o => o.id).filter(id => BOX[id]);
        // relief boxes are chosen by household size first
        if (c === 'disaster' && s.people) candidates.sort((a, b) => (a === (s.people > 4 ? 'relief-l' : 'relief-s') ? -1 : b === (s.people > 4 ? 'relief-l' : 'relief-s') ? 1 : 0));
        else candidates.sort((a, b) => optionById(a).price - optionById(b).price);
        for (const id of candidates) {
            const o = optionById(id);
            const missing = wanted.filter(n => !BOX[id].does.includes(n));
            const tooDear = budget && o.price > budget;
            const wrongSize = c === 'disaster' && s.people && ((s.people > 4) !== (id === 'relief-l'));
            if (!missing.length && !tooDear && !wrongSize) { box = { id, o, covers: wanted.filter(n => BOX[id].does.includes(n)) }; break; }
            if (!near) { near = o; nearWhy = tooDear ? L(`${o.name.en} is over your budget`, `${o.name.th} เกินงบของคุณ`) : missing.length ? L(`${o.name.en} doesn't have: ${missing.map(m => NEED_NAME[m].en.toLowerCase()).join(', ')}`, `${o.name.th} ยังไม่มี: ${missing.map(m => NEED_NAME[m].th).join(', ')}`) : null; }
        }
        if (box) return { route: 'box', cat: c, s, box, kit };
        return { route: 'kit', cat: c, s, kit, near, nearWhy };
    }

    // ---- category builder preset (controller + parts + enclosure), each with a reason
    function buildKit(s, c) {
        const C = cat();
        const parts = new Map(); // id -> { why, core }
        const add = (id, why, core = true) => { if (!parts.has(id)) parts.set(id, { why, core }); };
        const notes = [];
        if (s.lowlight) {
            if (s.indoor || s.crop === 'seedling' || c === 'commercial') add('ledFull', L('Recommended because your plants don\'t get enough sun — a full-spectrum panel replaces it', 'แนะนำเพราะคุณบอกว่าแสงไม่พอ แผงไฟฟูลสเปกตรัมทดแทนแสงแดดได้'));
            else add('ledRB', L('Recommended because your plants don\'t get enough sun', 'แนะนำเพราะคุณบอกว่าแสงไม่พอ'));
            add('lux', L('Turns the light on only when it gets dim', 'เปิดไฟเฉพาะตอนแสงน้อย'), false);
        } else if (s.indoor) add('ledRB', L('Indoors there is rarely enough sun for plants', 'ปลูกในห้อง แสงธรรมชาติมักไม่พอสำหรับต้นไม้'));
        if (s.yield && !parts.has('ledFull')) add('ledFull', L('More light = a bigger harvest', 'แสงมากขึ้น ผลผลิตเพิ่มขึ้น'));
        if (s.heat || s.cool) {
            add('fan', L('Recommended because you said it gets hot — pushes hot air out', 'แนะนำเพราะคุณบอกว่าร้อน ช่วยดันลมร้อนออก'));
            if (c === 'farmer') add('mist', L('The mist cools the air when the temperature climbs', 'ละอองหมอกช่วยลดอุณหภูมิเมื่ออากาศร้อนขึ้น'));
            else if (s.heat) add('cooler', L('Brings the temperature down on hot days', 'ช่วยลดอุณหภูมิในวันที่ร้อน'));
        }
        if (s.cold) add('heater', L('Recommended because you said it gets cold', 'แนะนำเพราะคุณบอกว่าอากาศหนาว'));
        if (s.dry || s.labour) {
            add('pump', s.labour ? L('Waters by itself, so it needs fewer workers', 'รดน้ำเอง ใช้แรงงานน้อยลง') : L('Recommended because you\'re often away — it waters for you', 'แนะนำเพราะคุณไม่ค่อยอยู่ ปั๊มรดน้ำให้เอง'));
            if (!s.hydro) add('soil', L('Waters only when the soil is dry, so roots don\'t drown', 'รดเฉพาะตอนดินแห้ง รากจึงไม่แฉะ'));
            add('level', L('Warns you before the water tank runs out', 'เตือนก่อนน้ำในถังหมด'), false);
        }
        if (s.humid) add('mist', L('Recommended because your plants like humid air', 'แนะนำเพราะต้นไม้ของคุณชอบความชื้น'));
        if (s.hydro) {
            add('hydro', L('You asked for hydroponics — grows in nutrient water', 'คุณต้องการไฮโดรโปนิกส์ ปลูกในน้ำผสมธาตุอาหาร'));
            add('ph', L('Keeps the water in a range roots can use', 'คุมค่าน้ำให้อยู่ในช่วงที่รากดูดซึมได้'), false);
            add('level', L('Warns you before the reservoir runs low', 'เตือนก่อนน้ำในถังเหลือน้อย'), false);
        }
        if (s.nutrients) {
            if (s.hydro) add('tds', L('Shows when the nutrient water is too weak or too strong', 'บอกว่าน้ำผสมธาตุอาหารเจือจางหรือเข้มข้นเกินไป'));
            else add('npk', L('Recommended because you said the soil is poor — shows what it lacks', 'แนะนำเพราะคุณบอกว่าดินไม่ดี บอกได้ว่าดินขาดธาตุอะไร'));
            add('fert', L('Feeds the plants on a schedule', 'ให้ปุ๋ยตามเวลาอัตโนมัติ'));
        }
        if (s.fert || s.labour || s.yield) add('fert', L('Feeds the plants on a schedule', 'ให้ปุ๋ยตามเวลาอัตโนมัติ'));
        // camera + AI
        let ai = null;
        if (s.disease || s.ai) {
            ai = s.precise || c === 'commercial' ? 'ai3' : (s.cheap || (s.budget && s.budget.amount < 900)) ? 'ai1' : 'ai2';
            const usePi = (s.precise || c === 'commercial') && s.board !== 'nano' && s.board !== 'uno' && !(s.budget && s.budget.amount < 4000);
            add(usePi ? 'picam' : 'cam', L('Photographs the leaves every day', 'ถ่ายภาพใบทุกวัน'));
            add(ai, s.disease ? L('Recommended because you mentioned plant disease — flags it early', 'แนะนำเพราะคุณพูดถึงโรคพืช ช่วยแจ้งเตือนตั้งแต่ระยะแรก') : L('Checks the photos for leaf disease', 'ตรวจภาพถ่ายหาโรคที่ใบ'));
        } else if (s.camera) add('cam', L('Recommended because you want to see your plants from your phone', 'แนะนำเพราะคุณอยากดูต้นไม้ผ่านมือถือ'));
        // every box waters itself: that's the point of a smart plant box
        if (!['pump', 'hydro', 'mist'].some(id => parts.has(id))) {
            add('pump', L('Automatic watering is the heart of every box', 'รดน้ำอัตโนมัติคือหัวใจของทุกกล่อง'));
            add('soil', L('Waters only when the soil is dry', 'รดเฉพาะตอนดินแห้ง'));
        }
        add('dht', L('Reads heat and humidity so everything runs at the right time', 'วัดอุณหภูมิและความชื้น ให้ทุกอย่างทำงานถูกเวลา'), false);

        // controller
        let controller, cWhy;
        const wantsArduino = s.board === 'nano' || s.board === 'uno';
        if (s.board) { controller = s.board; cWhy = L('The board you asked for', 'บอร์ดที่คุณเลือกไว้'); }
        else if (parts.has('picam')) { controller = 'pi4'; cWhy = L('Needed for the Pi camera and the most accurate AI', 'จำเป็นสำหรับกล้อง Pi และ AI ที่แม่นยำที่สุด'); }
        else if (s.phone || parts.has('cam') || ai) { controller = 'esp32'; cWhy = s.phone ? L('Recommended because you want to check it from your phone (Wi-Fi)', 'แนะนำเพราะคุณอยากดูผ่านมือถือ (มี Wi-Fi)') : L('Runs the camera and sends alerts over Wi-Fi', 'ควบคุมกล้องและส่งแจ้งเตือนผ่าน Wi-Fi'); }
        else if (s.cheap || (s.budget && s.budget.amount < 600)) { controller = 'nano'; cWhy = L('The lowest-cost board that runs the basics', 'บอร์ดราคาประหยัดที่สุด ทำงานพื้นฐานได้ครบ'); }
        else { controller = 'esp32'; cWhy = L('Lets you check and control it from your phone', 'ดูสถานะและสั่งงานผ่านมือถือได้'); }
        if (wantsArduino && parts.has('ai3')) {
            parts.delete('ai3'); add('ai2', L('Arduino can\'t run Model 3, so Model 2 is the best it can do', 'Arduino ใช้ Model 3 ไม่ได้ จึงใช้ Model 2 ที่ดีที่สุดที่รองรับ'));
            notes.push(L('Arduino can\'t run AI Model 3 — picked Model 2. Choose ESP32 or Raspberry Pi for 90% accuracy.', 'Arduino ใช้ AI Model 3 ไม่ได้ จึงเลือก Model 2 ให้ ถ้าต้องการความแม่นยำ 90% ให้เลือก ESP32 หรือ Raspberry Pi'));
        }
        if (wantsArduino && parts.has('picam')) { parts.delete('picam'); add('cam', L('Photographs the leaves every day', 'ถ่ายภาพใบทุกวัน')); }

        // enclosure
        const base = C.UC[c].preset;
        let material = s.material || base.material, mWhy = null;
        if (s.material) mWhy = L('The material you asked for', 'วัสดุที่คุณเลือกไว้');
        let size = s.size ? [...s.size] : [...base.size];
        if (!s.size && material !== 'none') { const k = s.small ? 0.75 : s.large ? 1.4 : 1; size = size.map(v => Math.round(v * k)); }
        let cfg = { controller, parts, material, size, cWhy, mWhy };
        cfg = fitBudget(cfg, s, notes);
        const why = { [cfg.controller]: cfg.cWhy };
        cfg.parts.forEach((v, id) => { why[id] = v.why; });
        if (cfg.mWhy) why.material = cfg.mWhy;
        return { controller: cfg.controller, parts: [...cfg.parts.keys()], material: cfg.material, size: cfg.size, why, notes, total: kitTotal(cfg), lines: kitLines(cfg) };
    }

    const priceOf = id => { const C = cat(); const p = C.PARTS.find(x => x.id === id) || C.CONTROLLERS.find(x => x.id === id); return p ? p.price : 0; };
    const boxCost = (m, size) => { const r = (cat().MATERIALS.find(x => x.id === m) || {}).rate || 0; const [w, l, h] = size; return Math.round(2 * (w * l + w * h + l * h) * r * 100) / 100; };
    const kitTotal = c => priceOf(c.controller) + [...c.parts.keys()].reduce((s, id) => s + priceOf(id), 0) + boxCost(c.material, c.size);
    function kitLines(c) {
        const C = cat();
        const nm = id => T((C.PARTS.find(x => x.id === id) || C.CONTROLLERS.find(x => x.id === id)).name);
        const out = [{ id: c.controller, name: nm(c.controller), price: priceOf(c.controller), why: c.cWhy }];
        c.parts.forEach((v, id) => out.push({ id, name: nm(id), price: priceOf(id), why: v.why }));
        const m = C.MATERIALS.find(x => x.id === c.material);
        if (m && m.rate) out.push({ id: 'material', name: `${T(m.name)} ${c.size.join('×')} ${t('cm', 'ซม.')}`, price: boxCost(c.material, c.size), why: c.mWhy });
        return out;
    }

    // Over budget: drop extras first, then swap to cheaper versions, never the things they asked for
    function fitBudget(c, s, notes) {
        const budget = s.budget && s.budget.amount;
        if (!budget || kitTotal(c) <= budget) return c;
        const start = kitTotal(c);
        const origMaterial = c.material, origWhy = c.mWhy;
        if (c.material !== 'none' && !s.material) { c.material = 'none'; c.mWhy = L('No enclosure keeps it within budget', 'ไม่ใส่กล่องเพื่อให้อยู่ในงบ'); }
        const extras = [...c.parts.entries()].filter(([, v]) => !v.core).map(([id]) => id).sort((a, b) => priceOf(b) - priceOf(a));
        for (const id of extras) { if (kitTotal(c) <= budget) break; if (id === 'dht' && ['fan', 'cooler', 'mist', 'heater'].some(x => c.parts.has(x))) continue; c.parts.delete(id); }
        const swap = (from, to, why) => { if (kitTotal(c) > budget && c.parts.has(from)) { const v = c.parts.get(from); c.parts.delete(from); c.parts.set(to, { why: why || v.why, core: v.core }); } };
        swap('ledFull', 'ledRB'); swap('cooler', 'fan'); swap('picam', 'cam');
        swap('ai3', 'ai2', L('Model 2 keeps it within budget', 'Model 2 ทำให้อยู่ในงบ')); swap('ai2', 'ai1', L('Model 1 keeps it within budget', 'Model 1 ทำให้อยู่ในงบ'));
        swap('npk', 'tds');
        if (kitTotal(c) > budget && c.controller === 'pi4' && !c.parts.has('picam') && s.board !== 'pi4') { c.controller = 'esp32'; c.cWhy = L('ESP32 keeps it within budget and still has Wi-Fi', 'ESP32 ทำให้อยู่ในงบ และยังมี Wi-Fi'); }
        if (kitTotal(c) > budget && c.controller === 'esp32' && !s.phone && !c.parts.has('cam') && !s.board && ![...c.parts.keys()].some(id => /^ai/.test(id))) { c.controller = 'nano'; c.cWhy = L('Arduino Nano keeps it within budget', 'Arduino Nano ทำให้อยู่ในงบ'); }
        // put the enclosure back if it still fits
        if (c.material === 'none' && origMaterial !== 'none' && kitTotal(c) + boxCost(origMaterial, c.size) <= budget) { c.material = origMaterial; c.mWhy = origWhy; }
        const end = kitTotal(c);
        if (end < start) notes.push(L(`Trimmed to fit your ${baht(budget)} budget (saved ${baht(start - end)}).`, `ปรับให้เข้างบ ${baht(budget)} แล้ว (ลดไป ${baht(start - end)})`));
        if (end > budget) notes.push(L(`Still ${baht(end - budget)} over budget — everything left fixes a problem you mentioned.`, `ยังเกินงบ ${baht(end - budget)} เพราะทุกชิ้นที่เหลือแก้ปัญหาที่คุณบอกมา`));
        return c;
    }

    // ---- the big Custom form (05): one choice per list, by position in each <select>
    function buildForm(s, c) {
        const f = {}, why = {}, notes = [];
        const set = (k, i, w) => { f[k] = i; why[k] = w; };
        // board
        const bd = { nano: 1, uno: 2, unoOfficial: 3, esp32: 4, espcam: 5, pico: 6, zero: 8, pi3: 10, 'pi4-2': 11, pi4: 12, 'pi4-8': 13, pi5: 14, 'pi5-8': 15 };
        const wantsAI = s.disease || s.ai;
        if (s.boardDetail && bd[s.boardDetail]) set('microcontroller', bd[s.boardDetail], L('The board you asked for', 'บอร์ดที่คุณเลือกไว้'));
        else if (s.board) set('microcontroller', bd[s.board], L('The board you asked for', 'บอร์ดที่คุณเลือกไว้'));
        else if (wantsAI && (s.precise || c === 'commercial')) set('microcontroller', 12, L('Strong enough for the Pi camera and the most accurate AI', 'แรงพอสำหรับกล้อง Pi และ AI ที่แม่นยำที่สุด'));
        else if (s.phone || s.camera || wantsAI) set('microcontroller', 4, s.phone ? L('Recommended because you want to check it from your phone (Wi-Fi)', 'แนะนำเพราะคุณอยากดูผ่านมือถือ (มี Wi-Fi)') : L('Runs the camera and sends alerts over Wi-Fi', 'ควบคุมกล้องและส่งแจ้งเตือนผ่าน Wi-Fi'));
        else if (s.cheap) set('microcontroller', 1, L('The lowest-cost board that runs the basics', 'บอร์ดราคาประหยัดที่สุด ทำงานพื้นฐานได้ครบ'));
        else set('microcontroller', 4, L('Lets you check and control it from your phone', 'ดูสถานะและสั่งงานผ่านมือถือได้'));
        const board = f.microcontroller, isPi = board >= 7, arduino = board >= 1 && board <= 3;
        // water
        if (s.hydro) set('watering', 10, L('You asked for hydroponics', 'คุณต้องการระบบไฮโดรโปนิกส์'));
        else if (s.dry || s.labour) set('watering', 4, L('Recommended because you\'re often away — it waters for you', 'แนะนำเพราะคุณไม่ค่อยอยู่ ปั๊มรดน้ำให้เอง'));
        else if (s.fert || s.nutrients) {
            const i = { herb: 6, veg: 7, flower: 8, fruit: 9 }[s.crop] || 7;
            set('watering', i, L('Feeds the plants on a schedule, matched to what you grow', 'ให้ปุ๋ยตามเวลา เลือกสูตรตามพืชที่คุณปลูก'));
        } else set('watering', 4, L('Automatic watering is the heart of every box', 'รดน้ำอัตโนมัติคือหัวใจของทุกกล่อง'));
        // light
        if (s.light === 'rgbw') set('light', s.dim ? 5 : 4, L('The light you asked for', 'ไฟแบบที่คุณเลือกไว้'));
        else if (s.light === 'rgb') set('light', s.dim ? 3 : 2, L('The light you asked for', 'ไฟแบบที่คุณเลือกไว้'));
        else if (s.dim) set('light', 5, L('Dimmable, as you asked', 'ปรับความสว่างได้ตามที่คุณต้องการ'));
        else if (s.light === 'redblue') set('light', 6, L('Red + blue, the colours plants use most', 'แดง-น้ำเงิน สีที่พืชใช้มากที่สุด'));
        else if (s.lowlight || s.yield || s.crop === 'seedling') set('light', 9, L('Recommended because your plants need more light', 'แนะนำเพราะต้นไม้ของคุณต้องการแสงเพิ่ม'));
        else if (s.indoor) set('light', 6, L('Indoors there is rarely enough sun for plants', 'ปลูกในห้อง แสงธรรมชาติมักไม่พอ'));
        else set('light', 1, L('Not needed — you didn\'t mention a light problem', 'ไม่จำเป็น เพราะไม่ได้บอกว่าแสงไม่พอ'));
        // temperature
        if (s.heat && s.cold) set('temperature', 2, L('Handles both hot days and cold nights', 'รับมือได้ทั้งวันร้อนและคืนหนาว'));
        else if (s.heat) set('temperature', 3, L('Recommended because you said it gets hot', 'แนะนำเพราะคุณบอกว่าร้อน'));
        else if (s.cold) set('temperature', 4, L('Recommended because you said it gets cold', 'แนะนำเพราะคุณบอกว่าหนาว'));
        else if (s.cool || (s.material && s.material !== 'none')) set('temperature', 5, L('A closed box needs fresh air', 'กล่องปิดต้องระบายอากาศ'));
        else set('temperature', 1, L('Not needed for what you described', 'ไม่จำเป็นสำหรับที่คุณเล่ามา'));
        // mist
        if (s.humid) set('mist', s.small ? 4 : 5, L('Recommended because your plants like humid air', 'แนะนำเพราะต้นไม้ของคุณชอบความชื้น'));
        else if (s.heat && (c === 'farmer' || c === 'commercial')) set('mist', 5, L('The mist cools the air on hot days', 'ละอองหมอกช่วยลดความร้อน'));
        else set('mist', 1, L('Not needed for what you described', 'ไม่จำเป็นสำหรับที่คุณเล่ามา'));
        // camera
        if (board === 5) set('camera', 1, L('Your ESP32-CAM board already has a camera', 'บอร์ด ESP32-CAM มีกล้องในตัวแล้ว'));
        else if (s.camera || wantsAI) set('camera', isPi ? 4 : 3, isPi ? L('Sharp photos for the AI, made for Raspberry Pi', 'ภาพคมชัดสำหรับ AI ใช้คู่กับ Raspberry Pi') : L('Photographs the leaves every day', 'ถ่ายภาพใบทุกวัน'));
        else set('camera', 1, L('Not needed — you didn\'t ask to see the plants', 'ไม่จำเป็น เพราะไม่ได้บอกว่าอยากดูต้นไม้'));
        // AI
        if (wantsAI) {
            let m = s.precise || c === 'commercial' ? 3 : s.cheap ? 1 : 2;
            if (m === 3 && arduino) { m = 2; notes.push(L('Arduino can\'t run AI Model 3 — picked Model 2.', 'Arduino ใช้ AI Model 3 ไม่ได้ จึงเลือก Model 2 ให้')); }
            set('ai', m, s.disease ? L('Recommended because you mentioned plant disease', 'แนะนำเพราะคุณพูดถึงโรคพืช') : L('Checks the photos for leaf disease', 'ตรวจภาพถ่ายหาโรคที่ใบ'));
        } else set('ai', 0, L('Not needed — no disease problem mentioned', 'ไม่จำเป็น เพราะไม่ได้พูดถึงโรคพืช'));
        // box
        const mat = { glass: 1, acrylic: 2, plastic: 3, none: 0 };
        if (s.material) set('boxMaterial', mat[s.material], L('The material you asked for', 'วัสดุที่คุณเลือกไว้'));
        else if (s.size) set('boxMaterial', 2, L('Clear acrylic lets light in and you can see inside', 'อะคริลิกใส แสงเข้าได้และมองเห็นข้างใน'));
        else if (s.indoor || c === 'commercial') set('boxMaterial', 2, L('A clear box keeps light and humidity where the plants are', 'กล่องใสช่วยเก็บแสงและความชื้นไว้ที่ต้นไม้'));
        else set('boxMaterial', 0, L('No enclosure — cheapest and fine outdoors', 'ไม่ใส่กล่อง ประหยัดที่สุดและเหมาะกับกลางแจ้ง'));
        f.size = f.boxMaterial ? (s.size || (s.small ? [40, 30, 40] : s.large ? [90, 60, 90] : [60, 40, 50])) : null;
        return { f, why, notes };
    }

    // ---------------------------------------------------------------- panel
    let el = null, last = null;
    const EXAMPLES = [
        L('I live in a condo with little sun, often away from home, want to check from my phone, budget ฿1,000', 'อยู่คอนโด แดดน้อย ไม่ค่อยอยู่บ้าน อยากดูผ่านมือถือ งบ 1,000 บาท'),
        L('Growing melons in a greenhouse, it gets very hot and leaves get spots', 'ปลูกเมลอนในโรงเรือน ร้อนมาก ใบเป็นจุด'),
        L('After the flood, family of 6, need fresh vegetables fast', 'หลังน้ำท่วม ครอบครัว 6 คน อยากได้ผักกินเร็ว ๆ'),
        L('Custom glass box 80x40x60 with Raspberry Pi 5, RGBW dimmable light and 90% AI', 'กล่องกระจก 80x40x60 ใช้ Raspberry Pi 5 ไฟ RGBW หรี่ได้ AI แม่นยำสูง'),
    ];

    function mount() {
        if (el) return;
        const fab = document.createElement('button');
        fab.type = 'button';
        fab.className = 'boxai-fab';
        fab.id = 'advisorFab';
        fab.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i><span>${esc(t('Design my box', 'ผู้ช่วยออกแบบกล่อง'))}</span>`;
        fab.setAttribute('aria-haspopup', 'dialog');
        fab.addEventListener('click', open);
        document.body.appendChild(fab);
        // stay out of the way of the 3D intro: show the button once the hero has scrolled away
        const track = document.querySelector('.hero-track');
        if (track) {
            const check = () => {
                const r = track.getBoundingClientRect();
                fab.classList.toggle('is-away', r.height > 0 && r.bottom > window.innerHeight * 0.6 && !document.body.classList.contains('detail-mode'));
            };
            window.addEventListener('scroll', check, { passive: true });
            window.addEventListener('resize', check, { passive: true });
            new MutationObserver(check).observe(document.body, { attributes: true, attributeFilter: ['class'] });
            check();
        }

        el = document.createElement('div');
        el.className = 'boxai';
        el.hidden = true;
        el.innerHTML = `
            <div class="boxai-backdrop" data-adv="close"></div>
            <section class="boxai-panel" role="dialog" aria-modal="true" aria-labelledby="advisorTitle">
                <header class="boxai-head">
                    <div>
                        <span class="boxai-eyebrow"><i class="fas fa-wand-magic-sparkles"></i> ${esc(t('Box design assistant', 'ผู้ช่วยออกแบบกล่อง'))}</span>
                        <h2 id="advisorTitle">${esc(t('Tell us what you want to grow', 'เล่าให้ฟังว่าอยากได้กล่องแบบไหน'))}</h2>
                        <p>${esc(t('Where, what you grow, what goes wrong, and your budget. We\'ll match a box — or design one part by part.', 'ปลูกที่ไหน ปลูกอะไร เจอปัญหาอะไร งบเท่าไร แล้วเราจะจับคู่กล่องให้ หรือออกแบบให้ทีละชิ้น'))}</p>
                    </div>
                    <button type="button" class="boxai-x" data-adv="close" aria-label="${esc(t('Close', 'ปิด'))}"><i class="fas fa-xmark"></i></button>
                </header>
                <form class="boxai-form" id="advisorForm">
                    <textarea id="advisorText" rows="3" maxlength="600" placeholder="${esc(t('e.g. ' + EXAMPLES[0].en, 'เช่น ' + EXAMPLES[0].th))}"></textarea>
                    <div class="boxai-examples">
                        <span>${esc(t('Try:', 'ลองตัวอย่าง:'))}</span>
                        ${EXAMPLES.map((e, i) => `<button type="button" class="boxai-chip" data-adv="example" data-i="${i}">${esc(T(e))}</button>`).join('')}
                    </div>
                    <button type="submit" class="boxai-go"><i class="fas fa-wand-magic-sparkles"></i> ${esc(t('Design my box', 'ออกแบบกล่องให้ฉัน'))}</button>
                </form>
                <div class="boxai-result" id="advisorResult" aria-live="polite"></div>
                <p class="boxai-foot">${esc(t('The assistant reads keywords in what you type (it is not a chat bot). Prices come from our real price list.', 'ผู้ช่วยนี้อ่านจากคำสำคัญในข้อความ (ไม่ใช่แชตบอต) ราคาทั้งหมดมาจากรายการราคาจริงของเรา'))}</p>
            </section>`;
        document.body.appendChild(el);
        el.addEventListener('click', onClick);
        el.querySelector('#advisorForm').addEventListener('submit', e => { e.preventDefault(); run(); });
        el.querySelector('#advisorText').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) close(); });
    }

    function open() {
        mount();
        el.hidden = false;
        document.body.classList.add('boxai-open');
        setTimeout(() => el.querySelector('#advisorText').focus(), 30);
    }
    function close() {
        if (!el) return;
        el.hidden = true;
        document.body.classList.remove('boxai-open');
        const fab = document.getElementById('advisorFab');
        if (fab) fab.focus({ preventScroll: true });
    }

    function run(force) {
        const text = el.querySelector('#advisorText').value.trim();
        const box = el.querySelector('#advisorResult');
        if (!text && !force) { box.innerHTML = `<p class="boxai-hint">${esc(t('Type a sentence or two first — or tap an example.', 'พิมพ์เล่ามาสักประโยคก่อน หรือกดตัวอย่างด้านบนก็ได้'))}</p>`; return; }
        const s = read(text);
        last = decide(s, force);
        box.innerHTML = render(last);
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function understood(s, c) {
        const pills = [];
        if (c) pills.push(T(CAT_NAME[c]));
        if (s.crop) pills.push(T(CROP_NAME[s.crop]));
        s.needs.forEach(n => pills.push(T(NEED_NAME[n])));
        if (s.people) pills.push(t(`${s.people} people`, `${s.people} คน`));
        if (s.board) pills.push({ nano: 'Arduino Nano', uno: 'Arduino Uno', esp32: 'ESP32', pi4: 'Raspberry Pi' }[s.board]);
        if (s.material) pills.push(t(`Box: ${s.material}`, `กล่อง: ${{ none: 'ไม่มี', glass: 'กระจก', acrylic: 'อะคริลิก', plastic: 'พลาสติก' }[s.material]}`));
        if (s.size) pills.push(`${s.size.join('×')} ${t('cm', 'ซม.')}`);
        if (s.budget) pills.push(s.budget.unlimited ? t('No budget limit', 'ไม่จำกัดงบ') : t(`Budget ${baht(s.budget.amount)}`, `งบ ${baht(s.budget.amount)}`));
        return pills.length ? `<div class="boxai-understood"><span>${esc(t('What we understood:', 'สิ่งที่ผู้ช่วยเข้าใจ:'))}</span>${pills.map(p => `<b>${esc(p)}</b>`).join('')}</div>` : '';
    }

    function switcher(r) {
        const opts = ['disaster', 'farmer', 'household', 'commercial'].filter(c => c !== r.cat || r.route === 'custom');
        return `<div class="boxai-switch"><span>${esc(t('Not quite? Try:', 'ไม่ใช่แบบนี้? ลอง:'))}</span>
            ${opts.map(c => `<button type="button" class="boxai-chip" data-adv="force" data-cat="${c}">${esc(T(CAT_NAME[c]))}</button>`).join('')}
            ${r.route !== 'custom' ? `<button type="button" class="boxai-chip" data-adv="force" data-cat="custom">${esc(t('05 · Custom (pick every part)', '05 · Custom (เลือกเองทุกชิ้น)'))}</button>` : ''}</div>`;
    }

    const linesHtml = ls => `<ul class="boxai-lines">${ls.map(l => `<li><div><b>${esc(l.name)}</b>${l.why ? `<small>${esc(T(l.why))}</small>` : ''}</div><span>${baht(l.price)}</span></li>`).join('')}</ul>`;
    const notesHtml = ns => ns.length ? `<div class="boxai-notes">${ns.map(n => `<p><i class="fas fa-circle-info"></i> ${esc(T(n))}</p>`).join('')}</div>` : '';

    function render(r) {
        if (r.route === 'ask') {
            return `<div class="boxai-card"><h3>${esc(t('Tell us a little more', 'ขอรายละเอียดอีกนิด'))}</h3>
                <p>${esc(t('Where will the plants grow? Tap one — it gets added to your text.', 'จะปลูกที่ไหน? กดเลือกได้เลย ระบบจะเติมลงในข้อความให้'))}</p>
                <div class="boxai-switch">${[
                    [L('Condo / room', 'คอนโด/ในห้อง'), 'คอนโด'], [L('Home / balcony', 'บ้าน/ระเบียง'), 'ระเบียงบ้าน'],
                    [L('Farm / greenhouse', 'ฟาร์ม/โรงเรือน'), 'โรงเรือน'], [L('After a disaster', 'หลังภัยพิบัติ'), 'น้ำท่วม'],
                    [L('High-value crops', 'พืชมูลค่าสูง'), 'พืชมูลค่าสูง']].map(([lab, add]) => `<button type="button" class="boxai-chip" data-adv="append" data-add="${esc(add)}">${esc(T(lab))}</button>`).join('')}
                </div></div>`;
        }
        const head = understood(r.s, r.cat);
        if (r.route === 'box') {
            const o = r.box.o;
            const covers = r.box.covers.map(n => T(NEED_NAME[n]));
            return `${head}<div class="boxai-card">
                <span class="boxai-tag"><i class="fas fa-circle-check"></i> ${esc(t('A ready-made box fits', 'มีกล่องสำเร็จที่ตรงกับคุณ'))}</span>
                <div class="boxai-box">
                    <img src="${esc(o.img)}" alt="" loading="lazy">
                    <div>
                        <h3>${esc(T(o.name))} <span>${o.priceNote ? esc(T(o.priceNote)) + ' ' : ''}${baht(o.price)}</span></h3>
                        <p class="boxai-sub">${esc(T(CAT_NAME[r.cat]))} · ${esc(T(o.tag))}</p>
                        <ul>${covers.length ? covers.map(c => `<li><i class="fas fa-check"></i> ${esc(t('Covers', 'ครอบคลุม'))}: ${esc(c)}</li>`).join('') : ''}
                            ${r.cat === 'disaster' && r.s.people ? `<li><i class="fas fa-check"></i> ${esc(t(`Sized for ${r.s.people} people`, `ขนาดเหมาะกับ ${r.s.people} คน`))}</li>` : ''}
                            ${r.s.budget && r.s.budget.amount ? `<li><i class="fas fa-check"></i> ${esc(t(`Within your ${baht(r.s.budget.amount)} budget`, `อยู่ในงบ ${baht(r.s.budget.amount)}`))}</li>` : ''}
                            ${o.features.slice(0, 3).map(f => `<li class="muted"><i class="fas fa-minus"></i> ${esc(T(f))}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <div class="boxai-actions">
                    <button type="button" class="boxai-btn ghost" data-adv="kit"><i class="fas fa-sliders"></i> ${esc(t('Build my own instead', 'ปรับแต่งเองทีละชิ้นแทน'))}</button>
                    <button type="button" class="boxai-btn" data-adv="box"><i class="fas fa-arrow-right"></i> ${esc(t('See this box', 'ดูกล่องนี้'))}</button>
                </div></div>${switcher(r)}`;
        }
        if (r.route === 'kit') {
            const k = r.kit;
            return `${head}<div class="boxai-card">
                <span class="boxai-tag"><i class="fas fa-layer-group"></i> ${esc(t('Matched category', 'จับคู่กับหมวด'))}: ${esc(T(CAT_NAME[r.cat]))}</span>
                <h3>${esc(t('Your recommended kit', 'ชุดที่แนะนำสำหรับคุณ'))} <span>${baht(k.total)}</span></h3>
                ${r.nearWhy ? `<p class="boxai-sub">${esc(t('No ready-made box fits exactly', 'ยังไม่มีกล่องสำเร็จที่ตรงทุกข้อ'))}: ${esc(T(r.nearWhy))}</p>` : ''}
                ${linesHtml(k.lines)}${notesHtml(k.notes)}
                <div class="boxai-actions">
                    <button type="button" class="boxai-btn ghost" data-adv="force" data-cat="custom"><i class="fas fa-screwdriver-wrench"></i> ${esc(t('Use the full Custom form', 'ใช้ฟอร์ม Custom เต็ม'))}</button>
                    <button type="button" class="boxai-btn" data-adv="kit"><i class="fas fa-arrow-right"></i> ${esc(t('Open this kit', 'เปิดชุดนี้'))}</button>
                </div></div>${switcher(r)}`;
        }
        // custom form
        const F = r.form, form = document.getElementById('customConfigForm');
        const label = { microcontroller: L('Controller', 'บอร์ดควบคุม'), watering: L('Water', 'ระบบรดน้ำ'), light: L('Light', 'ไฟ'), temperature: L('Temperature', 'อุณหภูมิ'), mist: L('Misting', 'พ่นหมอก'), camera: L('Camera', 'กล้อง'), ai: L('AI', 'AI'), boxMaterial: L('Enclosure', 'วัสดุกล่อง') };
        let total = 0;
        const rows = Object.keys(label).map(k => {
            const sel = form && form.querySelector('#' + k);
            const opt = sel && sel.options[F.f[k]];
            const txt = opt ? opt.textContent.trim() : '—';
            const isRate = k === 'boxMaterial';
            const price = opt ? (isRate ? (F.f.size ? Math.round(2 * (F.f.size[0] * F.f.size[1] + F.f.size[0] * F.f.size[2] + F.f.size[1] * F.f.size[2]) * parseFloat(opt.value) * 100) / 100 : 0) : parseFloat(opt.value) || 0) : 0;
            total += price;
            const shown = isRate && F.f.size && F.f.boxMaterial ? `${txt.replace(/\s*\(.*\)$/, '')} ${F.f.size.join('×')} ${t('cm', 'ซม.')}` : txt.replace(/\s*\(฿[^)]*\)$/, '');
            return { name: `${T(label[k])}: ${shown}`, price, why: F.why[k] };
        });
        const budget = r.s.budget && r.s.budget.amount;
        return `${head}<div class="boxai-card">
            <span class="boxai-tag"><i class="fas fa-screwdriver-wrench"></i> ${esc(r.cat ? t('Custom design (05)', 'ออกแบบเฉพาะ (05 Custom)') : t('No box or category matched — custom design (05)', 'ไม่ตรงกับกล่องหรือหมวดไหน จึงออกแบบให้ใหม่ (05 Custom)'))}</span>
            <h3>${esc(t('Every part, picked for you', 'เลือกให้ครบทุกช่อง'))} <span>${baht(total)}</span></h3>
            ${linesHtml(rows)}
            ${notesHtml(F.notes.concat(budget && total > budget ? [L(`About ${baht(total - budget)} over your budget — you can change any field on the form.`, `เกินงบประมาณ ${baht(total - budget)} แก้ช่องไหนก็ได้ในฟอร์ม`)] : []))}
            <div class="boxai-actions">
                <button type="button" class="boxai-btn" data-adv="custom"><i class="fas fa-arrow-right"></i> ${esc(t('Open the Custom form, filled in', 'เปิดฟอร์ม Custom ที่กรอกไว้แล้ว'))}</button>
            </div></div>${switcher(r)}`;
    }

    // ---------------------------------------------------------------- actions
    function ensureMain() {
        const main = document.getElementById('main-page');
        if (main && !main.classList.contains('active') && typeof showMainPage === 'function') showMainPage();
    }

    function openKit(r) {
        const k = r.kit, C = cat();
        ensureMain();
        close();
        window.openUseCase(r.cat, { kit: { label: C.UC[r.cat].short, preset: { controller: k.controller, parts: k.parts, material: k.material, size: k.size }, why: k.why, name: L('Your recommended kit', 'ชุดที่ผู้ช่วยแนะนำ') } });
    }

    function openBox(r) {
        ensureMain();
        close();
        window.openUseCase(r.cat);
        setTimeout(() => {
            const btn = document.querySelector(`#useCaseDetail [data-action="add"][data-id="${r.box.id}"]`);
            const card = btn && btn.closest('.uc-option');
            if (!card) return;
            card.classList.add('boxai-pick');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
    }

    function openCustom(r) {
        ensureMain();
        close();
        if (typeof selectUserType === 'function') selectUserType('custom');
        const F = r.form;
        document.querySelectorAll('#customConfigForm .boxai-why').forEach(n => n.remove());
        Object.keys(F.why).forEach(k => {
            const sel = document.getElementById(k);
            if (!sel) return;
            if (k === 'ai') sel.disabled = false;
            sel.selectedIndex = F.f[k] || 0;
            const why = document.createElement('small');
            why.className = 'boxai-why';
            why.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> ${esc(T(F.why[k]))}`;
            sel.insertAdjacentElement('afterend', why);
        });
        ['boxWidth', 'boxLength', 'boxHeight'].forEach((id, i) => { const inp = document.getElementById(id); if (inp) inp.value = F.f.size ? F.f.size[i] : ''; });
        if (typeof calculateCustomPrice === 'function') calculateCustomPrice();
    }

    function onClick(e) {
        const b = e.target.closest('[data-adv]');
        if (!b) return;
        const a = b.dataset.adv;
        if (a === 'close') close();
        else if (a === 'example') { el.querySelector('#advisorText').value = T(EXAMPLES[+b.dataset.i]); run(); }
        else if (a === 'append') { const ta = el.querySelector('#advisorText'); ta.value = (ta.value + ' ' + b.dataset.add).trim(); run(); }
        else if (a === 'force') {
            const c = b.dataset.cat;
            const s = read(el.querySelector('#advisorText').value);
            last = decide(s, c);
            el.querySelector('#advisorResult').innerHTML = render(last);
        }
        else if (a === 'kit' && last) openKit(last.kit ? last : decide(last.s, last.cat));
        else if (a === 'box' && last && last.box) openBox(last);
        else if (a === 'custom' && last && last.form) openCustom(last);
    }

    // a reason under a Custom field goes away once the customer changes that field
    document.addEventListener('change', e => {
        const n = e.target && e.target.nextElementSibling;
        if (n && n.classList && n.classList.contains('boxai-why') && e.isTrusted) n.remove();
    });

    function init() {
        if (!window.__catalog || !window.openUseCase) return;
        mount();
        document.querySelectorAll('[data-open-advisor]').forEach(b => b.addEventListener('click', open));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.openAdvisor = open;
    window.__advisor = { read, decide }; // for testing
})();
