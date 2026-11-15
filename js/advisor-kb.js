// ============== What each part is — written by us, so the answers are always right ==============
// The AI box designer (js/advisor.js) shows these when a customer asks "NPK คืออะไร", "ESP32 ต่างจาก
// Arduino ยังไง" ... and behind the ⓘ next to every part. Prices are NOT written here: they come
// from the live catalogue (js/usecases.js), the same list the server charges from.
// NOTE: draft texts — the team should check them before relying on them.

(function () {
    const L = (en, th) => ({ en, th });

    // One topic per part (or group of parts). parts: catalogue ids it describes (for price + "add to kit").
    const TOPICS = {
        npk: {
            parts: ['npk'], icon: 'fa-flask',
            title: L('What is an NPK sensor?', 'เซนเซอร์ NPK คืออะไร'),
            what: L('NPK = Nitrogen (N), Phosphorus (P) and Potassium (K), the three main nutrients plants need. The sensor goes into the soil and measures how much of each is there.',
                'NPK คือธาตุอาหารหลัก 3 ตัวของพืช ได้แก่ ไนโตรเจน (N) ฟอสฟอรัส (P) และโพแทสเซียม (K) เซนเซอร์นี้ปักลงดินเพื่อวัดว่าในดินมีธาตุแต่ละตัวมากน้อยแค่ไหน'),
            why: L('N grows leaves and stems, P grows roots and flowers, K builds fruit and toughness. Knowing which one is low lets you add only the fertilizer that is missing — no guessing, no waste.',
                'N ช่วยเรื่องใบและลำต้น P ช่วยเรื่องรากและดอก K ช่วยเรื่องผลและความแข็งแรง รู้ว่าตัวไหนขาดก็ใส่ปุ๋ยเฉพาะตัวนั้น ไม่ต้องเดา ไม่เปลืองปุ๋ย'),
            fit: L('Best for growing in soil, especially farms and bigger plots. Not needed for hydroponics (use TDS and pH instead).',
                'เหมาะกับการปลูกในดิน โดยเฉพาะแปลงหรือฟาร์ม ไม่จำเป็นสำหรับไฮโดรโปนิกส์ (ใช้ TDS กับ pH แทน)'),
        },
        tds: {
            parts: ['tds'], icon: 'fa-vial',
            title: L('What is a TDS sensor?', 'เซนเซอร์ TDS คืออะไร'),
            what: L('TDS = Total Dissolved Solids. It measures how much nutrient is dissolved in the water, in ppm.',
                'TDS ย่อมาจาก Total Dissolved Solids วัดว่าในน้ำมีธาตุอาหารละลายอยู่มากแค่ไหน หน่วยเป็น ppm'),
            why: L('In hydroponics the plants live on that water: too weak and they starve, too strong and the roots burn. TDS tells you when to add nutrients or top up with water.',
                'ในไฮโดรโปนิกส์ ต้นไม้กินอาหารจากน้ำนี้ ถ้าเจือจางไปต้นจะขาดอาหาร ถ้าเข้มข้นไปรากจะไหม้ TDS บอกว่าเมื่อไรควรเติมปุ๋ยน้ำหรือเติมน้ำเปล่า'),
            fit: L('Hydroponic growers. Pairs well with the pH sensor.', 'คนที่ปลูกไฮโดรโปนิกส์ ใช้คู่กับเซนเซอร์ pH ได้ดี'),
        },
        ph: {
            parts: ['ph'], icon: 'fa-droplet',
            title: L('What is a pH sensor?', 'เซนเซอร์ pH คืออะไร'),
            what: L('It measures how acidic or alkaline the water is, on a 0–14 scale (7 is neutral).',
                'วัดความเป็นกรด-ด่างของน้ำ สเกล 0–14 (7 คือเป็นกลาง)'),
            why: L('Roots can only take up nutrients in the right pH range — for most plants about 5.5–6.5 in hydroponics. Outside it, plants go hungry even with plenty of fertilizer.',
                'รากดูดธาตุอาหารได้ดีเฉพาะในช่วง pH ที่เหมาะ พืชส่วนใหญ่ในไฮโดรโปนิกส์อยู่ที่ราว 5.5–6.5 ถ้าค่าเพี้ยน ต่อให้มีปุ๋ยเยอะต้นก็ยังขาดอาหาร'),
            fit: L('Hydroponics and high-value crops.', 'ไฮโดรโปนิกส์และพืชมูลค่าสูง'),
        },
        dht: {
            parts: ['dht'], icon: 'fa-temperature-half',
            title: L('What is the temperature & humidity sensor?', 'เซนเซอร์อุณหภูมิและความชื้นคืออะไร'),
            what: L('A small sensor that reads the air temperature and humidity around the plants.', 'เซนเซอร์ตัวเล็กที่วัดอุณหภูมิและความชื้นของอากาศรอบต้นไม้'),
            why: L('It is what tells the box when to switch on the fan, misting or heater by itself, and it sends the readings to your phone.',
                'เป็นตัวที่บอกกล่องว่าเมื่อไรควรเปิดพัดลม พ่นหมอก หรือฮีตเตอร์เอง และส่งค่าเข้ามือถือได้'),
            fit: L('Almost every box — it is cheap and the climate parts depend on it.', 'แทบทุกกล่อง ราคาถูกและอุปกรณ์คุมอากาศต้องใช้ค่านี้'),
        },
        soil: {
            parts: ['soil'], icon: 'fa-seedling',
            title: L('What is the soil moisture sensor?', 'เซนเซอร์ความชื้นในดินคืออะไร'),
            what: L('A probe pushed into the soil that measures how wet it is.', 'แท่งที่ปักลงดินเพื่อวัดว่าดินชื้นหรือแห้งแค่ไหน'),
            why: L('The pump waters only when the soil is dry, so plants are never forgotten and roots do not rot from too much water.',
                'ปั๊มจะรดน้ำเฉพาะตอนดินแห้ง ต้นไม้ไม่ถูกลืมรดน้ำ และรากไม่เน่าเพราะน้ำมากเกินไป'),
            fit: L('Anyone growing in soil with the watering pump. One per pot or bed gives the best control.', 'ทุกคนที่ปลูกในดินและใช้ปั๊มรดน้ำ ใส่กระถางหรือแปลงละ 1 ตัวจะคุมได้แม่นที่สุด'),
        },
        lux: {
            parts: ['lux'], icon: 'fa-sun',
            title: L('What is the light sensor?', 'เซนเซอร์วัดแสงคืออะไร'),
            what: L('It measures how bright it is around the plants.', 'วัดความสว่างของแสงรอบต้นไม้'),
            why: L('The grow light switches on only when daylight is not enough, which saves electricity.', 'เปิดไฟปลูกพืชเฉพาะตอนแสงธรรมชาติไม่พอ ช่วยประหยัดไฟ'),
            fit: L('Boxes with a grow light, especially near a window.', 'กล่องที่มีไฟปลูกพืช โดยเฉพาะที่วางใกล้หน้าต่าง'),
        },
        level: {
            parts: ['level'], icon: 'fa-water',
            title: L('What is the water level sensor?', 'เซนเซอร์ระดับน้ำคืออะไร'),
            what: L('It checks how much water is left in the tank.', 'ตรวจว่าน้ำในถังเหลือเท่าไร'),
            why: L('You get a warning before the tank runs dry, and the pump is protected from running empty.', 'เตือนก่อนน้ำหมด และป้องกันปั๊มทำงานตอนไม่มีน้ำจนเสีย'),
            fit: L('Any box with a pump, misting or hydroponics.', 'ทุกกล่องที่มีปั๊ม พ่นหมอก หรือไฮโดรโปนิกส์'),
        },
        pump: {
            parts: ['pump'], icon: 'fa-faucet-drip',
            title: L('What does the watering pump do?', 'ปั๊มรดน้ำอัตโนมัติทำอะไร'),
            what: L('A small water pump with hose that waters the plants from a tank.', 'ปั๊มน้ำขนาดเล็กพร้อมสายยาง ดูดน้ำจากถังไปรดต้นไม้'),
            why: L('It waters on a schedule or when the soil sensor says the soil is dry — no more watering by hand.', 'รดน้ำตามเวลา หรือเมื่อเซนเซอร์บอกว่าดินแห้ง ไม่ต้องรดเอง'),
            fit: L('Anyone who is busy or often away.', 'คนที่ไม่ค่อยมีเวลาหรือไม่ค่อยอยู่บ้าน'),
        },
        mist: {
            parts: ['mist'], icon: 'fa-cloud',
            title: L('What does the misting system do?', 'ระบบพ่นหมอกทำอะไร'),
            what: L('A set of 2 misting nozzles with its own pump that sprays a fine mist. Add more sets for more nozzles (2 per set).', 'ชุดหัวพ่นหมอก 2 หัวพร้อมปั๊มในตัว พ่นละอองน้ำละเอียด เพิ่มได้ทีละชุด (ชุดละ 2 หัว)'),
            why: L('It raises the humidity and cools the leaves on hot days — tropical plants and orchids love it.', 'เพิ่มความชื้นในอากาศและช่วยลดความร้อนที่ใบในวันที่ร้อน ไม้เขตร้อนและกล้วยไม้ชอบมาก'),
            fit: L('Closed boxes, balconies and greenhouses. Not for an open room — the mist wets the floor.', 'กล่องปิด ระเบียง และโรงเรือน ไม่เหมาะกับห้องเปิดโล่งเพราะละอองจะทำให้พื้นเปียก'),
        },
        fert: {
            parts: ['fert'], icon: 'fa-prescription-bottle',
            title: L('What does the fertilizer doser do?', 'ชุดให้ปุ๋ยอัตโนมัติทำอะไร'),
            what: L('A small pump that adds liquid fertilizer on a schedule.', 'ปั๊มขนาดเล็กที่จ่ายปุ๋ยน้ำตามเวลาที่ตั้งไว้'),
            why: L('Plants are fed regularly without you remembering, so they grow faster and more evenly.', 'ต้นไม้ได้ปุ๋ยสม่ำเสมอโดยไม่ต้องจำ โตไวและโตเท่า ๆ กัน'),
            fit: L('Farms, vegetables and fruiting plants. Works well with the NPK sensor.', 'ฟาร์ม ผัก และพืชที่ให้ผล ใช้คู่กับเซนเซอร์ NPK ได้ดี'),
        },
        hydro: {
            parts: ['hydro'], icon: 'fa-bucket',
            title: L('What is the hydroponic reservoir?', 'ถังไฮโดรโปนิกส์คืออะไร'),
            what: L('A water tank with an air pump: the plants grow with their roots in nutrient water instead of soil.', 'ถังน้ำพร้อมปั๊มลม ต้นไม้ปลูกโดยให้รากอยู่ในน้ำผสมธาตุอาหารแทนดิน'),
            why: L('No soil, less mess, fast growth and easy control. The air pump keeps the roots supplied with oxygen.', 'ไม่ใช้ดิน สะอาด โตไว คุมง่าย ปั๊มลมช่วยให้รากได้ออกซิเจน'),
            fit: L('Leafy greens and high-value crops. Pair it with pH, TDS and a water level sensor.', 'ผักใบและพืชมูลค่าสูง ควรใช้คู่กับเซนเซอร์ pH, TDS และระดับน้ำ'),
        },
        fan: {
            parts: ['fan'], icon: 'fa-fan',
            title: L('What does the exhaust fan do?', 'พัดลมระบายอากาศทำอะไร'),
            what: L('A small fan that pushes stale, hot air out of the box.', 'พัดลมขนาดเล็กที่ดันอากาศร้อนและอากาศอับออกจากกล่อง'),
            why: L('Moving air stops mould and keeps the box from overheating.', 'อากาศถ่ายเทช่วยลดเชื้อราและไม่ให้กล่องร้อนเกินไป'),
            fit: L('Every closed box.', 'ทุกกล่องที่เป็นแบบปิด'),
        },
        cooler: {
            parts: ['cooler'], icon: 'fa-snowflake',
            title: L('What does the cooling fan do?', 'พัดลมระบายความร้อนทำอะไร'),
            what: L('A stronger fan that cools the plants down on hot days.', 'พัดลมที่แรงกว่า ช่วยลดอุณหภูมิในวันที่ร้อน'),
            why: L('It switches on when the temperature sensor reads too hot, so plants do not wilt.', 'ทำงานเองเมื่อเซนเซอร์บอกว่าร้อนเกินไป ต้นไม้จะได้ไม่เหี่ยว'),
            fit: L('Hot rooms, greenhouses and anywhere in direct sun.', 'ห้องที่ร้อน โรงเรือน และที่โดนแดดโดยตรง'),
        },
        heater: {
            parts: ['heater'], icon: 'fa-fire',
            title: L('What does the heater do?', 'ฮีตเตอร์ทำอะไร'),
            what: L('A small heater that keeps the box warm.', 'เครื่องทำความร้อนขนาดเล็กที่ช่วยให้กล่องอบอุ่น'),
            why: L('It protects plants on cold nights so they keep growing.', 'ช่วยต้นไม้ในคืนที่หนาว ต้นไม้ยังโตต่อได้'),
            fit: L('Cold areas such as the north in winter, or rooms with strong air-conditioning.', 'พื้นที่หนาว เช่นภาคเหนือหน้าหนาว หรือห้องที่เปิดแอร์เย็นจัด'),
        },
        lights: {
            parts: ['ledRB', 'ledFull'], icon: 'fa-lightbulb', compare: 'lights',
            title: L('Which grow light should I pick?', 'ไฟปลูกพืชแต่ละแบบต่างกันยังไง'),
            what: L('Grow lights replace sunlight so plants can grow indoors or where there is little sun.', 'ไฟปลูกพืชใช้แทนแสงแดด ให้ต้นไม้โตได้ในบ้านหรือที่แดดน้อย'),
            why: L('Red + blue strips give the two colours plants use most (red helps flowering, blue keeps leaves and stems strong) at a low price, but the light looks pink-purple. The full-spectrum panel is closer to real sunlight: plants look natural and grow well, and it can be dimmed.',
                'ไฟ LED แดง-น้ำเงินให้สองสีที่พืชใช้มากที่สุด (แดงช่วยการออกดอก น้ำเงินช่วยให้ใบและลำต้นแข็งแรง) ราคาถูก แต่แสงออกสีชมพูม่วง ส่วนแผงไฟฟูลสเปกตรัมใกล้เคียงแสงแดดจริง ต้นไม้ดูเป็นสีธรรมชาติ โตดี และปรับความสว่างได้'),
            fit: L('Red + blue: budget setups, greenhouses. Full spectrum: indoors, seedlings, plants you want to look good.', 'แดง-น้ำเงิน: งบประหยัด โรงเรือน · ฟูลสเปกตรัม: ปลูกในบ้าน ต้นกล้า และต้นไม้ที่อยากให้ดูสวย'),
        },
        cameras: {
            parts: ['cam', 'picam'], icon: 'fa-camera', compare: 'cameras',
            title: L('Which camera should I pick?', 'กล้องแต่ละแบบต่างกันยังไง'),
            what: L('The camera photographs your plants so you can see them from your phone, and it feeds the AI disease check.', 'กล้องถ่ายภาพต้นไม้ให้ดูผ่านมือถือได้ และส่งภาพให้ AI ตรวจโรค'),
            why: L('ESP32-CAM is small and cheap and works with any board. The Raspberry Pi camera takes much sharper photos, so the AI is more reliable, but it needs a Raspberry Pi board.',
                'ESP32-CAM เล็ก ราคาถูก ใช้ได้กับทุกบอร์ด ส่วนกล้อง Raspberry Pi ภาพคมชัดกว่ามาก AI จึงตรวจได้แม่นกว่า แต่ต้องใช้คู่กับบอร์ด Raspberry Pi'),
            fit: L('Anyone who wants to check on plants remotely or use the AI disease check.', 'คนที่อยากดูต้นไม้จากที่อื่น หรืออยากใช้ AI ตรวจโรค'),
        },
        ai: {
            parts: ['ai1', 'ai2', 'ai3'], icon: 'fa-brain', compare: 'ai',
            title: L('What does the AI do, and which model?', 'AI ตรวจโรคพืชทำอะไร และแต่ละรุ่นต่างกันยังไง'),
            what: L('The AI looks at the camera photos of the leaves and warns you when it sees signs of disease, so you can act before it spreads. It needs a camera.',
                'AI ดูภาพใบจากกล้อง แล้วแจ้งเตือนเมื่อเห็นอาการของโรค จะได้แก้ไขก่อนโรคลามทั้งต้น ต้องมีกล้องด้วย'),
            why: L('Model 1 is about 60% accurate, Model 2 about 75%, Model 3 about 90% (our test results). Higher accuracy means fewer false alarms and earlier warnings. Arduino boards cannot run Model 3 — use ESP32 or Raspberry Pi.',
                'Model 1 แม่นยำประมาณ 60% · Model 2 ประมาณ 75% · Model 3 ประมาณ 90% (จากการทดสอบของเรา) ยิ่งแม่นยิ่งแจ้งเตือนผิดน้อยและเจอโรคเร็ว บอร์ด Arduino ใช้ Model 3 ไม่ได้ ต้องใช้ ESP32 หรือ Raspberry Pi'),
            fit: L('Valuable plants, farms, and anyone who has had leaf disease before. One model per box.', 'พืชมูลค่าสูง ฟาร์ม และคนที่เคยเจอปัญหาโรคใบ ใช้ 1 รุ่นต่อกล่อง'),
        },
        boards: {
            parts: ['nano', 'uno', 'esp32', 'pi0', 'pi4'], icon: 'fa-microchip', compare: 'boards',
            title: L('Which control board should I pick?', 'บอร์ดควบคุมแต่ละแบบต่างกันยังไง'),
            what: L('The board is the brain of the box: it reads the sensors and switches the pump, lights and fans.', 'บอร์ดคือสมองของกล่อง อ่านค่าจากเซนเซอร์แล้วสั่งปั๊ม ไฟ และพัดลม'),
            why: L('Arduino Nano/Uno are the cheapest and run the basics but have no Wi-Fi. ESP32 adds Wi-Fi, so you can check and control the box from your phone — the best choice for most people. A Raspberry Pi is a tiny computer, needed for the Pi camera; Pi Zero 2 W is the budget one, Pi 4 the most powerful.',
                'Arduino Nano/Uno ราคาถูกที่สุด ทำงานพื้นฐานได้ แต่ไม่มี Wi-Fi · ESP32 มี Wi-Fi ดูและสั่งงานผ่านมือถือได้ เหมาะกับคนส่วนใหญ่ · Raspberry Pi คือคอมพิวเตอร์จิ๋ว จำเป็นเมื่อใช้กล้อง Pi โดย Pi Zero 2 W เป็นรุ่นประหยัด และ Pi 4 แรงที่สุด'),
            fit: L('Not sure? Pick ESP32.', 'ถ้าไม่แน่ใจ เลือก ESP32'),
        },
        materials: {
            parts: [], icon: 'fa-cube', compare: 'materials',
            title: L('Acrylic, glass or plastic — which box?', 'กล่องอะคริลิก กระจก หรือพลาสติก ต่างกันยังไง'),
            what: L('The box keeps light, warmth and humidity around the plants and keeps out dust and insects. It is priced by its surface area.', 'กล่องช่วยเก็บแสง ความอุ่น และความชื้นไว้ที่ต้นไม้ และกันฝุ่นกับแมลง ราคาคิดตามพื้นที่ผิวของกล่อง'),
            why: L('Acrylic is clear, light and hard to break — a good all-rounder. Glass is the clearest and scratch-resistant but heavier, breakable and the most expensive. Plastic is the cheapest and lightest but less clear.',
                'อะคริลิก ใส เบา ไม่แตกง่าย เป็นตัวเลือกกลาง ๆ ที่ดี · กระจก ใสที่สุดและทนรอยขีด แต่หนัก แตกได้ และแพงที่สุด · พลาสติก ถูกและเบาที่สุด แต่ใสน้อยกว่า'),
            fit: L('Show plants off: acrylic or glass. Budget or moving it around: plastic.', 'อยากโชว์ต้นไม้: อะคริลิกหรือกระจก · งบประหยัดหรือต้องย้ายบ่อย: พลาสติก'),
        },
        how: {
            parts: [], icon: 'fa-gears',
            title: L('How does a Smart Plant Box work?', 'Smart Plant Box ทำงานยังไง'),
            what: L('Sensors measure the soil, air, light and water. The control board reads them and switches the pump, lights, fans and misting by itself.', 'เซนเซอร์วัดดิน อากาศ แสง และน้ำ บอร์ดควบคุมอ่านค่าแล้วสั่งปั๊ม ไฟ พัดลม และพ่นหมอกให้ทำงานเอง'),
            why: L('Plants get water, light and the right climate on time even when you are busy or away. With an ESP32 or Raspberry Pi you can watch and control it from your phone.', 'ต้นไม้ได้น้ำ แสง และอากาศที่เหมาะสมตรงเวลา แม้คุณจะยุ่งหรือไม่อยู่บ้าน ถ้าใช้ ESP32 หรือ Raspberry Pi จะดูและสั่งงานผ่านมือถือได้'),
            fit: L('Tell the assistant what you grow, where, and your budget, and it builds the set for you.', 'เล่าให้ผู้ช่วยฟังว่าปลูกอะไร ที่ไหน งบเท่าไร แล้วจะจัดชุดให้'),
        },
    };

    // Words that point at each topic (lower-case; "n p k" is squeezed to "npk" before matching)
    const WORDS = [
        ['npk', ['npk', 'เอ็นพีเค', 'ธาตุอาหารในดิน', 'ไนโตรเจน', 'ฟอสฟอรัส', 'โพแทสเซียม', 'nitrogen', 'phosphorus', 'potassium']],
        ['tds', ['tds', 'ทีดีเอส', 'ppm']],
        ['ph', [/\bph\b/, 'พีเอช', 'กรดด่าง', 'กรด-ด่าง', 'กรด ด่าง', 'acidity']],
        ['dht', ['dht', 'อุณหภูมิและความชื้น', 'เซนเซอร์อุณหภูมิ', 'วัดอุณหภูมิ', 'humidity sensor', 'temperature sensor', 'temperature & humidity']],
        ['soil', ['ความชื้นในดิน', 'ความชื้นดิน', 'เซนเซอร์ดิน', 'soil moisture', 'soil sensor']],
        ['lux', ['วัดแสง', 'เซนเซอร์แสง', 'light sensor', /\bldr\b/, /\blux\b/]],
        ['level', ['ระดับน้ำ', 'water level', 'level sensor']],
        ['mist', ['พ่นหมอก', 'หัวพ่น', 'หมอก', 'mist']],
        ['fert', ['ปุ๋ย', 'fertili', 'doser']],
        ['hydro', ['ไฮโดร', 'hydro', 'ปลูกในน้ำ', 'ไม่ใช้ดิน', 'ไร้ดิน', 'soilless']],
        ['cooler', ['ระบายความร้อน', 'cooling fan', 'cooler']],
        ['heater', ['ฮีตเตอร์', 'ทำความร้อน', 'heater']],
        ['fan', ['พัดลม', 'ระบายอากาศ', 'exhaust', /\bfans?\b/]],
        ['pump', ['ปั๊ม', 'pump']],
        ['lights', ['ไฟปลูก', 'ไฟ led', 'led', 'ฟูลสเปกตรัม', 'full spectrum', 'full-spectrum', 'แดงน้ำเงิน', 'แดง-น้ำเงิน', 'grow light', 'แผงไฟ']],
        ['cameras', ['กล้อง', 'camera', 'esp32-cam', 'esp32 cam']],
        ['ai', [/\bai\b/, 'เอไอ', 'model 1', 'model 2', 'model 3', 'โมเดล', 'ตรวจโรค']],
        ['boards', ['บอร์ด', 'board', 'arduino', 'อาดุยโน่', 'อาร์ดุยโน', 'esp32', 'raspberry', 'ราสเบอร์รี่', 'ราสเบอรี่', /\bnano\b/, /\buno\b/, 'pi zero', /\bpi\s?4\b/, 'microcontroller', 'ไมโครคอนโทรลเลอร์']],
        ['materials', ['อะคริลิก', 'อะคริลิค', 'กระจก', 'พลาสติก', 'acrylic', 'glass', 'plastic', 'วัสดุ']],
        ['how', ['ทำงานยังไง', 'ทำงานอย่างไร', 'ทำงานยังงัย', 'ทำอะไรได้บ้าง', 'how does it work', 'how it works', 'smart plant box คือ', 'กล่องนี้คือ']],
    ];
    const QUESTION = /(คืออะไร|คือ\s*อะไร|อะไรคือ|ใช้ทำอะไร|ทำอะไร|ไว้ทำอะไร|มีไว้|วัดอะไร|ทำงานยังไง|ทำงานอย่างไร|ต่างกัน|ต่างจาก|แตกต่าง|เทียบ|อันไหนดี|ตัวไหนดี|แบบไหนดี|ดีกว่า|อธิบาย|หมายถึง|ย่อมาจาก|แปลว่า|จำเป็น.{0,20}(ไหม|มั้ย|มั๊ย|หรือเปล่า|รึเปล่า|ป่าว)|ต้อง(ใช้|มี).{0,20}(ไหม|มั้ย|มั๊ย|หรือเปล่า|รึเปล่า)|ดียังไง|ดีไหม|ดีมั้ย|\?|what is|what's|what are|what does|how does|how do|difference|\bvs\b|versus|compare|explain|do i need|should i)/i;

    // "npk คืออะไร", "n p k คืออะไร", "ESP32 ต่างจาก Arduino ยังไง" -> ['npk'] / ['boards']
    function detect(raw) {
        let txt = ' ' + String(raw || '').toLowerCase() + ' ';
        txt = txt.replace(/\b([a-z])[\s.\-]+(?=[a-z]\b)/g, '$1'); // "n p k" / "n.p.k" -> "npk"
        if (!QUESTION.test(txt)) return null;
        const found = [];
        WORDS.forEach(([id, words]) => { if (words.some(w => (w instanceof RegExp ? w.test(txt) : txt.includes(w)))) found.push(id); });
        // a more specific match wins over the general one ("พัดลมระบายความร้อน" is the cooler, not the fan)
        // (unless they also name the exhaust fan, e.g. "ต่างจากพัดลมระบายอากาศยังไง")
        if (found.includes('cooler') && !/ระบายอากาศ|exhaust/.test(txt)) { const i = found.indexOf('fan'); if (i >= 0) found.splice(i, 1); }
        return { topics: found.slice(0, 3) };
    }

    window.__kb = { TOPICS, detect };
})();
