/* Closed Won · 3D board (three.js) */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorld, SITES } from './world.js';

const N = 30, D = (Math.PI * 2) / N;
const R_IN = 5.62, R_OUT = 9.8, Y = 0.25, LANE = 9.12, LABEL = 7.68, PLOT = 6.28;
const INK = '#0D1A11', CREAM = '#F2EFE6', GOLD = '#D6A45E', SUN = '#F7D79A', OCHRE = '#B77F3C', SAGE = '#A9C4B5', SAGE4 = '#6B9A82';
const SANS = '"Cabinet Grotesk", "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif', SERIF = 'Fraunces, "Iowan Old Style", Georgia, serif';

const easeIO = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const backOut = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }

const std = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0, envMapIntensity: 0.35 }, o));
const glow = (color, k = 3) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 });
const metal = color => new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.1 });

function ringSeg(r0, r1, a0, a1) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, a0, a1, false);
  s.absarc(0, 0, r0, a1, a0, true);
  s.closePath();
  return s;
}
function extrude(shape, depth, bevel = 0.025) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  return g;
}
function shadow(m, cast = true, receive = true) { m.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } }); return m; }
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }

/* ---------- canvas textures ---------- */
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

function icon(x, kind, cx, cy, s, col) {
  x.save();
  x.translate(cx, cy);
  x.scale(s / 100, s / 100);
  x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 9; x.lineCap = 'round'; x.lineJoin = 'round';
  const line = (...p) => { x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.stroke(); };
  if (kind === 'kickoff') { line(-42, -36, -8, 0, -42, 36); line(0, -36, 34, 0, 0, 36); }
  else if (kind === 'signal') { x.beginPath(); x.arc(0, 26, 9, 0, 7); x.fill(); [26, 48, 70].forEach(r => { x.beginPath(); x.arc(0, 26, r, -Math.PI * 0.78, -Math.PI * 0.22); x.stroke(); }); }
  else if (kind === 'brain') { const pts = [[0, -44], [38, -22], [38, 22], [0, 44], [-38, 22], [-38, -22]]; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); x.stroke(); x.lineWidth = 5; pts.forEach(p => line(0, 0, p[0], p[1])); pts.concat([[0, 0]]).forEach(p => { x.beginPath(); x.arc(p[0], p[1], 9, 0, 7); x.fill(); }); }
  else if (kind === 'spam') { rr(x, -46, -32, 92, 64, 8); x.stroke(); line(-46, -30, 0, 6, 46, -30); x.lineWidth = 11; line(20, 4, 50, 34); line(50, 4, 20, 34); }
  else if (kind === 'board') { line(-40, 36, -40, 6); line(-14, 36, -14, -14); line(12, 36, 12, -30); line(38, 36, 38, -8); line(-52, 44, 50, 44); }
  else if (kind === 'mail') { rr(x, -46, -32, 92, 64, 8); x.stroke(); line(-46, -30, 0, 6, 46, -30); }
  else if (kind === 'chat') { rr(x, -46, -38, 92, 60, 14); x.stroke(); line(-18, 22, -26, 42, 4, 22); x.beginPath(); [-20, 0, 20].forEach(d => { x.moveTo(d + 5, -8); x.arc(d, -8, 5, 0, 7); }); x.fill(); }
  else if (kind === 'phone') { rr(x, -26, -46, 52, 92, 12); x.stroke(); line(-8, -32, 8, -32); x.beginPath(); x.arc(0, 30, 5, 0, 7); x.fill(); }
  else if (kind === 'tent') { line(-50, 40, 0, -40, 50, 40, -50, 40); line(0, -40, 0, 40); line(0, -40, 0, -54); line(0, -54, 18, -47, 0, -40); }
  x.restore();
}

function wrapName(name) {
  const w = name.split(' ');
  if (w.length === 1) return [name];
  let best = null;
  for (let i = 1; i < w.length; i++) {
    const a = w.slice(0, i).join(' '), b = w.slice(i).join(' ');
    const score = Math.max(a.length, b.length);
    if (!best || score < best.score) best = { score, lines: [a, b] };
  }
  return best.lines;
}

function labelTexture(t, sector, owner) {
  const c = document.createElement('canvas');
  c.width = 384; c.height = 448;
  const x = c.getContext('2d');
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const fit = (lines, size, weight, maxW) => { do { x.font = `${weight} ${size}px ${SANS}`; size -= 2; } while (Math.max(...lines.map(l => x.measureText(l).width)) > maxW && size > 20); return size + 2; };
  /* once a tile is mapped, the price gives way to a pill with the owner's name in the owner's colour */
  const ownerPill = () => {
    const s = owner.name.toUpperCase();
    fit([s], 40, 800, 292);
    const w = x.measureText(s).width + 60;
    rr(x, (384 - w) / 2, 336, w, 72, 36);
    x.fillStyle = owner.color; x.fill();
    x.lineWidth = 5; x.strokeStyle = INK; x.stroke();
    x.fillStyle = INK; x.fillText(s, 192, 374);
  };
  if (t.type === 'market') {
    x.font = `800 23px ${SANS}`;
    const s = sector.name.toUpperCase(), w = x.measureText(s).width + 44;
    rr(x, (384 - w) / 2, 22, w, 42, 21);
    x.fillStyle = sector.color; x.fill();
    x.fillStyle = INK; x.fillText(s, 192, 44);
    const lines = wrapName(t.name), size = fit(lines, 68, 800, 356);
    x.fillStyle = CREAM;
    lines.forEach((l, i) => x.fillText(l, 192, 190 + (i - (lines.length - 1) / 2) * size * 1.06));
    if (owner) ownerPill();
    else {
      x.font = `500 84px ${SERIF}`;
      x.fillStyle = '#F3C178';
      x.fillText('$' + t.price + 'K', 192, 378);
    }
  } else {
    const kind = t.type === 'channel' ? t.icon : t.type;
    const col = { kickoff: INK, spam: '#F0A58C', brain: SAGE, signal: SUN, board: CREAM }[t.type] || SUN;
    icon(x, kind, 192, 120, 150, col);
    const lines = wrapName(t.name), size = fit(lines, 64, 800, 350);
    x.fillStyle = t.type === 'kickoff' ? INK : CREAM;
    lines.forEach((l, i) => x.fillText(l, 192, 268 + (i - (lines.length - 1) / 2) * size * 1.06));
    x.font = `500 ${t.type === 'channel' ? 76 : 40}px ${SERIF}`;
    x.fillStyle = t.type === 'kickoff' ? INK : '#F3C178';
    const sub = { channel: '$' + t.price + 'K', kickoff: '+$150K each lap', signal: 'Draw a card', brain: 'Draw a learning', spam: 'Lose a turn', board: 'Pay 12%' }[t.type];
    if (owner && t.type === 'channel') ownerPill(); else x.fillText(sub, 192, 384);
  }
  return tex(c);
}

function diceTexture(n) {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const x = c.getContext('2d');
  x.fillStyle = '#F6F2E8'; x.fillRect(0, 0, 160, 160);
  const g = x.createRadialGradient(60, 50, 10, 80, 80, 120);
  g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(201,194,180,.55)');
  x.fillStyle = g; x.fillRect(0, 0, 160, 160);
  const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[n];
  P.forEach(p => { x.beginPath(); x.arc(80 + p[0] * 40, 80 + p[1] * 40, n === 1 ? 24 : 15, 0, 7); x.fillStyle = n === 1 ? OCHRE : INK; x.fill(); });
  return tex(c);
}

function deckTexture(kind) {
  const c = document.createElement('canvas');
  c.width = 300; c.height = 420;
  const x = c.getContext('2d'), brain = kind === 'brain';
  x.fillStyle = brain ? '#1F4D45' : '#8F5F2A'; x.fillRect(0, 0, 300, 420);
  x.strokeStyle = brain ? SAGE : SUN; x.lineWidth = 5; rr(x, 16, 16, 268, 388, 18); x.stroke();
  x.lineWidth = 1.5; x.globalAlpha = 0.35;
  for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(150, 190, 24 + i * 22, 0, 7); x.stroke(); }
  x.globalAlpha = 1;
  icon(x, kind, 150, 180, 150, brain ? SAGE : SUN);
  x.textAlign = 'center'; x.fillStyle = CREAM; x.font = `800 34px ${SANS}`;
  x.fillText(brain ? 'GTM BRAIN' : 'SIGNAL', 150, 340);
  return tex(c);
}

function bannerTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 128);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `800 72px ${SANS}`;
  x.fillText(text, 256, 68);
  return tex(c);
}

function iconTexture(kind, bg, fg) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 256, 256);
  icon(x, kind, 128, 128, 190, fg);
  return tex(c);
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 512;
  const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#060D09'); g.addColorStop(0.45, '#0D1A11'); g.addColorStop(0.78, '#173527'); g.addColorStop(1, '#2A4A36');
  x.fillStyle = g; x.fillRect(0, 0, 16, 512);
  return tex(c);
}

function glowSprite(color, size) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color); g.addColorStop(0.25, color + 'AA'); g.addColorStop(1, color + '00');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  s.scale.setScalar(size);
  return s;
}

/* ---------- valley diorama in the middle of the board ---------- */
function buildValley(root, anim) {
  const river = new THREE.CatmullRomCurve3([[-1.5, -1.5], [-0.9, -0.3], [-1.9, 0.9], [-1.5, 2.2], [-2.6, 3.3], [-3.5, 4.4]].map(p => new THREE.Vector3(p[0], 0, p[1]))).getPoints(48);
  const riverDist = (x, z) => { let d = 9; for (const p of river) d = Math.min(d, Math.hypot(p.x - x, p.z - z)); return d; };
  const noise = (x, z) => 0.5 + 0.5 * Math.sin(x * 1.7 + Math.sin(z * 2.3) * 1.3) * Math.cos(z * 1.3 + x * 0.7);
  const hgt = (x, z) => {
    const r = Math.hypot(x, z);
    let h = 0.1 + 0.12 * noise(x, z);
    h += 3.4 * Math.exp(-((x + 1.9) ** 2 + (z + 2.3) ** 2) / 1.5);
    h += 2.2 * Math.exp(-((x - 1.7) ** 2 + (z + 2.9) ** 2) / 1.1);
    h += 1.3 * Math.exp(-((x + 3.5) ** 2 + (z + 0.5) ** 2) / 0.9);
    h += 0.55 * Math.exp(-((x - 3.3) ** 2 + (z - 2.7) ** 2) / 1.6);
    h += 0.5 * Math.exp(-((x - 0.2) ** 2 + (z - 3.9) ** 2) / 1.4);
    const d = riverDist(x, z);
    if (d < 0.42 && h < 1.2) h = THREE.MathUtils.lerp(0.02, h, smooth(0.12, 0.42, d));
    return h * smooth(5.5, 4.7, r) + 0.02;
  };

  const K = 26, S = 84, pos = [], idx = [];
  pos.push(0, hgt(0, 0), 0);
  for (let k = 1; k <= K; k++) for (let s = 0; s < S; s++) {
    const r = (k / K) * 5.5, a = (s / S) * Math.PI * 2 + (k % 2) * (Math.PI / S);
    const x = r * Math.cos(a), z = r * Math.sin(a);
    pos.push(x, hgt(x, z), z);
  }
  for (let s = 0; s < S; s++) idx.push(0, 1 + ((s + 1) % S), 1 + s);
  for (let k = 1; k < K; k++) for (let s = 0; s < S; s++) {
    const a = 1 + (k - 1) * S + s, b = 1 + (k - 1) * S + ((s + 1) % S), c = 1 + k * S + s, d = 1 + k * S + ((s + 1) % S);
    idx.push(a, b, c, b, d, c);
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo = geo.toNonIndexed();
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), c2 = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3, h = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const n = noise(x * 2.1, z * 2.1);
    if (riverDist(x, z) < 0.2 && h < 0.3) c.set('#7FB8A4').lerp(c2.set('#A9D4C2'), n * 0.5);
    else if (h > 2.25) c.set('#F4F3EA').lerp(c2.set('#D5E0D8'), n * 0.4);
    else if (h > 1.05) c.set('#5C6F61').lerp(c2.set('#8A988A'), n * 0.7);
    else if (h > 0.42) c.set('#24553D').lerp(c2.set('#2F6A4C'), n);
    else c.set('#33694D').lerp(c2.set('#4C8A66'), n);
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const land = mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, envMapIntensity: 0.25 }), 0, 0.14, 0);
  land.castShadow = true; land.receiveShadow = true;
  root.add(land);
  const gy = (x, z) => hgt(x, z) + 0.14;

  /* trees */
  const cone = (r, h, y) => { const g = new THREE.ConeGeometry(r, h, 6); g.translate(0, y, 0); return g; };
  const treeGeo = mergeGeometries([cone(0.25, 0.4, 0.3), cone(0.19, 0.36, 0.52), cone(0.12, 0.3, 0.74)]);
  const trunkGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.16, 5); trunkGeo.translate(0, 0.07, 0);
  const spots = [], rnd = rng(11);
  const blocked = [[0.2, 0.9, 1.5], [2.9, 0.2, 1.25], [-3.5, 1.8, 0.9], [-1.7, 1.55, 0.5]].concat(Object.values(SITES).map(p => [p[0], p[1], 0.85]));
  let guard = 0;
  while (spots.length < 150 && guard++ < 4000) {
    const a = rnd() * 7, r = Math.sqrt(rnd()) * 5.2, x = r * Math.cos(a), z = r * Math.sin(a), h = hgt(x, z);
    if (h > 1.25 || riverDist(x, z) < 0.42 || blocked.some(b => Math.hypot(x - b[0], z - b[1]) < b[2])) continue;
    spots.push([x, z, 0.7 + rnd() * 0.8, rnd()]);
  }
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9, envMapIntensity: 0.2 }), spots.length);
  const trunks = new THREE.InstancedMesh(trunkGeo, std('#3B2A18'), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), v = new THREE.Vector3();
  spots.forEach((s, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s[3] * 6);
    m4.compose(v.set(s[0], gy(s[0], s[1]) - 0.02, s[1]), q, sc.setScalar(s[2]));
    trees.setMatrixAt(i, m4); trunks.setMatrixAt(i, m4);
    trees.setColorAt(i, c.set('#1E4A35').lerp(c2.set('#3A7A58'), s[3]));
  });
  trees.castShadow = trunks.castShadow = true; trees.receiveShadow = true;
  root.add(trees, trunks);

  /* rocks */
  const rockGeo = new THREE.DodecahedronGeometry(0.14, 0), rockMat = std('#7A887C', { flatShading: true });
  for (let i = 0; i < 26; i++) {
    const a = rnd() * 7, r = 1 + rnd() * 4.2, x = r * Math.cos(a), z = r * Math.sin(a);
    const m = mesh(rockGeo, rockMat, x, gy(x, z) + 0.02, z);
    m.scale.set(0.6 + rnd(), 0.5 + rnd() * 0.7, 0.6 + rnd()); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    m.castShadow = true; root.add(m);
  }

  /* cement plant */
  const plant = new THREE.Group(), wall = std('#E8E1D2'), wall2 = std('#C9C2B4'), ochre = std(OCHRE), lit = glow('#F7D79A', 2.6);
  plant.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.56, 16), wall, -0.55, 0.28, 0), mesh(new THREE.SphereGeometry(0.17, 16, 8, 0, 7, 0, 1.57), wall, -0.55, 0.56, 0));
  plant.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.68, 16), wall2, -0.18, 0.34, 0.04), mesh(new THREE.SphereGeometry(0.17, 16, 8, 0, 7, 0, 1.57), wall2, -0.18, 0.68, 0.04));
  plant.add(mesh(new THREE.BoxGeometry(0.26, 1.15, 0.26), wall, 0.22, 0.575, 0), mesh(new THREE.BoxGeometry(0.32, 0.05, 0.32), ochre, 0.22, 1.17, 0));
  for (let i = 0; i < 4; i++) plant.add(mesh(new THREE.BoxGeometry(0.28, 0.02, 0.28), wall2, 0.22, 0.25 + i * 0.24, 0), mesh(new THREE.BoxGeometry(0.06, 0.07, 0.01), lit, 0.2, 0.36 + i * 0.24, 0.135));
  const kiln = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.95, 14), ochre, 0.82, 0.3, 0); kiln.rotation.z = Math.PI / 2 - 0.16; plant.add(kiln);
  [0.6, 0.9, 1.1].forEach(x => { const t = mesh(new THREE.TorusGeometry(0.085, 0.018, 6, 16), std('#2A2A2A'), x, 0.3 + (0.82 - x) * 0.16, 0); t.rotation.y = Math.PI / 2; plant.add(t); });
  plant.add(mesh(new THREE.BoxGeometry(0.08, 0.22, 0.14), wall2, 0.62, 0.11, 0), mesh(new THREE.BoxGeometry(0.08, 0.16, 0.14), wall2, 1.02, 0.08, 0));
  plant.add(mesh(new THREE.BoxGeometry(0.36, 0.3, 0.34), wall2, 1.46, 0.15, 0), mesh(new THREE.BoxGeometry(0.4, 0.04, 0.38), ochre, 1.46, 0.32, 0), mesh(new THREE.BoxGeometry(0.1, 0.1, 0.01), lit, 1.42, 0.16, 0.175));
  plant.add(mesh(new THREE.CylinderGeometry(0.04, 0.055, 1.3, 10), wall, 0.5, 0.65, -0.26), mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.07, 10), ochre, 0.5, 1.06, -0.26), mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.07, 10), ochre, 0.5, 1.2, -0.26));
  const beacon = mesh(new THREE.SphereGeometry(0.03, 8, 8), glow('#F0A58C', 4), 0.5, 1.33, -0.26); plant.add(beacon);
  let plantK = 1;
  const puffs = [];
  for (let i = 0; i < 4; i++) { const s = mesh(new THREE.IcosahedronGeometry(0.1, 1), new THREE.MeshStandardMaterial({ color: '#F2EFE6', transparent: true, opacity: 0.7, flatShading: true }), 0.5, 1.4, -0.26); plant.add(s); puffs.push(s); }
  plant.position.set(2.5, gy(2.9, 0.2) - 0.02, 0.2); plant.rotation.y = -0.5; plant.scale.setScalar(1.15);
  shadow(plant); puffs.forEach(s => { s.castShadow = false; });
  root.add(plant);
  anim.push(t => {
    puffs.forEach((s, i) => { const k = (t * 0.25 + i / 4) % 1; s.position.set(0.5 + k * 0.5, 1.4 + k * 0.95, -0.26 - k * 0.2); s.scale.setScalar(0.5 + k * 1.6); s.material.opacity = 0.75 * (1 - k) * plantK; });
    beacon.material.emissiveIntensity = 2 + 3 * (Math.sin(t * 4) > 0.2);
  });

  /* village + bridge */
  const roof = std(OCHRE, { flatShading: true });
  [[-3.5, 1.75, 0.3], [-3.15, 1.4, 1.2], [-3.75, 1.3, 2.1], [-3.3, 2.1, 0.8], [-3.9, 1.95, 1.6], [3.6, 2.2, 0.4], [3.2, 2.7, 1.9]].forEach((h, i) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.26, 0.2, 0.22), wall, 0, 0.1, 0));
    const r = mesh(new THREE.ConeGeometry(0.22, 0.17, 4), roof, 0, 0.285, 0); r.rotation.y = Math.PI / 4; g.add(r);
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.07, 0.01), lit, 0.04, 0.1, 0.115));
    if (i === 1) { g.add(mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), wall, 0.24, 0.25, 0)); const sp = mesh(new THREE.ConeGeometry(0.1, 0.26, 4), roof, 0.24, 0.63, 0); sp.rotation.y = Math.PI / 4; g.add(sp); }
    g.position.set(h[0], gy(h[0], h[1]) - 0.02, h[1]); g.rotation.y = h[2];
    root.add(shadow(g));
  });
  const bridge = new THREE.Group();
  bridge.add(mesh(new THREE.BoxGeometry(0.9, 0.06, 0.26), std('#C9C2B4'), 0, 0.2, 0), mesh(new THREE.BoxGeometry(0.1, 0.22, 0.26), wall2, -0.4, 0.1, 0), mesh(new THREE.BoxGeometry(0.1, 0.22, 0.26), wall2, 0.4, 0.1, 0));
  [-0.12, 0.12].forEach(z => bridge.add(mesh(new THREE.BoxGeometry(0.9, 0.05, 0.02), wall2, 0, 0.27, z)));
  bridge.position.set(-1.72, 0.14, 1.55); bridge.rotation.y = -0.25;
  root.add(shadow(bridge));

  /* the GTM brain */
  const bx = 0.2, bz = 0.9, by = gy(bx, bz);
  const stone = std('#8A988A', { flatShading: true });
  root.add(shadow(mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.14, 10), stone, bx, by + 0.03, bz)), shadow(mesh(new THREE.CylinderGeometry(0.62, 0.8, 0.26, 8), std('#A9B3A6', { flatShading: true }), bx, by + 0.2, bz)), shadow(mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.5, 8), stone, bx, by + 0.55, bz)));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; root.add(shadow(mesh(new THREE.BoxGeometry(0.1, 0.5 + (i % 2) * 0.22, 0.1), std('#A9B3A6', { flatShading: true }), bx + Math.cos(a) * 0.86, by + 0.3, bz + Math.sin(a) * 0.86))); root.add(mesh(new THREE.SphereGeometry(0.045, 8, 8), glow('#F7D79A', 3.2), bx + Math.cos(a) * 0.86, by + 0.6 + (i % 2) * 0.11, bz + Math.sin(a) * 0.86)); }
  const brain = new THREE.Group();
  const core = mesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshStandardMaterial({ color: '#F3C178', emissive: '#E8A94E', emissiveIntensity: 2.2, flatShading: true, roughness: 0.3 }));
  const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.66, 1)), new THREE.LineBasicMaterial({ color: '#CFE6D9', transparent: true, opacity: 0.85 }));
  const nodes = new THREE.Points(new THREE.IcosahedronGeometry(0.66, 1), new THREE.PointsMaterial({ color: '#FFF3D6', size: 0.085, fog: false }));
  const ring1 = mesh(new THREE.TorusGeometry(0.95, 0.018, 8, 80), glow('#F7D79A', 2.4)), ring2 = mesh(new THREE.TorusGeometry(1.12, 0.012, 8, 80), glow('#A9C4B5', 2));
  const halo = glowSprite('#F7D79A', 4.6);
  brain.add(core, cage, nodes, ring1, ring2, halo);
  brain.position.set(bx, by + 1.75, bz);
  root.add(brain);
  const light = new THREE.PointLight(0xffcf87, 14, 9, 2); light.position.set(bx, by + 1.8, bz); root.add(light);
  anim.push(t => {
    brain.position.y = by + 1.75 + Math.sin(t * 1.3) * 0.08;
    core.rotation.set(t * 0.4, t * 0.6, 0); cage.rotation.set(-t * 0.25, t * 0.3, t * 0.1); nodes.rotation.copy(cage.rotation);
    ring1.rotation.set(1.2 + Math.sin(t * 0.5) * 0.3, t * 0.7, 0); ring2.rotation.set(0.5, -t * 0.5, 1 + Math.cos(t * 0.4) * 0.3);
    const k = 0.8 + 0.2 * Math.sin(t * 2.2);
    light.intensity = 14 * k; halo.material.opacity = 0.55 * k; core.material.emissiveIntensity = 2.2 * k;
  });

  /* clouds */
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#C4CEC5', flatShading: true, roughness: 1, transparent: true, opacity: 0.94, envMapIntensity: 0.2 });
  const blob = (r, x, y, z) => { const g = new THREE.IcosahedronGeometry(r, 1); g.translate(x, y, z); return g; };
  const cloudGeo = mergeGeometries([blob(0.42, 0, 0, 0), blob(0.3, 0.45, -0.05, 0.1), blob(0.26, -0.42, -0.06, -0.05), blob(0.22, 0.12, 0.16, -0.2)]);
  cloudGeo.scale(1, 0.62, 1);
  const clouds = [];
  for (let i = 0; i < 6; i++) { const m = mesh(cloudGeo, cloudMat); m.castShadow = true; m.scale.setScalar(0.8 + rnd() * 0.9); root.add(m); clouds.push([m, 2.2 + rnd() * 4.4, 3.5 + rnd() * 1.5, rnd() * 7, 0.02 + rnd() * 0.035]); }
  anim.push(t => clouds.forEach(cl => { const a = cl[3] + t * cl[4]; cl[0].position.set(Math.cos(a) * cl[1], cl[2] + Math.sin(t * 0.4 + cl[3]) * 0.1, Math.sin(a) * cl[1]); }));

  /* fireflies */
  const fN = 110, fp = new Float32Array(fN * 3), fs = [];
  for (let i = 0; i < fN; i++) { const a = rnd() * 7, r = rnd() * 9.6; fs.push([r * Math.cos(a), 0.5 + rnd() * 2.4, r * Math.sin(a), rnd() * 7, 0.3 + rnd() * 0.6]); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  root.add(new THREE.Points(fg, new THREE.PointsMaterial({ color: '#FFE2A8', size: 0.075, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
  anim.push(t => { fs.forEach((f, i) => { fp[i * 3] = f[0] + Math.sin(t * f[4] + f[3]) * 0.4; fp[i * 3 + 1] = f[1] + Math.sin(t * f[4] * 1.7 + f[3]) * 0.3; fp[i * 3 + 2] = f[2] + Math.cos(t * f[4] + f[3]) * 0.4; }); fg.attributes.position.needsUpdate = true; });
  return { gy, brain: [bx, by, bz], setPlant: v => { plantK = v; }, plant, brainParts: { cage, nodes, ring1, ring2 } };
}

/* ---------- buildings: Mapped → Reach → Booked ---------- */
function makeBuilding(stage, color) {
  /* the building itself wears the owner's colour: walls in the colour, roofs in a deeper tone of it, cream only as trim */
  const g = new THREE.Group(), own = std(color, { roughness: 0.6, emissive: color, emissiveIntensity: 0.34, envMapIntensity: 0.1 }), deep = std(new THREE.Color(color).multiplyScalar(0.42), { roughness: 0.6, envMapIntensity: 0.1 }), wall = std('#EFEAE0'), dark = std('#22332B'), lit = glow('#F7D79A', 1.35);
  const flag = (x, y, z, h) => {
    g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, h, 6), dark, x, y + h / 2, z));
    const f = mesh(new THREE.PlaneGeometry(0.3, 0.17), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.7 }), x + 0.16, y + h - 0.1, z);
    f.userData.flag = true; g.add(f);
  };
  const mast = (x, y, z, h) => {
    g.add(mesh(new THREE.CylinderGeometry(0.016, 0.034, h, 6), dark, x, y + h / 2, z));
    [0.5, 0.68, 0.86].forEach(k => { const t = mesh(new THREE.TorusGeometry(0.07 * (1.4 - k), 0.01, 6, 14), own, x, y + h * k, z); t.rotation.x = Math.PI / 2; g.add(t); });
    const tip = mesh(new THREE.SphereGeometry(0.045, 8, 8), glow(color, 4), x, y + h + 0.03, z); tip.userData.blink = true; g.add(tip);
  };
  if (stage === 1) {
    const tent = mesh(new THREE.ConeGeometry(0.34, 0.42, 4), own, -0.16, 0.21, 0.02); tent.rotation.y = Math.PI / 4; g.add(tent);
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.16, 0.01), dark, -0.16, 0.08, 0.215));
    [[0, 0.3], [0.26, -0.15], [-0.26, -0.15]].forEach(p => { const l = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.46, 5), dark, 0.3 + p[0] * 0.3, 0.2, 0.05 + p[1] * 0.3); l.rotation.set(p[1] * 0.9, 0, -p[0] * 0.9); g.add(l); });
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.07, 0.07), wall, 0.3, 0.44, 0.05));
    flag(0.02, 0, -0.26, 0.8);
    [[-0.42, 0.34], [0.44, 0.36], [0.44, -0.36], [-0.42, -0.34]].forEach(p => g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 5), own, p[0], 0.07, p[1])));
  } else if (stage === 2) {
    g.add(mesh(new THREE.BoxGeometry(0.62, 0.34, 0.5), own, -0.1, 0.17, 0));
    const roof = mesh(new THREE.ConeGeometry(0.5, 0.26, 4), deep, -0.1, 0.47, 0); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.86; g.add(roof);
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.2, 0.01), dark, -0.24, 0.1, 0.255), mesh(new THREE.BoxGeometry(0.14, 0.11, 0.01), lit, 0.02, 0.2, 0.255), mesh(new THREE.BoxGeometry(0.01, 0.11, 0.14), lit, 0.215, 0.2, 0));
    g.add(mesh(new THREE.BoxGeometry(0.07, 0.16, 0.07), deep, -0.3, 0.52, -0.1));
    mast(0.36, 0, -0.12, 1.25);
    const dish = mesh(new THREE.SphereGeometry(0.11, 12, 8, 0, 7, 0, 1.1), new THREE.MeshStandardMaterial({ color: '#EFEAE0', side: THREE.DoubleSide }), 0.36, 0.62, -0.02); dish.rotation.x = 1.9; g.add(dish);
    flag(-0.4, 0, -0.3, 0.9);
  } else {
    g.add(mesh(new THREE.BoxGeometry(0.92, 0.78, 0.62), own, 0, 0.39, 0));
    for (let f = 0; f < 3; f++) {
      g.add(mesh(new THREE.BoxGeometry(0.7, 0.065, 0.01), lit, 0, 0.2 + f * 0.22, 0.315), mesh(new THREE.BoxGeometry(0.7, 0.065, 0.01), lit, 0, 0.2 + f * 0.22, -0.315), mesh(new THREE.BoxGeometry(0.01, 0.065, 0.42), lit, 0.465, 0.2 + f * 0.22, 0), mesh(new THREE.BoxGeometry(0.01, 0.065, 0.42), lit, -0.465, 0.2 + f * 0.22, 0));
      [-0.24, 0, 0.24].forEach(x => g.add(mesh(new THREE.BoxGeometry(0.03, 0.075, 0.014), own, x, 0.2 + f * 0.22, 0.318)));
    }
    g.add(mesh(new THREE.BoxGeometry(1.02, 0.07, 0.72), deep, 0, 0.815, 0), mesh(new THREE.BoxGeometry(0.42, 0.2, 0.34), own, -0.18, 0.95, 0), mesh(new THREE.BoxGeometry(0.48, 0.05, 0.4), deep, -0.18, 1.07, 0), mesh(new THREE.BoxGeometry(0.3, 0.07, 0.01), lit, -0.18, 0.95, 0.172));
    g.add(mesh(new THREE.BoxGeometry(0.26, 0.05, 0.2), deep, 0, 0.3, 0.38), mesh(new THREE.BoxGeometry(0.16, 0.26, 0.012), dark, 0, 0.13, 0.317));
    mast(0.3, 0.85, -0.12, 0.95);
    flag(-0.36, 1.09, 0.1, 0.5);
    const h = glowSprite(color, 2.6); h.position.set(0, 0.5, 0); h.material.opacity = 0.3; g.add(h);
  }
  return shadow(g);
}

