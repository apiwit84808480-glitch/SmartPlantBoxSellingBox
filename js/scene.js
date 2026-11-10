// ============== Smart Plant Box — scroll-assembled 3D hero ==============
// The box starts as floating parts. Scrolling the hero assembles it,
// switches the grow lights on, then shows what each part does.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.documentElement;
const track = document.getElementById('home');
const stage = track ? track.querySelector('.hero-stage') : null;
const canvas = document.getElementById('box-canvas');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasWebGL() {
    try {
        const c = document.createElement('canvas');
        return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
}

function start() {
    if (!canvas || !stage || !hasWebGL()) { root.classList.add('no-webgl'); return; }
    try {
        init();
        root.classList.remove('no-webgl');
        root.classList.add('webgl-ready');
        window.__boxSceneReady = true;
    } catch (err) {
        console.error('3D scene failed to start', err);
        root.classList.add('no-webgl');
    }
}

// ---------- small helpers ----------
const clamp01 = v => Math.min(1, Math.max(0, v));
const range = (v, a, b) => clamp01((v - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);
let seed = 11;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rnd = (a, b) => a + (b - a) * rand();

function init() {
    // Box dimensions in scene units (≈ 1 unit = 10 cm)
    const W = 4.0, D = 3.2, H = 5.4, Y0 = 0.08;

    // ---------- renderer / scene / camera ----------
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 160);

    const HEMI_OFF = new THREE.Color(0xe6e2ee), HEMI_ON = new THREE.Color(0xff8fc8);
    const hemi = new THREE.HemisphereLight(HEMI_OFF.clone(), 0x140f18, 0.7);
    const key = new THREE.DirectionalLight(0xfff1e6, 2.4);
    key.position.set(6, 9, 8);
    const rim = new THREE.DirectionalLight(0x9fb6ff, 1.6);
    rim.position.set(-8, 4, -7);
    scene.add(hemi, key, rim);

    // ---------- textures ----------
    const glowTex = canvasTexture(64, 64, g => {
        const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, 'rgba(255,255,255,1)');
        grd.addColorStop(0.22, 'rgba(255,255,255,0.55)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    });
    const shadowTex = canvasTexture(128, 128, g => {
        const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grd.addColorStop(0, 'rgba(0,0,0,0.75)');
        grd.addColorStop(0.55, 'rgba(0,0,0,0.35)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    });
    const perfTex = canvasTexture(128, 128, g => {
        g.fillStyle = '#b8bbc1'; g.fillRect(0, 0, 128, 128);
        g.fillStyle = '#3b3d43';
        for (let y = 0; y < 8; y++) for (let x = 0; x < 9; x++) {
            g.beginPath(); g.arc(x * 16 + (y % 2 ? 8 : 0), y * 16 + 8, 5, 0, Math.PI * 2); g.fill();
        }
    });
    perfTex.wrapS = perfTex.wrapT = THREE.RepeatWrapping;
    perfTex.repeat.set(2, 4);
    const ventTex = canvasTexture(64, 96, g => {
        g.fillStyle = '#f3f1ee'; g.fillRect(0, 0, 64, 96);
        g.fillStyle = '#9b97a2';
        for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) g.fillRect(7 + c * 13, 9 + r * 11, 8, 6);
    });

    // ---------- materials ----------
    const M = {
        acrylic: new THREE.MeshPhysicalMaterial({ color: 0xf1f5ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.7, side: THREE.DoubleSide, depthWrite: false }),
        enclosure: new THREE.MeshPhysicalMaterial({ color: 0xf4f6ff, roughness: 0.08, transparent: true, opacity: 0.16, clearcoat: 1, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false }),
        edge: new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
        alu: new THREE.MeshStandardMaterial({ color: 0xc6c9cf, metalness: 0.95, roughness: 0.3 }),
        board: new THREE.MeshStandardMaterial({ color: 0xebe5ec, roughness: 0.82 }),
        black: new THREE.MeshStandardMaterial({ color: 0x19181d, roughness: 0.5, metalness: 0.15 }),
        hole: new THREE.MeshBasicMaterial({ color: 0x060507 }),
        white: new THREE.MeshStandardMaterial({ color: 0xf3f1ee, roughness: 0.55 }),
        label: new THREE.MeshStandardMaterial({ color: 0xeadfc6, roughness: 0.6 }),
        pot: new THREE.MeshStandardMaterial({ color: 0xe0465e, roughness: 0.5, side: THREE.DoubleSide }),
        soil: new THREE.MeshStandardMaterial({ color: 0x33241c, roughness: 1 }),
        leaf: new THREE.MeshStandardMaterial({ color: 0x2d5532, roughness: 0.3, metalness: 0.05, side: THREE.DoubleSide }),
        stem: new THREE.MeshStandardMaterial({ color: 0x5d803d, roughness: 0.6 }),
        pcb: new THREE.MeshStandardMaterial({ color: 0x1d4fb5, roughness: 0.45 }),
        pcbGreen: new THREE.MeshStandardMaterial({ color: 0x1f6b3d, roughness: 0.45 }),
        relay: new THREE.MeshStandardMaterial({ color: 0x2f6cf0, roughness: 0.35 }),
        chip: new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.4 }),
        wireWhite: new THREE.MeshStandardMaterial({ color: 0xefefef, roughness: 0.5 }),
        wireBlack: new THREE.MeshStandardMaterial({ color: 0x232227, roughness: 0.5 }),
        wireRed: new THREE.MeshStandardMaterial({ color: 0xd9383f, roughness: 0.5 }),
        wireOrange: new THREE.MeshStandardMaterial({ color: 0xe8792f, roughness: 0.5 }),
        bottle: new THREE.MeshPhysicalMaterial({ color: 0x3552dc, roughness: 0.1, transparent: true, opacity: 0.62, clearcoat: 1, depthWrite: false }),
        hose: new THREE.MeshPhysicalMaterial({ color: 0xdfe8ff, roughness: 0.15, transparent: true, opacity: 0.4, depthWrite: false }),
        psu: new THREE.MeshStandardMaterial({ map: perfTex, metalness: 0.7, roughness: 0.4 }),
        vent: new THREE.MeshStandardMaterial({ map: ventTex, roughness: 0.6 }),
        piRed: new THREE.MeshStandardMaterial({ color: 0xd8304a, roughness: 0.45 }),
        switchRed: new THREE.MeshStandardMaterial({ color: 0xff2b2b, emissive: 0xff1a1a, emissiveIntensity: 0.15, roughness: 0.4 }),
        crystal: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transparent: true, opacity: 0.7, clearcoat: 1, envMapIntensity: 3, flatShading: true }),
    };
    const EDGE_OFF = new THREE.Color(0xffffff), EDGE_ON = new THREE.Color(0xff9ccf);

    // ---------- geometry helpers ----------
    const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
    const cyl = (rt, rb, h, mat, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    const at = (obj, x, y, z) => { obj.position.set(x, y, z); return obj; };
    const group = (...kids) => { const g = new THREE.Group(); kids.forEach(k => g.add(k)); return g; };

    function acrylicPanel(w, h, d, mat = M.acrylic) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const m = new THREE.Mesh(geo, mat);
        m.renderOrder = 2;
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), M.edge);
        e.renderOrder = 3;
        return group(m, e);
    }

    function tube(points, r, mat) {
        const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
        return new THREE.Mesh(new THREE.TubeGeometry(curve, 48, r, 6, false), mat);
    }

    // ---------- cable helpers ----------
    // Straight runs joined by rounded bends, like a real wire laid along a board.
    function roundedPath(pts, radius = 0.08) {
        const path = new THREE.CurvePath();
        let prev = pts[0].clone();
        for (let i = 1; i < pts.length - 1; i++) {
            const a = pts[i - 1], b = pts[i], c = pts[i + 1];
            const d1 = b.clone().sub(a), d2 = c.clone().sub(b);
            const r = Math.min(radius, d1.length() * 0.5, d2.length() * 0.5);
            const p1 = b.clone().addScaledVector(d1.normalize(), -r);
            const p2 = b.clone().addScaledVector(d2.normalize(), r);
            if (prev.distanceTo(p1) > 1e-4) path.add(new THREE.LineCurve3(prev, p1));
            path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
            prev = p2;
        }
        path.add(new THREE.LineCurve3(prev, pts[pts.length - 1].clone()));
        return path;
    }
    function wire(pts, r, mat, radius) {
        const path = roundedPath(pts, radius);
        const segs = Math.max(12, Math.round(path.getLength() * 40));
        return new THREE.Mesh(new THREE.TubeGeometry(path, segs, r, 8, false), mat);
    }
    // Two wires twisted around a shared centre line (fan / LED leads).
    class TwistCurve extends THREE.Curve {
        constructor(base, r, twistsPerUnit, phase) {
            super();
            this.base = base; this.r = r; this.phase = phase;
            this.turns = twistsPerUnit * base.getLength();
            this.N = 160;
            this.frames = base.computeFrenetFrames(this.N, false);
        }
        getPoint(t, target = new THREE.Vector3()) {
            const p = this.base.getPointAt(t, target);
            const i = Math.min(this.N, Math.round(t * this.N));
            const a = this.phase + t * this.turns * Math.PI * 2;
            return p.addScaledVector(this.frames.normals[i], Math.cos(a) * this.r)
                .addScaledVector(this.frames.binormals[i], Math.sin(a) * this.r);
        }
    }
    function twistedPair(pts, matA, matB, r = 0.014, radius = 0.05) {
        const base = roundedPath(pts, radius);
        const segs = Math.max(30, Math.round(base.getLength() * 110));
        return group(
            new THREE.Mesh(new THREE.TubeGeometry(new TwistCurve(base, r * 1.05, 10, 0), segs, r, 6, false), matA),
            new THREE.Mesh(new THREE.TubeGeometry(new TwistCurve(base, r * 1.05, 10, Math.PI), segs, r, 6, false), matB)
        );
    }
    // Offset a 2D polyline sideways (mitred corners) so parallel wires never cross.
    function offsetPolyline(pts, d) {
        const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
        return pts.map((cur, i) => {
            const prev = pts[i - 1], next = pts[i + 1];
            let n;
            if (!prev) n = nrm(cur, next);
            else if (!next) n = nrm(prev, cur);
            else {
                const n1 = nrm(prev, cur), n2 = nrm(cur, next);
                const k = 1 + n1[0] * n2[0] + n1[1] * n2[1];
                n = [(n1[0] + n2[0]) / k, (n1[1] + n2[1]) / k];
            }
            return [cur[0] + n[0] * d, cur[1] + n[1] * d];
        });
    }

    const rotors = [];
    function rotor(r) {
        const g = new THREE.Group();
        g.add(cyl(r * 0.32, r * 0.32, 0.05, M.label, 20).rotateX(Math.PI / 2));
        const bladeGeo = new THREE.BoxGeometry(r * 0.62, r * 0.32, 0.016);
        for (let i = 0; i < 7; i++) {
            const blade = at(new THREE.Mesh(bladeGeo, M.black), r * 0.58, 0, 0);
            blade.rotation.x = 0.55;
            const pivot = new THREE.Group();
            pivot.rotation.z = (i / 7) * Math.PI * 2;
            pivot.add(blade);
            g.add(pivot);
        }
        rotors.push(g);
        return g;
    }

    function roundFan(r) {
        const housing = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.22, 40, 1, true), M.black);
        housing.rotation.x = Math.PI / 2;
        const ring = at(new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 8, 40), M.black), 0, 0, 0.11);
        const back = at(new THREE.Mesh(new THREE.CircleGeometry(r, 40), M.hole), 0, 0, -0.1);
        const rot = at(rotor(r * 0.9), 0, 0, 0.02);
        const guard = new THREE.Group();
        [0.38, 0.68].forEach(k => guard.add(new THREE.Mesh(new THREE.TorusGeometry(r * k, 0.012, 6, 36), M.black)));
        for (let i = 0; i < 4; i++) { const s = box(r * 2, 0.024, 0.02, M.black); s.rotation.z = (i * Math.PI) / 4; guard.add(s); }
        guard.position.z = 0.12;
        return group(housing, ring, back, rot, guard);
    }

    function squareFan(s, depth = 0.2) {
        const frame = rbox(s, s, depth, s * 0.07, M.black);
        const disc = at(new THREE.Mesh(new THREE.CircleGeometry(s * 0.45, 32), M.hole), 0, 0, depth / 2 + 0.003);
        const rot = at(rotor(s * 0.42), 0, 0, depth / 2 + 0.02);
        return group(frame, disc, rot);
    }

    // ---------- model ----------
    const model = new THREE.Group();
    const assembly = new THREE.Group();
    assembly.position.y = -(Y0 + H) / 2 - 0.15;
    model.add(assembly);
    scene.add(model);

    const parts = [];
    const anchors = {};
    function addPart(obj, home, offset, rot, start, homeRot = [0, 0, 0]) {
        const qHome = new THREE.Quaternion().setFromEuler(new THREE.Euler(...homeRot));
        const qOut = new THREE.Quaternion().setFromEuler(new THREE.Euler(homeRot[0] + rot[0], homeRot[1] + rot[1], homeRot[2] + rot[2]));
        const part = { obj, home: new THREE.Vector3(...home), offset: new THREE.Vector3(...offset), qHome, qOut, start, phase: rand() * Math.PI * 2 };
        assembly.add(obj);
        parts.push(part);
        return part;
    }
    function anchor(name, parent, x, y, z) {
        const o = at(new THREE.Object3D(), x, y, z);
        parent.add(o);
        anchors[name] = o;
    }

    // Base plate + aluminium feet
    addPart(acrylicPanel(W + 0.3, 0.08, D + 0.3), [0, 0.04, 0], [0.3, -3.9, 2.2], [0.9, 0.3, -0.25], 0.0);

    function foot(sx, sz) {
        const g = new THREE.Group();
        g.add(at(box(0.18, 0.62, 0.18, M.alu), 0, 0.31, 0));
        g.add(at(box(0.62, 0.07, 0.16, M.alu), -sx * 0.32, 0.035, 0));
        g.add(at(box(0.16, 0.07, 0.62, M.alu), 0, 0.035, -sz * 0.32));
        g.add(at(cyl(0.035, 0.035, 0.05, M.alu, 10), -sx * 0.48, 0.08, 0));
        g.add(at(cyl(0.035, 0.035, 0.05, M.alu, 10), 0, 0.08, -sz * 0.48));
        return g;
    }
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz], i) => {
        addPart(foot(sx, sz), [sx * (W / 2 + 0.22), 0, sz * (D / 2 + 0.22)],
            [sx * 3.4, -3.2 - i * 0.25, sz * 2.4 + 1.2], [rnd(-1.4, 1.4), rnd(-1.4, 1.4), rnd(-1.4, 1.4)], 0.03 + i * 0.025);
    });

    // Back board with wiring
    const back = new THREE.Group();
    back.add(box(W - 0.06, H - 0.04, 0.05, M.board));
    back.add(at(group(box(0.34, 0.22, 0.03, M.pcb), at(box(0.12, 0.1, 0.06, M.chip), 0.06, 0, 0.03)), 1.45, 0.25, 0.06));
    back.add(at(group(box(0.26, 0.3, 0.03, M.pcbGreen), at(box(0.1, 0.1, 0.05, M.chip), 0, 0.04, 0.03)), 1.2, -0.5, 0.06));
    addPart(back, [0, Y0 + H / 2, -D / 2 + 0.05], [0.8, 0.9, -7.5], [-0.3, 0.55, 0.12], 0.1);

    // Fans
    const bigFan = roundFan(0.52);
    anchor('fan', bigFan, 0, 0, 0.14);
    addPart(bigFan, [-1.2, Y0 + 2.75, -D / 2 + 0.2], [-5.4, 1.4, 2.6], [0.6, 1.1, 0.3], 0.22);
    const smallFan = squareFan(0.48, 0.18);
    addPart(smallFan, [-0.75, Y0 + 4.3, -D / 2 + 0.17], [-3.2, 3.5, 3.4], [-0.8, 0.6, 0.9], 0.26);
    addPart(squareFan(0.8, 0.22), [-W / 2 - 0.14, Y0 + 3.2, -0.3], [-7.0, -2.0, 1.6], [0.9, -0.6, 0.5], 0.5, [0, -Math.PI / 2, 0]);

    // Temperature / humidity sensor
    const dht = group(
        rbox(0.34, 0.5, 0.12, 0.02, M.vent),
        at(box(0.4, 0.62, 0.02, M.pcb), 0, -0.04, -0.07),
        ...[-0.09, -0.03, 0.03, 0.09].map(x => at(box(0.02, 0.14, 0.02, M.alu), x, -0.42, -0.06))
    );
    anchor('dht', dht, 0, 0.05, 0.07);
    addPart(dht, [-0.1, Y0 + 4.85, -D / 2 + 0.15], [-2.5, 3.2, 4.8], [1.2, -0.8, 0.6], 0.3);

    // Water pump
    const pumpMotor = cyl(0.15, 0.15, 0.42, M.alu, 24);
    pumpMotor.rotation.z = Math.PI / 2;
    const pump = group(
        at(pumpMotor, -0.2, 0, 0),
        at(cyl(0.08, 0.08, 0.06, M.wireRed, 16).rotateZ(Math.PI / 2), -0.44, 0, 0),
        at(rbox(0.28, 0.32, 0.28, 0.05, M.white), 0.15, 0, 0),
        at(cyl(0.045, 0.045, 0.22, M.white, 12), 0.15, 0.25, 0),
        at(cyl(0.045, 0.045, 0.22, M.white, 12), 0.15, -0.25, 0),
        tube([[0.15, 0.36, 0], [0.2, 0.8, 0.05], [0.0, 1.4, 0.1], [-0.4, 1.9, 0.12]], 0.035, M.hose)
    );
    anchor('pump', pump, 0.15, 0, 0.16);
    addPart(pump, [1.0, Y0 + 1.75, -D / 2 + 0.28], [4.6, 2.6, 3.0], [0.7, -1.2, -0.5], 0.33);

    // Misting bottles
    function bottle() {
        return group(
            at(box(0.2, 0.9, 0.2, M.bottle), 0, 0.45, 0),
            at(cyl(0.07, 0.07, 0.15, M.white, 12), 0, 0.97, 0),
            at(cyl(0.12, 0.12, 0.2, M.black, 20), 0, 1.13, 0),
            at(cyl(0.135, 0.135, 0.03, M.black, 20), 0, 1.24, 0)
        );
    }
    const bottles = [[-1.6, -1.0, [-4.4, -3.0, 3.6]], [-1.15, -1.0, [-2.7, -3.7, 1.4]], [1.55, -1.0, [5.6, -2.9, 2.4]]];
    bottles.forEach(([x, z, off], i) => {
        const b = bottle();
        if (i === 0) anchor('mist', b, 0, 1.15, 0.12);
        addPart(b, [x, Y0, z], off, [rnd(-1.2, 1.2), rnd(-1.5, 1.5), rnd(-1.2, 1.2)], 0.18 + i * 0.03);
    });

    // Mist nozzles on the left wall
    const dome = new THREE.SphereGeometry(0.14, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const nozzles = new THREE.Group();
    [-0.32, 0.32].forEach(z => {
        const d = at(new THREE.Mesh(dome, M.white), 0.06, 0, z);
        d.rotation.z = -Math.PI / 2;
        nozzles.add(d, at(cyl(0.05, 0.05, 0.12, M.black, 10).rotateZ(Math.PI / 2), 0, 0, z));
    });
    addPart(nozzles, [-W / 2 + 0.08, Y0 + 4.0, -0.55], [-5.8, 3.4, 1.2], [0.4, 1.2, -0.6], 0.36);

    // Side, front panels
    addPart(acrylicPanel(0.06, H, D), [-W / 2, Y0 + H / 2, 0], [-7.6, 0.8, -2.4], [0.15, -0.9, 0.25], 0.4);
    addPart(acrylicPanel(0.06, H, D), [W / 2, Y0 + H / 2, 0], [7.2, -0.9, -2.6], [-0.2, 0.85, -0.2], 0.43);

    // Pot, plant, soil probe
    const potProfile = [[0.001, 0], [0.58, 0], [0.6, 0.04], [0.83, 0.98], [0.86, 1.0], [0.84, 1.02], [0.8, 0.98]].map(([r, y]) => new THREE.Vector2(r, y));
    const rimGeo = new THREE.TorusGeometry(0.88, 0.045, 8, 120);
    const rp = rimGeo.attributes.position;
    for (let i = 0; i < rp.count; i++) {
        const ang = Math.atan2(rp.getY(i), rp.getX(i));
        rp.setZ(i, rp.getZ(i) + Math.sin(ang * 18) * 0.035);
    }
    rimGeo.computeVertexNormals();
    const potRim = at(new THREE.Mesh(rimGeo, M.pot), 0, 1.0, 0);
    potRim.rotation.x = -Math.PI / 2;
    const pot = group(
        new THREE.Mesh(new THREE.LatheGeometry(potProfile, 48), M.pot),
        potRim,
        at(cyl(0.8, 0.8, 0.04, M.soil, 40), 0, 0.96, 0)
    );
    addPart(pot, [0, Y0, 0.35], [2.6, -3.2, 3.6], [0.5, 1.4, -0.4], 0.46);

    const plant = makePlant();
    addPart(plant, [0, Y0 + 0.97, 0.35], [3.2, 0.6, 2.4], [0.3, -1.2, 0.5], 0.52);

    const probe = group(
        box(0.1, 0.7, 0.03, M.black),
        at(box(0.17, 0.13, 0.03, M.pcb), 0, 0.41, 0),
        at(box(0.1, 0.06, 0.06, M.black), 0, 0.49, 0.02)
    );
    anchor('probe', probe, 0, 0.42, 0.03);
    addPart(probe, [0.42, Y0 + 1.15, 0.2], [3.8, -1.0, 5.0], [1.0, 0.6, -1.3], 0.56);

    // Control box (outside, right side)
    const cb = new THREE.Group();
    cb.add(acrylicPanel(0.66, 2.5, 2.2, M.enclosure));
    cb.add(at(box(0.05, 2.3, 2.0, M.alu), -0.29, 0, 0));
    cb.add(at(box(0.3, 1.5, 0.8, M.psu), -0.12, 0.3, -0.58));
    cb.add(at(box(0.14, 1.15, 0.16, M.black), -0.17, 0.3, 0.08));
    for (let i = 0; i < 8; i++) cb.add(at(cyl(0.035, 0.035, 0.04, M.alu, 8).rotateZ(Math.PI / 2), -0.08, -0.18 + i * 0.14, 0.08));
    cb.add(at(box(0.04, 0.55, 0.4, M.pcb), -0.2, 0.68, 0.6));
    [-0.1, 0.1].forEach(dz => cb.add(at(box(0.14, 0.16, 0.14, M.relay), -0.11, 0.68, 0.6 + dz * 1.4)));
    cb.add(at(box(0.04, 0.62, 0.36, M.pcbGreen), -0.2, -0.3, 0.6));
    cb.add(at(box(0.06, 0.16, 0.16, M.chip), -0.15, -0.3, 0.6));
    cb.add(at(box(0.08, 0.34, 0.44, M.black), 0.36, -0.85, 0.55));
    cb.add(at(box(0.05, 0.22, 0.15, M.switchRed), 0.41, -0.85, 0.47));
    cb.add(tube([[0.42, -0.95, 0.7], [0.62, -1.4, 0.9], [0.7, -2.3, 1.2], [0.9, -2.9, 1.7]], 0.045, M.black));
    anchor('control', cb, 0.34, 0.35, 0.4);
    addPart(cb, [W / 2 + 0.42, Y0 + 2.95, -0.35], [7.2, 2.0, -2.2], [0.3, -0.9, 0.4], 0.6);

    // Raspberry Pi case
    const pi = group(rbox(0.28, 0.9, 0.62, 0.05, M.white), at(box(0.06, 0.9, 0.63, M.piRed), -0.12, 0, 0));
    addPart(pi, [W / 2 + 0.2, Y0 + 4.85, -0.55], [5.4, 3.6, 2.6], [-0.5, 0.8, 0.6], 0.64);

    // Top plate with LED canopy
    const top = new THREE.Group();
    top.add(acrylicPanel(W + 0.16, 0.07, D + 0.16));
    const ROWS = 7, COLS = 22;
    const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.025, 0.075), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), ROWS * COLS);
    const LED_OFF = new THREE.Color(0.17, 0.15, 0.19);
    const RED = new THREE.Color(1.0, 0.16, 0.34), BLUE = new THREE.Color(0.3, 0.5, 1.0);
    const ledOn = [], ledRow = [], glowPos = [], glowCol = [];
    const dummy = new THREE.Object3D();
    let li = 0;
    for (let r = 0; r < ROWS; r++) {
        const z = lerp(-D / 2 + 0.35, D / 2 - 0.35, r / (ROWS - 1));
        top.add(at(box(W - 0.4, 0.012, 0.13, M.white), 0, -0.045, z));
        for (let c = 0; c < COLS; c++) {
            const x = lerp(-W / 2 + 0.3, W / 2 - 0.3, c / (COLS - 1));
            const zz = z + Math.sin(x * 1.4 + r) * 0.035;
            dummy.position.set(x, -0.062, zz);
            dummy.updateMatrix();
            leds.setMatrixAt(li, dummy.matrix);
            const col = (c + r * 2) % 4 === 0 ? BLUE : RED;
            ledOn.push(col); ledRow.push(r);
            leds.setColorAt(li, LED_OFF);
            glowPos.push(x, -0.08, zz);
            glowCol.push(col.r, col.g, col.b);
            li++;
        }
    }
    top.add(leds);
    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3));
    glowGeo.setAttribute('color', new THREE.Float32BufferAttribute(glowCol, 3));
    const glowMat = new THREE.PointsMaterial({ size: 0.55, map: glowTex, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    top.add(new THREE.Points(glowGeo, glowMat));
    top.add(at(cyl(0.05, 0.07, 0.14, M.alu, 12), 0, 0.1, 0));
    top.add(at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), M.crystal), 0, 0.3, 0));
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
        top.add(at(box(0.6, 0.18, 0.06, M.alu), sx * (W / 2 - 0.28), -0.13, sz * (D / 2 + 0.04)));
    });
    anchor('led', top, 0.9, -0.08, 0.7);
    addPart(top, [0, Y0 + H + 0.035, 0], [0.4, 4.6, 0.6], [0.6, 0.5, -0.3], 0.68);

    // ---------- wiring harness ----------
    // Wires leave a grommet at the top of the back board as one tied bundle,
    // then peel off at right angles to each component and end in a plug.
    const WM = (color, rough = 0.36) => new THREE.MeshStandardMaterial({ color, roughness: rough });
    const WIRE = {
        red: WM(0xd3242c), black: WM(0x1c1c20), white: WM(0xf1efea), yellow: WM(0xf0bf2a),
        blue: WM(0x2c6fe4), green: WM(0x2f9e57), grey: WM(0x5c5f68, 0.45),
        plug: WM(0x151517, 0.55), socket: WM(0xebe6da, 0.5), tie: WM(0x0e0e10, 0.45),
        clip: WM(0xe8e5ea, 0.6), rubber: WM(0x141416, 0.85),
    };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const homeOf = obj => parts.find(p => p.obj === obj).home;
    // Build in assembly space, then hang it on a part so it moves with that part.
    const attach = (partObj, ...objs) => { const h = homeOf(partObj); objs.forEach(o => { o.position.sub(h); partObj.add(o); }); };

    const WR = 0.019, PITCH = 0.044;
    const Zp = -D / 2 + 0.05 + 0.025 + WR + 0.002;     // wires lying on the board face
    const HX = 0.35;                                   // trunk x
    const HTOP = 4.98;                                 // bundle leaves the grommet here (above Y0)
    const RING1 = 0.054, RING2 = 0.1;

    // Plug housing (+ optional white socket) at the end of a wire group.
    function plug(x, y, z, dir, n, socket = true) {
        const w = n * PITCH + 0.03;
        const g = group(at(box(0.1, w, 0.062, WIRE.plug), 0.05, 0, 0));
        g.add(at(box(0.012, w * 0.6, 0.064, WIRE.socket), 0.02, 0, 0.001)); // latch
        if (socket) g.add(at(box(0.055, w + 0.012, 0.072, WIRE.socket), 0.1275, 0, 0));
        g.position.set(x, y, z);
        g.rotation.z = Math.atan2(dir[1], dir[0]);
        return g;
    }

    const BRANCHES = [
        { colors: ['red', 'black', 'yellow'], route: [[HX, 4.14], [-0.1, 4.14], [-0.1, 4.26]], socket: false },  // temp/humidity sensor pins
        { colors: ['red', 'black'], route: [[HX, 3.94], [-0.34, 3.94]] },                                        // small fan
        { colors: ['white', 'white'], route: [[HX, 3.72], [-1.6, 3.72]] },                                       // misting nozzles
        { colors: ['red', 'black'], route: [[HX, 3.42], [-0.64, 3.42]] },                                        // big fan
        { colors: ['red', 'black', 'blue'], route: [[HX, 2.95], [1.2, 2.95]], socket: false },                    // relay board
        { colors: ['yellow', 'green'], route: [[HX, 2.32], [1.0, 2.32]], socket: false },                         // sensor board
        { colors: ['red', 'black'], route: [[HX, 2.12], [0.64, 2.12], [0.64, 2.02]], socket: false },            // pump motor
        { colors: ['grey'], route: [[HX, 1.62]], thick: true },                                                   // soil probe cable
    ];

    // Give every wire a seat in the round bundle. Wires that run furthest down sit in the
    // core, so the bundle tapers naturally as branches peel off.
    const slots = [{ s: [0, 0], ring: 0 }];
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; slots.push({ s: [Math.cos(a) * RING1, Math.sin(a) * RING1], ring: 1 }); }
    for (let k = 0; k < 12; k++) { const a = ((k + 0.5) / 12) * Math.PI * 2; slots.push({ s: [Math.cos(a) * RING2, Math.sin(a) * RING2], ring: 2 }); }
    const harness = [];
    BRANCHES.forEach(b => {
        const endX = b.route[b.route.length - 1][0];
        const side = Math.sign(endX - HX);
        b.colors.forEach((color, i) => harness.push({ b, i, n: b.colors.length, color, leaveY: b.route[0][1], side }));
    });
    [...harness].sort((a, b) => a.leaveY - b.leaveY).forEach(w => {
        const ring = slots.find(s => !s.used).ring;
        let best = null;
        slots.forEach(s => { if (!s.used && s.ring === ring && (!best || s.s[0] * w.side > best.s[0] * w.side)) best = s; });
        best.used = true;
        w.slot = best.s;
    });

    // The bundle hugs the board: its centre sits one bundle-radius off the board face,
    // and moves closer as wires leave and it gets thinner.
    const wireR = w => (w.b.thick ? 0.033 : WR);
    const bundleZ = (y, margin = 0) => {
        const inside = harness.filter(w => w.leaveY < y - margin);
        if (!inside.length) return Zp;
        return Zp - WR + Math.max(...inside.map(w => Math.hypot(w.slot[0], w.slot[1]) + wireR(w)));
    };
    const leaveYs = [...new Set(harness.map(w => w.leaveY))].sort((a, b) => b - a);

    harness.forEach(w => {
        const { b } = w;
        const r = wireR(w);
        const [sx, sz] = w.slot;
        const full = [[HX, HTOP], ...b.route];
        const off = offsetPolyline(full, (w.i - (w.n - 1) / 2) * PITCH);
        const pts = [
            V(HX + sx * 0.5, Y0 + HTOP + 0.16, Zp - 0.05),   // inside the grommet hole
            V(HX + sx, Y0 + HTOP - 0.04, bundleZ(HTOP) + sz),
        ];
        // step towards the board each time other wires leave the bundle above this wire's exit
        leaveYs.forEach(yb => {
            if (yb >= HTOP - 0.1 || yb < w.leaveY + 0.3) return;
            pts.push(V(HX + sx, Y0 + yb - 0.03, bundleZ(yb + 0.01) + sz));
            pts.push(V(HX + sx, Y0 + yb - 0.15, bundleZ(yb - 0.01) + sz));
        });
        if (b.route.length === 1) {
            pts.push(V(HX + sx, Y0 + b.route[0][1], bundleZ(b.route[0][1] + 0.01) + sz));
        } else {
            pts.push(V(HX + sx, Y0 + off[1][1] + 0.12, bundleZ(off[1][1] + 0.13) + sz));
            for (let k = 1; k < off.length; k++) pts.push(V(off[k][0], Y0 + off[k][1], Zp));
            // tuck the wire end into the plug housing
            const a = pts[pts.length - 2], e = pts[pts.length - 1];
            e.addScaledVector(e.clone().sub(a).normalize(), 0.03);
        }
        attach(back, wire(pts, r, WIRE[w.color], 0.075));
    });

    // Plugs at each branch end
    const probeZ = bundleZ(1.63);
    BRANCHES.forEach(b => {
        const n = b.colors.length;
        const end = b.route[b.route.length - 1];
        const prev = b.route.length > 1 ? b.route[b.route.length - 2] : [HX, HTOP];
        const dir = [Math.sign(end[0] - prev[0]), Math.sign(end[1] - prev[1])];
        attach(back, plug(end[0], Y0 + end[1], b.thick ? probeZ : Zp, dir, b.thick ? 2 : n, b.socket !== false));
        // a saddle clip half-way along long runs
        if (b.route.length > 1 && Math.abs(b.route[1][0] - HX) > 0.6) {
            const cx = (HX + b.route[1][0]) / 2 + (b.route[1][0] < HX ? -0.08 : 0.08);
            const w = n * PITCH + 0.05;
            attach(back,
                at(box(0.12, w + 0.07, 0.012, WIRE.clip), cx, Y0 + b.route[1][1], Zp - WR - 0.004),
                at(box(0.035, w, 0.022, WIRE.clip), cx, Y0 + b.route[1][1], Zp + WR + 0.01));
        }
    });

    // Grommet the bundle comes out of
    const grommet = at(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.034, 10, 32), WIRE.rubber), HX, Y0 + HTOP + 0.16, -D / 2 + 0.085);
    const grommetHole = at(new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), M.hole), HX, Y0 + HTOP + 0.16, -D / 2 + 0.077);
    attach(back, grommet, grommetHole);

    // Cable ties + adhesive mounts down the trunk; each tie fits the wires still in the bundle
    [4.8, 4.36, 3.84, 3.2, 2.66, 2.2, 1.86].forEach(y => {
        const inside = harness.filter(w => w.leaveY < y - 0.12);
        if (!inside.length) return;
        const rr = Math.max(...inside.map(w => Math.hypot(w.slot[0], w.slot[1]) + wireR(w))) + 0.007;
        const zc = bundleZ(y, 0.12);
        const tie = at(new THREE.Mesh(new THREE.TorusGeometry(rr, 0.011, 6, 28), WIRE.tie), HX, Y0 + y, zc);
        tie.rotation.x = Math.PI / 2;
        attach(back, tie,
            at(box(0.034, 0.046, 0.034, WIRE.tie), HX + rr + 0.012, Y0 + y, zc),
            at(box(0.17, 0.17, 0.014, WIRE.clip), HX, Y0 + y, -D / 2 + 0.084));
    });

    // Black spiral wrap around the trunk; wires peel out between the turns
    {
        const pts = [];
        const yTop = HTOP - 0.06, yBot = 2.04, pitch = 0.12;
        const turns = (yTop - yBot) / pitch;
        const steps = Math.round(turns * 18);
        for (let s = 0; s <= steps; s++) {
            const t = s / steps, y = lerp(yTop, yBot, t);
            const inside = harness.filter(w => w.leaveY < y - 0.04);
            const r = Math.max(...inside.map(w => Math.hypot(w.slot[0], w.slot[1]) + wireR(w))) + 0.01;
            const a = t * turns * Math.PI * 2;
            pts.push(V(HX + Math.cos(a) * r, Y0 + y, bundleZ(y, 0.04) + Math.sin(a) * r));
        }
        attach(back, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), steps, 0.01, 5, false), WIRE.tie));
    }

    // Fan leads: short twisted pairs from each fan into its socket
    attach(smallFan, twistedPair([V(-0.53, Y0 + 4.08, -1.4), V(-0.57, Y0 + 3.98, -1.45), V(-0.5, Y0 + 3.94, Zp)], WIRE.red, WIRE.black));
    attach(bigFan, twistedPair([V(-0.83, Y0 + 3.12, -1.36), V(-0.86, Y0 + 3.33, -1.44), V(-0.8, Y0 + 3.42, Zp)], WIRE.red, WIRE.black));

    // Misting nozzles: two white leads along the left wall to their socket
    [[-0.87, -0.022], [-0.23, 0.022]].forEach(([zd, o]) => {
        attach(nozzles, wire([
            V(-1.9, Y0 + 3.94, zd), V(-1.935, Y0 + 3.72 + o, zd - 0.14),
            V(-1.935, Y0 + 3.72 + o, -1.32), V(-1.86, Y0 + 3.72 + o, Zp), V(-1.76, Y0 + 3.72 + o, Zp),
        ], WR * 0.9, WIRE.white, 0.07));
    });

    // Soil probe cable: hangs in a natural curve from the probe back up into its socket
    attach(probe, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        V(0.42, Y0 + 1.68, 0.21), V(0.43, Y0 + 1.86, 0.08), V(0.41, Y0 + 1.74, -0.45),
        V(0.37, Y0 + 1.38, -0.95), V(0.35, Y0 + 1.34, probeZ + 0.06), V(HX, Y0 + 1.46, probeZ),
    ]), 80, 0.03, 8, false), WIRE.grey));

    // LED canopy lead drops from the ceiling into the grommet
    attach(top, twistedPair([V(0.66, Y0 + H - 0.03, -D / 2 + 0.24), V(0.66, Y0 + H - 0.03, -1.5), V(0.62, Y0 + 5.3, -1.5), V(0.5, Y0 + HTOP + 0.2, Zp - 0.04)], WIRE.red, WIRE.black, 0.014, 0.07));

    // Neat wiring inside the control box (control-box local space)
    const cbWire = (pts, mat) => cb.add(wire(pts.map(p => V(...p)), 0.016, mat, 0.05));
    cbWire([[-0.06, 0.78, 0.08], [0.02, 0.78, 0.08], [0.02, 0.78, 0.42], [-0.16, 0.78, 0.42]], WIRE.red);
    cbWire([[-0.06, 0.64, 0.08], [0.05, 0.64, 0.08], [0.05, 0.64, 0.46], [-0.16, 0.64, 0.46]], WIRE.black);
    cbWire([[-0.06, 0.22, 0.08], [0.03, 0.22, 0.08], [0.03, 0.22, 0.3], [0.03, -0.12, 0.3], [-0.16, -0.12, 0.44]], WIRE.yellow);
    cbWire([[-0.06, 0.08, 0.08], [0.0, 0.08, 0.08], [0.0, 0.08, 0.26], [0.0, -0.22, 0.26], [-0.16, -0.22, 0.44]], WIRE.blue);
    cbWire([[-0.1, 0.62, -0.17], [-0.1, 0.62, -0.04], [-0.06, 0.5, -0.04], [-0.06, 0.5, 0.02]], WIRE.red);
    cbWire([[-0.14, 0.55, -0.17], [-0.14, 0.55, -0.06], [-0.06, 0.36, -0.06], [-0.06, 0.36, 0.02]], WIRE.black);
    // Main cable from the control box round the back to the grommet
    attach(cb,
        at(cyl(0.06, 0.06, 0.08, WIRE.rubber, 16).rotateX(Math.PI / 2), W / 2 + 0.3, Y0 + 3.95, -1.46),
        wire([V(W / 2 + 0.3, Y0 + 3.95, -1.46), V(W / 2 + 0.3, Y0 + 3.95, -1.7), V(1.5, Y0 + 3.95, -1.7), V(1.5, Y0 + HTOP + 0.16, -1.7), V(HX, Y0 + HTOP + 0.16, -1.7), V(HX, Y0 + HTOP + 0.16, -1.58)], 0.045, WIRE.grey, 0.2));

    // Front door goes on last
    addPart(acrylicPanel(W + 0.06, H, 0.06), [0, Y0 + H / 2, D / 2], [-5.4, 2.4, 1.0], [0.35, -0.6, 0.12], 0.72);

    // Light that fills the box once the LEDs are on
    const pink = new THREE.PointLight(0xff3d8f, 0, 16, 1.6);
    pink.position.set(0, Y0 + H - 0.7, 0.3);
    const blue = new THREE.PointLight(0x5b7bff, 0, 10, 2);
    blue.position.set(0.8, Y0 + H - 0.6, -0.6);
    assembly.add(pink, blue);

    // Contact shadow + pink floor bounce
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(W + 3.5, D + 3.5), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.01;
    const bounce = new THREE.Mesh(new THREE.PlaneGeometry(W + 6, D + 6), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff3d8f, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending, toneMapped: false }));
    bounce.rotation.x = -Math.PI / 2;
    bounce.position.y = 0.0;
    assembly.add(shadow, bounce);

    // ---------- plant builder ----------
    function makePlant() {
        const g = new THREE.Group();
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.bezierCurveTo(0.17, 0.1, 0.19, 0.4, 0, 0.62);
        shape.bezierCurveTo(-0.19, 0.4, -0.17, 0.1, 0, 0);
        const leafGeo = new THREE.ShapeGeometry(shape, 10);
        const lp = leafGeo.attributes.position;
        for (let i = 0; i < lp.count; i++) {
            const x = lp.getX(i), y = lp.getY(i);
            lp.setZ(i, -1.1 * x * x + 0.2 * y * y);
        }
        leafGeo.computeVertexNormals();
        const UP = new THREE.Vector3(0, 1, 0);
        const stems = [
            { a: 0.3, lean: 0.22, h: 2.6 }, { a: 1.6, lean: 0.32, h: 2.05 }, { a: 2.8, lean: 0.28, h: 2.35 },
            { a: 4.0, lean: 0.36, h: 1.75 }, { a: 5.2, lean: 0.26, h: 2.2 },
        ];
        stems.forEach(s => {
            const dir = new THREE.Vector3(Math.cos(s.a), 0, Math.sin(s.a));
            const perp = new THREE.Vector3(-Math.sin(s.a), 0, Math.cos(s.a));
            const pts = [0, 0.35, 0.7, 1].map(t =>
                dir.clone().multiplyScalar(0.1 + s.lean * t * t * s.h).add(new THREE.Vector3(0, t * s.h, 0)));
            const curve = new THREE.CatmullRomCurve3(pts);
            g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.035, 6), M.stem));
            const n = 8;
            for (let i = 0; i < n; i++) {
                const t = 0.3 + (i / (n - 1)) * 0.68;
                const side = i % 2 ? 1 : -1;
                const leaf = new THREE.Mesh(leafGeo, M.leaf);
                const leafDir = perp.clone().multiplyScalar(side).add(new THREE.Vector3(0, 0.8, 0)).add(dir.clone().multiplyScalar(0.3)).normalize();
                leaf.quaternion.setFromUnitVectors(UP, leafDir);
                leaf.rotateY(side * 0.5);
                leaf.scale.setScalar((0.8 + 0.3 * Math.sin(t * Math.PI)) * (1.05 - t * 0.3));
                leaf.position.copy(curve.getPointAt(t));
                g.add(leaf);
            }
        });
        return g;
    }

    // ---------- callouts (DOM labels pinned to 3D points) ----------
    const calloutLayer = document.getElementById('callouts');
    const CALLOUTS = [
        { key: 'led', side: 'right', title: 'Red + blue grow LEDs', text: 'The wavelengths plants use most for photosynthesis' },
        { key: 'dht', side: 'left', title: 'Temperature & humidity', text: 'Reads the air inside the chamber' },
        { key: 'fan', side: 'left', title: 'Air-flow fans', text: 'Cool the box and move fresh air' },
        { key: 'mist', side: 'left', title: 'Misting system', text: 'Keeps humidity up for tropical plants' },
        { key: 'probe', side: 'right', title: 'Soil moisture probe', text: 'Waters only when the soil is dry' },
        { key: 'pump', side: 'right', title: 'Automatic pump', text: 'Delivers water on schedule or on demand' },
        { key: 'control', side: 'right', title: 'Controller & power', text: 'Microcontroller, relays and power supply' },
    ];
    const calloutEls = CALLOUTS.map((c, i) => {
        const el = document.createElement('div');
        el.className = `callout callout-${c.side}`;
        el.dataset.key = c.key;
        el.style.setProperty('--d', `${i * 70}ms`);
        el.innerHTML = `<span class="callout-dot"></span><span class="callout-line"></span><span class="callout-text"><b>${c.title}</b><small>${c.text}</small></span>`;
        if (calloutLayer) calloutLayer.appendChild(el);
        return {
            el, idx: i, anchor: anchors[c.key], side: c.side, cur: c.side, measured: false, w: 0, h: 0,
            line: el.querySelector('.callout-line'), text: el.querySelector('.callout-text'),
        };
    });

    // ---------- DOM hooks ----------
    const titleEl = stage.querySelector('.hero-title');
    const storyEl = stage.querySelector('.story');
    const countEl = document.getElementById('partCount');
    const totalEl = document.getElementById('partTotal');
    if (totalEl) totalEl.textContent = String(parts.length).padStart(2, '0');

    // ---------- layout ----------
    const view = { w: 1, h: 1, dist: 14, small: false, spread: 1, tan: Math.tan(THREE.MathUtils.degToRad(15)) };
    function resize() {
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        view.w = w; view.h = h;
        view.small = w < 760;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, view.small ? 1.75 : 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        view.tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const fitH = view.small ? 7.6 : 7.7, fitW = 7.8;
        view.dist = Math.max(fitH / 2 / view.tan, fitW / 2 / (view.tan * camera.aspect));
        view.spread = THREE.MathUtils.clamp(camera.aspect / 1.6, 0.42, 1.05);
        calloutEls.forEach(c => { c.measured = false; });
    }
    new ResizeObserver(resize).observe(stage);
    resize();

    // ---------- input / visibility ----------
    const state = { p: 0, ps: 0, mx: 0, my: 0, mxs: 0, mys: 0, visible: true, lastL: -1, lastCount: -1 };
    window.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        state.mx = (e.clientX / window.innerWidth) * 2 - 1;
        state.my = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    new IntersectionObserver(entries => { state.visible = entries[0].isIntersecting; }).observe(track);

    function readScroll() {
        const r = track.getBoundingClientRect();
        const total = r.height - stage.clientHeight;
        state.p = total > 0 ? clamp01(-r.top / total) : 0;
        if (typeof window.__heroP === 'number') state.p = window.__heroP; // testing hook
    }

    // ---------- frame ----------
    const tmpColor = new THREE.Color();
    const v3 = new THREE.Vector3();
    const clock = new THREE.Clock();

    function frame() {
        requestAnimationFrame(frame);
        const dt = Math.min(clock.getDelta(), 0.05);
        if (!state.visible || document.hidden || !stage.clientWidth) return;
        const time = clock.elapsedTime;

        readScroll();
        state.ps = (reduceMotion || typeof window.__heroP === "number") ? state.p : state.ps + (state.p - state.ps) * (1 - Math.exp(-dt * 6));
        if (Math.abs(state.p - state.ps) < 0.0002) state.ps = state.p;
        state.mxs += (state.mx - state.mxs) * (1 - Math.exp(-dt * 3));
        state.mys += (state.my - state.mys) * (1 - Math.exp(-dt * 3));
        const p = state.ps;

        // Timeline (p = 0..1 across the hero)
        const a = range(p, 0.03, 0.5);                                   // assembly
        const aE = easeInOut(a);
        const L = range(p, 0.5, 0.58);                                   // lights on
        const shiftIn = easeInOut(range(p, 0.58, 0.67));
        const shiftOut = easeInOut(range(p, 0.78, 0.86));
        const shift = shiftIn * (1 - shiftOut);
        const story = range(p, 0.6, 0.66) * (1 - range(p, 0.77, 0.82));
        const specs = range(p, 0.86, 0.92);
        const intro = 1 - range(p, 0, 0.06);
        const titleOut = range(p, 0.1, 0.38);
        const counterVis = range(p, 0.02, 0.06) * (1 - range(p, 0.52, 0.58));

        // Parts
        const float = reduceMotion ? 0 : 1;
        let assembled = 0;
        for (const pt of parts) {
            const t = easeOut(range(a, pt.start, pt.start + 0.27));
            if (t > 0.995) assembled++;
            const k = 1 - t;
            pt.obj.position.set(
                pt.home.x + pt.offset.x * view.spread * k,
                pt.home.y + pt.offset.y * k + Math.sin(time * 0.7 + pt.phase) * 0.16 * k * float,
                pt.home.z + pt.offset.z * k
            );
            pt.obj.quaternion.slerpQuaternions(pt.qOut, pt.qHome, t);
            if (k > 0.001 && float) pt.obj.rotateY(Math.sin(time * 0.35 + pt.phase) * 0.25 * k);
        }

        // Model pose
        const specsTurn = easeInOut(range(p, 0.84, 1));
        model.rotation.y = lerp(0.85, -0.5, aE) + (1 - a) * Math.sin(time * 0.15) * 0.12 * float - specsTurn * 0.3 + state.mxs * 0.12;
        model.rotation.x = lerp(0.16, -0.03, aE) + state.mys * 0.05;
        const distK = lerp(view.small ? 1.25 : 1.55, 1.0, aE) + (view.small ? 0.1 : 0.06) * easeInOut(specs);
        const dist = view.dist * distK;
        const halfW = dist * view.tan * camera.aspect;
        const halfH = dist * view.tan;
        if (view.small) {
            model.position.set(0, shift * halfH * 0.4, 0);
            model.scale.setScalar(1 - 0.36 * shift);
        } else {
            model.position.set(shift * halfW * 0.42 + easeInOut(specs) * halfW * 0.1, 0, 0);
            model.scale.setScalar(1);
        }
        camera.position.set(0, lerp(1.7, -0.45, aE), dist);
        camera.lookAt(0, lerp(0.25, 0.3, aE), 0);

        // Lights on
        if (Math.abs(L - state.lastL) > 0.0005) {
            for (let i = 0; i < leds.count; i++) {
                const rowL = clamp01(L * 1.6 - (ledRow[i] / ROWS) * 0.6);
                leds.setColorAt(i, tmpColor.copy(LED_OFF).lerp(ledOn[i], rowL));
            }
            leds.instanceColor.needsUpdate = true;
            const Le = easeInOut(L);
            glowMat.opacity = Le * 0.95;
            pink.intensity = Le * 42;
            blue.intensity = Le * 10;
            bounce.material.opacity = Le * 0.5;
            M.edge.color.copy(EDGE_OFF).lerp(EDGE_ON, Le);
            M.switchRed.emissiveIntensity = 0.15 + Le * 2.4;
            hemi.color.copy(HEMI_OFF).lerp(HEMI_ON, Le);
            key.intensity = lerp(2.4, 1.2, Le);
            root.style.setProperty('--glow', Le.toFixed(3));
            state.lastL = L;
        }
        shadow.material.opacity = aE * 0.9;
        const spin = dt * (16 * easeInOut(L));
        if (spin) rotors.forEach(r => { r.rotation.z += spin; });

        // DOM
        stage.style.setProperty('--intro', intro.toFixed(3));
        stage.style.setProperty('--story', story.toFixed(3));
        stage.style.setProperty('--specs', specs.toFixed(3));
        stage.style.setProperty('--counter', counterVis.toFixed(3));
        if (titleEl) titleEl.style.setProperty('--out', titleOut.toFixed(3));
        if (storyEl) storyEl.classList.toggle('is-active', story > 0.5);
        if (calloutLayer) calloutLayer.classList.toggle('is-active', specs > 0.5);
        if (countEl && assembled !== state.lastCount) {
            countEl.textContent = String(assembled).padStart(2, '0');
            stage.style.setProperty('--assembled', (assembled / parts.length).toFixed(3));
            state.lastCount = assembled;
        }

        renderer.render(scene, camera);

        // Pin callouts to their 3D anchors (after render so matrices are current)
        if (specs > 0.001) layoutCallouts(specs);
    }

    // Dots stay on their 3D point; labels sit to one side and slide up/down (with an
    // angled leader line) so they never overlap each other or leave the screen.
    function layoutCallouts(specs) {
        const L = view.small ? 22 : 56, GAP = view.small ? 6 : 10, EDGE = 12;
        // Parts left of the box's centre are labelled to the left, the rest to the right,
        // so leader lines never cross the box or each other.
        v3.copy(model.position).project(camera);
        const midX = (v3.x * 0.5 + 0.5) * view.w;
        const items = [];
        for (const c of calloutEls) {
            if (!c.measured) {
                c.hidden = c.el.offsetParent === null;
                c.w = c.text.offsetWidth; c.h = c.text.offsetHeight;
                c.measured = true;
            }
            if (c.hidden || !c.anchor) continue;
            c.anchor.getWorldPosition(v3).project(camera);
            const x = (v3.x * 0.5 + 0.5) * view.w;
            const y = (-v3.y * 0.5 + 0.5) * view.h;
            let side = x < midX ? 'left' : 'right';
            const fitsR = x + 22 + c.w <= view.w - EDGE, fitsL = x - 22 - c.w >= EDGE;
            if (side === 'right' && !fitsR && fitsL) side = 'left';
            else if (side === 'left' && !fitsL && fitsR) side = 'right';
            items.push({ c, x, y, side, ty: y });
        }
        const top = view.small ? 72 : 92, bottom = view.h - (view.small ? 130 : 40);
        ['left', 'right'].forEach(s => {
            const col = items.filter(it => it.side === s).sort((a, b) => a.y - b.y);
            for (let k = 0; k < col.length; k++) {
                const it = col[k];
                const min = k ? col[k - 1].ty + col[k - 1].c.h / 2 + GAP + it.c.h / 2 : top + it.c.h / 2;
                it.ty = Math.max(it.y, min);
            }
            for (let k = col.length - 1; k >= 0; k--) {
                const it = col[k];
                const max = k < col.length - 1 ? col[k + 1].ty - col[k + 1].c.h / 2 - GAP - it.c.h / 2 : bottom - it.c.h / 2;
                it.ty = Math.min(it.ty, max);
            }
        });
        for (const it of items) {
            const { c } = it;
            if (it.side !== c.cur) {
                c.el.classList.toggle('callout-left', it.side === 'left');
                c.el.classList.toggle('callout-right', it.side === 'right');
                c.cur = it.side;
            }
            // Label edge sits L px out from the dot, but is pulled back inside the screen
            let tx;
            if (it.side === 'right') tx = Math.min(L + 6, view.w - EDGE - c.w - it.x);
            else tx = Math.max(-L - 6 - c.w, EDGE - it.x);
            const ex = it.side === 'right' ? tx - 6 : tx + c.w + 6, ey = it.ty - it.y;
            const k = easeOut(clamp01(specs * 1.6 - c.idx * 0.08));
            c.el.style.transform = `translate3d(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px, 0)`;
            c.line.style.width = `${Math.hypot(ex, ey).toFixed(1)}px`;
            c.line.style.transform = `rotate(${Math.atan2(ey, ex).toFixed(4)}rad) scaleX(${k.toFixed(3)})`;
            c.text.style.transform = `translate3d(${tx.toFixed(1)}px, ${(ey - c.h / 2).toFixed(1)}px, 0)`;
            c.text.style.opacity = clamp01(k * 2 - 1).toFixed(3);
        }
    }
    frame();
}

function canvasTexture(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

start();
