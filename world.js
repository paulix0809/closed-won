/* Closed Won · the living valley.
   The diorama in the middle of the board reacts to the game:
   - every sector has a site that is built up as its markets go from Mapped to Booked;
   - cards and special tiles play short scenes (signal pulse, storm, airship, birds, brain nodes);
   - a train on the rim grows with the leader's pipeline, and balloons rise late in the game. */
import * as THREE from 'three';

const CREAM = '#EFEAE0', DARK = '#22332B', OCHRE = '#B77F3C', GOLD = '#D6A45E', SAGE = '#A9C4B5', CORAL = '#C97B63';
const backOut = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);

export const SITES = { robotics: [1.7, 2.3], lab: [3.3, 2.7], saas: [-0.4, 2.7], health: [2.4, -1.4], security: [0.8, -1.7], materials: [1.75, 0.95] };

/* the valley's five ages and the leader's pipeline ($K) at which each one begins */
export const AGES = ['Ancient', 'Medieval', 'Industrial', 'Modern', 'Future'];
const AGE_AT = [0, 700, 1500, 2600, 3800];

export function createWorld(c) {
  const { root, anim, gy, tween, mesh, std, glow, shadow, glowSprite, blinkers, setPlant, brain, plant, brainParts } = c;
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
  let wagons = 1, trainY = 0.3;
  anim.push(t => train.forEach((w, i) => { if (!w.visible) return; const a = t * 0.16 - i * 0.068; w.position.set(Math.sin(a) * R, trainY, Math.cos(a) * R); w.rotation.y = a; }));

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

  /* ---------- ages: from an ancient settlement to the future, as the leader's pipeline climbs ---------- */
  const sand = std('#D8C9A0', { flatShading: true }), stone = std('#9AA598', { flatShading: true }), straw = std('#C9A35E', { flatShading: true }), wood = std('#6B4A2B'), litShared = glow('#F7D79A', 2.2);
  const put = (g, x, z) => { g.position.set(x, gy(x, z) - 0.02, z); return g; };
  const heritage = new THREE.Group(), ancient = new THREE.Group(), medieval = new THREE.Group(), city = new THREE.Group(), spires = new THREE.Group();
  [heritage, ancient, medieval, city, spires].forEach(g => { g.visible = false; root.add(g); });

  /* Ancient: a step pyramid and obelisks that stay for the whole game, huts, campfires and an ox caravan */
  const pyr = new THREE.Group();
  [0.9, 0.68, 0.46, 0.24].forEach((w, i) => pyr.add(box(w, 0.16, w, sand, 0, 0.08 + i * 0.16, 0)));
  const cap = mesh(new THREE.ConeGeometry(0.1, 0.14, 4), std(GOLD, { metalness: 0.7, roughness: 0.3, envMapIntensity: 1 }), 0, 0.71, 0); cap.rotation.y = Math.PI / 4; pyr.add(cap);
  heritage.add(put(pyr, 3.7, -0.9));
  [[1.55, 0.75], [-1.15, 0.8]].forEach(p => { const o = new THREE.Group(); o.add(cyl(0.03, 0.07, 0.62, sand, 0, 0.31, 0, 4), mesh(new THREE.ConeGeometry(0.045, 0.08, 4), std(GOLD, { metalness: 0.7, roughness: 0.3 }), 0, 0.66, 0)); heritage.add(put(o, p[0], p[1])); });
  [[1.3, 1.7], [-0.9, 1.5], [1.5, 0.1], [0.9, -0.5], [-0.3, 3.5], [0.6, 2.0], [-2.9, 2.6]].forEach(p => { const h = new THREE.Group(); h.add(cyl(0.13, 0.14, 0.14, std('#B9A27A', { flatShading: true }), 0, 0.07, 0, 8), mesh(new THREE.ConeGeometry(0.2, 0.2, 8), straw, 0, 0.24, 0), box(0.05, 0.09, 0.01, dark, 0, 0.045, 0.14)); ancient.add(put(h, p[0], p[1])); });
  const fires = [[1.05, 1.45], [-0.6, 1.75], [1.2, -0.2]].map(p => { const f = new THREE.Group(), fl = mesh(new THREE.ConeGeometry(0.05, 0.14, 5), glow('#FF9A4D', 3.2), 0, 0.09, 0), gl = glowSprite('#FF9A4D', 0.7); gl.position.y = 0.12; f.add(cyl(0.07, 0.08, 0.03, dark, 0, 0.015, 0, 6), fl, gl); f.userData.fl = fl; ancient.add(put(f, p[0], p[1])); return f; });
  anim.push(t => { if (ancient.visible) fires.forEach((f, i) => { const k = 0.8 + 0.3 * Math.sin(t * 9 + i * 2) * Math.sin(t * 5.3 + i); f.userData.fl.scale.set(k, k * 1.2, k); }); });
  const carts = [0, 1, 2].map(i => { const cart = new THREE.Group(); cart.add(box(0.2, 0.09, 0.11, i ? wood : std('#3B2A18'), 0, 0.1, 0)); if (i) cart.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), straw, 0, 0.17, 0)); else cart.add(box(0.07, 0.07, 0.06, std('#3B2A18'), 0.12, 0.13, 0)); [-0.07, 0.07].forEach(x => [-0.06, 0.06].forEach(z => { const w = cyl(0.035, 0.035, 0.015, dark, x, 0.04, z, 8); w.rotation.x = Math.PI / 2; cart.add(w); })); shadow(cart); root.add(cart); return cart; });
  anim.push(t => carts.forEach((cart, i) => { if (!cart.visible) return; const a = t * 0.05 - i * 0.055; cart.position.set(Math.sin(a) * R, 0.3, Math.cos(a) * R); cart.rotation.y = a; }));

  /* Medieval: a castle on the hill and a windmill */
  const castle = new THREE.Group();
  castle.add(cyl(0.2, 0.22, 0.6, stone, 0, 0.3, 0, 8), cyl(0.24, 0.24, 0.06, stone, 0, 0.63, 0, 8), cyl(0.11, 0.12, 0.42, stone, 0.36, 0.21, 0.1, 6), cyl(0.11, 0.12, 0.42, stone, -0.36, 0.21, 0.1, 6), box(0.72, 0.24, 0.08, stone, 0, 0.12, 0.12), mesh(new THREE.ConeGeometry(0.14, 0.2, 6), std(CORAL, { flatShading: true }), 0.36, 0.52, 0.1), mesh(new THREE.ConeGeometry(0.14, 0.2, 6), std(CORAL, { flatShading: true }), -0.36, 0.52, 0.1), box(0.1, 0.14, 0.01, dark, 0, 0.07, 0.165));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; castle.add(box(0.07, 0.07, 0.07, stone, Math.cos(a) * 0.2, 0.69, Math.sin(a) * 0.2)); }
  const mill = new THREE.Group(), blades = new THREE.Group();
  mill.add(cyl(0.1, 0.16, 0.42, cream, 0, 0.21, 0, 8), mesh(new THREE.ConeGeometry(0.13, 0.14, 8), ochre, 0, 0.49, 0));
  for (let i = 0; i < 4; i++) { const p = new THREE.Group(); p.rotation.z = (i * Math.PI) / 2; p.add(box(0.045, 0.34, 0.008, wood, 0, 0.17, 0)); blades.add(p); }
  blades.position.set(0, 0.4, 0.15); mill.add(blades);
  anim.push(t => { if (medieval.visible) blades.rotation.z = t * 1.1; });
  medieval.add(put(castle, 0.2, 3.95), put(mill, -1.3, 3.5));

  /* Modern: a downtown of towers, planes overhead and traffic around the valley */
  [[0, 0, 1.3], [0.3, 0.14, 0.9], [-0.28, 0.16, 1.05], [0.12, -0.32, 0.75], [-0.22, -0.26, 1.5], [0.42, -0.2, 0.6]].forEach((q, i) => {
    const tw = new THREE.Group(), w = 0.2 + (i % 2) * 0.04;
    tw.add(box(w, q[2], w, i % 2 ? cream2 : std('#3D4A44', { roughness: 0.4, metalness: 0.3 }), 0, q[2] / 2, 0));
    for (let y = 0.14; y < q[2] - 0.06; y += 0.16) tw.add(box(w * 0.8, 0.05, 0.01, litShared, 0, y, w / 2 + 0.006), box(0.01, 0.05, w * 0.8, litShared, w / 2 + 0.006, y, 0));
    const b = mesh(new THREE.SphereGeometry(0.02, 6, 6), glow('#F0745A', 4), 0, q[2] + 0.04, 0); b.userData.blink = true; blinkers.push(b); tw.add(b);
    tw.position.set(q[0], 0, q[1]); city.add(tw);
  });
  put(city, -2.7, 0.2);
  const planes = [0, 1].map(i => { const p = new THREE.Group(); p.add(box(0.34, 0.05, 0.05, cream, 0, 0, 0), box(0.07, 0.012, 0.4, cream2, 0.02, 0, 0), box(0.05, 0.08, 0.012, coral, -0.15, 0.04, 0)); p.visible = false; root.add(p); anim.push(t => { if (!p.visible) return; const d = i ? -1 : 1, a = t * 0.22 * d + i * 3; p.position.set(Math.cos(a) * 4.3, 3.3 + i * 0.5, Math.sin(a) * 4.3); p.rotation.y = -(a + Math.PI / 2) + (d < 0 ? Math.PI : 0); }); return p; });
  const carN = 26, carPos = new Float32Array(carN * 3), carGeo = new THREE.BufferGeometry(); carGeo.setAttribute('position', new THREE.BufferAttribute(carPos, 3));
  const carMat = new THREE.PointsMaterial({ color: '#FFD9A0', size: 0.11, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }), cars = new THREE.Points(carGeo, carMat);
  cars.visible = false; cars.frustumCulled = false; root.add(cars);
  let carY = 0.34;
  anim.push(t => { if (!cars.visible) return; for (let i = 0; i < carN; i++) { const a = t * 0.12 * (i % 2 ? 1 : -1) + i * 0.9, r = 4.95 - (i % 2) * 0.5; carPos[i * 3] = Math.cos(a) * r; carPos[i * 3 + 1] = carY + (carY > 1 ? Math.sin(t + i) * 0.15 : 0); carPos[i * 3 + 2] = Math.sin(a) * r; } carGeo.attributes.position.needsUpdate = true; });

  /* Future: ships circling the centre, a mothership over the brain, orbital rings and floating spires */
  const shipMat = std('#E8EEF0', { roughness: 0.3, metalness: 0.6, envMapIntensity: 1 }), trailMat = new THREE.MeshBasicMaterial({ color: '#9FE8FF', transparent: true, opacity: 0.45 });
  const ships = [[2.6, 2.4, 0.5, 1], [3.6, 3.1, 0.38, -1], [4.5, 2.0, 0.3, 1], [1.9, 3.6, 0.62, -1], [5.0, 4.0, 0.26, 1], [3.1, 1.6, 0.45, -1]].map((q, i) => {
    const sh = new THREE.Group(), body = mesh(new THREE.ConeGeometry(0.085, 0.52, 8), shipMat); body.rotation.z = -Math.PI / 2;
    const eng = glowSprite('#7FE0FF', 0.55); eng.position.x = -0.3;
    sh.add(body, box(0.16, 0.02, 0.44, std('#8FA79B', { metalness: 0.5, roughness: 0.4 }), -0.1, 0, 0), box(0.1, 0.1, 0.02, dark, -0.2, 0.06, 0), eng, box(0.6, 0.018, 0.018, trailMat, -0.6, 0, 0));
    const inner = new THREE.Group(); inner.scale.setScalar(1.9); while (sh.children.length) inner.add(sh.children[0]); sh.add(inner);
    sh.visible = false; root.add(sh);
    anim.push(t => { if (!sh.visible) return; const a = t * q[2] * q[3] + i * 1.3; sh.position.set(Math.cos(a) * q[0], q[1] + Math.sin(t * 0.7 + i) * 0.22, Math.sin(a) * q[0]); sh.rotation.y = -(a + Math.PI / 2) + (q[3] < 0 ? Math.PI : 0); sh.rotation.x = q[3] * 0.25; });
    return sh;
  });
  const mother = new THREE.Group(), saucer = mesh(new THREE.SphereGeometry(0.8, 28, 14), std('#C9D2D0', { roughness: 0.25, metalness: 0.7, envMapIntensity: 1 })); saucer.scale.y = 0.24;
  const mbeam = mesh(new THREE.ConeGeometry(0.7, 3.2, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#BFF3E2', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }), 0, -1.7, 0);
  const mring = mesh(new THREE.TorusGeometry(0.8, 0.025, 6, 48), glow('#7FE0FF', 3)); mring.rotation.x = Math.PI / 2;
  mother.add(saucer, mesh(new THREE.SphereGeometry(0.32, 18, 10, 0, 7, 0, 1.57), glow('#A9E0C8', 1.6), 0, 0.1, 0), mbeam, mring);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, l = mesh(new THREE.SphereGeometry(0.035, 6, 6), glow('#F7D79A', 4), Math.cos(a) * 0.62, -0.12, Math.sin(a) * 0.62); l.userData.blink = true; blinkers.push(l); mother.add(l); }
  mother.visible = false; root.add(mother);
  anim.push(t => { if (!mother.visible) return; mother.position.set(bx + Math.cos(t * 0.2) * 0.5, 5.3 + Math.sin(t * 0.6) * 0.12, bz + Math.sin(t * 0.2) * 0.5); mother.rotation.y = t * 0.3; mbeam.material.opacity = 0.08 + 0.07 * Math.sin(t * 2); });
  const orbit = new THREE.Group(), o1 = mesh(new THREE.TorusGeometry(4.5, 0.02, 6, 120), glow('#A9E0C8', 1.5)), o2 = mesh(new THREE.TorusGeometry(3.3, 0.015, 6, 100), glow('#7FE0FF', 1.5));
  o1.rotation.x = 1.25; o2.rotation.x = 1.9; o2.rotation.y = 0.5; orbit.add(o1, o2); orbit.position.y = 3.2; orbit.visible = false; root.add(orbit);
  anim.push(t => { if (orbit.visible) { o1.rotation.z = t * 0.12; o2.rotation.z = -t * 0.2; orbit.rotation.y = t * 0.05; } });
  [[4.4, 0.6], [-4.2, -1.6], [0.9, -4.3], [-1.9, 4.2]].forEach((q, i) => {
    const sp = new THREE.Group(), h = 1.8 + i * 0.3, ringS = mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 28), glow('#A9E0C8', 3), 0, h * 0.75, 0), pad = cyl(0.26, 0.2, 0.04, std('#C9D2D0', { metalness: 0.6, roughness: 0.3 }), 0, h + 0.3, 0, 14);
    ringS.rotation.x = Math.PI / 2;
    sp.add(box(0.1, h, 0.1, std('#2A3A38', { roughness: 0.3, metalness: 0.6 }), 0, h / 2, 0), box(0.02, h * 0.9, 0.105, glow('#7FE0FF', 2.6), 0, h / 2, 0), ringS, pad);
    spires.add(put(sp, q[0], q[1]));
    anim.push(t => { if (spires.visible) pad.position.y = h + 0.3 + Math.sin(t * 1.2 + i) * 0.08; });
  });

  /* before the Industrial age a sector's site is a camp, then a hamlet; in the Future a drone hovers over it */
  Object.keys(state).forEach(k => {
    const s = state[k], p0 = new THREE.Group(), p1 = new THREE.Group();
    [[-0.2, 0.1], [0.2, -0.08], [0, 0.3]].forEach(q => p0.add(mesh(new THREE.ConeGeometry(0.15, 0.22, 5), straw, q[0], 0.11, q[1])));
    [[-0.22, 0.05], [0.2, -0.1], [0.02, 0.3]].forEach(q => { const h = new THREE.Group(), r = mesh(new THREE.ConeGeometry(0.17, 0.13, 4), ochre, 0, 0.215, 0); r.rotation.y = Math.PI / 4; h.add(box(0.2, 0.15, 0.17, cream, 0, 0.075, 0), r); h.position.set(q[0], 0, q[1]); p1.add(h); });
    const drone = glowSprite('#7FE0FF', 0.5); drone.position.y = 1.5;
    anim.push(t => { if (drone.visible) drone.position.y = 1.5 + Math.sin(t * 1.5 + s.g.position.x) * 0.12; });
    shadow(p0); shadow(p1); p0.visible = p1.visible = drone.visible = false;
    s.g.add(p0, p1, drone); s.p0 = p0; s.p1 = p1; s.drone = drone;
  });

  let era = -1;
  function refreshSite(s, key) {
    const modern = era >= 2;
    for (let i = 1; i <= 3; i++) { if (modern && i <= s.level) pop(s.lv[i]); else s.lv[i].visible = false; }
    [s.p0, s.p1].forEach((p, n) => { const on = !modern && era === n && s.level > 0; p.visible = on; if (on) p.children.forEach((ch, i) => { ch.visible = i < s.level; }); });
    s.lot.visible = s.level === 0;
    s.drone.visible = era >= 4 && s.level > 0;
    if (key === 'materials') setPlant(modern ? s.level / 3 : 0);
  }
  function applyEra(n, quiet) {
    era = n;
    const within = (a, b) => n >= a && n <= b, one = (o, on) => { if (on) pop(o); else o.visible = false; };
    [[heritage, 0, 4], [ancient, 0, 1], [medieval, 1, 4], [city, 3, 4], [spires, 4, 4]].forEach(q => {
      const on = within(q[1], q[2]);
      if (on && !q[0].visible) { q[0].visible = true; if (!quiet) q[0].children.forEach((ch, i) => { ch.scale.setScalar(0.01); setTimeout(() => tween(650, k => ch.scale.setScalar(Math.max(0.01, k)), backOut), i * 90); }); }
      else if (!on) q[0].visible = false;
    });
    carts.forEach(o => one(o, n < 2));
    plant.visible = n >= 2;
    train.forEach((w, i) => one(w, n >= 2 && i < wagons));
    trainY = n >= 4 ? 0.46 : 0.3; wagonMat.emissiveIntensity = n >= 4 ? 1.3 : 0.25;
    balloons.forEach(o => one(o, within(2, 3)));
    planes.forEach(o => one(o, n === 3));
    cars.visible = n >= 3; carY = n >= 4 ? 1.5 : 0.34; carMat.color.set(n >= 4 ? '#7FE0FF' : '#FFD9A0');
    ships.forEach(o => one(o, n >= 4)); one(mother, n >= 4); one(orbit, n >= 4);
    brainParts.ring1.visible = n >= 1; brainParts.cage.visible = brainParts.nodes.visible = n >= 2; brainParts.ring2.visible = n >= 3;
    Object.keys(state).forEach(k => refreshSite(state[k], k));
  }

  applyEra(0, true);
  return {
    /* level 0–3 = the highest stage among the sector's markets; color = who leads it; full = one owner holds all three */
    sector(key, level, color, full) {
      const s = state[key];
      if (!s) return;
      if (level !== s.level) { s.level = level; refreshSite(s, key); }
      if (color !== s.color) { s.flag.visible = !!color; if (color) { s.flagMat.color.set(color); s.halo.material.color.set(color); } s.color = color; }
      if (full !== s.full) { s.halo.visible = !!full; s.full = full; }
    },
    /* returns the age the valley is in; ages only move forward during a game */
    leader(pipeline, color) {
      wagons = Math.min(6, 1 + Math.floor(pipeline / 1000));
      if (color) { wagonMat.color.set(color); wagonMat.emissive.set(color); }
      let e = 0;
      AGE_AT.forEach((v, i) => { if (pipeline >= v) e = i; });
      if (e > era) { applyEra(e); scenes.signal(color || CREAM); }
      else train.forEach((w, i) => { if (era >= 2 && i < wagons) pop(w); else w.visible = false; });
      return era;
    },
    event(kind, color) { if (scenes[kind]) scenes[kind](color); },
    reset() {
      wagons = 1;
      Object.keys(state).forEach(k => this.sector(k, 0, null, false));
      applyEra(0, true);
      nodes.splice(0).forEach(n => root.remove(n));
    }
  };
}
