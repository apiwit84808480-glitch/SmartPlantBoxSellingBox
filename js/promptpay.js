// ============== PromptPay QR (Thai QR Payment, EMVCo) ==============
// Builds the same code every Thai bank app scans, with the amount already filled in,
// and draws it as a PNG (so people can also save it and open it from their bank app's gallery).
// Needs qrcode-generator (window.qrcode) for drawing; building the text needs nothing.

(function () {
    const f = (id, v) => id + String(v.length).padStart(2, '0') + v;

    // CRC-16/CCITT-FALSE, as the Thai QR standard asks
    function crc16(s) {
        let crc = 0xffff;
        for (let i = 0; i < s.length; i++) {
            crc ^= s.charCodeAt(i) << 8;
            for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    // id: phone 0XXXXXXXXX or 13-digit ID card / tax number. amount in baht.
    function payload(id, amount) {
        const t = String(id || '').replace(/\D/g, '');
        let acct;
        if (/^0\d{9}$/.test(t)) acct = f('01', ('0000000000000' + t.replace(/^0/, '66')).slice(-13));
        else if (/^\d{13}$/.test(t)) acct = f('02', t);
        else return null;
        const amt = Math.round(Number(amount) * 100) / 100;
        const data = [
            f('00', '01'),
            f('01', amt > 0 ? '12' : '11'),
            f('29', f('00', 'A000000677010111') + acct),
            f('58', 'TH'),
            f('53', '764'),
            amt > 0 ? f('54', amt.toFixed(2)) : '',
        ].join('') + '6304';
        return data + crc16(data);
    }

    // PNG data URL with a white quiet zone (scanners need it)
    function png(text, px = 8) {
        if (!text || typeof window.qrcode !== 'function') return null;
        const qr = window.qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        const n = qr.getModuleCount(), quiet = 4, size = (n + quiet * 2) * px;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, size, size);
        g.fillStyle = '#000';
        for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) g.fillRect((k + quiet) * px, (r + quiet) * px, px, px);
        return c.toDataURL('image/png');
    }

    // 081-234-5678 / 1-2345-67890-12-3 for showing on screen
    function pretty(id) {
        const t = String(id || '').replace(/\D/g, '');
        if (t.length === 10) return `${t.slice(0, 3)}-${t.slice(3, 6)}-${t.slice(6)}`;
        if (t.length === 13) return `${t[0]}-${t.slice(1, 5)}-${t.slice(5, 10)}-${t.slice(10, 12)}-${t[12]}`;
        return t;
    }

    window.PromptPay = { payload, png, pretty, crc16 };
    if (typeof module !== 'undefined') module.exports = window.PromptPay;
})();