function makeToken(shape, color) {
  const g = new THREE.Group(), body = new THREE.Group(), own = std(color, { roughness: 0.35, metalness: 0.25, envMapIntensity: 0.9 }), gold = metal('#D6A45E'), dark = std('#16261E', { roughness: 0.5 });
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.1, 28), dark, 0, 0.05, 0), mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 28), own, 0, 0.12, 0), mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 32), gold, 0, 0.1, 0));
  g.children[2].rotation.x = Math.PI / 2;
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.3, 12), gold, 0, 0.28, 0));
  if (shape === 'sun') {
    body.add(mesh(new THREE.SphereGeometry(0.21, 24, 16), new THREE.MeshStandardMaterial({ color: '#F3C178', emissive: '#E8A94E', emissiveIntensity: 1.1, roughness: 0.3 })));
    const r = mesh(new THREE.TorusGeometry(0.31, 0.022, 8, 40), gold); r.rotation.x = 1.15; body.add(r);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, c = mesh(new THREE.ConeGeometry(0.035, 0.11, 6), own, Math.cos(a) * 0.29, Math.sin(a) * 0.29, 0); c.rotation.z = a - Math.PI / 2; body.add(c); }
  } else if (shape === 'megaphone') {
    const c = mesh(new THREE.ConeGeometry(0.24, 0.46, 24, 1, true), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.2 })); c.rotation.z = Math.PI / 2; c.position.x = 0.04; body.add(c);
    const rim = mesh(new THREE.TorusGeometry(0.24, 0.022, 8, 32), gold, -0.19, 0, 0); rim.rotation.y = Math.PI / 2; body.add(rim);
    body.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), dark, 0.3, 0, 0)); body.children[2].rotation.z = Math.PI / 2;
    body.add(mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), dark, 0.2, -0.12, 0));
    body.rotation.z = 0.3;
  } else if (shape === 'case') {
    body.add(mesh(new RoundedBoxGeometry(0.5, 0.36, 0.2, 3, 0.05), own), mesh(new THREE.BoxGeometry(0.52, 0.045, 0.215), gold, 0, 0.03, 0), mesh(new THREE.BoxGeometry(0.08, 0.09, 0.225), gold, 0, 0.03, 0));
    const h = mesh(new THREE.TorusGeometry(0.09, 0.022, 8, 20, Math.PI), dark, 0, 0.18, 0); body.add(h);
  } else {
    const s = new THREE.Shape(); s.moveTo(0, 0.36); s.lineTo(0.26, -0.26); s.lineTo(0, -0.12); s.lineTo(-0.26, -0.26); s.closePath();
    const w = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.5 }));
    w.rotation.x = -Math.PI / 2 + 0.25; body.add(w);
    const s2 = new THREE.Shape(); s2.moveTo(0, 0.36); s2.lineTo(0, -0.12); s2.lineTo(0, -0.24); s2.lineTo(0.001, -0.24); s2.closePath();
    const fin = mesh(new THREE.BoxGeometry(0.015, 0.16, 0.42), gold, 0, -0.06, 0.04); fin.rotation.x = 0.25; body.add(fin);
    body.rotation.y = Math.PI / 2;
  }
  body.position.y = 0.66;
  g.add(body);
  g.userData.body = body;
  return shadow(g);
}

