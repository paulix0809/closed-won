/* Closed Won · interface and turn controller */
import { Game, TILES, SECTORS, STAGES, PERKS, TARGET, KICKOFF, MAX_ROUNDS, SET_BONUS, money } from './rules.js';
import { createBoard } from './board3d.js';

const CTA_URL = 'https://arrel.ai/get-started';
const ROSTER = [
  { name: 'Arrel', color: '#F3C178', shape: 'sun', ai: false, persona: 'smart', blurb: 'Maps, reaches, books.' },
  { name: 'Spray & Pray Inc.', color: '#E8775C', shape: 'megaphone', ai: true, persona: 'spray', blurb: 'Buys everything. Builds nothing.' },
  { name: 'Bigname Agency', color: '#7FB4E0', shape: 'case', ai: true, persona: 'bigname', blurb: 'Only the expensive logos.' },
  { name: 'The Intern', color: '#B99BE3', shape: 'plane', ai: true, persona: 'intern', blurb: 'Enthusiastic. Unpredictable.' }
];

const $ = s => document.querySelector(s);
const ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

let g = null, board = null, phase = 'idle', rollResolve = null, modalResolve = null, speed = 1, viewer = 0, overview = false, stopConfetti = null;

/* ---------- sound ---------- */
const AC = window.AudioContext || window.webkitAudioContext;
let ac = null, muted = false;
function tone(freq, dur, type = 'sine', vol = 0.07, when = 0, slide = 0) {
  if (!ac || muted) return;
  const t = ac.currentTime + when, o = ac.createOscillator(), v = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(vol, t + 0.012); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(v).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.1, when = 0, hp = 900) {
  if (!ac || muted) return;
  const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain();
  s.buffer = b; f.type = 'highpass'; f.frequency.value = hp; v.gain.value = vol;
  s.connect(f).connect(v).connect(ac.destination); s.start(ac.currentTime + when);
}
const sfx = {
  step: () => tone(500 + Math.random() * 90, 0.06, 'triangle', 0.045),
  dice: () => { for (let i = 0; i < 7; i++) noise(0.035, 0.13, i * 0.1 + Math.random() * 0.04, 1400); },
  coin: () => { tone(880, 0.09, 'triangle', 0.06); tone(1320, 0.16, 'triangle', 0.06, 0.07); },
  pay: () => { tone(330, 0.12, 'sawtooth', 0.035); tone(220, 0.2, 'sawtooth', 0.035, 0.09); },
  pipe: () => { tone(660, 0.1, 'sine', 0.06); tone(990, 0.1, 'sine', 0.06, 0.08); tone(1320, 0.22, 'sine', 0.05, 0.16); },
  build: () => { noise(0.09, 0.14, 0, 500); tone(196, 0.22, 'triangle', 0.08); tone(784, 0.28, 'sine', 0.05, 0.1); },
  card: () => noise(0.2, 0.06, 0, 2200),
  spam: () => tone(190, 0.36, 'square', 0.04, 0, -70),
  turn: () => { tone(740, 0.08, 'sine', 0.05); tone(988, 0.12, 'sine', 0.05, 0.08); },
  win: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.34, 'triangle', 0.08, i * 0.12))
};

/* ---------- small helpers ---------- */
const wait = ms => board.wait(ms);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const signed = n => (n > 0 ? '+' : '−') + money(Math.abs(n));
const lastFloat = {};

function float(pid, text, cls) {
  const pt = board.tokenScreen(pid);
  if (!pt.ok) return;
  const now = performance.now(), lf = lastFloat[pid] || { t: 0, n: 0 };
  lf.n = now - lf.t < 900 ? lf.n + 1 : 0; lf.t = now; lastFloat[pid] = lf;
  const el = document.createElement('div');
  el.className = 'float ' + cls;
  el.textContent = text;
  el.style.left = pt.x + 'px';
  el.style.top = pt.y - lf.n * 26 + 'px';
  $('#fx').appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

function toast(html, color) {
  const el = document.createElement('div');
  el.className = 'toast';
  if (color) el.style.setProperty('--c', color);
  el.innerHTML = html;
  $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('bye'), 2600);
  setTimeout(() => el.remove(), 3100);
}

function log(html, pid) {
  const el = document.createElement('li');
  if (pid !== undefined && pid !== null) el.style.setProperty('--c', g.players[pid].color);
  el.innerHTML = html;
  const ul = $('#log');
  ul.prepend(el);
  while (ul.children.length > 60) ul.lastChild.remove();
}

