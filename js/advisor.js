// ============== Box design assistant ==============
// The customer describes what they want in their own words (Thai or English). Google Gemini
// (free tier, via the Supabase Edge Function "box-advisor") reads it into plain facts; if the AI
// is busy or its free quota is used up, keyword rules read it instead. Then we route in this order:
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
        household: ['บ้าน', 'ครัวเรือน', 'คอนโด', 'ห้อง', 'ระเบียง', 'ในครัว', 'อพาร์ต', 'หอพัก', /อยู่หอ/, 'โต๊ะ', 'ออฟฟิศ', 'ที่ทำงาน', 'desk', 'office', /\btable\b/, 'windowsill', 'กินเอง', 'home', 'house', 'condo', 'apartment', 'balcony', 'kitchen', 'indoor', 'bedroom', 'dorm', /\broom\b/],
        commercial: ['มูลค่าสูง', 'พืชเศรษฐกิจ', 'ราคาสูง', 'พรีเมียม', 'เมลอน', 'เมล่อน', 'เมล่อน', 'สตรอว์เบอร์รี', 'สตรอเบอร์รี', 'สตอเบอรี', 'สตอเบอร์รี่', 'วาซาบิ', 'หญ้าฝรั่น', 'ส่งออก', 'ห้องแล็บ', 'งานวิจัย', 'premium', 'high-value', 'high value', 'melon', 'strawberr', 'wasabi', 'saffron', 'export', 'precision', /\blab\b/, 'research', 'commercial'],
        indoor: ['คอนโด', 'ห้อง', 'ในบ้าน', 'อพาร์ต', 'หอพัก', /อยู่หอ/, 'โต๊ะ', 'ออฟฟิศ', 'ที่ทำงาน', 'desk', 'office', 'condo', 'apartment', 'indoor', 'bedroom', 'dorm', /\broom\b/, 'inside'],

        veg: ['ผัก', 'สลัด', 'คะน้า', 'ผักบุ้ง', 'กวางตุ้ง', 'ไมโครกรีน', 'ต้นอ่อน', 'lettuce', 'salad', 'vegetable', 'veggie', 'kale', 'spinach', 'microgreen'],
        herb: ['สมุนไพร', 'กะเพรา', 'โหระพา', 'สะระแหน่', 'ตะไคร้', 'มิ้นต์', 'มินต์', 'ผักชี', 'herb', 'basil', 'mint', 'coriander', 'cilantro', 'parsley'],
        flower: ['ดอกไม้', 'ไม้ดอก', 'กุหลาบ', 'ดาวเรือง', 'ทานตะวัน', 'กล้วยไม้', 'flower', 'rose', 'sunflower', 'orchid'],
        fruit: ['ผลไม้', 'มะเขือเทศ', 'พริก', 'เมลอน', 'เมล่อน', 'สตรอ', 'สตอ', 'แตง', 'fruit', 'tomato', 'chili', 'chilli', 'pepper', 'melon', 'strawberr', 'cucumber'],
        seedling: ['ต้นกล้า', 'เพาะกล้า', 'เพาะเมล็ด', 'ต้นยืด', 'seedling', 'sprout', 'germinat'],

        lowlight: [/(แดด|แสง).{0,6}(น้อย|ไม่ถึง|ไม่พอ|ไม่เข้า|ไม่ค่อย|เข้าน้อย)/, /ไม่มี.{0,4}(แดด|แสง|หน้าต่าง)/, /no window|windowless|without (a )?window/, 'แดดน้อย', 'แสงน้อย', 'แดดไม่ถึง', 'แสงไม่ถึง', 'แสงไม่พอ', 'แดดไม่พอ', 'ไม่มีแดด', 'ไม่โดนแดด', 'ไม่ค่อยมีแดด', 'ไม่ค่อยโดนแดด', 'ในร่ม', 'มืด', 'ทึบ', 'ต้นยืด', 'ไฟปลูก', /\bled\b/, 'grow light', 'low light', 'little sun', 'no sun', 'not enough light', 'not much sun', 'shade', 'shady', 'dark'],
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
        cheap: ['ราคาถูก', 'ถูกที่สุด', 'ถูกกว่า', 'ถูกลง', 'cheaper', 'ถูกๆ', 'ถูก ๆ', 'ประหยัด', 'ไม่แพง', 'งบน้อย', 'งบจำกัด', 'cheap', 'affordable', 'low cost', 'low-cost', 'inexpensive'],
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
        // no currency next to the number, but the text is about money: take the plain numbers (a range -> its top)
        if (!best && /(งบ|บาท|ราคา|แพง|ถูก|ประหยัด|เงิน|จ่าย|budget|baht|price|cheap|afford|spend|money|฿)/.test(txt)) {
            const re2 = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k\b|พัน|หมื่น)?/gi;
            let m2;
            while ((m2 = re2.exec(txt))) {
                const after = txt.slice(re2.lastIndex, re2.lastIndex + 6), before = txt.slice(Math.max(0, m2.index - 2), m2.index);
                if (/^\s*(คน|people|person|ต้น|กระถาง|pots?|plants?|%|ไร่|rai|ตร|m2|m²|ซม|cm|เซน|x|×|\*|วัน|days?|ชม|hours?|gb|นิ้ว|inch)/i.test(after) && !m2[2]) continue;
                if (/[x×*]\s*$/.test(before) || /pi\s?$/i.test(txt.slice(Math.max(0, m2.index - 3), m2.index))) continue;
                let v = parseFloat(m2[1].replace(/,/g, ''));
                if (m2[2]) v *= UNIT[m2[2].toLowerCase()];
                if (v >= 100 && v <= 5000000) best = Math.max(best || 0, v);
            }
        }
        if (!best && /งบ\s*หลักร้อย/.test(txt)) best = 999;
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
        // a dorm room or a desk only has space for a small box
        if (!s.large && hit(txt, [/อยู่หอ/, 'หอพัก', 'โต๊ะ', 'dorm', 'desk', 'windowsill'])) s.small = true;
        s.source = 'keywords';
        return finalize(s);
    }

    function finalize(s) {
        if (s.crop === 'seedling') s.lowlight = true;
        if (s.cheap && !s.budget) s.budget = { amount: 1000, implied: true };
        if (s.small && s.large) s.large = false;
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

    // The AI's facts (already checked by the Edge Function) in the shape read() makes.
    // Numbers the AI missed are taken from the keyword reader only when they came with a currency.
    function fromAI(d, text) {
        const k = read(text);
        const need = x => d.needs.includes(x), no = x => d.not_wanted.includes(x);
        const BOARD = {
            arduino_nano: ['nano'], arduino_uno: ['uno'], arduino_uno_official: ['uno', 'unoOfficial'], esp32: ['esp32'], esp32_cam: ['esp32', 'espcam'],
            pi_pico: ['pi4', 'pico'], pi_zero: ['pi4', 'zero'], pi3: ['pi4', 'pi3'], pi4: ['pi4', 'pi4'], pi4_2gb: ['pi4', 'pi4-2'], pi4_8gb: ['pi4', 'pi4-8'], pi5: ['pi4', 'pi5'], pi5_8gb: ['pi4', 'pi5-8'],
        };
        const [board, boardDetail] = BOARD[d.board] || [null, null];
        const dims = d.dims_cm.length >= 2 ? [d.dims_cm[0], d.dims_cm[1], d.dims_cm[2] || Math.max(d.dims_cm[0], d.dims_cm[1])] : null;
        let budget = null;
        if (d.budget_unlimited) budget = { unlimited: true };
        else if (d.budget_max_thb) budget = { amount: d.budget_max_thb };
        else if (k.budget && !k.budget.implied && !k.budget.unlimited) budget = k.budget;
        const s = {
            text, source: 'ai', summary: d.summary, aboutPlants: d.about_plants,
            score: { disaster: 0, farmer: 0, household: 0, commercial: 0 },
            indoor: d.indoor,
            crop: ['veg', 'herb', 'flower', 'fruit', 'seedling'].includes(d.crop) ? d.crop : null,
            lowlight: need('light') && !no('light'), heat: need('heat'), cold: need('cold'), cool: need('cool'),
            dry: need('water'), humid: need('mist') && !no('mist'),
            disease: need('disease') && !no('camera'), camera: need('camera') && !no('camera'), ai: need('ai') && !no('ai') && !no('camera'),
            precise: d.ai_accuracy === 'high', aiBasic: d.ai_accuracy === 'basic',
            phone: need('phone') && !no('phone'), hydro: need('hydro'), nutrients: need('nutrients'), fert: need('fert'),
            labour: need('labour'), yield: need('yield'),
            cheap: d.cheap, small: d.size === 'small', large: d.size === 'large',
            wantsCustom: d.wants_custom,
            material: no('box') ? 'none' : (d.material === 'unspecified' ? null : d.material),
            light: d.light_type === 'unspecified' ? null : d.light_type, dim: d.dimmable,
            board, boardDetail, budget, size: dims, people: d.people || null,
        };
        if (d.category !== 'none') s.score[d.category] = 5;
        return finalize(s);
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
        'relief-s': { cat: 'disaster', size: 's', does: ['water'] },
        'relief-l': { cat: 'disaster', size: 'l', does: ['mist', 'heat', 'phone'] },
        'home-tent': { cat: 'household', size: 'l', does: ['light', 'mist', 'water', 'phone'] },
        'farmer-vision': { cat: 'farmer', size: 'l', does: ['light', 'water', 'fert', 'mist', 'heat', 'camera', 'ai', 'phone'] },
        'hydro-cube': { cat: 'commercial', size: 'm', does: ['hydro', 'light', 'heat', 'mist', 'water', 'phone'] },
        'v4-pro': { cat: 'commercial', size: 'm', does: ['light', 'heat', 'mist', 'water', 'camera', 'ai', 'phone', 'hydro'] },
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
        if (s.aboutPlants === false || (!c && !s.needs.size && !needsCustomForm(s))) return { route: 'ask', s };
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
            const wrongPeople = c === 'disaster' && s.people && ((s.people > 4) !== (id === 'relief-l'));
            const tooBig = s.small && BOX[id].size === 'l', tooSmall = s.large && BOX[id].size === 's';
            if (!missing.length && !tooDear && !wrongPeople && !tooBig && !tooSmall) { box = { id, o, covers: wanted.filter(n => BOX[id].does.includes(n)) }; break; }
            if (!near) { near = o; nearWhy = tooDear ? L(`${o.name.en} is over your budget`, `${o.name.th} เกินงบของคุณ`) : tooBig ? L(`${o.name.en} is bigger than you want`, `${o.name.th} ใหญ่เกินกว่าที่คุณต้องการ`) : tooSmall ? L(`${o.name.en} is smaller than you want`, `${o.name.th} เล็กเกินกว่าที่คุณต้องการ`) : missing.length ? L(`${o.name.en} doesn't have: ${missing.map(m => NEED_NAME[m].en.toLowerCase()).join(', ')}`, `${o.name.th} ยังไม่มี: ${missing.map(m => NEED_NAME[m].th).join(', ')}`) : null; }
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
            if (s.indoor || s.crop === 'seedling' || c === 'commercial' || s.light === 'panel') add('ledFull', L('Recommended because your plants don\'t get enough sun — a full-spectrum panel replaces it', 'แนะนำเพราะคุณบอกว่าแสงไม่พอ แผงไฟฟูลสเปกตรัมทดแทนแสงแดดได้'));
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
            ai = s.precise || (c === 'commercial' && !s.aiBasic) ? 'ai3' : (s.aiBasic || s.cheap || (s.budget && s.budget.amount < 900)) ? 'ai1' : 'ai2';
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
        else if (s.light === 'panel') set('light', 9, L('The light you asked for', 'ไฟแบบที่คุณเลือกไว้'));
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
            let m = s.precise || (c === 'commercial' && !s.aiBasic) ? 3 : (s.aiBasic || s.cheap) ? 1 : 2;
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
        const budget = s.budget && s.budget.amount;
        const cost = () => customTotal({ f, size: f.size || [60, 40, 50] });
        if (budget && document.getElementById('customConfigForm') && cost() > budget) {
            const start = cost();
            const steps = [
                () => { if (f.boxMaterial && !s.material && !s.size) { set('boxMaterial', 0, L('No enclosure keeps it within budget', 'ไม่ใส่กล่องเพื่อให้อยู่ในงบ')); f.size = null; if (f.temperature === 5 && !s.cool) set('temperature', 1, L('Not needed without a box', 'ไม่จำเป็นเมื่อไม่มีกล่อง')); } },
                () => { if ([3, 4, 5, 9].includes(f.light) && !s.light && !s.dim) set('light', 6, L('A red + blue strip keeps it within budget', 'ไฟแดง-น้ำเงินทำให้อยู่ในงบ')); },
                () => { if (f.temperature === 2) set('temperature', 3, L('Cooling only keeps it within budget', 'ใช้แค่ระบบทำความเย็นเพื่อให้อยู่ในงบ')); },
                () => { if (f.mist === 5) set('mist', 4, L('One nozzle keeps it within budget', 'หัวพ่นหมอกหัวเดียวทำให้อยู่ในงบ')); },
                () => { if (f.ai === 3) set('ai', 2, L('Model 2 keeps it within budget', 'Model 2 ทำให้อยู่ในงบ')); else if (f.ai === 2) set('ai', 1, L('Model 1 keeps it within budget', 'Model 1 ทำให้อยู่ในงบ')); },
                () => { if (f.microcontroller >= 7 && !s.board) { set('microcontroller', 4, L('ESP32 keeps it within budget and still has Wi-Fi', 'ESP32 ทำให้อยู่ในงบ และยังมี Wi-Fi')); if (f.camera === 4) set('camera', 3, L('Photographs the leaves every day', 'ถ่ายภาพใบทุกวัน')); } },
                () => { if (f.camera === 4) set('camera', f.microcontroller >= 7 ? 2 : 3, L('A cheaper camera keeps it within budget', 'กล้องที่ถูกกว่าทำให้อยู่ในงบ')); },
            ];
            for (const step of steps) { if (cost() <= budget) break; step(); }
            const end = cost();
            if (end < start) notes.push(L(`Trimmed to fit your ${baht(budget)} budget (saved ${baht(start - end)}).`, `ปรับให้เข้างบ ${baht(budget)} แล้ว (ลดไป ${baht(start - end)})`));
        }
        return { f, why, notes };
    }

    // ---------------------------------------------------------------- panel (a chat)
    // Each question is a "turn": the customer's words, then our answer, which they can edit in place
    // (tick parts on/off, change board, material, size) and add to the cart. Follow-up questions
    // ("cheaper please", "add a camera") are read together with the earlier ones.
    let el = null, last = null, thread = null;
    const turns = [];
    let turnSeq = 0;
    const EXAMPLES = [
        L('I live in a condo with little sun, often away from home, want to check from my phone, budget ฿1,000', 'อยู่คอนโด แดดน้อย ไม่ค่อยอยู่บ้าน อยากดูผ่านมือถือ งบ 1,000 บาท'),
        L('Growing melons in a greenhouse, it gets very hot and leaves get spots', 'ปลูกเมลอนในโรงเรือน ร้อนมาก ใบเป็นจุด'),
        L('After the flood, family of 6, need fresh vegetables fast', 'หลังน้ำท่วม ครอบครัว 6 คน อยากได้ผักกินเร็ว ๆ'),
        L('Custom glass box 80x40x60 with Raspberry Pi 5, RGBW dimmable light and 90% AI', 'กล่องกระจก 80x40x60 ใช้ Raspberry Pi 5 ไฟ RGBW หรี่ได้ AI แม่นยำสูง'),
    ];
    const FOLLOW_UPS = [
        L('Cheaper please', 'ขอถูกกว่านี้'), L('Add a camera with AI', 'เพิ่มกล้องกับ AI'),
        L('No box needed', 'ไม่เอากล่อง'), L('I want to check it from my phone', 'อยากดูผ่านมือถือ'),
    ];
    const GROUP_NAME = { Light: L('Light', 'ไฟ'), Water: L('Water', 'น้ำ'), Climate: L('Climate', 'อากาศ'), Sensors: L('Sensors', 'เซนเซอร์'), Camera: L('Camera', 'กล้อง'), AI: L('AI', 'AI') };

    function mount() {
        if (el) return;
        const fab = document.createElement('button');
        fab.type = 'button';
        fab.className = 'boxai-fab';
        fab.id = 'advisorFab';
        fab.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i><span>${esc(t('AI box designer', 'AI ออกแบบกล่อง'))}</span>`;
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
                        <span class="boxai-eyebrow"><i class="fas fa-wand-magic-sparkles"></i> ${esc(t('AI box designer', 'AI ออกแบบกล่อง'))}</span>
                        <h2 id="advisorTitle">${esc(t('Tell us what you want to grow', 'เล่าให้ฟังว่าอยากได้กล่องแบบไหน'))}</h2>
                    </div>
                    <div class="boxai-head-actions">
                        <button type="button" class="boxai-reset" data-adv="reset" hidden><i class="fas fa-rotate-left"></i> ${esc(t('Start over', 'เริ่มใหม่'))}</button>
                        <button type="button" class="boxai-x" data-adv="close" aria-label="${esc(t('Close', 'ปิด'))}"><i class="fas fa-xmark"></i></button>
                    </div>
                </header>
                <div class="boxai-thread" id="advisorThread" aria-live="polite"></div>
                <form class="boxai-composer" id="advisorForm">
                    <div class="boxai-quick" id="advisorQuick"></div>
                    <div class="boxai-inputrow">
                        <textarea id="advisorText" rows="2" maxlength="600"></textarea>
                        <button type="submit" class="boxai-send" aria-label="${esc(t('Send', 'ส่ง'))}"><i class="fas fa-paper-plane"></i></button>
                    </div>
                    <p class="boxai-foot">${esc(t('Read by Google Gemini AI — don\'t type your name, phone or address. Parts and prices come from our real price list.', 'ข้อความจะถูกส่งให้ AI ของ Google (Gemini) อ่าน อย่าพิมพ์ชื่อ เบอร์โทร หรือที่อยู่ ชิ้นส่วนและราคาทั้งหมดมาจากรายการราคาจริงของเรา'))}</p>
                </form>
            </section>`;
        document.body.appendChild(el);
        thread = el.querySelector('#advisorThread');
        el.addEventListener('click', onClick);
        el.addEventListener('change', onEdit);
        el.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.ed === 'dim') onEdit(e); });
        el.querySelector('#advisorForm').addEventListener('submit', e => { e.preventDefault(); send(); });
        el.querySelector('#advisorText').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) close(); });
        renderIntro();
    }

    function renderIntro() {
        thread.innerHTML = `
            <div class="boxai-intro">
                <p>${esc(t('Where will the plants grow, what do you grow, what goes wrong, and what\'s your budget? We\'ll match a ready-made box — or design one part by part. You can keep asking to adjust it.', 'ปลูกที่ไหน ปลูกอะไร เจอปัญหาอะไร งบเท่าไร แล้วเราจะจับคู่กล่องให้ หรือออกแบบให้ทีละชิ้น จากนั้นถามต่อเพื่อปรับได้เรื่อย ๆ'))}</p>
                <span>${esc(t('Try one:', 'ลองตัวอย่าง:'))}</span>
                <div class="boxai-examples">${EXAMPLES.map((e, i) => `<button type="button" class="boxai-chip" data-adv="example" data-i="${i}">${esc(T(e))}</button>`).join('')}</div>
            </div>`;
        el.querySelector('#advisorQuick').innerHTML = '';
        el.querySelector('#advisorText').placeholder = t('e.g. ' + EXAMPLES[0].en, 'เช่น ' + EXAMPLES[0].th);
        el.querySelector('[data-adv="reset"]').hidden = true;
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

    // ---- talking to the AI
    const AI_URL = 'https://gjsfhgsbrdfftytdfkyt.supabase.co/functions/v1/box-advisor';
    const aiCache = new Map(); // same conversation again -> same answer, no extra quota
    async function askAI(text, history) {
        const key = JSON.stringify([history, text]);
        if (aiCache.has(key)) return aiCache.get(key);
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 25000);
        try {
            const r = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, history }), signal: ctl.signal });
            const j = await r.json();
            if (j && j.ok && j.data) aiCache.set(key, j);
            return j;
        } catch (e) {
            return { ok: false, fallback: 'network' };
        } finally { clearTimeout(timer); }
    }

    const CHEAPER = /(ถูกกว่า|ถูกลง|ราคาต่ำกว่า|ประหยัดกว่า|ลดงบ|cheaper|less expensive|lower price|cut the cost)/i;
    let busy = false;
    async function send(preset) {
        if (busy) return;
        const ta = el.querySelector('#advisorText');
        const text = (preset || ta.value).trim().slice(0, 600);
        if (!text) { ta.focus(); return; }
        busy = true;
        ta.value = '';
        const btn = el.querySelector('.boxai-send');
        btn.disabled = true;
        if (!turns.length) thread.innerHTML = '';
        const history = turns.map(x => x.text).slice(-4);
        const prev = turns[turns.length - 1];
        const turn = { id: ++turnSeq, text, r: null, mode: null, edit: null };
        turns.push(turn);
        const node = document.createElement('article');
        node.className = 'boxai-turn';
        node.dataset.turn = turn.id;
        node.innerHTML = `<div class="boxai-you">${esc(text)}</div><div class="boxai-reply"><p class="boxai-thinking"><i class="fas fa-spinner fa-spin"></i> ${esc(t('The AI is reading what you wrote…', 'AI กำลังอ่านสิ่งที่คุณพิมพ์…'))}</p></div>`;
        thread.appendChild(node);
        scrollToTurn(node);

        let s;
        // just "cheaper please": keep what we already understood and only lower the budget (no AI call)
        const rest = text.replace(CHEAPER, '').replace(/[\s.!?,ๆ]|ครับ|ค่ะ|คะ|นะ|หน่อย|ขอ|อีก|please|a bit|make it|can you/gi, '');
        const onlyCheaper = prev && prev.r && prev.r.s && prev.r.route !== 'ask' && CHEAPER.test(text) && rest.length < 8;
        if (onlyCheaper) {
            s = Object.assign({}, prev.r.s, { needs: new Set(prev.r.s.needs), source: 'adjust' });
        } else {
            const res = await askAI(text, history);
            if (res && res.ok) s = fromAI(res.data, [...history, text].join(' \n'));
            else { s = read([...history, text].join(' \n')); s.fallback = (res && res.fallback) || 'error'; }
        }
        // "cheaper than that": aim below the last answer's total
        if (prev && prev.r && CHEAPER.test(text)) {
            const was = turnTotal(prev);
            if (was > 0) { const cap = Math.max(100, Math.round(was * 0.8 / 10) * 10); if (!s.budget || s.budget.unlimited || s.budget.amount > cap) s.budget = { amount: cap, fromCheaper: true }; s.cheap = true; }
        }
        turn.r = decide(s);
        last = turn.r;
        setupEdit(turn);
        renderTurn(turn);
        scrollToTurn(node);
        el.querySelector('#advisorQuick').innerHTML = turn.r.route === 'ask' ? '' : `<span>${esc(t('Ask more:', 'ถามต่อ:'))}</span>${FOLLOW_UPS.map((f, i) => `<button type="button" class="boxai-chip" data-adv="follow" data-i="${i}">${esc(T(f))}</button>`).join('')}`;
        ta.placeholder = t('Ask a follow-up or ask for a change…', 'ถามต่อ หรือขอปรับ เช่น "ขอถูกกว่านี้" "เพิ่มกล้อง"…');
        el.querySelector('[data-adv="reset"]').hidden = false;
        btn.disabled = false;
        busy = false;
    }

    // the newest question goes to the top of the chat so its answer can be read from the start
    function scrollToTurn(node) {
        // the latest turn is at least one screen tall, so it can always scroll up to the top
        thread.querySelectorAll('.boxai-turn').forEach(n => { n.style.minHeight = ''; });
        node.style.minHeight = Math.max(0, thread.clientHeight - 24) + 'px';
        thread.scrollTo({ top: Math.max(0, node.offsetTop - thread.offsetTop - 8), behavior: reduceMotionOK() ? 'smooth' : 'auto' });
    }
    const reduceMotionOK = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- editable state for each answer
    function setupEdit(turn) {
        const r = turn.r;
        turn.mode = r.route;
        if (r.route === 'kit' || r.route === 'box') {
            const k = r.kit;
            turn.edit = { cat: r.cat, controller: k.controller, parts: new Set(k.parts), material: k.material, size: [...k.size], why: Object.assign({}, k.why) };
        } else if (r.route === 'custom') {
            turn.edit = { f: Object.assign({}, r.form.f), size: r.form.f.size ? [...r.form.f.size] : [60, 40, 50], why: Object.assign({}, r.form.why) };
        }
    }
    const kitOf = e => ({ controller: e.controller, parts: new Map([...e.parts].map(id => [id, { why: e.why[id] }])), material: e.material, size: e.size, cWhy: e.why[e.controller], mWhy: e.why.material });
    const customSel = id => document.querySelector('#customConfigForm #' + id);
    function customTotal(e) {
        let sum = 0;
        ['microcontroller', 'watering', 'light', 'temperature', 'mist', 'camera', 'ai'].forEach(k => { const s = customSel(k); if (s && s.options[e.f[k] || 0]) sum += parseFloat(s.options[e.f[k] || 0].value) || 0; });
        const m = customSel('boxMaterial');
        if (m && e.f.boxMaterial) { const [w, l, h] = e.size; sum += 2 * (w * l + w * h + l * h) * (parseFloat(m.options[e.f.boxMaterial].value) || 0); }
        return Math.round(sum * 100) / 100;
    }
    function turnTotal(turn) {
        if (!turn.edit) return turn.r && turn.r.box ? turn.r.box.o.price : 0;
        if (turn.mode === 'box') return turn.r.box.o.price;
        return turn.mode === 'custom' ? customTotal(turn.edit) : kitTotal(kitOf(turn.edit));
    }

    // ---- drawing an answer
    function renderTurn(turn) {
        const node = thread.querySelector(`[data-turn="${turn.id}"] .boxai-reply`);
        if (node) node.innerHTML = sourceNote(turn.r.s) + renderBody(turn);
    }

    // where the reading came from: the AI (with its one-line summary) or the keyword back-up
    function sourceNote(s) {
        if (s.source === 'adjust') return `<p class="boxai-source ai"><i class="fas fa-arrow-down-wide-short"></i> <span><b>${esc(t('Same needs, lower budget', 'ความต้องการเดิม งบต่ำลง'))}</b> — ${esc(t('we kept what you asked for and cut the rest first', 'คงสิ่งที่คุณต้องการไว้ แล้วตัดส่วนอื่นออกก่อน'))}</span></p>`;
        if (s.source === 'ai') {
            return `<p class="boxai-source ai"><i class="fas fa-wand-magic-sparkles"></i> <span><b>${esc(t('Read by AI', 'AI อ่านแล้ว'))}</b>${s.summary ? ` — “${esc(s.summary)}”` : ''}</span></p>`;
        }
        const why = {
            visitor: L('you\'ve used today\'s AI questions', 'คุณใช้ AI ครบโควตาของวันนี้แล้ว'),
            site: L('today\'s free AI quota is used up', 'โควตา AI ฟรีของวันนี้หมดแล้ว'),
            quota: L('today\'s free AI quota is used up', 'โควตา AI ฟรีของวันนี้หมดแล้ว'),
            'not-configured': L('the AI isn\'t switched on yet', 'ยังไม่ได้เปิดใช้ AI'),
        }[s.fallback] || L('the AI didn\'t answer', 'AI ไม่ตอบในตอนนี้');
        return `<p class="boxai-source"><i class="fas fa-circle-info"></i> <span>${esc(t(`Quick read (${why.en}) — results may be less precise.`, `อ่านแบบสำรอง (${why.th}) ผลอาจแม่นน้อยกว่า`))}</span></p>`;
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
        else if (s.small) pills.push(t('Small box', 'กล่องเล็ก'));
        else if (s.large) pills.push(t('Large box', 'กล่องใหญ่'));
        if (s.budget) pills.push(s.budget.unlimited ? t('No budget limit', 'ไม่จำกัดงบ') : s.budget.implied ? t(`Low budget (about ${baht(s.budget.amount)})`, `งบประหยัด (ราว ${baht(s.budget.amount)})`) : s.budget.fromCheaper ? t(`Cheaper: up to ${baht(s.budget.amount)}`, `ถูกลง: ไม่เกิน ${baht(s.budget.amount)}`) : t(`Budget up to ${baht(s.budget.amount)}`, `งบไม่เกิน ${baht(s.budget.amount)}`));
        return pills.length ? `<div class="boxai-understood"><span>${esc(t('What we understood:', 'สิ่งที่ผู้ช่วยเข้าใจ:'))}</span>${pills.map(p => `<b>${esc(p)}</b>`).join('')}</div>` : '';
    }

    function switcher(turn) {
        const r = turn.r;
        const opts = ['disaster', 'farmer', 'household', 'commercial'].filter(c => c !== r.cat || r.route === 'custom');
        return `<div class="boxai-switch"><span>${esc(t('Not quite? Try:', 'ไม่ใช่แบบนี้? ลอง:'))}</span>
            ${opts.map(c => `<button type="button" class="boxai-chip" data-adv="force" data-cat="${c}">${esc(T(CAT_NAME[c]))}</button>`).join('')}
            ${r.route !== 'custom' ? `<button type="button" class="boxai-chip" data-adv="force" data-cat="custom">${esc(t('05 · Custom (pick every part)', '05 · Custom (เลือกเองทุกชิ้น)'))}</button>` : ''}</div>`;
    }
    const notesHtml = ns => ns.length ? `<div class="boxai-notes">${ns.map(n => `<p><i class="fas fa-circle-info"></i> ${esc(T(n))}</p>`).join('')}</div>` : '';
    const opt = (v, label, on, dis) => `<option value="${esc(v)}"${on ? ' selected' : ''}${dis ? ' disabled' : ''}>${esc(label)}</option>`;
    const overNote = (total, s) => {
        const b = s.budget && s.budget.amount;
        if (!b) return '';
        return total > b
            ? `<p class="boxai-budget over"><i class="fas fa-triangle-exclamation"></i> ${esc(t(`${baht(total - b)} over your ${baht(b)} budget`, `เกินงบ ${baht(b)} ไป ${baht(total - b)}`))}</p>`
            : `<p class="boxai-budget"><i class="fas fa-circle-check"></i> ${esc(t(`Within your ${baht(b)} budget`, `อยู่ในงบ ${baht(b)}`))}</p>`;
    };

    function renderBody(turn) {
        const r = turn.r;
        if (r.route === 'ask') {
            const off = r.s.aboutPlants === false;
            return `${understood(r.s, null)}<div class="boxai-card">${off ? `<p>${esc(t('That doesn\'t look like it\'s about growing plants. Tell us what you want to grow, where, and your budget.', 'ข้อความนี้ดูไม่เกี่ยวกับการปลูกต้นไม้ ลองเล่าว่าอยากปลูกอะไร ที่ไหน งบเท่าไร'))}</p>` : ''}
                <h3>${esc(t('Tell us a little more', 'ขอรายละเอียดอีกนิด'))}</h3>
                <p>${esc(t('Where will the plants grow?', 'จะปลูกที่ไหน?'))}</p>
                <div class="boxai-switch">${[
                    [L('Condo / room', 'คอนโด/ในห้อง'), 'คอนโด'], [L('Home / balcony', 'บ้าน/ระเบียง'), 'ระเบียงบ้าน'],
                    [L('Farm / greenhouse', 'ฟาร์ม/โรงเรือน'), 'โรงเรือน'], [L('After a disaster', 'หลังภัยพิบัติ'), 'น้ำท่วม'],
                    [L('High-value crops', 'พืชมูลค่าสูง'), 'พืชมูลค่าสูง']].map(([lab, add]) => `<button type="button" class="boxai-chip" data-adv="answer" data-add="${esc(add)}">${esc(T(lab))}</button>`).join('')}
                </div></div>`;
        }
        const head = understood(r.s, r.cat);
        if (turn.mode === 'box') {
            const o = r.box.o;
            const covers = r.box.covers.map(n => T(NEED_NAME[n]));
            return `${head}<div class="boxai-card">
                <span class="boxai-tag"><i class="fas fa-circle-check"></i> ${esc(t('A ready-made box fits', 'มีกล่องสำเร็จที่ตรงกับคุณ'))}</span>
                <div class="boxai-box">
                    <img src="${esc(o.img)}" alt="" loading="lazy">
                    <div>
                        <h3>${esc(T(o.name))} <span>${o.priceNote ? esc(T(o.priceNote)) + ' ' : ''}${baht(o.price)}</span></h3>
                        <p class="boxai-sub">${esc(T(CAT_NAME[r.cat]))} · ${esc(T(o.tag))}</p>
                        <ul>${covers.map(c => `<li><i class="fas fa-check"></i> ${esc(t('Covers', 'ครอบคลุม'))}: ${esc(c)}</li>`).join('')}
                            ${r.cat === 'disaster' && r.s.people ? `<li><i class="fas fa-check"></i> ${esc(t(`Sized for ${r.s.people} people`, `ขนาดเหมาะกับ ${r.s.people} คน`))}</li>` : ''}
                            ${o.features.map(f => `<li class="muted"><i class="fas fa-minus"></i> ${esc(T(f))}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                ${overNote(o.price, r.s)}
                <div class="boxai-actions">
                    <button type="button" class="boxai-btn ghost" data-adv="tweak"><i class="fas fa-sliders"></i> ${esc(t('Adjust part by part here', 'ปรับทีละชิ้นตรงนี้'))}</button>
                    <button type="button" class="boxai-btn ghost" data-adv="box"><i class="fas fa-arrow-right"></i> ${esc(t('See this box', 'ดูกล่องนี้'))}</button>
                    <button type="button" class="boxai-btn" data-adv="cart-box"><i class="fas fa-bag-shopping"></i> ${esc(t('Add to cart', 'ใส่ตะกร้า'))}</button>
                </div></div>${switcher(turn)}`;
        }
        if (turn.mode === 'kit') return head + kitEditor(turn) + switcher(turn);
        return head + customEditor(turn) + switcher(turn);
    }

    // ---- a kit you can change right here
    function kitEditor(turn) {
        const e = turn.edit, C = cat(), r = turn.r;
        const arduino = e.controller === 'nano' || e.controller === 'uno';
        const k = kitOf(e), total = kitTotal(k);
        const partName = id => T(C.PARTS.find(p => p.id === id).name);
        const reason = id => (e.why[id] ? T(e.why[id]) : T((C.PARTS.find(p => p.id === id) || C.CONTROLLERS.find(p => p.id === id) || {}).why || ''));
        const others = C.PARTS.filter(p => !e.parts.has(p.id));
        const groups = [...new Set(others.map(p => p.group))];
        const sizeRow = e.material !== 'none' ? `<div class="boxai-dims">${[t('W', 'กว้าง'), t('L', 'ยาว'), t('H', 'สูง')].map((lab, i) => `<label>${esc(lab)}<input type="number" min="10" max="400" step="1" data-ed="dim" data-i="${i}" value="${e.size[i]}"></label>`).join('')}<span>${esc(t('cm', 'ซม.'))}</span></div>` : '';
        return `<div class="boxai-card">
            <span class="boxai-tag"><i class="fas fa-layer-group"></i> ${esc(r.route === 'box' ? t('Built from the matched box', 'ปรับจากกล่องที่จับคู่ไว้') : t('Matched category', 'จับคู่กับหมวด'))}: ${esc(T(CAT_NAME[e.cat]))}</span>
            <h3>${esc(t('Your kit — change anything', 'ชุดของคุณ — ปรับได้ทุกชิ้น'))} <span>${baht(total)}</span></h3>
            ${r.nearWhy && r.route === 'kit' ? `<p class="boxai-sub">${esc(t('No ready-made box fits exactly', 'ยังไม่มีกล่องสำเร็จที่ตรงทุกข้อ'))}: ${esc(T(r.nearWhy))}</p>` : ''}
            <div class="boxai-row">
                <label class="boxai-field">${esc(t('Controller', 'บอร์ดควบคุม'))}
                    <select data-ed="controller">${C.CONTROLLERS.map(c => opt(c.id, `${T(c.name)} (${baht(c.price)})`, c.id === e.controller)).join('')}</select></label>
                <small>${esc(reason(e.controller))}</small>
            </div>
            <ul class="boxai-lines">
                ${[...e.parts].map(id => `<li><label><input type="checkbox" data-ed="part" value="${id}" checked><span><b>${esc(partName(id))}</b><small>${esc(reason(id))}</small></span></label><span>${baht(priceOf(id))}</span></li>`).join('')}
            </ul>
            <label class="boxai-field">${esc(t('Add a part', 'เพิ่มชิ้นส่วน'))}
                <select data-ed="add"><option value="">${esc(t('+ choose a part…', '+ เลือกชิ้นส่วน…'))}</option>
                ${groups.map(g => `<optgroup label="${esc(T(GROUP_NAME[g] || L(g, g)))}">${others.filter(p => p.group === g).map(p => opt(p.id, `${T(p.name)} (${baht(p.price)})`, false, p.id === 'ai3' && arduino)).join('')}</optgroup>`).join('')}
                </select></label>
            <div class="boxai-row">
                <label class="boxai-field">${esc(t('Enclosure', 'กล่อง'))}
                    <select data-ed="material">${C.MATERIALS.map(m => opt(m.id, `${T(m.name)}${m.rate ? ` (${baht(m.rate)}/${t('cm²', 'ตร.ซม.')})` : ''}`, m.id === e.material)).join('')}</select></label>
                ${e.material !== 'none' ? `<span class="boxai-price">${baht(boxCost(e.material, e.size))}</span>` : ''}
            </div>
            ${sizeRow}
            ${notesHtml(r.kit.notes || [])}
            ${overNote(total, r.s)}
            <div class="boxai-actions">
                <button type="button" class="boxai-btn ghost" data-adv="kit"><i class="fas fa-up-right-from-square"></i> ${esc(t('Open in the full builder', 'เปิดในหน้าปรับแต่งเต็ม'))}</button>
                <button type="button" class="boxai-btn" data-adv="cart-kit"><i class="fas fa-bag-shopping"></i> ${esc(t('Add to cart', 'ใส่ตะกร้า'))} · ${baht(total)}</button>
            </div></div>`;
    }

    // ---- the Custom (05) design you can change right here: same lists as the big form
    const CUSTOM_KEYS = { microcontroller: L('Controller', 'บอร์ดควบคุม'), watering: L('Water', 'ระบบรดน้ำ'), light: L('Light', 'ไฟ'), temperature: L('Temperature', 'อุณหภูมิ'), mist: L('Misting', 'พ่นหมอก'), camera: L('Camera', 'กล้อง'), ai: L('AI', 'AI'), boxMaterial: L('Enclosure', 'วัสดุกล่อง') };
    function customEditor(turn) {
        const e = turn.edit, r = turn.r;
        const total = customTotal(e);
        const board = e.f.microcontroller || 0, arduino = board >= 1 && board <= 3;
        const rows = Object.keys(CUSTOM_KEYS).map(k => {
            const sel = customSel(k);
            if (!sel) return '';
            const options = [...sel.options].map((o, i) => opt(i, o.textContent.trim(), (e.f[k] || 0) === i, k === 'ai' && ((i > 0 && board === 0) || (i === 3 && arduino)))).join('');
            const why = e.why[k] ? `<small>${esc(T(e.why[k]))}</small>` : '';
            return `<div class="boxai-row"><label class="boxai-field">${esc(T(CUSTOM_KEYS[k]))}<select data-ed="cf" data-k="${k}">${options}</select></label>${why}</div>`;
        }).join('');
        const sizeRow = e.f.boxMaterial ? `<div class="boxai-dims">${[t('W', 'กว้าง'), t('L', 'ยาว'), t('H', 'สูง')].map((lab, i) => `<label>${esc(lab)}<input type="number" min="1" max="1000" step="1" data-ed="dim" data-i="${i}" value="${e.size[i]}"></label>`).join('')}<span>${esc(t('cm', 'ซม.'))}</span></div>` : '';
        return `<div class="boxai-card">
            <span class="boxai-tag"><i class="fas fa-screwdriver-wrench"></i> ${esc(r.cat ? t('Custom design (05)', 'ออกแบบเฉพาะ (05 Custom)') : t('No box or category matched — custom design (05)', 'ไม่ตรงกับกล่องหรือหมวดไหน จึงออกแบบให้ใหม่ (05 Custom)'))}</span>
            <h3>${esc(t('Every part, picked for you — change anything', 'เลือกให้ครบทุกช่อง — ปรับได้ทุกช่อง'))} <span>${baht(total)}</span></h3>
            ${rows}${sizeRow}
            ${notesHtml(r.form.notes || [])}
            ${overNote(total, r.s)}
            <div class="boxai-actions">
                <button type="button" class="boxai-btn ghost" data-adv="custom"><i class="fas fa-up-right-from-square"></i> ${esc(t('Open the Custom form', 'เปิดฟอร์ม Custom'))}</button>
                <button type="button" class="boxai-btn" data-adv="order-custom"><i class="fas fa-bag-shopping"></i> ${esc(t('Order this', 'สั่งชุดนี้'))} · ${baht(total)}</button>
            </div></div>`;
    }

    function onEdit(e) {
        const x = e.target;
        if (!x.dataset || !x.dataset.ed) return;
        const node = x.closest('[data-turn]');
        const turn = node && turns.find(tt => String(tt.id) === node.dataset.turn);
        if (!turn || !turn.edit) return;
        const ed = turn.edit, kind = x.dataset.ed;
        let note = null;
        if (turn.mode === 'kit') {
            if (kind === 'controller') {
                ed.controller = x.value;
                if ((x.value === 'nano' || x.value === 'uno') && ed.parts.has('ai3')) { ed.parts.delete('ai3'); ed.parts.add('ai2'); note = t('Arduino can\'t run AI Model 3 — switched to Model 2', 'Arduino ใช้ AI Model 3 ไม่ได้ จึงเปลี่ยนเป็น Model 2'); }
            } else if (kind === 'part') {
                if (!x.checked) ed.parts.delete(x.value);
            } else if (kind === 'add' && x.value) {
                if (/^ai\d$/.test(x.value)) [...ed.parts].filter(id => /^ai\d$/.test(id)).forEach(id => ed.parts.delete(id)); // one AI model at a time
                ed.parts.add(x.value);
            } else if (kind === 'material') ed.material = x.value;
            else if (kind === 'dim') { ed.size[+x.dataset.i] = Math.min(400, Math.max(10, parseInt(x.value, 10) || 10)); if (e.type === 'input') return refreshTotal(turn, node); }
        } else if (turn.mode === 'custom') {
            if (kind === 'cf') {
                ed.f[x.dataset.k] = +x.value;
                delete ed.why[x.dataset.k];
                const b = ed.f.microcontroller || 0;
                if (b === 0 && ed.f.ai) { ed.f.ai = 0; note = t('Pick a controller first to use AI', 'เลือกบอร์ดก่อน จึงจะใช้ AI ได้'); }
                if (b >= 1 && b <= 3 && ed.f.ai === 3) { ed.f.ai = 2; note = t('Arduino can\'t run AI Model 3 — switched to Model 2', 'Arduino ใช้ AI Model 3 ไม่ได้ จึงเปลี่ยนเป็น Model 2'); }
            } else if (kind === 'dim') { ed.size[+x.dataset.i] = Math.min(1000, Math.max(1, parseInt(x.value, 10) || 1)); if (e.type === 'input') return refreshTotal(turn, node); }
        }
        if (note && typeof showToast === 'function') showToast(note);
        const keep = thread.scrollTop;
        renderTurn(turn);
        thread.scrollTop = keep;
    }
    // while typing a size, only update the numbers (re-drawing would steal the cursor)
    function refreshTotal(turn, node) {
        const total = turnTotal(turn);
        const h = node.querySelector('.boxai-card h3 span');
        if (h) h.textContent = baht(total);
        const b = node.querySelector('[data-adv="cart-kit"], [data-adv="order-custom"]');
        if (b) b.lastChild.textContent = ` · ${baht(total)}`;
        const price = node.querySelector('.boxai-price');
        if (price && turn.mode === 'kit') price.textContent = baht(boxCost(turn.edit.material, turn.edit.size));
    }

    // ---------------------------------------------------------------- actions
    function ensureMain() {
        const main = document.getElementById('main-page');
        if (main && !main.classList.contains('active') && typeof showMainPage === 'function') showMainPage();
    }
    const presetOf = ed => ({ controller: ed.controller, parts: [...ed.parts], material: ed.material, size: [...ed.size] });

    function openKit(turn) {
        const C = cat(), ed = turn.edit;
        ensureMain();
        close();
        window.openUseCase(ed.cat, { kit: { label: C.UC[ed.cat].short, preset: presetOf(ed), why: ed.why, name: L('Your kit from the AI', 'ชุดที่ AI ออกแบบให้') } });
    }

    function addKitToCart(turn) {
        const C = cat(), ed = turn.edit;
        if (!ed.parts.size) { if (typeof showToast === 'function') showToast(t('Pick at least one part', 'เลือกชิ้นส่วนอย่างน้อย 1 ชิ้น')); return; }
        if (window.__ucCart) window.__ucCart.addPreset(ed.cat, presetOf(ed), ed.why, C.UC[ed.cat].short);
    }

    function openBox(turn) {
        const r = turn.r;
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

    // fill the big Custom form with this design (and optionally go straight to ordering)
    function openCustom(turn, andOrder) {
        const ed = turn.edit;
        ensureMain();
        close();
        if (typeof selectUserType === 'function') selectUserType('custom');
        document.querySelectorAll('#customConfigForm .boxai-why').forEach(n => n.remove());
        Object.keys(CUSTOM_KEYS).forEach(k => {
            const sel = document.getElementById(k);
            if (!sel) return;
            if (k === 'ai') sel.disabled = false;
            sel.selectedIndex = ed.f[k] || 0;
            if (ed.why[k]) {
                const why = document.createElement('small');
                why.className = 'boxai-why';
                why.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> ${esc(T(ed.why[k]))}`;
                sel.insertAdjacentElement('afterend', why);
            }
        });
        ['boxWidth', 'boxLength', 'boxHeight'].forEach((id, i) => { const inp = document.getElementById(id); if (inp) inp.value = ed.f.boxMaterial ? ed.size[i] : ''; });
        if (typeof calculateCustomPrice === 'function') calculateCustomPrice();
        if (andOrder && typeof showCustomOrderForm === 'function') showCustomOrderForm();
    }

    function onClick(e) {
        const b = e.target.closest('[data-adv]');
        if (!b) return;
        const a = b.dataset.adv;
        const node = b.closest('[data-turn]');
        const turn = node ? turns.find(tt => String(tt.id) === node.dataset.turn) : null;
        if (a === 'close') close();
        else if (a === 'reset') { turns.length = 0; renderIntro(); el.querySelector('#advisorText').focus(); }
        else if (a === 'example') send(T(EXAMPLES[+b.dataset.i]));
        else if (a === 'follow') send(T(FOLLOW_UPS[+b.dataset.i]));
        else if (a === 'answer') send(b.dataset.add);
        else if (a === 'force' && turn) {
            turn.r = decide(turn.r.s, b.dataset.cat);
            setupEdit(turn);
            renderTurn(turn);
        }
        else if (a === 'tweak' && turn) { turn.mode = 'kit'; renderTurn(turn); }
        else if (a === 'kit' && turn) openKit(turn);
        else if (a === 'cart-kit' && turn) addKitToCart(turn);
        else if (a === 'box' && turn) openBox(turn);
        else if (a === 'cart-box' && turn && window.__ucCart) window.__ucCart.addOption(turn.r.cat, turn.r.box.id);
        else if (a === 'custom' && turn) openCustom(turn, false);
        else if (a === 'order-custom' && turn) openCustom(turn, true);
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
