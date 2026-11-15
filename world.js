/* Closed Won · the living valley.
   The diorama in the middle of the board reacts to the game:
   - every sector has a site that is built up as its markets go from Mapped to Booked;
   - cards and special tiles play short scenes (signal pulse, storm, airship, birds, brain nodes);
   - a train on the rim grows with the leader's pipeline, and balloons rise late in the game. */
import * as THREE from 'three';

const CREAM = '#EFEAE0', DARK = '#22332B', OCHRE = '#B77F3C', GOLD = '#D6A45E', SAGE = '#A9C4B5', CORAL = '#C97B63';
const backOut = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);

export const SITES = { robotics: [1.7, 2.3], lab: [3.3, 2.7], saas: [-0.4, 2.7], health: [2.4, -1.4], security: [0.8, -1.7], materials: [1.75, 0.95] };

export function createWorld(c) {
  const { root, anim, gy, tween, mesh, std, glow, shadow, glowSprite, blinkers, setPlant, brain } = c;
  const box = (w, h, d, m, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const cyl = (r0, r1, h, m, x = 0, y = 0, z = 0, seg = 12) => mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m, x, y, z);
  const cream = std(CREAM), cream2 = std('#CFC8B8'), dark = std(DARK), ochre = std(OCHRE), sage = std(SAGE), coral = std(CORAL);
  const lit = () => glow('#F7D79A', 2.4);
  const pop = g => { if (g.visible) return; g.visible = true; g.scale.setScalar(0.01); tween(650, k => g.scale.setScalar(Math.max(0.01, k)), backOut); };
  const state = {};

  /* ---------- sector sites ---------- */
  const build = {
    robotics(l) {
      l[1].add(box(0.5, 0.26, 0.36, cream, 0, 0.13, 0), box(0.14, 0.18, 0.01, dark, -0.1, 0.09, 0.185), box(0.12, 0.09, 0.01, lit(), 0.12, 0.15, 0.185));
      [-0.17, 0, 0.17].forEach(x => { const r = box(0.17, 0.03, 0.38, ochre, x, 0.31, 0); r.rotation.z = 0.5; l[1].add(r); });
      const arm = (g, x, z, ph) => {
        g.add(cyl(0.07, 0.09, 0.08, dark, x, 0.04, z));
        const p1 = new THREE.Group(); p1.position.set(x, 0.08, z);
        const s1 = box(0.05, 0.3, 0.05, std(GOLD), 0, 0.15, 0), p2 = new THREE.Group(); p2.position.y = 0.3;
        p2.add(box(0.04, 0.24, 0.04, std(GOLD), 0, 0.12, 0), box(0.1, 0.03, 0.03, dark, 0, 0.25, 0));
        p1.add(s1, p2); g.add(p1);
        anim.push(t => { if (!g.visible) return; p1.rotation.y = Math.sin(t * 0.9 + ph) * 1.2; p1.rotation.z = Math.sin(t * 1.3 + ph) * 0.35; p2.rotation.z = 0.9 + Math.sin(t * 1.7 + ph) * 0.5; });
      };
      arm(l[2], 0.45, 0.1, 0);
      l[3].add(box(0.76, 0.05, 0.13, dark, 0.05, 0.05, -0.34));
      const crates = [0, 1, 2].map(i => { const b = box(0.09, 0.08, 0.09, cream, 0, 0.115, -0.34); l[3].add(b); return b; });
      anim.push(t => { if (l[3].visible) crates.forEach((b, i) => { b.position.x = -0.28 + ((t * 0.18 + i / 3) % 1) * 0.66; }); });
      arm(l[3], -0.42, -0.1, 2);
    },
    lab(l) {
      l[1].add(cyl(0.26, 0.29, 0.22, cream, 0, 0.11, 0, 16), mesh(new THREE.SphereGeometry(0.26, 16, 10, 0, 7, 0, 1.57), sage, 0, 0.22, 0), box(0.1, 0.14, 0.01, dark, 0, 0.07, 0.285));
      const scope = new THREE.Group(); scope.position.y = 0.3;
      const tube = cyl(0.045, 0.06, 0.42, dark, 0, 0.16, 0.1); tube.rotation.x = 0.7; scope.add(tube, box(0.05, 0.02, 0.3, dark, 0, 0.19, 0.02));
      l[2].add(scope);
      anim.push(t => { if (l[2].visible) scope.rotation.y = t * 0.25; });
      [[0.42, 0.2], [-0.4, 0.26], [0.1, -0.44]].forEach(p => { const d = mesh(new THREE.SphereGeometry(0.1, 10, 6, 0, 7, 0, 1.1), new THREE.MeshStandardMaterial({ color: CREAM, side: THREE.DoubleSide }), p[0], 0.2, p[1]); d.rotation.x = 2.3; l[3].add(d, cyl(0.012, 0.02, 0.2, dark, p[0], 0.1, p[1], 6)); });
      const beam = cyl(0.02, 0.05, 3.2, new THREE.MeshBasicMaterial({ color: '#CFEBDD', transparent: true, opacity: 0.3, depthWrite: false }), 0, 2, 0, 8);
      l[3].add(beam);
      anim.push(t => { if (l[3].visible) beam.material.opacity = 0.16 + 0.16 * Math.sin(t * 2.4); });
    },
    saas(l) {
      l[1].add(box(0.3, 0.5, 0.3, cream, -0.18, 0.25, 0), box(0.34, 0.03, 0.34, dark, -0.18, 0.515, 0));
      [0.14, 0.28, 0.42].forEach(y => l[1].add(box(0.24, 0.05, 0.01, lit(), -0.18, y, 0.155)));
      l[2].add(box(0.26, 0.86, 0.26, cream2, 0.16, 0.43, -0.04), box(0.3, 0.03, 0.3, dark, 0.16, 0.875, -0.04));
      [0.14, 0.3, 0.46, 0.62, 0.76].forEach(y => l[2].add(box(0.2, 0.05, 0.01, lit(), 0.16, y, 0.095), box(0.01, 0.05, 0.2, lit(), 0.295, y, -0.04)));
      const dish = mesh(new THREE.SphereGeometry(0.09, 10, 6, 0, 7, 0, 1.1), new THREE.MeshStandardMaterial({ color: CREAM, side: THREE.DoubleSide }), 0.16, 0.95, -0.04); dish.rotation.x = 2.2; l[3].add(dish);
      [-0.08, 0, 0.08].forEach((x, i) => { const s = mesh(new THREE.SphereGeometry(0.022, 6, 6), glow(i === 1 ? '#F7D79A' : '#A9E0C8', 4), -0.18 + x, 0.55, 0.1); s.userData.blink = true; blinkers.push(s); l[3].add(s); });
      const cl = mesh(new THREE.IcosahedronGeometry(0.16, 1), new THREE.MeshStandardMaterial({ color: '#E8EEE8', flatShading: true, transparent: true, opacity: 0.92 }), 0, 1.25, 0); cl.scale.set(1.6, 0.7, 1); l[3].add(cl);
      anim.push(t => { if (l[3].visible) { cl.position.y = 1.25 + Math.sin(t * 1.1) * 0.05; cl.position.x = Math.sin(t * 0.4) * 0.12; } });
    },
    health(l) {
      l[1].add(box(0.5, 0.26, 0.34, cream, 0, 0.13, 0), box(0.56, 0.03, 0.4, cream2, 0, 0.275, 0), box(0.12, 0.17, 0.01, dark, -0.12, 0.085, 0.175), box(0.05, 0.15, 0.012, coral, 0.12, 0.15, 0.176), box(0.15, 0.05, 0.012, coral, 0.12, 0.15, 0.176), box(0.1, 0.07, 0.01, lit(), -0.12, 0.2, 0.175));
      l[2].add(cyl(0.24, 0.24, 0.02, dark, 0.62, 0.02, 0, 20));
      const hr = mesh(new THREE.TorusGeometry(0.18, 0.012, 6, 28), glow('#F7D79A', 2.2), 0.62, 0.035, 0); hr.rotation.x = Math.PI / 2; l[2].add(hr);
      const amb = new THREE.Group(); amb.add(box(0.17, 0.09, 0.09, cream, 0, 0.065, 0), box(0.05, 0.03, 0.092, coral, 0.02, 0.07, 0)); const lamp = mesh(new THREE.SphereGeometry(0.02, 6, 6), glow('#F0745A', 4), -0.03, 0.125, 0); lamp.userData.blink = true; blinkers.push(lamp); amb.add(lamp); l[2].add(amb);
      anim.push(t => { if (l[2].visible) { const k = Math.sin(t * 0.6); amb.position.set(-0.05 + k * 0.42, 0, 0.36); amb.rotation.y = Math.cos(t * 0.6) > 0 ? 0 : Math.PI; } });
      const heli = new THREE.Group(), rotor = box(0.42, 0.008, 0.03, dark, 0, 0.07, 0);
      heli.add(box(0.2, 0.09, 0.09, cream, 0, 0, 0), box(0.16, 0.025, 0.025, cream2, -0.17, 0.01, 0), box(0.03, 0.08, 0.01, coral, -0.24, 0.03, 0), rotor); l[3].add(heli);
      anim.push(t => { if (l[3].visible) { const a = t * 0.55; heli.position.set(0.3 + Math.cos(a) * 0.75, 0.95 + Math.sin(t * 1.4) * 0.06, Math.sin(a) * 0.75); heli.rotation.y = -a - Math.PI / 2; rotor.rotation.y = t * 22; } });
    },
    security(l) {
      l[1].add(cyl(0.03, 0.055, 0.9, dark, 0, 0.45, 0, 8), box(0.2, 0.03, 0.2, dark, 0, 0.9, 0), box(0.24, 0.14, 0.2, cream, 0.26, 0.07, 0.1));
      const head = new THREE.Group(); head.position.y = 0.96;
      head.add(box(0.26, 0.14, 0.02, cream, 0, 0.07, 0.03), cyl(0.012, 0.012, 0.1, dark, 0, 0.02, 0, 6));
      l[2].add(head);
      const beam = mesh(new THREE.ConeGeometry(0.5, 2.6, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#D9F0E4', transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }));
      beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.07, 1.35);
      const pivot = new THREE.Group(); pivot.position.y = 0.96; pivot.add(beam); l[3].add(pivot);
      [[0.45, 0.4], [-0.45, 0.4], [0.45, -0.4], [-0.45, -0.4]].forEach(p => { l[3].add(cyl(0.012, 0.012, 0.18, dark, p[0], 0.09, p[1], 6)); const s = mesh(new THREE.SphereGeometry(0.025, 6, 6), glow('#A9E0C8', 4), p[0], 0.2, p[1]); s.userData.blink = true; blinkers.push(s); l[3].add(s); });
      anim.push(t => { head.rotation.y = pivot.rotation.y = t * 0.8; });
    },
    materials(l) {
      const truck = (g, ph) => {
        const tr = new THREE.Group(); tr.add(box(0.16, 0.1, 0.1, cream, -0.04, 0.09, 0), box(0.08, 0.08, 0.1, ochre, 0.09, 0.08, 0), box(0.26, 0.03, 0.09, dark, 0, 0.03, 0)); g.add(tr);
        anim.push(t => { if (!g.visible) return; const a = t * 0.32 + ph, x = 0.95 + Math.cos(a) * 1.05, z = -0.55 + Math.sin(a) * 0.62; tr.position.set(x, gy(SITES.materials[0] + x, SITES.materials[1] + z) - gy(SITES.materials[0], SITES.materials[1]), z); tr.rotation.y = -a - Math.PI / 2; });
      };
      l[1].add(box(0.2, 0.14, 0.16, cream, 0, 0.07, 0), box(0.24, 0.03, 0.2, ochre, 0, 0.155, 0));
      truck(l[2], 0);
      truck(l[3], Math.PI);
      l[3].add(box(0.14, 0.2, 0.14, cream2, 0.3, 0.1, 0.1), box(0.06, 0.06, 0.01, lit(), 0.3, 0.12, 0.172));
    }
  };

  Object.keys(SITES).forEach(key => {
    const [x, z] = SITES[key], g = new THREE.Group();
    g.position.set(x, gy(x, z) - 0.02, z);
    const lot = new THREE.Group(), rope = new THREE.MeshBasicMaterial({ color: CREAM, transparent: true, opacity: 0.45 });
    [[-0.34, -0.26], [0.34, -0.26], [0.34, 0.26], [-0.34, 0.26]].forEach(p => lot.add(cyl(0.012, 0.012, 0.16, dark, p[0], 0.08, p[1], 5)));
    lot.add(box(0.68, 0.008, 0.008, rope, 0, 0.13, -0.26), box(0.68, 0.008, 0.008, rope, 0, 0.13, 0.26), box(0.008, 0.008, 0.52, rope, -0.34, 0.13, 0), box(0.008, 0.008, 0.52, rope, 0.34, 0.13, 0));
    const lv = [null, new THREE.Group(), new THREE.Group(), new THREE.Group()];
    build[key](lv);
    for (let i = 1; i <= 3; i++) { lv[i].visible = false; shadow(lv[i]); g.add(lv[i]); }
    const flagMat = new THREE.MeshStandardMaterial({ color: CREAM, side: THREE.DoubleSide, roughness: 0.6 }), flag = new THREE.Group();
    const cloth = mesh(new THREE.PlaneGeometry(0.3, 0.17).translate(0.15, 0, 0), flagMat, 0, 0.72, 0);
    flag.add(cyl(0.014, 0.018, 0.84, dark, 0, 0.42, 0, 6), cloth); flag.position.set(-0.52, 0, 0.42); flag.visible = false;
    anim.push(t => { if (flag.visible) cloth.rotation.y = Math.sin(t * 3 + x) * 0.4; });
    const halo = mesh(new THREE.TorusGeometry(0.78, 0.022, 6, 48), new THREE.MeshBasicMaterial({ color: CREAM, transparent: true, opacity: 0.8 }), 0, 0.06, 0);
    halo.rotation.x = Math.PI / 2; halo.visible = false;
    anim.push(t => { if (halo.visible) { halo.scale.setScalar(1 + 0.05 * Math.sin(t * 2.5)); halo.material.opacity = 0.55 + 0.25 * Math.sin(t * 2.5); } });
    g.add(lot, flag, halo);
    root.add(g);
    state[key] = { g, lot, lv, flag, flagMat, halo, level: 0, color: null, full: false };
  });

  /* ---------- train on the rim: one more wagon for every $1M the leader holds ---------- */
  const R = 5.5, train = [], wagonMat = std(GOLD, { roughness: 0.5, emissive: GOLD, emissiveIntensity: 0.25 });
  for (let i = 0; i < 6; i++) {
    const w = new THREE.Group();
    if (i === 0) { w.add(box(0.34, 0.15, 0.13, dark, 0, 0.1, 0), box(0.12, 0.1, 0.12, std(OCHRE), -0.1, 0.22, 0), cyl(0.028, 0.035, 0.12, dark, 0.1, 0.23, 0, 8)); const lamp = mesh(new THREE.SphereGeometry(0.026, 6, 6), glow('#F7D79A', 4), 0.175, 0.12, 0); w.add(lamp); }
    else w.add(box(0.28, 0.11, 0.12, wagonMat, 0, 0.09, 0), box(0.3, 0.02, 0.13, dark, 0, 0.02, 0));
    w.visible = i < 1; shadow(w); root.add(w); train.push(w);
  }
  let wagons = 1;
  anim.push(t => train.forEach((w, i) => { if (!w.visible) return; const a = t * 0.16 - i * 0.068; w.position.set(Math.sin(a) * R, 0.3, Math.cos(a) * R); w.rotation.y = a; }));

  /* ---------- balloons: they rise once the leader passes $3M ---------- */
  const balloons = [GOLD, CORAL, SAGE].map((col, i) => {
    const b = new THREE.Group(), env = mesh(new THREE.SphereGeometry(0.26, 14, 12), std(col, { roughness: 0.6 }), 0, 0.3, 0); env.scale.y = 1.2;
    b.add(env, mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 20), std(CREAM), 0, 0.3, 0), box(0.09, 0.07, 0.09, std(OCHRE), 0, -0.08, 0), cyl(0.004, 0.004, 0.16, dark, 0.05, 0.02, 0, 4), cyl(0.004, 0.004, 0.16, dark, -0.05, 0.02, 0, 4));
    b.children[1].rotation.x = Math.PI / 2; b.visible = false; shadow(b); root.add(b);
    anim.push(t => { if (!b.visible) return; const a = t * 0.05 + i * 2.1; b.position.set(Math.cos(a) * (2.6 + i * 0.8), 2.6 + i * 0.5 + Math.sin(t * 0.5 + i) * 0.18, Math.sin(a) * (2.6 + i * 0.8)); });
    return b;
  });

  /* ---------- short scenes ---------- */
  const [bx, by, bz] = brain;
  const pulse = mesh(new THREE.TorusGeometry(1, 0.03, 6, 72), new THREE.MeshBasicMaterial({ color: CREAM, transparent: true, opacity: 0, depthWrite: false }), bx, by + 0.25, bz); pulse.rotation.x = Math.PI / 2; root.add(pulse);
  const flare = glowSprite('#F7D79A', 1.4); flare.material.opacity = 0; root.add(flare);
  const nodes = [];
  anim.push(t => nodes.forEach((n, i) => { const a = t * (0.5 + (i % 3) * 0.14) + i * 1.7, r = 1.3 + (i % 4) * 0.13; n.position.set(bx + Math.cos(a) * r, by + 1.75 + Math.sin(a * 1.3 + i) * 0.45, bz + Math.sin(a) * r); }));

  const storm = new THREE.Group(), stormMat = new THREE.MeshStandardMaterial({ color: '#1B2A22', flatShading: true, roughness: 1, transparent: true, opacity: 0 });
  [[0, 0, 0, 1.1], [1.1, -0.1, 0.3, 0.8], [-1.0, -0.12, -0.2, 0.85], [0.3, 0.3, -0.6, 0.7]].forEach(q => { const m = mesh(new THREE.IcosahedronGeometry(q[3], 1), stormMat, q[0], q[1], q[2]); m.scale.y = 0.55; storm.add(m); });
  const bolts = [[-0.5, 0.2], [0.6, -0.3], [0.1, 0.5]].map(p => { const bolt = new THREE.Group(), bm = new THREE.MeshBasicMaterial({ color: '#FFF3C4', transparent: true, opacity: 0 }); [[0, -0.5, 0.25], [0.14, -1.0, -0.3], [-0.04, -1.5, 0.28], [0.1, -2.0, -0.2]].forEach(s => { const b = box(0.045, 0.56, 0.045, bm, p[0] + s[0], s[1], p[1]); b.rotation.z = s[2]; bolt.add(b); }); bolt.userData.mat = bm; storm.add(bolt); return bolt; });
  storm.position.set(0, 4.3, 0); storm.visible = false; root.add(storm);

  const ship = new THREE.Group(), hull = mesh(new THREE.SphereGeometry(0.5, 20, 12), std(CREAM, { roughness: 0.5 })); hull.scale.set(2.3, 0.72, 0.72);
  ship.add(hull, box(0.5, 0.14, 0.2, std(OCHRE), 0, -0.42, 0), box(0.02, 0.44, 0.5, std(GOLD), -1.05, 0, 0), box(0.5, 0.02, 0.5, std(GOLD), -1.0, 0, 0));
  [-0.5, 0, 0.5].forEach(x => ship.add(mesh(new THREE.TorusGeometry(0.345 - Math.abs(x) * 0.09, 0.012, 6, 30), std(GOLD), x, 0, 0)));
  ship.children.slice(4).forEach(r => { r.rotation.y = Math.PI / 2; }); ship.visible = false; shadow(ship); root.add(ship);

  const flock = new THREE.Group(), birdMat = new THREE.MeshBasicMaterial({ color: '#0D1A11', side: THREE.DoubleSide }), wings = [];
  for (let i = 0; i < 11; i++) { const b = new THREE.Group(), row = Math.ceil(i / 2), side = i % 2 ? 1 : -1; [1, -1].forEach(s => { const w = mesh(new THREE.PlaneGeometry(0.16, 0.05).translate(0.08 * s, 0, 0), birdMat); w.rotation.x = -Math.PI / 2; w.userData.s = s; b.add(w); wings.push(w); }); b.position.set(-row * 0.3, (i % 3) * 0.06, i ? side * row * 0.26 : 0); flock.add(b); }
  flock.visible = false; root.add(flock);
  anim.push(t => { if (flock.visible) wings.forEach((w, i) => { w.rotation.y = w.userData.s * Math.sin(t * 9 + i * 0.3) * 0.7; }); });

  const scenes = {
    signal(color) {
      pulse.material.color.set(color || CREAM);
      tween(1600, k => { pulse.scale.setScalar(0.3 + k * 5.2); pulse.material.opacity = 0.9 * (1 - k); });
      flare.material.color.set(color || '#F7D79A');
      tween(1500, k => { flare.position.set(bx, by + 1.9 + k * 4.5, bz); flare.material.opacity = Math.sin(k * Math.PI); flare.scale.setScalar(1.4 + k * 1.4); });
    },
    learning(color) {
      if (nodes.length >= 14) return;
      const n = mesh(new THREE.SphereGeometry(0.06, 8, 8), glow(color || '#A9E0C8', 3.2));
      root.add(n); nodes.push(n); n.scale.setScalar(0.01); tween(700, k => n.scale.setScalar(Math.max(0.01, k)), backOut);
      scenes.signal('#A9E0C8');
    },
    storm() {
      storm.visible = true;
      tween(4200, k => {
        stormMat.opacity = Math.min(1, k * 5, (1 - k) * 4) * 0.92;
        storm.position.x = -0.6 + k * 1.2;
        bolts.forEach((b, i) => { const t0 = 0.22 + i * 0.2, d = k - t0; b.userData.mat.opacity = d > 0 && d < 0.09 ? (Math.floor(d * 90) % 2 ? 0.25 : 1) : 0; });
      }, k => k).then(() => { storm.visible = false; });
    },
    airship() {
      ship.visible = true;
      tween(11000, k => { ship.position.set(-8 + k * 16, 3.9 + Math.sin(k * 9) * 0.12, -2.4 + k * 4.4); ship.rotation.y = -0.27; }, k => k).then(() => { ship.visible = false; });
    },
    birds() {
      flock.visible = true;
      tween(7000, k => { flock.position.set(-7 + k * 14, 3.1 + Math.sin(k * 6) * 0.25, 2.6 - k * 4.6); flock.rotation.y = 0.32; }, k => k).then(() => { flock.visible = false; });
    }
  };

  setPlant(0);
  return {
    /* level 0–3 = the highest stage among the sector's markets; color = who leads it; full = one owner holds all three */
    sector(key, level, color, full) {
      const s = state[key];
      if (!s) return;
      if (level !== s.level) {
        for (let i = 1; i <= 3; i++) { if (i <= level) pop(s.lv[i]); else s.lv[i].visible = false; }
        s.lot.visible = level === 0;
        if (key === 'materials') setPlant(level / 3);
        s.level = level;
      }
      if (color !== s.color) { s.flag.visible = !!color; if (color) { s.flagMat.color.set(color); s.halo.material.color.set(color); } s.color = color; }
      if (full !== s.full) { s.halo.visible = !!full; s.full = full; }
    },
    leader(pipeline, color) {
      const n = Math.min(6, 1 + Math.floor(pipeline / 1000));
      if (color) { wagonMat.color.set(color); wagonMat.emissive.set(color); }
      if (n !== wagons) { train.forEach((w, i) => { if (i < n && !w.visible) pop(w); else if (i >= n) w.visible = false; }); wagons = n; }
      const up = pipeline >= 3000;
      balloons.forEach(b => { if (up) pop(b); else b.visible = false; });
    },
    event(kind, color) { if (scenes[kind]) scenes[kind](color); },
    reset() {
      Object.keys(state).forEach(k => this.sector(k, 0, null, false));
      this.leader(0, GOLD);
      nodes.splice(0).forEach(n => root.remove(n));
    }
  };
}
