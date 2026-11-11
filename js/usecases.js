// ============== Use-case pages + "start from a real problem" ==============
// Each use case shows recommended boxes (with real photos), a case from our field work, and a
// "customize" option that starts from our recommended parts. Every recommended part carries a
// one-line reason. Farmers answer a short survey first; if the result is over their budget we
// offer an Essential kit (only what fixes their problems) next to the Full kit.
//
// Text is bilingual: { en, th }. T(x) picks the current language (js/i18n.js).
// Prices are in Thai baht and must match public.price_list (the server re-prices every order).
// NOTE: product specs, prices and the field-case texts are drafts — the team should check them.

(function () {
    const L = (en, th) => ({ en, th });
    const money = v => baht(v);
    const round2 = v => Math.round(v * 100) / 100;
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const $ = (sel, root = document) => root.querySelector(sel);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- catalogue for the preset configurator (baht) ----------
    const CONTROLLERS = [
        { id: 'nano', name: L('Arduino Nano', 'Arduino Nano'), price: 105, why: L('Simple, low-cost board that runs the basics', 'บอร์ดราคาประหยัด ทำงานพื้นฐานได้ครบ') },
        { id: 'uno', name: L('Arduino Uno', 'Arduino Uno'), price: 125, why: L('Reliable board with room for more sensors', 'บอร์ดเสถียร ต่อเซนเซอร์เพิ่มได้') },
        { id: 'esp32', name: L('ESP32 (Wi-Fi app control)', 'ESP32 (ควบคุมผ่านแอปด้วย Wi-Fi)'), price: 175, why: L('Lets you check and control it from your phone', 'ดูสถานะและสั่งงานผ่านมือถือได้') },
        { id: 'pi4', name: L('Raspberry Pi 4 (AI camera ready)', 'Raspberry Pi 4 (รองรับกล้อง AI)'), price: 1750, why: L('Powerful enough to run the AI camera', 'แรงพอสำหรับประมวลผลกล้อง AI') },
    ];
    const GROUPS = { Light: L('Light', 'ไฟ'), Water: L('Water', 'น้ำ'), Climate: L('Climate', 'อากาศ'), Sensors: L('Sensors', 'เซนเซอร์'), Camera: L('Camera', 'กล้อง') };
    const PARTS = [
        { id: 'ledRB', group: 'Light', price: 210, name: L('Red + blue LED grow strips', 'ไฟ LED ปลูกพืชแดง-น้ำเงิน'), why: L('Gives plants light when the sun isn\'t enough', 'ให้แสงเมื่อแดดไม่พอ') },
        { id: 'ledFull', group: 'Light', price: 385, name: L('Dimmable full-spectrum LED panel', 'แผงไฟ LED ฟูลสเปกตรัม ปรับความสว่างได้'), why: L('Replaces missing sunlight with the full spectrum plants use', 'ทดแทนแสงแดดด้วยแสงครบสเปกตรัมที่พืชใช้') },
        { id: 'pump', group: 'Water', price: 175, name: L('Automatic watering pump + hose', 'ปั๊มรดน้ำอัตโนมัติ + สายยาง'), why: L('Waters for you when the soil gets dry', 'รดน้ำให้เองเมื่อดินแห้ง') },
        { id: 'mist', group: 'Water', price: 420, name: L('Misting system (2 nozzles + pump)', 'ระบบพ่นหมอก (2 หัว + ปั๊ม)'), why: L('Raises humidity and cools the leaves', 'เพิ่มความชื้นและช่วยลดความร้อนที่ใบ') },
        { id: 'fert', group: 'Water', price: 245, name: L('Fertilizer doser', 'ชุดจ่ายปุ๋ยอัตโนมัติ'), why: L('Feeds plants on a schedule', 'ให้ปุ๋ยตามเวลาโดยอัตโนมัติ') },
        { id: 'hydro', group: 'Water', price: 315, name: L('Hydroponic reservoir + air pump', 'ถังไฮโดรโปนิกส์ + ปั๊มลม'), why: L('Grows plants in nutrient water instead of soil', 'ปลูกในน้ำผสมธาตุอาหารแทนดิน') },
        { id: 'fan', group: 'Climate', price: 210, name: L('Exhaust fan', 'พัดลมระบายอากาศ'), why: L('Pushes hot, stale air out', 'ดันลมร้อนและอากาศอับออก') },
        { id: 'cooler', group: 'Climate', price: 350, name: L('Cooling fan', 'พัดลมระบายความร้อน'), why: L('Brings the temperature down on hot days', 'ช่วยลดอุณหภูมิในวันที่ร้อน') },
        { id: 'heater', group: 'Climate', price: 315, name: L('Heater', 'ฮีตเตอร์'), why: L('Keeps plants warm on cold nights', 'ให้ความอบอุ่นในคืนที่หนาว') },
        { id: 'soil', group: 'Sensors', price: 55, name: L('Soil moisture sensor', 'เซนเซอร์ความชื้นในดิน'), why: L('Tells the pump when to water, so roots don\'t drown', 'บอกปั๊มว่าเมื่อไรต้องรดน้ำ รากจึงไม่แฉะ') },
        { id: 'dht', group: 'Sensors', price: 90, name: L('Temperature & humidity sensor', 'เซนเซอร์อุณหภูมิและความชื้นอากาศ'), why: L('Watches heat and humidity so fans and misting start at the right time', 'ดูอุณหภูมิและความชื้น เพื่อสั่งพัดลมและหมอกให้ทำงานถูกเวลา') },
        { id: 'lux', group: 'Sensors', price: 55, name: L('Light sensor', 'เซนเซอร์วัดแสง'), why: L('Turns the lights on only when it gets dim', 'เปิดไฟเฉพาะตอนแสงน้อย') },
        { id: 'level', group: 'Sensors', price: 55, name: L('Water level sensor', 'เซนเซอร์ระดับน้ำ'), why: L('Warns you before the tank runs dry', 'เตือนก่อนน้ำในถังหมด') },
        { id: 'ph', group: 'Sensors', price: 280, name: L('pH sensor', 'เซนเซอร์วัดค่า pH'), why: L('Keeps the water in a range roots can use', 'คุมค่าน้ำให้อยู่ในช่วงที่รากดูดซึมได้') },
        { id: 'npk', group: 'Sensors', price: 560, name: L('NPK soil nutrient sensor', 'เซนเซอร์ธาตุอาหารในดิน (NPK)'), why: L('Shows which nutrients the soil is missing', 'บอกว่าดินขาดธาตุอาหารอะไร') },
        { id: 'cam', group: 'Camera', price: 210, name: L('Camera (ESP32-CAM)', 'กล้อง (ESP32-CAM)'), why: L('Lets you see your plants from your phone', 'ดูต้นไม้ผ่านมือถือได้') },
        { id: 'camAI', group: 'Camera', price: 490, name: L('Camera + AI plant disease detection', 'กล้อง + AI ตรวจโรคพืช'), why: L('Spots leaf disease early', 'ตรวจเจอโรคที่ใบได้ตั้งแต่ระยะแรก') },
    ];
    const MATERIALS = [
        { id: 'none', name: L('No enclosure (open plot)', 'ไม่มีกล่อง (แปลงเปิด)'), rate: 0 },
        { id: 'plastic', name: L('Plastic', 'พลาสติก'), rate: 0.0525 },
        { id: 'acrylic', name: L('Acrylic', 'อะคริลิก'), rate: 0.105 },
        { id: 'glass', name: L('Glass', 'กระจก'), rate: 0.14 },
    ];
    const part = id => PARTS.find(p => p.id === id);

    // ---------- use cases ----------
    const UC = {
        disaster: {
            num: '01', eyebrow: L('Relief', 'ช่วยเหลือผู้ประสบภัย'), title: L('For Disaster Victims', 'สำหรับผู้ประสบภัย'), short: 'Relief',
            shortName: L('relief', 'ผู้ประสบภัย'),
            cover: { img: 'images/usecases/disaster-cover.webp' },
            lead: L('Boxes that families can set up in minutes after a flood or storm, with the pump, sensors and power supply already wired. Pick the size that fits your household.',
                'กล่องที่ครอบครัวติดตั้งเองได้ในไม่กี่นาทีหลังน้ำท่วมหรือพายุ ต่อปั๊ม เซนเซอร์ และไฟเลี้ยงไว้ให้แล้ว เลือกขนาดตามจำนวนคนในบ้าน'),
            optionsTitle: L('Choose by household size', 'เลือกตามจำนวนคนในบ้าน'),
            options: [
                {
                    id: 'relief-s', name: L('Relief Box S', 'Relief Box S'), tag: L('Household of 2–4', 'สำหรับ 2–4 คน'), price: 630, controller: 'Arduino Nano',
                    img: 'images/usecases/disaster-small.webp', alt: L('Small clear storage box with two potted plants, a power supply and a controller box on the lid', 'กล่องใสขนาดเล็กมีกระถาง 2 ใบ พร้อมแหล่งจ่ายไฟและกล่องควบคุมบนฝา'),
                    features: [L('Clear storage box with lid', 'กล่องใสมีฝาปิด'), L('Holds 2 pots', 'ใส่กระถางได้ 2 ใบ'), L('Automatic watering pump', 'ปั๊มรดน้ำอัตโนมัติ'), L('Soil moisture sensor', 'เซนเซอร์ความชื้นในดิน'), L('Plug-in power supply', 'อะแดปเตอร์เสียบปลั๊ก')],
                },
                {
                    id: 'relief-l', name: L('Relief Box L', 'Relief Box L'), tag: L('Household of 4+', 'สำหรับ 4 คนขึ้นไป'), price: 1190, controller: 'ESP32',
                    img: 'images/usecases/disaster-large.webp', alt: L('Large clear storage box with several potted plants and a misting pipe along the top', 'กล่องใสขนาดใหญ่มีกระถางหลายใบและท่อพ่นหมอกด้านบน'),
                    features: [L('Large clear storage box', 'กล่องใสขนาดใหญ่'), L('Holds 4–6 pots', 'ใส่กระถางได้ 4–6 ใบ'), L('Misting pipe with 3 nozzles', 'ท่อพ่นหมอก 3 หัว'), L('Temperature & humidity sensor', 'เซนเซอร์อุณหภูมิและความชื้น'), L('Wi-Fi alerts to your phone', 'แจ้งเตือนเข้ามือถือผ่าน Wi-Fi')],
                },
            ],
            field: {
                img: 'images/usecases/disaster-large.webp', title: L('Relief box', 'กล่องสำหรับผู้ประสบภัย'),
                problem: L('Families recovering from a flood need fresh food quickly, with little time to look after plants.', 'ครอบครัวที่เพิ่งผ่านน้ำท่วมต้องการผักสดเร็ว แต่ไม่มีเวลาดูแลต้นไม้มากนัก'),
                installed: L('A large clear storage box with 4–6 pots, a misting pipe with 3 nozzles, a temperature & humidity sensor and Wi-Fi alerts.', 'กล่องใสขนาดใหญ่ใส่กระถาง 4–6 ใบ ท่อพ่นหมอก 3 หัว เซนเซอร์อุณหภูมิและความชื้น และแจ้งเตือนผ่าน Wi-Fi'),
                runs: L('Misting runs when the air in the box gets too dry, and a phone alert comes when it needs water.', 'ระบบพ่นหมอกทำงานเมื่ออากาศในกล่องแห้งเกินไป และมีแจ้งเตือนเข้ามือถือเมื่อต้องเติมน้ำ'),
            },
            preset: { controller: 'nano', parts: ['ledRB', 'pump', 'soil', 'dht'], material: 'plastic', size: [45, 32, 30] },
        },
        farmer: {
            num: '02', eyebrow: L('Agriculture', 'เกษตรกรรม'), title: L('For Farmers', 'สำหรับเกษตรกร'), short: 'Farm',
            shortName: L('farm', 'ฟาร์ม'),
            cover: { video: 'videos/farmer.mp4', poster: 'images/usecases/farmer-poster.webp' },
            lead: L('Tell us about your farm and we will match the system to your plot, the way you grow, and your budget.',
                'เล่าเรื่องฟาร์มของคุณให้เราฟัง แล้วเราจะจับคู่ระบบให้เหมาะกับพื้นที่ วิธีปลูก และงบประมาณของคุณ'),
            optionsTitle: L('Matched to your farm', 'จับคู่ให้เหมาะกับฟาร์มของคุณ'),
            survey: true,
            options: [
                {
                    id: 'farmer-vision', name: L('Farmer Vision', 'Farmer Vision'), tag: L('Soil & hydroponic plots', 'แปลงดินและไฮโดรโปนิกส์'), price: 1925, priceNote: L('from', 'เริ่ม'), controller: 'ESP32 Dual Core',
                    img: 'images/usecases/farmer-vision.webp', alt: L('Hydroponic growing room lit by pink LED grow lights', 'ห้องปลูกไฮโดรโปนิกส์ที่เปิดไฟ LED ปลูกพืชสีชมพู'),
                    features: [L('Red + blue LED grow lights', 'ไฟ LED ปลูกพืชแดง-น้ำเงิน'), L('Automatic water & fertilizer', 'รดน้ำและให้ปุ๋ยอัตโนมัติ'), L('Misting for humidity', 'พ่นหมอกเพิ่มความชื้น'), L('Camera with AI plant disease detection', 'กล้อง AI ตรวจโรคพืช'), L('Multi-zone control + Line/email reports', 'ควบคุมหลายโซน + รายงานทาง Line/อีเมล')],
                },
            ],
            field: {
                img: 'images/usecases/farmer-vision.webp', title: L('Hydroponic grow room', 'ห้องปลูกไฮโดรโปนิกส์'),
                problem: L('Plants grown indoors weren\'t getting enough light, and the room got hot in the afternoon.', 'พืชที่ปลูกในร่มได้แสงไม่พอ และห้องร้อนในช่วงบ่าย'),
                installed: L('Red + blue LED grow lights, misting sprinklers and an automatic water pump on an ESP32 controller.', 'ไฟ LED ปลูกพืชแดง-น้ำเงิน สปริงเกอร์พ่นหมอก และปั๊มน้ำอัตโนมัติ ควบคุมด้วย ESP32'),
                runs: L('The lights follow a daily schedule, and the sprinklers start when the room goes above 30°C.', 'ไฟเปิด-ปิดตามตารางเวลาทุกวัน และสปริงเกอร์ทำงานเมื่อห้องร้อนเกิน 30°C'),
            },
            preset: { controller: 'esp32', parts: ['ledFull', 'pump', 'fert', 'soil', 'dht'], material: 'none', size: [100, 100, 60] },
        },
        household: {
            num: '03', eyebrow: L('Home', 'บ้าน'), title: L('For Households', 'สำหรับบ้าน'), short: 'Home',
            shortName: L('home', 'บ้าน'),
            cover: { video: 'videos/household.mp4', poster: 'images/usecases/household-poster.webp' },
            lead: L('A grow tent for your home that lights, waters and mists your plants by itself.', 'เต็นท์ปลูกพืชสำหรับบ้าน ที่เปิดไฟ รดน้ำ และพ่นหมอกให้ต้นไม้เอง'),
            optionsTitle: L('Our home box', 'กล่องสำหรับบ้านของเรา'),
            options: [
                {
                    id: 'home-tent', name: L('Home Grow Tent', 'Home Grow Tent'), tag: L('Balcony, porch or living room', 'ระเบียง หน้าบ้าน หรือห้องนั่งเล่น'), price: 840, controller: 'ESP32',
                    img: 'images/usecases/household-tent.webp', alt: L('PVC frame grow tent with mesh walls and a pink LED light above a potted plant', 'เต็นท์โครง PVC ผนังตาข่าย มีไฟ LED สีชมพูเหนือกระถางต้นไม้'),
                    features: [L('PVC frame with mesh walls', 'โครง PVC ผนังตาข่าย'), L('Clip-on LED grow light', 'ไฟ LED ปลูกพืชแบบหนีบ'), L('Misting nozzles on both sides', 'หัวพ่นหมอกสองด้าน'), L('Water pump + reservoir', 'ปั๊มน้ำ + ถังเก็บน้ำ'), L('App control over Wi-Fi', 'ควบคุมผ่านแอปด้วย Wi-Fi')],
                },
            ],
            field: {
                img: 'images/usecases/household-tent.webp', title: L('Home grow tent', 'เต็นท์ปลูกผักในบ้าน'),
                problem: L('The family wanted fresh vegetables at home but had no garden.', 'ครอบครัวอยากมีผักสดกินเองที่บ้าน แต่ไม่มีพื้นที่สวน'),
                installed: L('A PVC-frame tent with mesh walls, a clip-on LED light, misting on both sides and a water pump, run by ESP32.', 'เต็นท์โครง PVC ผนังตาข่าย ไฟ LED แบบหนีบ พ่นหมอกสองด้าน และปั๊มน้ำ ควบคุมด้วย ESP32'),
                runs: L('The pump runs when the soil sensor reads dry, and misting runs when the air inside gets dry.', 'ปั๊มทำงานเมื่อเซนเซอร์บอกว่าดินแห้ง และพ่นหมอกเมื่ออากาศในเต็นท์แห้ง'),
            },
            preset: { controller: 'esp32', parts: ['ledRB', 'mist', 'pump', 'soil', 'dht'], material: 'plastic', size: [60, 60, 60] },
        },
        condo: {
            num: '04', eyebrow: L('Small spaces', 'พื้นที่เล็ก'), title: L('For Condominiums', 'สำหรับคอนโด'), short: 'Condo',
            shortName: L('condo', 'คอนโด'),
            cover: { img: 'images/build-side.webp' },
            lead: L('Compact, quiet boxes for small rooms and balconies. Add the sensors you need to each kit.', 'กล่องกะทัดรัดและเงียบ สำหรับห้องเล็กและระเบียง เพิ่มเซนเซอร์ที่ต้องการได้ทุกชุด'),
            optionsTitle: L('Kits for small spaces', 'ชุดสำหรับพื้นที่เล็ก'),
            legacyProducts: [5, 2, 1],
            preset: { controller: 'esp32', parts: ['ledFull', 'pump', 'soil', 'dht', 'fan'], material: 'acrylic', size: [40, 30, 50] },
        },
        commercial: {
            num: '05', eyebrow: L('Premium crops', 'พืชมูลค่าสูง'), title: L('Commercial & High-Value Crops', 'พืชเศรษฐกิจมูลค่าสูง'), short: 'Commercial',
            shortName: L('commercial', 'พืชมูลค่าสูง'),
            cover: { img: 'images/usecases/commercial-hydro.webp' },
            lead: L('Precision chambers for plants worth protecting. Every input is measured, controlled and logged.', 'ห้องปลูกแม่นยำสำหรับพืชที่มีมูลค่า ทุกค่าถูกวัด ควบคุม และบันทึก'),
            optionsTitle: L('Our innovations', 'นวัตกรรมของเรา'),
            options: [
                {
                    id: 'hydro-cube', name: L('Hydro Cube', 'Hydro Cube'), tag: L('Hydroponic chamber', 'ห้องปลูกไฮโดรโปนิกส์'), price: 2380, controller: 'ESP32',
                    img: 'images/usecases/commercial-hydro.webp', alt: L('Acrylic chamber with red and blue LED strips, a plant on a shelf and a water tank below', 'ห้องอะคริลิกมีไฟ LED แดงและน้ำเงิน ต้นไม้บนชั้น และถังน้ำด้านล่าง'),
                    features: [L('Acrylic chamber with built-in water tank', 'ห้องอะคริลิกพร้อมถังน้ำในตัว'), L('Hydroponic reservoir + pump', 'ถังไฮโดรโปนิกส์ + ปั๊ม'), L('Red + blue LED strips', 'ไฟ LED แดง-น้ำเงิน'), L('Cooling fan & misting', 'พัดลมระบายความร้อนและพ่นหมอก'), L('pH & water-level sensors', 'เซนเซอร์ pH และระดับน้ำ')],
                },
                {
                    id: 'v4-pro', name: L('Smart Plant Box V4', 'Smart Plant Box V4'), tag: L('Full climate control', 'ควบคุมสภาพอากาศครบ'), price: 1680, controller: 'Raspberry Pi 4',
                    img: 'images/build-front.webp', alt: L('Smart Plant Box V4 with its pink LED canopy switched on', 'Smart Plant Box V4 เปิดหลังคาไฟ LED สีชมพู'),
                    features: [L('Acrylic chamber on aluminium feet', 'ห้องอะคริลิกบนขาอะลูมิเนียม'), L('Full red + blue LED canopy', 'หลังคาไฟ LED แดง-น้ำเงินเต็มแผง'), L('Fans, misting & automatic pump', 'พัดลม พ่นหมอก และปั๊มอัตโนมัติ'), L('Camera + AI plant health analysis', 'กล้อง + AI วิเคราะห์สุขภาพพืช'), L('Cloud data & app control', 'เก็บข้อมูลบนคลาวด์และควบคุมผ่านแอป')],
                },
            ],
            field: {
                img: 'images/usecases/commercial-hydro.webp', title: L('Hydro Cube chamber', 'ห้องปลูก Hydro Cube'),
                problem: L('High-value plants need steady water and nutrients every day.', 'พืชมูลค่าสูงต้องได้น้ำและธาตุอาหารสม่ำเสมอทุกวัน'),
                installed: L('An acrylic chamber with a built-in tank, a hydroponic pump, red + blue LEDs, a cooling fan, and pH and water-level sensors.', 'ห้องอะคริลิกพร้อมถังในตัว ปั๊มไฮโดรโปนิกส์ ไฟ LED แดง-น้ำเงิน พัดลมระบายความร้อน และเซนเซอร์ pH กับระดับน้ำ'),
                runs: L('The pump circulates nutrient water on a schedule, and you get an alert if the tank runs low or the pH drifts.', 'ปั๊มหมุนเวียนน้ำผสมธาตุอาหารตามเวลา และแจ้งเตือนเมื่อน้ำในถังเหลือน้อยหรือค่า pH เปลี่ยน'),
            },
            preset: { controller: 'pi4', parts: ['ledRB', 'hydro', 'ph', 'level', 'dht', 'cooler', 'mist', 'camAI'], material: 'acrylic', size: [40, 32, 56] },
        },
    };

    // ---------- homepage: "start from a real problem" ----------
    const KITS = [
        {
            id: 'seedling', icon: 'fa-seedling', uc: 'farmer', label: 'Seedling Light',
            problem: L('Seedlings grow tall and thin — not enough light', 'ต้นกล้ายืด เพราะแสงไม่พอ'),
            name: L('Seedling light kit', 'ชุดไฟสำหรับต้นกล้า'),
            preset: { controller: 'esp32', parts: ['ledFull', 'lux', 'dht'], material: 'acrylic', size: [60, 40, 40] },
            why: {
                ledFull: L('Recommended because seedlings stretch toward weak light — a full-spectrum panel keeps them short and sturdy', 'แนะนำเพราะต้นกล้ายืดหาแสงที่อ่อนเกินไป ไฟฟูลสเปกตรัมช่วยให้ต้นเตี้ยและแข็งแรง'),
                lux: L('Turns the light on only when daylight drops', 'เปิดไฟเฉพาะตอนแสงธรรมชาติลดลง'),
                dht: L('Checks the lamp isn\'t overheating the seedlings', 'คอยดูไม่ให้ไฟทำให้ต้นกล้าร้อนเกินไป'),
                esp32: L('Set the light hours from your phone', 'ตั้งเวลาเปิด-ปิดไฟผ่านมือถือได้'),
                material: L('A clear box keeps the light on the seedlings', 'กล่องใสช่วยเก็บแสงไว้ที่ต้นกล้า'),
            },
        },
        {
            id: 'hot', icon: 'fa-temperature-high', uc: 'farmer', label: 'Afternoon Cooling',
            problem: L('The greenhouse gets too hot in the afternoon', 'โรงเรือนร้อนช่วงบ่าย'),
            name: L('Afternoon cooling kit', 'ชุดลดความร้อนช่วงบ่าย'),
            preset: { controller: 'esp32', parts: ['dht', 'fan', 'mist'], material: 'none', size: [100, 100, 60] },
            why: {
                dht: L('Measures the heat so cooling starts before plants wilt', 'วัดความร้อน เพื่อเริ่มลดอุณหภูมิก่อนต้นไม้เหี่ยว'),
                fan: L('Pushes trapped hot air out of the greenhouse', 'ดันลมร้อนที่สะสมออกจากโรงเรือน'),
                mist: L('Recommended because you said it gets hot — the mist cools the air when the temperature climbs', 'แนะนำเพราะคุณบอกว่าร้อน ละอองหมอกช่วยลดอุณหภูมิเมื่ออากาศร้อนขึ้น'),
                esp32: L('Sends a phone alert when it gets too hot', 'แจ้งเตือนเข้ามือถือเมื่อร้อนเกินไป'),
            },
        },
        {
            id: 'away', icon: 'fa-droplet', uc: 'household', label: 'Auto Water',
            problem: L('My plants dry out when I\'m away', 'ไม่อยู่บ้านแล้วต้นไม้แห้ง'),
            name: L('Away-from-home watering kit', 'ชุดรดน้ำตอนไม่อยู่บ้าน'),
            preset: { controller: 'esp32', parts: ['pump', 'soil', 'level'], material: 'none', size: [60, 60, 60] },
            why: {
                pump: L('Waters your pots while you\'re away', 'รดน้ำให้กระถางตอนคุณไม่อยู่'),
                soil: L('Starts the pump only when the soil is dry, so nothing drowns', 'สั่งปั๊มเฉพาะตอนดินแห้ง ต้นไม้จึงไม่แฉะเกินไป'),
                level: L('Warns your phone before the water tank runs out', 'เตือนเข้ามือถือก่อนน้ำในถังหมด'),
                esp32: L('Check and water from anywhere over Wi-Fi', 'ดูสถานะและสั่งรดน้ำจากที่ไหนก็ได้ผ่าน Wi-Fi'),
            },
        },
        {
            id: 'disease', icon: 'fa-bug', uc: 'farmer', label: 'Leaf Health',
            problem: L('Leaves get spots and disease', 'ใบมีจุด เป็นโรค'),
            name: L('Leaf health kit', 'ชุดตรวจสุขภาพใบ'),
            preset: { controller: 'pi4', parts: ['camAI', 'dht'], material: 'none', size: [100, 100, 60] },
            why: {
                camAI: L('Photographs the leaves and flags disease early', 'ถ่ายภาพใบและแจ้งเตือนเมื่อพบโรคตั้งแต่ระยะแรก'),
                dht: L('High humidity spreads fungus — this tells you when the risk is high', 'ความชื้นสูงทำให้เชื้อราลาม เซนเซอร์นี้บอกเมื่อมีความเสี่ยง'),
                pi4: L('Runs the AI that reads the photos', 'ประมวลผล AI ที่อ่านภาพถ่าย'),
            },
        },
        {
            id: 'flood', icon: 'fa-house-flood-water', uc: 'disaster', label: 'Relief',
            problem: L('After a flood, my family needs fresh food fast', 'หลังน้ำท่วม ครอบครัวต้องการผักกินเร็ว'),
            name: L('Relief starter kit', 'ชุดเริ่มต้นสำหรับผู้ประสบภัย'),
            preset: { controller: 'nano', parts: ['ledRB', 'pump', 'soil', 'dht'], material: 'plastic', size: [45, 32, 30] },
            why: {
                ledRB: L('Grows food even under a roof or in a shelter', 'ปลูกผักได้แม้อยู่ใต้หลังคาหรือในศูนย์พักพิง'),
                pump: L('Waters automatically, so you can focus on recovery', 'รดน้ำเอง คุณจึงมีเวลาไปฟื้นฟูบ้าน'),
                soil: L('Waters only when needed — saves clean water', 'รดเฉพาะตอนจำเป็น ประหยัดน้ำสะอาด'),
                dht: L('Warns if the box gets too hot in the sun', 'เตือนเมื่อกล่องร้อนเกินไปกลางแดด'),
                material: L('A light plastic box that\'s easy to move', 'กล่องพลาสติกน้ำหนักเบา ย้ายง่าย'),
            },
        },
        {
            id: 'condo', icon: 'fa-building', uc: 'condo', label: 'Condo',
            problem: L('My condo gets very little sun', 'คอนโดแดดน้อย'),
            name: L('Condo grow kit', 'ชุดปลูกในคอนโด'),
            preset: { controller: 'esp32', parts: ['ledFull', 'pump', 'soil', 'dht', 'fan'], material: 'acrylic', size: [40, 30, 50] },
            why: {
                ledFull: L('Recommended because your room gets little sun — this replaces it', 'แนะนำเพราะห้องได้แดดน้อย ไฟนี้ทดแทนแสงแดดได้'),
                fan: L('Quiet air-flow stops mould in a closed room', 'ลมเบา ๆ ช่วยกันเชื้อราในห้องปิด'),
            },
        },
    ];

    // Farmer survey choices, the parts each answer recommends, and why
    const PROBLEMS = [
        { id: 'light', label: L('Not enough light (seedlings stretch)', 'แสงไม่พอ (ต้นกล้ายืด)'), parts: ['ledFull', 'lux'], because: L('you said your seedlings don\'t get enough light', 'คุณระบุว่าต้นกล้าได้รับแสงไม่พอ') },
        { id: 'heat', label: L('Too hot', 'ร้อนเกินไป'), parts: ['fan', 'cooler', 'dht'], because: L('you said it gets too hot', 'คุณระบุว่าพื้นที่ร้อนเกินไป') },
        { id: 'water', label: L('Not enough water', 'น้ำไม่พอ'), parts: ['pump', 'soil', 'level'], because: L('you said water runs short', 'คุณระบุว่าน้ำไม่พอ') },
        { id: 'pests', label: L('Pests & plant disease', 'แมลงและโรคพืช'), parts: ['camAI'], because: L('you said pests and disease are a problem', 'คุณระบุว่ามีปัญหาแมลงและโรคพืช') },
        { id: 'labour', label: L('Not enough workers', 'แรงงานไม่พอ'), parts: ['pump', 'fert'], because: L('you\'re short on workers, so it waters and feeds by itself', 'คุณระบุว่าแรงงานไม่พอ ระบบจึงรดน้ำและให้ปุ๋ยเอง') },
        { id: 'nutrients', label: L('Poor soil nutrients', 'ดินขาดธาตุอาหาร'), parts: ['npk', 'fert'], because: L('you said the soil lacks nutrients', 'คุณระบุว่าดินขาดธาตุอาหาร') },
        { id: 'yield', label: L('Low yield', 'ผลผลิตต่ำ'), parts: ['ledFull', 'npk'], because: L('you want a bigger harvest', 'คุณต้องการเพิ่มผลผลิต') },
    ];
    const SYSTEMS = [
        { id: 'soil', label: L('Soil', 'ดิน'), parts: ['soil', 'npk'], core: ['soil'], because: L('you grow in soil', 'คุณปลูกในดิน') },
        { id: 'hydro', label: L('Hydroponics', 'ไฮโดรโปนิกส์'), parts: ['hydro', 'ph', 'level'], core: ['hydro', 'level'], because: L('you grow hydroponically', 'คุณปลูกแบบไฮโดรโปนิกส์') },
        { id: 'both', label: L('Both', 'ทั้งสองแบบ'), parts: ['soil', 'npk', 'hydro', 'ph', 'level'], core: ['soil', 'hydro', 'level'], because: L('you grow in soil and hydroponically', 'คุณปลูกทั้งในดินและแบบไฮโดรโปนิกส์') },
    ];
    const FUNCTIONS = [
        { id: 'light', label: L('Grow lights', 'ไฟปลูกพืช'), icon: 'fa-lightbulb', parts: ['ledFull'] },
        { id: 'water', label: L('Automatic watering', 'รดน้ำอัตโนมัติ'), icon: 'fa-droplet', parts: ['pump', 'fert'] },
        { id: 'mist', label: L('Misting', 'พ่นหมอก'), icon: 'fa-cloud', parts: ['mist'] },
        { id: 'camera', label: L('Camera + plant disease detection', 'กล้อง + ตรวจโรคพืช'), icon: 'fa-camera', parts: ['camAI'] },
    ];

    // ---------- state ----------
    let current = null;     // use-case key
    let cfg = null;         // { controller, parts: Set, material, size: [w, l, h] }
    let recommended = null; // the preset we started from
    let reasons = {};       // id -> { en, th } why we recommend it
    let survey = null;      // farmer answers (+ core parts for the Essential kit)
    let kitLabel = null;    // label sent to the server for "build" items

    // ---------- open a use case ----------
    function openUseCase(key, opts) {
        const uc = UC[key];
        const section = document.getElementById('useCaseDetail');
        if (!uc || !section) return;
        current = key;
        survey = null;
        kitLabel = uc.short;
        setPreset(uc.preset, null);
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

        // Opened from a homepage problem: go straight to that kit, reasons included
        if (opts && opts.kit) {
            kitLabel = opts.kit.label;
            setPreset(opts.kit.preset, opts.kit.why);
            const results = $('.uc-results', section);
            if (results) results.hidden = false;
            renderConfig(T(opts.kit.name));
            document.getElementById('ucConfig').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function setPreset(preset, why) {
        recommended = { controller: preset.controller, parts: [...preset.parts], material: preset.material, size: [...preset.size] };
        cfg = { controller: preset.controller, parts: new Set(preset.parts), material: preset.material, size: [...preset.size] };
        reasons = Object.assign({}, why || {});
    }

    // Reason shown under a recommended part: a specific one if we have it, else the part's general job
    function reasonFor(id) {
        if (reasons[id]) return T(reasons[id]);
        const p = part(id) || CONTROLLERS.find(c => c.id === id);
        return p ? T(p.why) : '';
    }

    // ---------- rendering ----------
    function renderPage(uc) {
        const media = uc.cover.video
            ? `<video class="uc-hero-media" muted loop playsinline preload="auto" poster="${uc.cover.poster}" aria-hidden="true"><source src="${uc.cover.video}" type="video/mp4"></video>`
            : `<img class="uc-hero-media" src="${uc.cover.img}" alt="" aria-hidden="true">`;
        const options = (uc.options || []).map(renderOption).join('');
        return `
            <button class="back-btn" type="button" onclick="backToUserType()"><i class="fas fa-arrow-left"></i> ${esc(t('Back', 'กลับ'))}</button>
            <header class="uc-hero">
                ${media}
                <div class="uc-hero-shade"></div>
                <div class="uc-hero-text">
                    <span class="eyebrow">${uc.num} — ${esc(T(uc.eyebrow))}</span>
                    <h2>${esc(T(uc.title))}</h2>
                    <p>${esc(T(uc.lead))}</p>
                </div>
            </header>
            <div class="uc-body">
                ${uc.field ? renderField(uc) : ''}
                ${uc.survey ? renderSurvey() : ''}
                <div class="uc-results"${uc.survey ? ' hidden' : ''}>
                    <div class="uc-section-head">
                        <span class="eyebrow">${esc(uc.survey ? t('Step 2 — Our recommendation', 'ขั้นที่ 2 — ชุดที่เราแนะนำ') : t('Recommended', 'รุ่นแนะนำ'))}</span>
                        <h3>${esc(T(uc.optionsTitle))}</h3>
                    </div>
                    <div class="uc-survey-summary" hidden></div>
                    <div class="uc-options">
                        ${options}
                        <div class="uc-option uc-customize">
                            <div class="uc-customize-icon"><i class="fas fa-sliders"></i></div>
                            <h4>${esc(t('Customize this setup', 'ปรับแต่งชุดนี้'))}</h4>
                            <p>${esc(t(`Start from the parts we recommend for ${T(uc.shortName)} growing. Untick what you don't need, add extras, or change the size.`,
                                `เริ่มจากชิ้นส่วนที่เราแนะนำสำหรับ${T(uc.shortName)} แล้วเอาออก เพิ่ม หรือเปลี่ยนขนาดได้ตามต้องการ`))}</p>
                            <button class="btn btn-ghost" type="button" data-action="customize">${esc(t('Customize', 'ปรับแต่ง'))} <i class="fas fa-arrow-down"></i></button>
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
                    <img src="${o.img}" alt="${esc(T(o.alt))}" loading="lazy">
                    <span class="uc-option-tag">${esc(T(o.tag))}</span>
                </div>
                <div class="uc-option-body">
                    <div class="uc-option-head">
                        <h4>${esc(T(o.name))}</h4>
                        <span class="uc-price">${o.priceNote ? `<small>${esc(T(o.priceNote))}</small>` : ''}${money(o.price)}</span>
                    </div>
                    <p class="uc-ctrl">${esc(t('Controller', 'บอร์ดควบคุม'))}: ${esc(o.controller)}</p>
                    <ul class="uc-features">${o.features.map(f => `<li><i class="fas fa-check"></i>${esc(T(f))}</li>`).join('')}</ul>
                    <div class="uc-option-actions">
                        <button class="btn btn-ghost" type="button" data-action="add" data-id="${o.id}"><i class="fas fa-bag-shopping"></i> ${esc(t('Add to cart', 'ใส่ตะกร้า'))}</button>
                        <button class="btn" type="button" data-action="order" data-id="${o.id}">${esc(t('Order now', 'สั่งซื้อ'))}</button>
                    </div>
                </div>
            </article>`;
    }

    // A real installation from our field work: problem → what we installed → when it runs
    function renderField(uc) {
        const f = uc.field;
        return `
            <section class="uc-field" aria-label="${esc(t('From our field work', 'ผลงานจากหน้างานจริง'))}">
                <figure class="uc-field-media"><img src="${f.img}" alt="${esc(T(f.title))}" loading="lazy"></figure>
                <div class="uc-field-body">
                    <span class="eyebrow">${esc(t('From our field work', 'ผลงานจากหน้างานจริง'))}</span>
                    <h3>${esc(T(f.title))}</h3>
                    <ol class="uc-field-steps">
                        <li><b>${esc(t('What they faced', 'ปัญหาที่เจอ'))}</b><span>${esc(T(f.problem))}</span></li>
                        <li><b>${esc(t('What we installed', 'สิ่งที่ทีมติดตั้ง'))}</b><span>${esc(T(f.installed))}</span></li>
                        <li><b>${esc(t('When it runs', 'ระบบทำงานเมื่อไร'))}</b><span>${esc(T(f.runs))}</span></li>
                    </ol>
                    <button class="btn" type="button" data-action="adapt">${esc(t('Adapt this kit to my area', 'ปรับชุดนี้ให้เข้ากับพื้นที่ของฉัน'))} <i class="fas fa-arrow-right"></i></button>
                </div>
            </section>`;
    }

    function renderSurvey() {
        const chips = (name, list, type) => list.map(o => `
            <label class="chip"><input type="${type}" name="${name}" value="${o.id}"${type === 'radio' && o.id === 'soil' ? ' checked' : ''}>
            <span>${o.icon ? `<i class="fas ${o.icon}"></i>` : ''}${esc(T(o.label))}</span></label>`).join('');
        return `
            <form class="uc-survey" id="farmSurvey" novalidate>
                <div class="uc-section-head">
                    <span class="eyebrow">${esc(t('Step 1 — Tell us about your farm', 'ขั้นที่ 1 — เล่าเรื่องฟาร์มของคุณ'))}</span>
                    <h3>${esc(t('A few questions first', 'ขอถามสั้น ๆ ก่อน'))}</h3>
                </div>
                <div class="survey-grid">
                    <label class="field">
                        <span class="field-label">${esc(t('Farm or plot size', 'ขนาดฟาร์มหรือแปลง'))}</span>
                        <span class="input-unit">
                            <input class="uc-input" type="number" id="sArea" min="1" step="any" placeholder="${esc(t('e.g. 200', 'เช่น 200'))}" required>
                            <select class="uc-input" id="sAreaUnit" aria-label="${esc(t('Area unit', 'หน่วยพื้นที่'))}"><option value="m²">${esc(t('m²', 'ตร.ม.'))}</option><option value="rai">${esc(t('rai', 'ไร่'))}</option></select>
                        </span>
                    </label>
                    <label class="field">
                        <span class="field-label">${esc(t('Most you can spend', 'งบสูงสุดที่จ่ายได้'))}</span>
                        <span class="input-unit"><span class="unit-prefix">฿</span>
                            <input class="uc-input" type="number" id="sBudget" min="1" step="any" placeholder="${esc(t('e.g. 5000', 'เช่น 5000'))}" required>
                        </span>
                    </label>
                    <fieldset class="field full">
                        <legend class="field-label">${esc(t('What problems do you have? (the first one you tick matters most)', 'มีปัญหาอะไรบ้าง? (ข้อแรกที่เลือกสำคัญที่สุด)'))}</legend>
                        <div class="chip-group">${chips('problem', PROBLEMS, 'checkbox')}</div>
                        <input class="uc-input" type="text" id="sProblemOther" placeholder="${esc(t('Anything else? (optional)', 'มีอย่างอื่นอีกไหม? (ไม่บังคับ)'))}">
                    </fieldset>
                    <fieldset class="field">
                        <legend class="field-label">${esc(t('How do you grow?', 'ปลูกแบบไหน?'))}</legend>
                        <div class="chip-group">${chips('system', SYSTEMS, 'radio')}</div>
                    </fieldset>
                    <fieldset class="field">
                        <legend class="field-label">${esc(t('Which functions do you want?', 'ต้องการฟังก์ชันไหนบ้าง?'))}</legend>
                        <div class="chip-group">${chips('func', FUNCTIONS, 'checkbox')}</div>
                    </fieldset>
                </div>
                <p class="survey-error" role="alert" hidden></p>
                <button class="btn" type="submit">${esc(t('See my recommendation', 'ดูชุดที่แนะนำ'))} <i class="fas fa-arrow-right"></i></button>
            </form>`;
    }

    // ---------- farmer survey ----------
    let problemOrder = []; // problems in the order they were ticked (first = main problem)
    document.addEventListener('change', e => {
        const i = e.target;
        if (i.name !== 'problem' || !i.closest('#farmSurvey')) return;
        problemOrder = problemOrder.filter(id => id !== i.value);
        if (i.checked) problemOrder.push(i.value);
    });

    function submitSurvey(form) {
        const area = parseFloat($('#sArea', form).value);
        const budget = parseFloat($('#sBudget', form).value);
        const err = $('.survey-error', form);
        if (!(area > 0) || !(budget > 0)) {
            err.textContent = t('Please enter your plot size and the most you can spend.', 'กรุณากรอกขนาดพื้นที่และงบสูงสุดที่จ่ายได้');
            err.hidden = false;
            return;
        }
        err.hidden = true;
        const checked = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
        const ticked = checked('problem');
        const problems = [...problemOrder.filter(id => ticked.includes(id)), ...ticked.filter(id => !problemOrder.includes(id))];
        const systemId = checked('system')[0] || 'soil';
        const system = SYSTEMS.find(s => s.id === systemId);
        const funcs = checked('func');

        // Recommended parts come straight from the answers — and each remembers why
        const why = {};
        const parts = new Set();
        const add = (id, because) => { parts.add(id); if (!why[id] && because) why[id] = because; };
        const becauseText = b => L(`Recommended because ${b.en}`, `แนะนำเพราะ${b.th}`);
        problems.forEach(id => { const p = PROBLEMS.find(x => x.id === id); p.parts.forEach(x => add(x, becauseText(p.because))); });
        system.parts.forEach(x => add(x, becauseText(system.because)));
        funcs.forEach(id => { const f = FUNCTIONS.find(x => x.id === id); f.parts.forEach(x => add(x, L(`Recommended because you asked for ${f.label.en.toLowerCase()}`, `แนะนำเพราะคุณต้องการ${f.label.th}`))); });
        add('dht', null);
        const controller = parts.has('camAI') ? 'pi4' : 'esp32';
        why[controller] = controller === 'pi4'
            ? L('Needed to run the AI camera you asked for', 'จำเป็นสำหรับประมวลผลกล้อง AI ที่คุณเลือก')
            : L('Wi-Fi alerts and app control for your farm', 'แจ้งเตือนและควบคุมผ่านแอปด้วย Wi-Fi');

        // Essential kit = what fixes the problems they ticked + the minimum for how they grow
        const core = new Set(system.core);
        problems.forEach(id => PROBLEMS.find(x => x.id === id).parts.forEach(x => core.add(x)));
        if (['fan', 'cooler', 'mist'].some(x => core.has(x))) core.add('dht');

        survey = {
            area, areaUnit: $('#sAreaUnit', form).value, budget,
            problems, problemOther: $('#sProblemOther', form).value.trim(),
            system: systemId, functions: funcs, core: [...core],
        };
        kitLabel = UC.farmer.short;
        setPreset({ controller, parts: [...parts], material: 'none', size: [100, 100, 60] }, why);

        const section = document.getElementById('useCaseDetail');
        const results = $('.uc-results', section);
        const summary = $('.uc-survey-summary', section);
        summary.innerHTML = `<span>${esc(t('Based on your answers:', 'จากคำตอบของคุณ:'))}</span>${surveyNotes().map(n => `<span class="pill">${esc(n)}</span>`).join('')}`;
        summary.hidden = false;
        results.hidden = false;
        renderConfig(t('Your farm kit', 'ชุดสำหรับฟาร์มของคุณ'));
        document.getElementById('ucConfig').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const labelOf = (list, id) => T((list.find(x => x.id === id) || {}).label || id);
    function surveyNotes(lang) {
        if (!survey) return [];
        const pick = v => (lang === 'en' ? v.en : T(v));
        const tt = (en, th) => (lang === 'en' ? en : t(en, th));
        const lab = (list, id) => pick((list.find(x => x.id === id) || {}).label || L(id, id));
        const unit = survey.areaUnit === 'rai' ? tt('rai', 'ไร่') : tt('m²', 'ตร.ม.');
        const notes = [
            `${tt('Plot', 'พื้นที่')}: ${survey.area} ${unit}`,
            `${tt('Budget', 'งบ')}: ${tt('up to', 'ไม่เกิน')} ${money(survey.budget)}`,
            `${tt('Grows in', 'ปลูกแบบ')}: ${lab(SYSTEMS, survey.system)}`,
        ];
        if (survey.problems.length) notes.push(`${tt('Problems', 'ปัญหา')}: ${survey.problems.map(id => lab(PROBLEMS, id)).join(', ')}`);
        if (survey.problemOther) notes.push(`${tt('Other', 'อื่น ๆ')}: ${survey.problemOther}`);
        if (survey.functions.length) notes.push(`${tt('Wants', 'ต้องการ')}: ${survey.functions.map(id => lab(FUNCTIONS, id)).join(', ')}`);
        return notes;
    }

    // ---------- preset configurator ----------
    function renderConfig(title) {
        const uc = UC[current];
        const el = document.getElementById('ucConfig');
        const rec = new Set(recommended.parts);
        const groups = [...new Set(PARTS.map(p => p.group))];
        const option = (type, name, value, on, label, price, isRec) => `
            <label class="cfg-option ${type}${on ? ' is-on' : ''}${isRec ? ' is-rec' : ''}">
                <input type="${type}" name="${name}" value="${value}"${on ? ' checked' : ''}>
                <span class="cfg-check" aria-hidden="true"></span>
                <span class="cfg-name">${esc(label)}${isRec ? `<small class="cfg-why"><i class="fas fa-circle-check"></i> ${esc(reasonFor(value))}</small>` : ''}</span>
                <span class="cfg-price">${money(price)}</span>
            </label>`;
        const showSize = cfg.material !== 'none';
        const heading = title || t(`Your ${T(uc.shortName)} setup`, `ชุด${T(uc.shortName)}ของคุณ`);
        el.innerHTML = `
            <div class="uc-config-head">
                <div>
                    <span class="eyebrow">${esc(t('Recommended kit', 'ชุดที่แนะนำ'))}</span>
                    <h3>${esc(heading)}</h3>
                    <p>${esc(t('We\'ve ticked what we recommend, with the reason under each part. Untick anything you don\'t need, add extras, or change the size.',
                        'เราเลือกชิ้นที่แนะนำไว้ให้แล้ว พร้อมเหตุผลใต้แต่ละชิ้น เอาออกได้ถ้าไม่ต้องการ เพิ่มชิ้นอื่น หรือเปลี่ยนขนาดก็ได้'))}</p>
                </div>
                <button class="btn btn-ghost" type="button" data-action="reset"><i class="fas fa-rotate-left"></i> ${esc(t('Reset to recommended', 'กลับไปชุดที่แนะนำ'))}</button>
            </div>
            <div class="uc-config-grid">
                <form class="uc-config-main" id="ucConfigForm" onsubmit="return false">
                    <fieldset class="cfg-group">
                        <legend>${esc(t('Controller', 'บอร์ดควบคุม'))}</legend>
                        <div class="cfg-options">${CONTROLLERS.map(c => option('radio', 'cfgController', c.id, cfg.controller === c.id, T(c.name), c.price, recommended.controller === c.id)).join('')}</div>
                    </fieldset>
                    ${groups.map(g => `
                    <fieldset class="cfg-group">
                        <legend>${esc(T(GROUPS[g]))}</legend>
                        <div class="cfg-options">${PARTS.filter(p => p.group === g).map(p => option('checkbox', 'cfgPart', p.id, cfg.parts.has(p.id), T(p.name), p.price, rec.has(p.id))).join('')}</div>
                    </fieldset>`).join('')}
                    <fieldset class="cfg-group">
                        <legend>${esc(t('Enclosure & size', 'กล่องและขนาด'))}</legend>
                        <div class="cfg-size">
                            <label class="field"><span class="field-label">${esc(t('Material', 'วัสดุ'))}</span>
                                <select class="uc-input" id="cfgMaterial">${MATERIALS.map(m => `<option value="${m.id}"${cfg.material === m.id ? ' selected' : ''}>${esc(T(m.name))}${m.rate ? ` (${money(m.rate)}/${t('cm²', 'ตร.ซม.')})` : ''}</option>`).join('')}</select>
                            </label>
                            ${[t('Width', 'กว้าง'), t('Length', 'ยาว'), t('Height', 'สูง')].map((lab, i) => `
                            <label class="field cfg-dim"${showSize ? '' : ' hidden'}><span class="field-label">${esc(lab)} (${esc(t('cm', 'ซม.'))})</span>
                                <input class="uc-input" type="number" min="10" max="400" step="1" data-dim="${i}" value="${cfg.size[i]}">
                            </label>`).join('')}
                        </div>
                        ${reasons.material ? `<p class="cfg-why cfg-why-block"><i class="fas fa-circle-check"></i> ${esc(T(reasons.material))}</p>` : ''}
                    </fieldset>
                </form>
                <aside class="uc-summary" aria-live="polite"></aside>
            </div>`;
        el.hidden = false;
        renderSummary();
    }

    function linesFor(c, lang) {
        const nm = v => (lang === 'en' ? v.en : T(v));
        const out = [];
        const ctrl = CONTROLLERS.find(x => x.id === c.controller);
        if (ctrl) out.push({ id: ctrl.id, name: nm(ctrl.name), price: ctrl.price });
        PARTS.forEach(p => { if (c.parts.has(p.id)) out.push({ id: p.id, name: nm(p.name), price: p.price }); });
        const m = MATERIALS.find(x => x.id === c.material);
        if (m && m.rate) {
            const [w, l, h] = c.size.map(v => Math.max(0, v || 0));
            const area = 2 * (w * l + w * h + l * h);
            out.push({ id: 'material', name: `${nm(m.name)} ${lang === 'en' ? 'box' : t('box', 'กล่อง')} ${w}×${l}×${h} ${lang === 'en' ? 'cm' : t('cm', 'ซม.')}`, price: round2(area * m.rate) });
        }
        return out;
    }
    const lines = () => linesFor(cfg);
    const totalOf = c => round2(linesFor(c).reduce((s, x) => s + x.price, 0));

    // Essential kit: only the parts that fix the ticked problems + the minimum for how they grow
    function essentialCfg() {
        const core = new Set(survey.core.filter(id => recommended.parts.includes(id)));
        return { controller: core.has('camAI') ? 'pi4' : 'esp32', parts: core, material: recommended.material, size: [...recommended.size] };
    }
    const fullCfg = () => ({ controller: recommended.controller, parts: new Set(recommended.parts), material: recommended.material, size: [...recommended.size] });
    const sameCfg = (a, b) => a.controller === b.controller && a.parts.size === b.parts.size && [...a.parts].every(x => b.parts.has(x));

    function renderBudget(total) {
        if (!survey) return '';
        const full = fullCfg(), fullTotal = totalOf(full);
        if (fullTotal <= survey.budget) {
            return total <= survey.budget
                ? `<p class="uc-budget"><i class="fas fa-circle-check"></i> ${esc(t(`Within your ${money(survey.budget)} budget.`, `อยู่ในงบ ${money(survey.budget)} ของคุณ`))}</p>`
                : `<p class="uc-budget over"><i class="fas fa-triangle-exclamation"></i> ${esc(t(`${money(total - survey.budget)} over your ${money(survey.budget)} budget.`, `เกินงบ ${money(survey.budget)} ไป ${money(total - survey.budget)}`))}</p>`;
        }
        // Over budget: let the website say what to cut first, instead of leaving it to the customer
        const ess = essentialCfg(), essTotal = totalOf(ess);
        const removed = linesFor(full).filter(l => l.id !== 'material' && l.id !== full.controller && !ess.parts.has(l.id)).map(l => l.name);
        const ctrlName = id => T(CONTROLLERS.find(c => c.id === id).name);
        const swap = ess.controller !== full.controller
            ? t(`Uses ${ctrlName(ess.controller)} instead of ${ctrlName(full.controller)}`, `ใช้ ${ctrlName(ess.controller)} แทน ${ctrlName(full.controller)}`)
            : '';
        const fixes = survey.problems.map(id => labelOf(PROBLEMS, id));
        const essFits = essTotal <= survey.budget;
        const activeEss = sameCfg(cfg, ess), activeFull = sameCfg(cfg, full);
        return `
            <div class="kit-choice">
                <p class="uc-budget over"><i class="fas fa-triangle-exclamation"></i> ${esc(t(`The full kit is ${money(fullTotal - survey.budget)} over your ${money(survey.budget)} budget. Pick one:`, `ชุดครบเกินงบ ${money(survey.budget)} ไป ${money(fullTotal - survey.budget)} เลือกได้ 2 แบบ:`))}</p>
                <button type="button" class="kit-opt${activeEss ? ' active' : ''}" data-action="kit-essential" aria-pressed="${activeEss}">
                    <span class="kit-opt-head"><b>${esc(t('Essential kit', 'ชุดจำเป็น'))}</b><span>${money(essTotal)}</span></span>
                    <small>${esc(fixes.length ? t(`Still fixes: ${fixes.join(', ')}`, `ยังแก้ปัญหา: ${fixes.join(', ')}`) : t('Keeps the basics for how you grow', 'เก็บเฉพาะสิ่งพื้นฐานสำหรับวิธีปลูกของคุณ'))}</small>
                    ${removed.length ? `<small>${esc(t(`Leaves out: ${removed.join(', ')}`, `ตัดออก: ${removed.join(', ')}`))}</small>` : ''}
                    ${swap ? `<small>${esc(swap)}</small>` : ''}
                    <small class="${essFits ? 'ok' : 'warn'}">${esc(essFits
                        ? t(`Saves ${money(fullTotal - essTotal)} · fits your budget`, `ประหยัด ${money(fullTotal - essTotal)} · อยู่ในงบ`)
                        : t(`Saves ${money(fullTotal - essTotal)} · still ${money(essTotal - survey.budget)} over — try a smaller area first`, `ประหยัด ${money(fullTotal - essTotal)} · ยังเกินงบ ${money(essTotal - survey.budget)} ลองเริ่มจากพื้นที่เล็กลงก่อน`))}</small>
                </button>
                <button type="button" class="kit-opt${activeFull ? ' active' : ''}" data-action="kit-full" aria-pressed="${activeFull}">
                    <span class="kit-opt-head"><b>${esc(t('Full kit', 'ชุดครบ'))}</b><span>${money(fullTotal)}</span></span>
                    <small>${esc(t('Everything we recommend for your answers', 'ทุกชิ้นที่เราแนะนำจากคำตอบของคุณ'))}</small>
                </button>
            </div>`;
    }

    function renderSummary() {
        const aside = $('.uc-summary', document.getElementById('ucConfig'));
        if (!aside) return;
        const items = lines();
        const total = round2(items.reduce((s, x) => s + x.price, 0));
        aside.innerHTML = `
            <span class="eyebrow">${esc(t('Your setup', 'ชุดของคุณ'))}</span>
            <ul class="uc-lines">${items.map(i => `<li><span>${esc(i.name)}</span><span>${money(i.price)}</span></li>`).join('')}</ul>
            <div class="uc-total"><span>${esc(t('Total', 'รวม'))}</span><span>${money(total)}</span></div>
            ${renderBudget(total)}
            <div class="uc-summary-actions">
                <button class="btn btn-ghost" type="button" data-action="custom-add"><i class="fas fa-bag-shopping"></i> ${esc(t('Add to cart', 'ใส่ตะกร้า'))}</button>
                <button class="btn" type="button" data-action="custom-order">${esc(t('Order now', 'สั่งซื้อ'))} <i class="fas fa-arrow-right"></i></button>
            </div>`;
    }

    // ---------- cart ----------
    function pushToCart(item) {
        if (typeof cart === 'undefined' || typeof saveCart !== 'function') return false;
        cart.push(Object.assign({ quantity: 1, cur: 'THB', addedAt: new Date().toISOString(), useCase: UC[current].title.en }, item));
        saveCart();
        return true;
    }

    function addOption(id, andOrder) {
        const o = (UC[current].options || []).find(x => x.id === id);
        if (!o) return;
        const ok = pushToCart({
            type: 'option', option_id: o.id,
            id: o.id, name: T(o.name), controller: o.controller,
            selectedSensors: o.features.map(f => ({ name: T(f), price: 0, included: true })),
            totalPrice: o.price,
            notes: survey ? surveyNotes('en') : undefined,
        });
        if (!ok) return;
        if (andOrder) goToOrder();
        else if (typeof showToast === 'function') showToast(`${t('Added', 'เพิ่มแล้ว')}: ${T(o.name)} (${money(o.price)})`);
    }

    function addCustom(andOrder) {
        const items = lines();
        const ctrl = CONTROLLERS.find(c => c.id === cfg.controller);
        const total = round2(items.reduce((s, x) => s + x.price, 0));
        if (items.length < 2) {
            if (typeof showToast === 'function') showToast(t('Pick at least one part to go with the controller', 'เลือกชิ้นส่วนอย่างน้อย 1 ชิ้นคู่กับบอร์ดควบคุม'));
            return;
        }
        const label = kitLabel || UC[current].short;
        const name = t(`Custom ${label} Box`, `กล่อง ${label} แบบปรับแต่ง`);
        const ok = pushToCart({
            // What the server prices: chosen controller, parts, material and size
            type: 'build',
            build: { label, controller: cfg.controller, parts: [...cfg.parts], material: cfg.material, size: [...cfg.size] },
            id: `custom-${current}`, name, controller: ctrl ? T(ctrl.name) : '',
            selectedSensors: items.map(i => ({ name: `${i.name} (${money(i.price)})`, price: i.price, included: false })),
            totalPrice: total,
            notes: survey ? surveyNotes('en') : undefined,
        });
        if (!ok) return;
        if (andOrder) goToOrder();
        else if (typeof showToast === 'function') showToast(`${t('Added', 'เพิ่มแล้ว')}: ${name} (${money(total)})`);
    }

    function goToOrder() {
        window.orderReturnTo = 'useCaseDetail';
        if (typeof proceedToOrder === 'function') proceedToOrder();
    }

    // ---------- homepage problem picker ----------
    function renderProblemChips() {
        const box = document.getElementById('problemChips');
        if (!box) return;
        box.innerHTML = KITS.map(k => `
            <button type="button" class="problem-chip" data-kit="${k.id}" aria-pressed="false">
                <i class="fas ${k.icon}" aria-hidden="true"></i><span>${esc(T(k.problem))}</span>
            </button>`).join('');
    }

    function showKit(id) {
        const k = KITS.find(x => x.id === id);
        const box = document.getElementById('problemResult');
        if (!k || !box) return;
        document.querySelectorAll('.problem-chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kit === id)));
        const c = { controller: k.preset.controller, parts: new Set(k.preset.parts), material: k.preset.material, size: [...k.preset.size] };
        const ls = linesFor(c);
        const total = round2(ls.reduce((s, x) => s + x.price, 0));
        const why = id2 => {
            if (k.why[id2]) return T(k.why[id2]);
            if (id2 === 'material') return '';
            const p = part(id2) || CONTROLLERS.find(x => x.id === id2);
            return p ? T(p.why) : '';
        };
        box.innerHTML = `
            <div class="kit-card">
                <div class="kit-card-head">
                    <div>
                        <span class="eyebrow">${esc(t('Recommended kit', 'ชุดที่แนะนำ'))}</span>
                        <h3>${esc(T(k.name))}</h3>
                        <p>${esc(t(`For: ${T(k.problem)}`, `สำหรับ: ${T(k.problem)}`))}</p>
                    </div>
                    <span class="kit-total">${money(total)}</span>
                </div>
                <ul class="kit-lines">
                    ${ls.map(l => { const r = why(l.id); return `<li><div><b>${esc(l.name)}</b>${r ? `<small>${esc(r)}</small>` : ''}</div><span>${money(l.price)}</span></li>`; }).join('')}
                </ul>
                <div class="kit-actions">
                    <button class="btn btn-ghost" type="button" data-kit-action="adjust" data-kit-id="${k.id}"><i class="fas fa-sliders"></i> ${esc(t('Adjust this kit', 'ปรับแต่งชุดนี้'))}</button>
                    <button class="btn" type="button" data-kit-action="add" data-kit-id="${k.id}"><i class="fas fa-bag-shopping"></i> ${esc(t('Add to cart', 'ใส่ตะกร้า'))}</button>
                </div>
            </div>`;
        box.hidden = false;
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function addKitToCart(id) {
        const k = KITS.find(x => x.id === id);
        if (!k) return;
        current = k.uc;
        survey = null;
        kitLabel = k.label;
        setPreset(k.preset, k.why);
        const items = lines();
        const total = round2(items.reduce((s, x) => s + x.price, 0));
        const ok = pushToCart({
            type: 'build',
            build: { label: k.label, controller: cfg.controller, parts: [...cfg.parts], material: cfg.material, size: [...cfg.size] },
            id: `kit-${k.id}`, name: T(k.name), controller: T(CONTROLLERS.find(c => c.id === cfg.controller).name),
            selectedSensors: items.map(i => ({ name: `${i.name} (${money(i.price)})`, price: i.price, included: false })),
            totalPrice: total,
            notes: [`Problem: ${k.problem.en}`],
        });
        if (ok && typeof showToast === 'function') showToast(`${t('Added', 'เพิ่มแล้ว')}: ${T(k.name)} (${money(total)})`);
    }

    // ---------- events (delegated) ----------
    document.addEventListener('click', e => {
        const chip = e.target.closest('.problem-chip');
        if (chip) { showKit(chip.dataset.kit); return; }
        const kb = e.target.closest('[data-kit-action]');
        if (kb) {
            const k = KITS.find(x => x.id === kb.dataset.kitId);
            if (kb.dataset.kitAction === 'add') addKitToCart(k.id);
            else openUseCase(k.uc, { kit: k });
            return;
        }
        const btn = e.target.closest('#useCaseDetail [data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === 'add') addOption(btn.dataset.id, false);
        else if (action === 'order') addOption(btn.dataset.id, true);
        else if (action === 'customize') {
            renderConfig();
            document.getElementById('ucConfig').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (action === 'adapt') {
            const sv = document.getElementById('farmSurvey');
            if (sv) { sv.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => { const a = document.getElementById('sArea'); if (a) a.focus({ preventScroll: true }); }, 500); return; }
            const results = $('.uc-results', document.getElementById('useCaseDetail'));
            if (results) results.hidden = false;
            renderConfig();
            document.getElementById('ucConfig').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (action === 'reset') {
            setPreset(recommended, reasons);
            renderConfig($('#ucConfig h3') ? $('#ucConfig h3').textContent : undefined);
        } else if (action === 'kit-essential' || action === 'kit-full') {
            const next = action === 'kit-essential' ? essentialCfg() : fullCfg();
            cfg = next;
            renderConfig($('#ucConfig h3') ? $('#ucConfig h3').textContent : undefined);
        } else if (action === 'custom-add') addCustom(false);
        else if (action === 'custom-order') addCustom(true);
    });

    document.addEventListener('submit', e => {
        if (e.target.id === 'farmSurvey') { e.preventDefault(); submitSurvey(e.target); }
    });

    function onConfigChange(e) {
        const el = e.target;
        if (!el.closest('#ucConfigForm')) return;
        if (el.name === 'cfgController') {
            cfg.controller = el.value;
            el.closest('.cfg-options').querySelectorAll('.cfg-option').forEach(l => l.classList.toggle('is-on', l.querySelector('input').checked));
        } else if (el.name === 'cfgPart') {
            if (el.checked) cfg.parts.add(el.value); else cfg.parts.delete(el.value);
            el.closest('.cfg-option').classList.toggle('is-on', el.checked);
        } else if (el.id === 'cfgMaterial') {
            cfg.material = el.value;
            document.querySelectorAll('#ucConfig .cfg-dim').forEach(d => { d.hidden = cfg.material === 'none'; });
        } else if (el.dataset.dim) {
            cfg.size[+el.dataset.dim] = Math.max(0, parseFloat(el.value) || 0);
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
    function init() { initCardVideos(); renderProblemChips(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.openUseCase = openUseCase;
    // Read-only view of the catalogue, used to check that site prices match the server's price list
    window.__catalog = { CONTROLLERS, PARTS, MATERIALS, UC, KITS };
})();