function dock(html, button) {
  $('#dock-msg').innerHTML = html;
  const b = $('#roll');
  b.hidden = !button;
  if (button) b.focus({ preventScroll: true });
}

/* ---------- player cards ---------- */
function buildPlayers() {
  $('#players').innerHTML = g.players.map(p => `
    <div class="pc" id="pc${p.id}" style="--c:${p.color}">
      <div class="pc-top"><i class="chip"></i><b>${esc(p.name)}</b>${p.ai ? '' : `<em>${p.id === 0 ? 'you' : 'human'}</em>`}<span class="tag"></span></div>
      <div class="pc-pipe"><div class="bar"><i></i></div><div class="pc-nums"><span class="pv"></span><span class="pt">of ${money(TARGET)} pipeline</span></div></div>
      <div class="pc-row"><span>Budget</span><b class="bv"></b></div>
      <div class="pc-meta"></div>
    </div>`).join('');
}

function updatePlayers() {
  const lead = Math.max(...g.players.map(p => p.pipeline));
  g.players.forEach(p => {
    const el = $('#pc' + p.id), mine = g.owned(p.id), mk = mine.filter(i => TILES[i].type === 'market').length, ch = mine.length - mk;
    el.classList.toggle('on', !g.over && g.current.id === p.id);
    el.classList.toggle('out', p.out);
    el.classList.toggle('lead', lead > 0 && p.pipeline === lead);
    el.querySelector('.bar i').style.width = Math.min(100, (p.pipeline / TARGET) * 100) + '%';
    el.querySelector('.pv').textContent = money(p.pipeline);
    el.querySelector('.bv').textContent = money(p.budget);
    el.querySelector('.tag').textContent = p.out ? 'Out' : p.skip ? 'In spam' : '';
    const perks = Object.keys(p.perks).map(k => `<span class="perk" title="${esc(PERKS[k].title + ': ' + PERKS[k].text)}">${esc(PERKS[k].title.split(' ').slice(0, 2).join(' '))}</span>`).join('');
    el.querySelector('.pc-meta').innerHTML = `<span>${mk} market${mk === 1 ? '' : 's'}</span><span>${ch} channel${ch === 1 ? '' : 's'}</span>${perks}`;
  });
  $('#round').textContent = `Round ${Math.min(g.round, MAX_ROUNDS)} / ${MAX_ROUNDS}`;
}

/* ---------- your markets panel ---------- */
function updateMine() {
  const p = g.players[viewer], mine = g.owned(p.id), can = phase === 'ready' && g.current.id === p.id;
  $('#mine-title').textContent = p.ai ? p.name : (g.players.filter(x => !x.ai).length > 1 ? p.name + '’s markets' : 'Your markets');
  if (!mine.length) { $('#mine').innerHTML = '<li class="empty">Nothing mapped yet. Land on a market and map it.</li>'; return; }
  $('#mine').innerHTML = mine.map(i => {
    const t = TILES[i];
    if (t.type === 'channel') return `<li><i class="dot" style="background:#8F5F2A"></i><div><b>${t.name}</b><span>Channel · rivals pay ${money(g.fee(i))}</span></div></li>`;
    const full = g.full(p.id, t.sector), pips = [1, 2, 3].map(s => `<i class="${s <= g.stage[i] ? 'on' : ''}"></i>`).join('');
    const up = g.stage[i] < 3 ? `<button class="up" data-up="${i}" ${can && g.canUpgrade(p, i) ? '' : 'disabled'}>${STAGES[g.stage[i]]} · ${money(g.upgradeCost(p, i))}</button>` : '<span class="max">Booked</span>';
    return `<li><i class="dot" style="background:${SECTORS[t.sector].color}"></i><div><b>${t.name}${full ? ' <em>×' + SET_BONUS + '</em>' : ''}</b><span><span class="pips">${pips}</span>${STAGES[g.stage[i] - 1]} · fee ${money(g.fee(i))}</span></div>${up}</li>`;
  }).join('');
}

function updateAll() { updatePlayers(); updateMine(); }

/* ---------- cards & modals ---------- */
function sectorDots(t) {
  return g.sectorTiles(t.sector).map(k => {
    const o = g.owner[k];
    return `<span class="sd" title="${esc(TILES[k].name)}"><i style="background:${o === null ? 'transparent' : g.players[o].color}"></i>${esc(TILES[k].name)}</span>`;
  }).join('');
}