/* ---------- board ---------- */
export async function createBoard(canvas, TILES, SECTORS) {
  try { await Promise.all([document.fonts.load(`800 40px "Cabinet Grotesk"`), document.fonts.load(`800 40px "Hanken Grotesk"`), document.fonts.load(`500 40px Fraunces`)]); } catch (e) { /* fall back to system fonts */ }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0x10241a, 36, 92);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);
  const target = new THREE.Vector3(0, 0.3, 0);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(target);
  controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 11; controls.maxDistance = 44; controls.minPolarAngle = 0.25; controls.maxPolarAngle = 1.2;
  controls.rotateSpeed = 0.6; controls.zoomSpeed = 0.7;
  const cam = { theta: 0, phi: 0.84, dist: 27 };
  const applyCam = () => { const s = Math.sin(cam.phi); camera.position.set(target.x + cam.dist * s * Math.sin(cam.theta), target.y + cam.dist * Math.cos(cam.phi), target.z + cam.dist * s * Math.cos(cam.theta)); camera.lookAt(target); };
  applyCam();
  let dragging = false, lastUser = 0;
  controls.addEventListener('start', () => { dragging = true; });
  controls.addEventListener('end', () => { dragging = false; lastUser = performance.now(); });

  /* lights */
  const hemi = new THREE.HemisphereLight(0xdfeee4, 0x0d1a11, 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0ae, 3.1);
  sun.position.set(13, 21, 9); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025;
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 70 });
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8fc7b0, 0.9); rim.position.set(-12, 8, -14); scene.add(rim);

  const anim = [], blinkers = [], flags = [];
  const root = new THREE.Group();
  scene.add(root);

  /* table */
  const table = mesh(new THREE.CircleGeometry(80, 72).rotateX(-Math.PI / 2), std('#0F2419', { roughness: 1 }), 0, -0.72, 0);
  table.receiveShadow = true; root.add(table);
  const lineMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.16 });
  [11.7, 12.9, 14.6, 17, 20.2, 24.5].forEach((r, i) => root.add(mesh(new THREE.RingGeometry(r, r + 0.03 + i * 0.006, 160).rotateX(-Math.PI / 2), lineMat, 0, -0.7, 0)));
  for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2, long = i % 10 === 0, m = mesh(new THREE.PlaneGeometry(0.03, long ? 0.6 : 0.26).rotateX(-Math.PI / 2), lineMat, Math.sin(a) * (11.9 + (long ? 0.17 : 0)), -0.7, Math.cos(a) * (11.9 + (long ? 0.17 : 0))); m.rotation.y = a; root.add(m); }

  /* base and rims */
  const base = mesh(new THREE.CylinderGeometry(10.55, 10.95, 0.72, 128), std('#0B1711', { roughness: 0.42, metalness: 0.35, envMapIntensity: 0.7 }), 0, -0.36, 0);
  base.castShadow = true; base.receiveShadow = true; root.add(base);
  const gold = metal(GOLD);
  [[10.5, 0.085, 0.02], [5.5, 0.07, 0.27], [9.96, 0.03, 0.05]].forEach(r => { const t = mesh(new THREE.TorusGeometry(r[0], r[1], 10, 180), gold, 0, r[2], 0); t.rotation.x = Math.PI / 2; root.add(t); });
  root.add(mesh(new THREE.CylinderGeometry(5.5, 5.5, 0.26, 96, 1, true), std('#0B1711', { side: THREE.DoubleSide }), 0, 0.13, 0));
  for (let i = 0; i < N; i++) { const a = (i + 0.5) * D, s = mesh(new THREE.SphereGeometry(0.06, 10, 8), gold, Math.sin(a) * 10.22, 0.04, Math.cos(a) * 10.22); root.add(s); }

  const valley = buildValley(root, anim);
  const world = createWorld({ root, anim, gy: valley.gy, brain: valley.brain, setPlant: valley.setPlant, plant: valley.plant, brainParts: valley.brainParts, tween: (ms, fn, ease) => tween(ms, fn, ease), mesh, std, glow, shadow, glowSprite, blinkers });

  /* tiles */
  const a0 = -Math.PI / 2 - D / 2 + 0.007, a1 = -Math.PI / 2 + D / 2 - 0.007;
  const tileGeo = extrude(ringSeg(R_IN, R_OUT, a0, a1), 0.2);
  const plotGeo = extrude(ringSeg(5.76, 6.86, a0 + 0.014, a1 - 0.014), 0.035, 0.012);
  const laneGeo = extrude(ringSeg(LANE - 0.03, LANE + 0.03, a0 + 0.03, a1 - 0.03), 0.004, 0);
  const ringGeo = extrude(ringSeg(8.5, 9.76, a0 + 0.012, a1 - 0.012), 0.012, 0);
  const hiGeo = extrude(ringSeg(R_IN + 0.04, R_OUT - 0.04, a0 + 0.008, a1 - 0.008), 0.01, 0);
  const labelGeo = new THREE.PlaneGeometry(1.36, 1.586).rotateX(-Math.PI / 2);
  const tileColor = { market: ['#17382B', '#1B4132'], channel: ['#2C2B1E', '#2C2B1E'], kickoff: ['#C8934C', '#C8934C'], signal: ['#5A4320', '#5A4320'], brain: ['#1F4D45', '#1F4D45'], spam: ['#4E2B22', '#4E2B22'], board: ['#34382F', '#34382F'] };
  const tiles = [], pickable = [];

  const local = (i, lx, y, lz) => { const a = -i * D; return new THREE.Vector3(lx * Math.cos(a) + lz * Math.sin(a), y, -lx * Math.sin(a) + lz * Math.cos(a)); };

  TILES.forEach((t, i) => {
    const g = new THREE.Group();
    g.rotation.y = -i * D;
    const m = mesh(tileGeo, std(tileColor[t.type][i % 2], { roughness: t.type === 'kickoff' ? 0.4 : 0.7, metalness: t.type === 'kickoff' ? 0.5 : 0.05, envMapIntensity: 0.6 }), 0, 0.025, 0);
    m.receiveShadow = true; m.castShadow = true; m.userData.tile = i;
    pickable.push(m);
    g.add(m);
    g.add(mesh(laneGeo, new THREE.MeshBasicMaterial({ color: CREAM, transparent: true, opacity: t.type === 'kickoff' ? 0 : 0.16 }), 0, Y, 0));
    const lab = mesh(labelGeo, new THREE.MeshBasicMaterial({ map: labelTexture(t, SECTORS[t.sector]), transparent: true, depthWrite: false, toneMapped: false }), 0, Y + 0.006, LABEL);
    g.add(lab);
    const ring = mesh(ringGeo, std('#ffffff', { roughness: 0.55, emissive: '#000000', transparent: true, opacity: 0.92 }), 0, Y - 0.004, 0);
    ring.receiveShadow = true;
    ring.visible = false; g.add(ring);
    const holder = new THREE.Group(); holder.position.set(0, Y + 0.02, PLOT); g.add(holder);
    const rec = { t, group: g, mesh: m, ring, holder, lab, base: tileColor[t.type][i % 2], plot: null, prop: null, stage: 0, owner: null };
    if (t.type === 'market') {
      rec.plot = mesh(plotGeo, std(SECTORS[t.sector].color, { roughness: 0.85 }), 0, Y - 0.005, 0);
      rec.plot.receiveShadow = true; g.add(rec.plot);
      const gem = mesh(new THREE.OctahedronGeometry(0.09, 0), std(SECTORS[t.sector].color, { roughness: 0.25, metalness: 0.4, envMapIntensity: 1 }), 0, Y + 0.1, 9.42);
      gem.castShadow = true; g.add(gem);
      anim.push(tm => { gem.rotation.y = tm * 1.2 + i; gem.position.y = Y + 0.12 + Math.sin(tm * 2 + i) * 0.02; });
    } else rec.prop = makeProp(t, holder, i);
    root.add(g);
    tiles.push(rec);
  });

  function makeProp(t, holder, i) {
    const p = new THREE.Group(), dark = std('#22332B'), cream = std('#EFEAE0');
    if (t.type === 'kickoff') {
      const arch = new THREE.Group();
      [-0.92, 0.92].forEach(x => { arch.add(mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.7, 12), gold, x, 0.85, 0), mesh(new THREE.SphereGeometry(0.09, 12, 10), gold, x, 1.74, 0), mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.1, 12), dark, x, 0.05, 0)); });
      const ban = mesh(new THREE.PlaneGeometry(1.84, 0.42), new THREE.MeshBasicMaterial({ map: bannerTexture('KICKOFF', '#0D1A11', '#F7D79A'), side: THREE.DoubleSide, toneMapped: false }), 0, 1.42, 0);
      arch.add(ban, mesh(new THREE.BoxGeometry(1.9, 0.04, 0.05), gold, 0, 1.65, 0), mesh(new THREE.BoxGeometry(1.9, 0.04, 0.05), gold, 0, 1.19, 0));
      arch.position.set(0, 0, LANE - PLOT);
      p.add(arch);
      for (let k = 0; k < 3; k++) { const c = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20), gold, -0.3 + k * 0.3, 0.03 + (k === 1 ? 0.1 : 0.05) / 2, 0.1 * (k % 2)); c.scale.y = 1 + (k === 1 ? 3 : k); c.position.y = 0.025 * c.scale.y; p.add(c); }
    } else if (t.type === 'signal') {
      p.add(mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.9, 8), dark, 0, 0.45, 0));
      const dish = mesh(new THREE.SphereGeometry(0.3, 20, 10, 0, 7, 0, 1.0), new THREE.MeshStandardMaterial({ color: '#EFEAE0', side: THREE.DoubleSide, roughness: 0.5 }), 0, 0.98, 0.04); dish.rotation.x = 2.2; p.add(dish);
      const tip = mesh(new THREE.SphereGeometry(0.05, 8, 8), glow('#F7D79A', 4), 0, 1.02, 0.2); tip.userData.blink = true; p.add(tip);
      const rings = [0, 1, 2].map(k => { const r = mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 40), new THREE.MeshBasicMaterial({ color: SUN, transparent: true }), 0, 1.02, 0.2); r.rotation.x = 0.63; p.add(r); return r; });
      anim.push(tm => rings.forEach((r, k) => { const u = (tm * 0.5 + k / 3 + i * 0.13) % 1; r.scale.setScalar(0.4 + u * 2.4); r.material.opacity = 0.8 * (1 - u); r.position.z = 0.2 + u * 0.5; r.position.y = 1.02 + u * 0.36; }));
    } else if (t.type === 'brain') {
      p.add(mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.22, 6), std('#8A988A', { flatShading: true }), 0, 0.11, 0));
      const core = mesh(new THREE.IcosahedronGeometry(0.17, 0), glow('#A9E0C8', 2.4)), cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.3, 0)), new THREE.LineBasicMaterial({ color: '#D9F0E4' }));
      core.position.y = cage.position.y = 0.72; p.add(core, cage);
      anim.push(tm => { core.rotation.y = tm; cage.rotation.set(tm * 0.5, -tm * 0.7, 0); core.position.y = cage.position.y = 0.72 + Math.sin(tm * 1.6 + i) * 0.05; });
    } else if (t.type === 'spam') {
      p.add(mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.5, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#6B3A2E', side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3 }), 0, 0.25, 0), mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 24), dark, 0, 0.5, 0));
      p.children[1].rotation.x = Math.PI / 2;
      [[0, 0.56, 0, 0.5], [0.1, 0.62, 0.05, -0.7], [-0.12, 0.6, -0.04, 1.2], [0.42, 0.03, 0.2, 1.5], [-0.4, 0.03, -0.1, 0.3]].forEach(e => { const m = mesh(new THREE.BoxGeometry(0.3, 0.2, 0.012), cream, e[0], e[1], e[2]); m.rotation.set(e[1] < 0.1 ? Math.PI / 2 : 0.3, e[3], 0.4 * e[3]); p.add(m); });
      const led = mesh(new THREE.SphereGeometry(0.05, 8, 8), glow('#F0745A', 4), 0.32, 0.5, 0); led.userData.blink = true; p.add(led);
    } else if (t.type === 'board') {
      p.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 20), std('#8F5F2A', { roughness: 0.5 }), 0, 0.3, 0), mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.28, 10), dark, 0, 0.14, 0));
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.3, c = new THREE.Group(); c.add(mesh(new THREE.BoxGeometry(0.15, 0.04, 0.15), cream, 0, 0.18, 0), mesh(new THREE.BoxGeometry(0.15, 0.2, 0.03), cream, 0, 0.3, 0.07), mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), dark, 0, 0.08, 0)); c.position.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5); c.rotation.y = a; p.add(c); }
      const scr = mesh(new THREE.BoxGeometry(0.5, 0.3, 0.02), glow('#A9C4B5', 1.6), 0, 0.78, -0.42); p.add(scr, mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 6), dark, 0, 0.32, -0.42));
    } else if (t.type === 'channel') {
      [-0.36, 0.36].forEach(x => p.add(mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.7, 8), dark, x, 0.35, 0)));
      const frame = mesh(new THREE.BoxGeometry(0.96, 0.66, 0.06), std('#3A3A30', { roughness: 0.5, metalness: 0.4 }), 0, 0.92, 0);
      const face = mesh(new THREE.PlaneGeometry(0.84, 0.54), new THREE.MeshBasicMaterial({ map: iconTexture(t.icon, '#16261E', '#F7D79A'), toneMapped: false }), 0, 0.92, 0.034);
      const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.034;
      p.add(frame, face, back);
      p.userData.frame = frame;
    }
    holder.add(shadow(p));
    p.traverse(o => { if (o.userData.blink) blinkers.push(o); });
    return p;
  }

  /* landing highlight */
  const hi = mesh(hiGeo, new THREE.MeshBasicMaterial({ color: SUN, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), 0, Y + 0.012, 0);
  const hiGroup = new THREE.Group(); hiGroup.add(hi); root.add(hiGroup);
  let hiUntil = 0;
  anim.push(t => { const left = hiUntil - performance.now(); hi.material.opacity = left > 0 ? (0.22 + 0.16 * Math.sin(t * 9)) * Math.min(1, left / 400) : 0; });

  /* a ring in the owner's colour bursts from the tile when it is mapped */
  const shockMesh = mesh(new THREE.TorusGeometry(1, 0.045, 8, 56), new THREE.MeshBasicMaterial({ color: SUN, transparent: true, opacity: 0, depthWrite: false }));
  shockMesh.rotation.x = Math.PI / 2; root.add(shockMesh);
  function shock(i, color) {
    shockMesh.position.copy(local(i, 0, Y + 0.09, 7.9));
    shockMesh.material.color.set(color);
    tween(850, k => { shockMesh.scale.setScalar(0.25 + k * 1.9); shockMesh.material.opacity = 0.95 * (1 - k); }, easeOut);
  }

  /* card decks and coin stacks on the table */
  const decks = {};
  [['signal', 0.62], ['brain', -0.62]].forEach(d => {
    const g = new THREE.Group(), side = std('#F2EFE6'), top = new THREE.MeshStandardMaterial({ map: deckTexture(d[0]), roughness: 0.6 });
    const body = mesh(new RoundedBoxGeometry(1.5, 0.34, 2.1, 2, 0.04), [side, side, top, side, side, side], 0, 0.17, 0);
    const card = mesh(new RoundedBoxGeometry(1.5, 0.02, 2.1, 1, 0.01), [side, side, top, side, side, side], 0, 0.36, 0);
    g.add(body, card);
    g.position.set(Math.sin(d[1]) * 13.4, -0.7, Math.cos(d[1]) * 13.4); g.rotation.y = d[1];
    root.add(shadow(g));
    decks[d[0]] = { g, card };
  });
  const coinMat = metal('#D6A45E'), rc = rng(5);
  [[0.25, 12.6], [-0.2, 12.9], [1.05, 13.1], [-1.02, 13.3]].forEach(s => { for (let k = 0; k < 3; k++) { const n = 2 + Math.floor(rc() * 6), a = s[0] + (k - 1) * 0.045, r = s[1] + (k % 2) * 0.5; const st = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06 * n, 20), coinMat, Math.sin(a) * r, -0.7 + 0.03 * n, Math.cos(a) * r); st.castShadow = true; root.add(st); } });

  /* stars */
  const sp = new Float32Array(600 * 3), rs = rng(3);
  for (let i = 0; i < 600; i++) { const a = rs() * Math.PI * 2, e = 0.05 + rs() * 1.3, r = 140; sp[i * 3] = r * Math.cos(e) * Math.cos(a); sp[i * 3 + 1] = r * Math.sin(e) - 10; sp[i * 3 + 2] = r * Math.cos(e) * Math.sin(a); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starsMat = new THREE.PointsMaterial({ color: '#F2EFE6', size: 0.55, fog: false, transparent: true, opacity: 0.4 });
  scene.add(new THREE.Points(sg, starsMat));

  /* the light follows the quarter: morning at round 1, golden hour mid-game, moonlight in the last rounds */
  const DAY = [[0, '#FFE0AE', 3.1, 1.25, [13, 21, 9]], [0.35, '#FFF3DC', 3.4, 1.3, [4, 25, 6]], [0.62, '#FFB870', 2.8, 1.05, [-10, 14, 8]], [0.82, '#FF8A5C', 1.7, 0.85, [-15, 7, 6]], [1, '#9FC2E8', 1.05, 0.66, [-9, 18, -8]]];
  const cA = new THREE.Color(), cB = new THREE.Color();
  let dayT = 0, dayNow = 0;
  function applyDay(t) {
    let i = 0;
    while (i < DAY.length - 2 && t > DAY[i + 1][0]) i++;
    const a = DAY[i], b = DAY[i + 1], k = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0])));
    sun.color.copy(cA.set(a[1])).lerp(cB.set(b[1]), k);
    sun.intensity = a[2] + (b[2] - a[2]) * k;
    hemi.intensity = a[3] + (b[3] - a[3]) * k;
    sun.position.set(a[4][0] + (b[4][0] - a[4][0]) * k, a[4][1] + (b[4][1] - a[4][1]) * k, a[4][2] + (b[4][2] - a[4][2]) * k);
    starsMat.opacity = 0.35 + 0.65 * t;
  }
  anim.push(() => { if (Math.abs(dayT - dayNow) > 0.0005) { dayNow += (dayT - dayNow) * 0.02; applyDay(dayNow); } });

  /* dice */
  const diceMats = [3, 4, 1, 6, 2, 5].map(n => new THREE.MeshStandardMaterial({ map: diceTexture(n), roughness: 0.35, envMapIntensity: 0.8 }));
  const dice = [0, 1].map(() => { const d = mesh(new RoundedBoxGeometry(0.62, 0.62, 0.62, 4, 0.09), diceMats); d.castShadow = true; d.visible = false; root.add(d); return d; });
  const faceQ = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2] };

  /* tokens */
  const tokens = {};
  const SLOTS = [[-0.34, -0.24], [0.34, -0.24], [-0.34, 0.3], [0.34, 0.3]];
  const slot = (i, pid) => local(i, SLOTS[pid % 4][0], Y + 0.01, LANE + SLOTS[pid % 4][1]);
  const activeRing = mesh(new THREE.TorusGeometry(0.44, 0.03, 8, 40), new THREE.MeshBasicMaterial({ color: SUN, transparent: true, opacity: 0.9 }));
  activeRing.rotation.x = Math.PI / 2; activeRing.visible = false; root.add(activeRing);
  let activeId = null;
  anim.push(t => { if (activeId !== null && tokens[activeId]) { const p = tokens[activeId].g.position; activeRing.position.set(p.x, Y + 0.04, p.z); activeRing.scale.setScalar(1 + 0.12 * Math.sin(t * 5)); activeRing.material.opacity = 0.6 + 0.3 * Math.sin(t * 5); } });

  /* confetti */
  let confetti = null, tokenAnim = false;

  /* ---------- tween engine ---------- */
  const tweens = [];
  let speed = 1;
  const tween = (ms, fn, ease = easeIO) => new Promise(res => tweens.push({ t0: performance.now(), ms: Math.max(1, ms / speed), fn, ease, res }));
  const wait = ms => new Promise(r => setTimeout(r, ms / speed));
  function stepTweens(now) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i], k = Math.min(1, (now - tw.t0) / tw.ms);
      tw.fn(tw.ease(k));
      if (k >= 1) { tweens.splice(i, 1); tw.res(); }
    }
  }

  /* ---------- post-processing ---------- */
  let composer = null, bloom = null;
  try {
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.6, 1.7);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  } catch (e) { composer = null; }

  let shift = 0;
  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 52 : 36;
    if (w / h >= 0.8) camera.setViewOffset(w, h, -w * shift, h * 0.075, w, h); else camera.setViewOffset(w, h, 0, h * 0.12, w, h);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  let lastFrame = 0;
  function update(render) {
    const now = performance.now(), t = clock.getElapsedTime();
    lastFrame = now;
    stepTweens(now);
    anim.forEach(f => f(t));
    blinkers.forEach((b, i) => { b.material.emissiveIntensity = Math.sin(t * 3 + i * 1.7) > 0.3 ? 4.5 : 0.6; });
    flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 3 + i) * 0.35; });
    if (confetti) confetti(now);
    controls.update();
    if (render) { if (composer) composer.render(); else renderer.render(scene, camera); }
  }
  renderer.setAnimationLoop(() => update(true));
  setInterval(() => { if (performance.now() - lastFrame > 250) update(false); }, 120);

  /* ---------- picking ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let hoverCb = null, pickCb = null, downAt = null;
  const tileAt = ev => { const r = canvas.getBoundingClientRect(); ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera); const h = ray.intersectObjects(pickable, false)[0]; return h ? h.object.userData.tile : null; };
  canvas.addEventListener('pointermove', ev => { if (hoverCb && !dragging) hoverCb(tileAt(ev), ev.clientX, ev.clientY); });
  canvas.addEventListener('pointerleave', () => { if (hoverCb) hoverCb(null); });
  canvas.addEventListener('pointerdown', ev => { downAt = [ev.clientX, ev.clientY]; });
  canvas.addEventListener('pointerup', ev => { if (downAt && Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) < 6 && pickCb) pickCb(tileAt(ev), ev.clientX, ev.clientY); downAt = null; });

  const toScreen = v => { const p = v.clone().project(camera), r = canvas.getBoundingClientRect(); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height, ok: p.z < 1 }; };

  function focus(i, ms = 900) {
    if (dragging || performance.now() - lastUser < 2500) return Promise.resolve();
    const from = controls.getAzimuthalAngle(), phi = controls.getPolarAngle(), dist = controls.getDistance();
    let d = (-i * D - from) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    if (Math.abs(d) < 0.02) return Promise.resolve();
    return tween(ms, k => { if (dragging) return; cam.theta = from + d * k; cam.phi = phi; cam.dist = dist; applyCam(); });
  }

  function rebuild(rec, color, animate) {
    while (rec.holder.children.length) rec.holder.remove(rec.holder.children[0]);
    if (rec.t.type !== 'market' || !rec.stage) return;
    const b = makeBuilding(rec.stage, color);
    b.traverse(o => { if (o.userData.blink) blinkers.push(o); if (o.userData.flag) flags.push(o); });
    rec.holder.add(b);
    if (animate) { b.scale.set(1, 0.01, 1); tween(620, k => { b.scale.set(0.6 + 0.4 * k, k, 0.6 + 0.4 * k); }, backOut); }
  }

  const api = {
    speed: k => { speed = k; },
    wait,
    autoRotate(on) { controls.autoRotate = on; controls.autoRotateSpeed = 0.55; },
    world,
    daylight(t) { dayT = Math.min(1, Math.max(0, t)); },
    shiftView(to, ms = 900) { const from = shift; return tween(ms, k => { shift = from + (to - from) * k; resize(); }); },
    tileScreen: i => toScreen(local(i, 0, Y + 0.6, LABEL)),
    tokenScreen: id => { const p = tokens[id].g.position.clone(); p.y += 1.3; return toScreen(p); },
    onHover: f => { hoverCb = f; },
    onPick: f => { pickCb = f; },
    focus,
    setActive(id) { activeId = id; activeRing.visible = id !== null; },
    reset() {
      Object.keys(tokens).forEach(k => { root.remove(tokens[k].g); delete tokens[k]; });
      tiles.forEach((rec, i) => api.setTile(i, null, 0, false));
      dice.forEach(d => { d.visible = false; });
      activeId = null; activeRing.visible = false; hiUntil = 0;
      world.reset(); dayT = 0;
    },
    overview(on) {
      const phi = controls.getPolarAngle(), dist = controls.getDistance(), th = controls.getAzimuthalAngle();
      const p1 = on ? 0.42 : 0.84, d1 = on ? 37 : (camera.aspect < 0.8 ? 31 : 27);
      return tween(900, k => { cam.theta = th; cam.phi = phi + (p1 - phi) * k; cam.dist = dist + (d1 - dist) * k; applyCam(); });
    },
    addPlayers(list) {
      list.forEach(p => {
        const g = makeToken(p.shape, p.color);
        g.position.copy(slot(0, p.id));
        root.add(g);
        tokens[p.id] = { g, color: p.color };
        g.scale.setScalar(0.01);
        tween(600, k => g.scale.setScalar(k), backOut);
      });
      if (!tokenAnim) { tokenAnim = true; anim.push(t => Object.values(tokens).forEach((tk, i) => { const b = tk.g.userData.body; if (!tk.out) { b.rotation.y += 0.012; b.position.y = 0.66 + Math.sin(t * 2.2 + i) * 0.03; } })); }
    },
    async moveToken(id, path, onStep) {
      const tk = tokens[id];
      for (const i of path) {
        const from = tk.g.position.clone(), to = slot(i, id);
        tk.g.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
        await tween(175, k => { tk.g.position.lerpVectors(from, to, k); tk.g.position.y = to.y + Math.sin(k * Math.PI) * 0.6; const s = 1 + Math.sin(k * Math.PI) * 0.14; tk.g.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s)); }, k => k);
        tk.g.scale.setScalar(1);
        if (onStep) onStep(i);
      }
      tk.g.rotation.y = -path[path.length - 1] * D + Math.PI;
    },
    async jumpToken(id, i) {
      const tk = tokens[id], from = tk.g.position.clone(), to = slot(i, id);
      await tween(900, k => { tk.g.position.lerpVectors(from, to, k); tk.g.position.y = to.y + Math.sin(k * Math.PI) * 5; tk.g.rotation.y += 0.3; });
      tk.g.rotation.y = -i * D + Math.PI;
    },
    setOut(id) { const tk = tokens[id]; tk.out = true; tween(700, k => { tk.g.scale.setScalar(1 - k * 0.999); tk.g.position.y = Y + k * 2; }).then(() => { tk.g.visible = false; }); },
    async rollDice(a, b) {
      const th = controls.getAzimuthalAngle();
      const jobs = dice.map((d, n) => {
        const ang = th + (n ? 0.09 : -0.09) + (Math.random() - 0.5) * 0.04, r = LABEL + (Math.random() - 0.5) * 0.5;
        const rest = new THREE.Vector3(Math.sin(ang) * r, Y + 0.32, Math.cos(ang) * r);
        const start = new THREE.Vector3(Math.sin(th) * (r + 5) + (n ? 1.2 : -1.2), 5.5, Math.cos(th) * (r + 5));
        const e = faceQ[n ? b : a], qT = new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2]));
        qT.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6.28));
        const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), qs = new THREE.Quaternion();
        d.visible = true; d.scale.setScalar(1);
        return tween(1050, k => {
          const e2 = easeOut(k);
          d.position.lerpVectors(start, rest, e2);
          d.position.y = rest.y + Math.abs(Math.cos(k * Math.PI * 2.5)) * Math.pow(1 - k, 1.6) * 3.4 + (1 - e2) * 0.8;
          qs.setFromAxisAngle(axis, (1 - e2) * 15);
          d.quaternion.copy(qT).multiply(qs);
        }, k => k);
      });
      await Promise.all(jobs);
      await wait(380);
    },
    hideDice() { dice.forEach(d => { if (d.visible) tween(260, k => d.scale.setScalar(1 - k * 0.98)).then(() => { d.visible = false; }); }); },
    setTile(i, color, stage, animate = true, name = '') {
      const rec = tiles[i], changed = rec.stage !== stage || rec.owner !== color, newOwner = rec.owner !== color;
      rec.owner = color; rec.stage = stage;
      rec.ring.visible = !!color;
      if (color) { rec.ring.material.color.set(color); rec.ring.material.emissive.set(color); rec.ring.material.emissiveIntensity = 0.2; }
      if (newOwner) {
        rec.mesh.material.color.set(rec.base);
        if (color) rec.mesh.material.color.lerp(new THREE.Color(color), 0.22);
        const old = rec.lab.material.map;
        rec.lab.material.map = labelTexture(rec.t, SECTORS[rec.t.sector], color ? { name, color } : null);
        rec.lab.material.needsUpdate = true;
        if (old) old.dispose();
        rec.ring.material.opacity = 0.92;
        if (color && animate) { rec.ring.material.opacity = 0; tween(600, k => { rec.ring.material.opacity = 0.92 * k; }); shock(i, color); }
      }
      if (rec.t.type === 'channel' && rec.prop) {
        const f = rec.prop.userData.frame;
        f.material.color.set(color || '#3A3A30'); f.material.emissive.set(color || '#000000'); f.material.emissiveIntensity = color ? 0.5 : 0;
        if (animate && changed) { rec.prop.scale.setScalar(0.7); tween(500, k => rec.prop.scale.setScalar(0.7 + 0.3 * k), backOut); }
      } else if (changed) rebuild(rec, color, animate);
    },
    pulse(i, ms = 1800, color) { hi.material.color.set(color || SUN); hiGroup.rotation.y = -i * D; hiUntil = performance.now() + ms / speed; },
    drawCard(kind) {
      const d = decks[kind];
      return tween(520, k => { d.card.position.y = 0.36 + Math.sin(k * Math.PI) * 1.6; d.card.rotation.z = Math.sin(k * Math.PI) * 0.5; d.card.rotation.x = k * Math.PI * 2; }).then(() => { d.card.rotation.set(0, 0, 0); });
    },
    celebrate(colors) {
      const n = 420, geo = new THREE.PlaneGeometry(0.16, 0.09), im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), n);
      const ps = [], c = new THREE.Color(), m4 = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
      for (let i = 0; i < n; i++) { ps.push({ x: (Math.random() - 0.5) * 18, y: 6 + Math.random() * 12, z: (Math.random() - 0.5) * 18, vy: 1.6 + Math.random() * 2.4, r: Math.random() * 6, w: 1 + Math.random() * 4, sx: (Math.random() - 0.5) * 1.2 }); im.setColorAt(i, c.set(colors[i % colors.length])); }
      root.add(im);
      let last = performance.now();
      confetti = now => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        ps.forEach((p, i) => { p.y -= p.vy * dt; p.r += p.w * dt; p.x += Math.sin(p.r) * p.sx * dt; if (p.y < 0.2) p.y = 14 + Math.random() * 4; e.set(p.r, p.r * 0.7, p.r * 1.3); m4.compose(v.set(p.x, p.y, p.z), q.setFromEuler(e), one); im.setMatrixAt(i, m4); });
        im.instanceMatrix.needsUpdate = true;
      };
      return () => { root.remove(im); confetti = null; };
    }
  };
  return api;
}