function marketCard(i, p, mode) {
  const t = TILES[i], isM = t.type === 'market', sec = isM ? SECTORS[t.sector] : { name: 'Channel', color: '#B77F3C' };
  const o = g.owner[i], pid = o === null ? p.id : o;
  let table;
  if (isM) {
    table = `<table><thead><tr><th>Stage</th><th>Rivals pay you</th><th>Pipeline booked</th></tr></thead><tbody>${[1, 2, 3].map(s => `<tr class="${o !== null && g.stage[i] === s ? 'cur' : ''}"><td>${STAGES[s - 1]}</td><td>${money(g.fee(i, s, pid))}</td><td>${money(g.pipe(i, false, s, pid))}</td></tr>`).join('')}</tbody></table>
      <div class="sector"><span>Sector</span>${sectorDots(t)}</div><p class="note">Own all three and every fee and booking is ×${SET_BONUS}.</p>`;
  } else {
    table = `<table><thead><tr><th>Channels owned</th><th>Rivals pay you</th><th>Pipeline booked</th></tr></thead><tbody>${[1, 2, 3, 4].map(n => `<tr class="${o !== null && g.channels(o) === n ? 'cur' : ''}"><td>${n}</td><td>${money(30 * 2 ** (n - 1))}</td><td>${money(70 * n)}</td></tr>`).join('')}</tbody></table><p class="note">Channels are worth more the more of them you run.</p>`;
  }
  const owner = o === null ? '' : `<p class="owner"><i style="background:${g.players[o].color}"></i>${esc(g.players[o].name)}${isM ? ' · ' + STAGES[g.stage[i] - 1] : ''}</p>`;
  let btn = '<div class="btns"><button class="cta" data-v="1">Close</button></div>';
  if (mode === 'buy') btn = `<div class="btns"><button class="cta" data-v="1">Map it · ${money(g.price(p, i))} ${ARROW}</button><button class="ghost" data-v="0">Skip</button></div><p class="fine">You have ${money(p.budget)}. Mapping also books ${money(isM ? Math.round(t.price * 0.4 / 5) * 5 : 60)} of pipeline.</p>`;
  if (mode === 'upgrade') btn = `<div class="btns"><button class="cta" data-v="1">Upgrade to ${STAGES[g.stage[i]]} · ${money(g.upgradeCost(p, i))} ${ARROW}</button><button class="ghost" data-v="0">Not now</button></div><p class="fine">You have ${money(p.budget)}.</p>`;
  return `<div class="card mk" style="--s:${sec.color}"><div class="band"><span>${esc(sec.name)}</span><b>${money(t.price)}</b></div><h2>${esc(t.name)}</h2>${owner}${table}${btn}</div>`;
}

function ask(html) {
  const m = $('#modal');
  m.innerHTML = html;
  m.classList.add('show');
  const first = m.querySelector('[data-v]');
  if (first) first.focus({ preventScroll: true });
  return new Promise(res => { modalResolve = v => { modalResolve = null; m.classList.remove('show'); res(v); }; });
}
$('#modal').addEventListener('click', ev => { const b = ev.target.closest('[data-v]'); if (b && modalResolve) modalResolve(b.dataset.v === '1'); });

async function showCard(p, card, deck) {
  const head = deck === 'brain' ? 'GTM Brain · learning logged' : 'Signal';
  const html = `<div class="card ev ${deck}"><div class="band"><span>${head}</span><b>${esc(p.name)}</b></div><h2>${esc(card.title)}</h2><p>${esc(card.text)}</p><div class="effect">${esc(card.effect)}</div>${p.ai ? '' : `<div class="btns"><button class="cta" data-v="1">OK ${ARROW}</button></div>`}</div>`;
  log(`${esc(p.name)} draws <b>${esc(card.title)}</b>.`, p.id);
  if (!p.ai) return ask(html);
  const m = $('#modal');
  m.innerHTML = html; m.classList.add('show', 'passive');
  await wait(2100);
  m.classList.remove('show', 'passive');
  await wait(200);
}

/* ---------- events ---------- */
async function showEvents(p, evs) {
  for (const e of evs) {
    const pl = e.p !== null && e.p !== undefined ? g.players[e.p] : null;
    let pause = 260;
    if (e.t === 'cash') { if (!e.amt) continue; float(e.p, signed(e.amt), e.amt > 0 ? 'pos' : 'neg'); (e.amt > 0 ? sfx.coin : sfx.pay)(); }
    else if (e.t === 'pipe') { float(e.p, signed(e.amt) + ' pipeline', e.amt > 0 ? 'pipe' : 'neg'); if (e.amt > 0) sfx.pipe(); }
    else if (e.t === 'own') {
      pause = 520;
      if (e.p === null) { board.setTile(e.tile, null, 0); log(`${esc(g.players[e.from].name)} gives up <b>${TILES[e.tile].name}</b>.`, e.from); }
      else { board.setTile(e.tile, pl.color, 1, true, pl.name); board.pulse(e.tile, 1400, pl.color); sfx.build(); log(`${esc(pl.name)} maps <b>${TILES[e.tile].name}</b>.`, e.p); }
    } else if (e.t === 'stage') {
      pause = 520;
      board.setTile(e.tile, pl.color, e.stage, true, pl.name); board.pulse(e.tile, 1200, pl.color); sfx.build();
      log(e.down ? `${esc(pl.name)} scales <b>${TILES[e.tile].name}</b> back to ${STAGES[e.stage - 1]}.` : `${esc(pl.name)} takes <b>${TILES[e.tile].name}</b> to ${STAGES[e.stage - 1]}.`, e.p);
    } else if (e.t === 'perk') { toast(`<b>${esc(PERKS[e.perk].title)}</b> ${esc(PERKS[e.perk].text)}`, pl.color); }
    else if (e.t === 'set') { pause = 700; toast(`<b>${esc(pl.name)}</b> owns all of ${SECTORS[e.sector].name}. Fees and bookings ×${SET_BONUS}.`, pl.color); sfx.turn(); log(`${esc(pl.name)} owns the whole <b>${SECTORS[e.sector].name}</b> sector.`, e.p); }
    else if (e.t === 'out') { pause = 900; board.setOut(e.p); sfx.spam(); toast(`<b>${esc(pl.name)}</b> ran out of budget and is out.`, pl.color); log(`${esc(pl.name)} is out of budget.`, e.p); }
    updateAll();
    await wait(pause);
  }
}

/* ---------- io: how the rules talk to the screen ---------- */
const io = {
  async ready(p, rolls) {
    if (!p.ai) viewer = p.id;
    board.setActive(p.id);
    updateAll();
    await board.focus(p.pos, 800);
    if (p.ai) {
      dock(`<i class="pdot" style="background:${p.color}"></i><b>${esc(p.name)}</b> is playing…`, false);
      await wait(420);
      for (const i of g.aiUpgrades(p)) { await showEvents(p, g.upgrade(p, i)); if (g.over) return; }
      return;
    }
    sfx.turn();
    phase = 'ready';
    updateMine();
    dock(rolls ? `<i class="pdot" style="background:${p.color}"></i><b>Doubles.</b> Roll again.` : `<i class="pdot" style="background:${p.color}"></i><b>${g.players.filter(x => !x.ai).length > 1 ? esc(p.name) + ', your turn.' : 'Your turn.'}</b> Upgrade a market or roll.`, true);
    await new Promise(res => { rollResolve = res; });
    rollResolve = null;
    phase = 'busy';
    updateMine();
  },
  async roll(p, a, b) {
    dock(`<i class="pdot" style="background:${p.color}"></i>Rolling…`, false);
    sfx.dice();
    await board.rollDice(a, b);
    dock(`<i class="pdot" style="background:${p.color}"></i><b>${esc(p.name)}</b> rolled <span class="die">${a}</span><span class="die">${b}</span>${a === b ? ' doubles' : ''}`, false);
  },
  async move(p, path, kick, ev) {
    const dest = path[path.length - 1];
    setTimeout(() => board.hideDice(), 500 / speed);
    board.focus(dest, 175 * path.length + 400);
    let shown = false;
    await board.moveToken(p.id, path, i => { sfx.step(); if (i === 0 && kick >= 0 && !shown) { shown = true; showEvents(p, ev); log(`${esc(p.name)} passes Kickoff: new quarter, new budget.`, p.id); } });
    board.pulse(dest);
    updateAll();
    await wait(280);
  },
  async jump(p, i) { board.focus(i, 900); await board.jumpToken(p.id, i); board.pulse(i); await wait(200); },
  events: showEvents,
  async offer(p, i) {
    if (p.ai) { await wait(520); const yes = g.aiBuy(p, i); if (!yes) log(`${esc(p.name)} passes on ${TILES[i].name}.`, p.id); return yes; }
    return ask(marketCard(i, p, 'buy'));
  },
  async offerUpgrade(p, i) {
    if (p.ai) { await wait(360); return g.aiUpgrades(p).includes(i); }
    return ask(marketCard(i, p, 'upgrade'));
  },
  async card(p, card, deck) { sfx.card(); board.drawCard(deck); await wait(300); await showCard(p, card, deck); },
  async note(p, kind, i, extra) {
    const t = TILES[i], n = esc(p.name);
    if (kind === 'fee') { const o = g.players[g.owner[i]]; log(`${n} lands on ${esc(o.name)}’s <b>${t.name}</b>.`, p.id); toast(`<b>${n}</b> lands on <b>${t.name}</b>. ${esc(o.name)} books the meeting.`, o.color); await wait(500); }
    else if (kind === 'short') { log(`${n} cannot afford ${t.name}.`, p.id); if (!p.ai) toast(`Not enough budget to map <b>${t.name}</b>.`, p.color); await wait(500); }
    else if (kind === 'spam') { sfx.spam(); log(`${n} lands in the Spam Folder and loses a turn.`, p.id); toast(`<b>${n}</b> is in the Spam Folder. Next turn lost.`, '#D9785A'); await wait(900); }
    else if (kind === 'shield') { log(`${n}’s deliverability shield absorbs the Spam Folder.`, p.id); toast(`<b>${n}</b> uses the deliverability shield. No turn lost.`, p.color); await wait(800); }
    else if (kind === 'skipped') { board.setActive(p.id); updateAll(); await board.focus(p.pos, 700); dock(`<i class="pdot" style="background:${p.color}"></i><b>${n}</b> is stuck in spam this turn.`, false); log(`${n} sits this turn out.`, p.id); await wait(1100); }
    else if (kind === 'board') { log(`${n} faces the board and pays ${money(extra)}.`, p.id); toast(`<b>Board Meeting.</b> ${n} pays ${money(extra)} in overhead.`, p.color); await wait(600); }
    else if (kind === 'kickoff') { log(`${n} lands exactly on Kickoff: bonus budget.`, p.id); await wait(200); }
    else if (kind === 'doubles') { log(`${n} rolled doubles and goes again.`, p.id); await wait(250); }
  }
};

/* ---------- start / end ---------- */
function setupScreen() {
  const rows = ROSTER.map((r, i) => `
    <div class="slot" style="--c:${r.color}"><i class="chip"></i><div><b>${i === 0 ? 'You, playing as Arrel' : r.name}</b><span>${r.blurb}</span></div>
    ${i === 0 ? '<span class="fixed">Human</span>' : `<div class="seg" data-slot="${i}"><button data-m="ai" class="on">AI</button><button data-m="human">Human</button><button data-m="off">Off</button></div>`}</div>`).join('');
  $('#slots').innerHTML = rows;
  $('#slots').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-m]');
    if (!b) return;
    b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    const active = [...document.querySelectorAll('.seg')].filter(s => s.querySelector('.on').dataset.m !== 'off').length;
    $('#go').disabled = active < 1;
  });
}

async function startGame() {
  if (AC && !ac) { try { ac = new AC(); } catch (e) { ac = null; } }
  const cfg = [Object.assign({}, ROSTER[0])];
  document.querySelectorAll('.seg').forEach(s => {
    const m = s.querySelector('.on').dataset.m, r = ROSTER[+s.dataset.slot];
    if (m !== 'off') cfg.push(Object.assign({}, r, { ai: m === 'ai' }));
  });
  g = new Game(cfg);
  window.__game = g;
  $('#start').classList.add('gone');
  document.body.classList.add('playing');
  board.autoRotate(false);
  board.shiftView(0, 900);
  buildPlayers();
  updateAll();
  board.addPlayers(g.players.map((p, i) => ({ id: p.id, color: p.color, shape: cfg[i].shape })));
  log('The quarter opens. First to <b>' + money(TARGET) + '</b> in pipeline wins.');
  await board.overview(false);
  await wait(500);
  while (!g.over) await g.takeTurn(io);
  endGame();
}

function endGame() {
  phase = 'over';
  document.body.classList.add('over');
  board.setActive(null);
  updateAll();
  dock('', false);
  const rank = [...g.players].sort((a, b) => (a.out - b.out) || b.pipeline - a.pipeline || b.budget - a.budget), w = g.winner, humanWon = !w.ai;
  const why = { target: `reached ${money(TARGET)} in pipeline`, last: 'is the last one with budget left', bust: 'outlasted you', rounds: `led after ${MAX_ROUNDS} rounds` }[g.reason];
  if (humanWon) sfx.win(); else sfx.spam();
  stopConfetti = board.celebrate(humanWon ? ['#F7D79A', '#F2EFE6', '#D6A45E', '#A9C4B5'] : [w.color, '#F2EFE6']);
  board.autoRotate(true);
  board.overview(true);
  board.shiftView(0.2, 900);
  $('#end-inner').innerHTML = `
    <p class="kicker">Round ${Math.min(g.round, MAX_ROUNDS)} · Final board</p>
    <h1>${humanWon ? 'Closed <em>Won.</em>' : `${esc(w.name)} closed it <em>first.</em>`}</h1>
    <p class="lead">${esc(w.name)} ${why}.${humanWon ? ' You mapped the niches nobody else bothered with, and built them all the way to booked.' : ' They got to the target before your map did. One more quarter?'}</p>
    <ol class="rank">${rank.map((p, i) => `<li style="--c:${p.color}" class="${p.id === w.id ? 'win' : ''}"><span>${i + 1}</span><i class="chip"></i><b>${esc(p.name)}</b><em>${money(p.pipeline)}</em><small>${g.owned(p.id).length} tiles · ${money(p.budget)} budget${p.out ? ' · out' : ''}</small></li>`).join('')}</ol>
    <p class="pitch">In real life this is what Arrel does: map the market, reach the buyers, book the meetings, for industries everyone else skips.</p>
    <div class="btns"><a class="cta" href="${CTA_URL}" target="_blank" rel="noopener">Book a call ${ARROW}</a><button class="ghost" id="share">Share result</button><button class="ghost" id="again">Play again</button></div>`;
  $('#end').classList.add('show');
  $('#again').addEventListener('click', backToStart);
  $('#share').addEventListener('click', async ev => {
    const me = g.players[0], pos = rank.indexOf(me) + 1, here = /^https?:/.test(location.protocol) && !/^(localhost|127\.|\[::1\])/.test(location.hostname) ? location.href : 'https://arrel.ai';
    const text = `I ${pos === 1 ? 'won' : 'finished #' + pos + ' in'} Closed Won, the GTM board game by arrel.ai: ${money(me.pipeline)} in pipeline across ${g.owned(0).length} niche markets. Can you beat it? ${here}`;
    try {
      await navigator.clipboard.writeText(text);
      ev.target.textContent = 'Copied to clipboard';
    } catch (e) {
      let box = $('#share-text');
      if (!box) { box = document.createElement('textarea'); box.id = 'share-text'; box.className = 'sharebox'; box.readOnly = true; box.rows = 3; $('#end-inner').appendChild(box); }
      box.value = text; box.focus(); box.select();
      ev.target.textContent = 'Select and copy';
    }
  });
}

function backToStart() {
  if (stopConfetti) { stopConfetti(); stopConfetti = null; }
  board.reset();
  document.body.classList.remove('playing', 'over');
  $('#end').classList.remove('show');
  $('#modal').classList.remove('show', 'passive');
  $('#log').innerHTML = ''; $('#players').innerHTML = ''; $('#mine').innerHTML = '';
  $('#b-view').classList.remove('on');
  phase = 'idle'; viewer = 0; overview = false; g = null;
  $('#start').classList.remove('gone');
  board.overview(false);
  board.shiftView(0.2, 900);
  board.autoRotate(true);
}

/* ---------- input ---------- */
function roll() { if (phase === 'ready' && rollResolve && !modalResolve) rollResolve(); }
$('#roll').addEventListener('click', roll);
document.addEventListener('keydown', ev => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (modalResolve) { if (ev.key === 'Escape') { ev.preventDefault(); modalResolve(false); } return; }
  if ((ev.key === ' ' || ev.key === 'Enter') && phase === 'ready' && document.activeElement.tagName !== 'BUTTON') { ev.preventDefault(); roll(); }
});
$('#mine').addEventListener('click', async ev => {
  const b = ev.target.closest('[data-up]');
  if (!b || phase !== 'ready' || modalResolve) return;
  const p = g.current, i = +b.dataset.up;
  if (!g.canUpgrade(p, i)) return;
  phase = 'busy';
  board.focus(i, 600);
  await showEvents(p, g.upgrade(p, i));
  if (g.over) { if (rollResolve) rollResolve(); return; }
  phase = 'ready';
  updateMine();
});
$('#b-speed').addEventListener('click', ev => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; board.speed(speed); ev.currentTarget.textContent = speed + '×'; });
$('#b-sound').addEventListener('click', ev => { muted = !muted; ev.currentTarget.classList.toggle('off', muted); ev.currentTarget.setAttribute('aria-pressed', String(!muted)); });
$('#b-view').addEventListener('click', ev => { overview = !overview; board.overview(overview); ev.currentTarget.classList.toggle('on', overview); });
$('#b-help').addEventListener('click', () => { if (!modalResolve) ask($('#help-tpl').innerHTML); });
$('#go').addEventListener('click', startGame);

/* ---------- tile tooltip ---------- */
function tip(i, x, y) {
  const el = $('#tip');
  if (i === null || i === undefined || !g) { el.classList.remove('show'); return; }
  const t = TILES[i], o = g.owner[i];
  let body;
  if (t.type === 'market' || t.type === 'channel') {
    body = o === null ? `<span>Unmapped · ${money(t.price)}</span>` : `<span><i style="background:${g.players[o].color}"></i>${esc(g.players[o].name)}${t.type === 'market' ? ' · ' + STAGES[g.stage[i] - 1] : ''}</span><span>Rivals pay ${money(g.fee(i))}</span>`;
    if (t.type === 'market') body = `<em style="color:${SECTORS[t.sector].color}">${SECTORS[t.sector].name}</em>` + body;
  } else body = `<span>${{ kickoff: `Collect ${money(KICKOFF)} every lap`, signal: 'Draw a Signal card', brain: 'Log a permanent learning', spam: 'Lose your next turn', board: 'Pay 12% of your budget' }[t.type]}</span>`;
  el.innerHTML = `<b>${t.name}</b>${body}`;
  el.style.left = Math.min(window.innerWidth - 230, x + 16) + 'px';
  el.style.top = Math.max(10, y - 20) + 'px';
  el.classList.add('show');
}

/* ---------- boot ---------- */
(async function boot() {
  setupScreen();
  try {
    board = await createBoard($('#stage'), TILES, SECTORS);
  } catch (e) {
    console.error(e);
    $('#start').innerHTML = '<div class="panel"><h1>This game needs <em>WebGL.</em></h1><p class="lead">Your browser could not start the 3D board. Try a recent Chrome, Safari or Firefox with hardware acceleration on.</p></div>';
    return;
  }
  window.__board = board;
  board.autoRotate(true);
  if (new URLSearchParams(location.search).has('shot')) document.body.classList.add('shot'); else board.shiftView(0.2, 1);
  board.onHover(tip);
  board.onPick((i, x, y) => { if (i !== null && g && !modalResolve && matchMedia('(pointer: coarse)').matches) { tip(i, x, y); setTimeout(() => tip(null), 2600); } else if (i !== null && g && !modalResolve && phase !== 'over') { ask(marketCardOrInfo(i)); } });
  $('#go').disabled = false;
  $('#go').innerHTML = 'Start the quarter ' + ARROW;
  document.body.classList.add('ready');
})();

function marketCardOrInfo(i) {
  const t = TILES[i];
  if (t.type === 'market' || t.type === 'channel') return marketCard(i, g.players[viewer], 'info');
  const text = { kickoff: `Every time you pass Kickoff a new quarter starts and you collect ${money(KICKOFF)}. Land exactly on it for a bonus.`, signal: 'Draw a Signal card: funding rounds, shutdowns, bounced lists. Some help, some hurt, some move you.', brain: 'Log a learning in the GTM Brain. Most are permanent perks that stay with you for the whole game.', spam: 'Your domain is flagged. You lose your next turn, unless you hold a deliverability shield.', board: 'The board wants its overhead: pay 12% of your budget.' }[t.type];
  return `<div class="card ev"><div class="band"><span>Special tile</span><b></b></div><h2>${t.name}</h2><p>${text}</p><div class="btns"><button class="cta" data-v="1">Close</button></div></div>`;
}
