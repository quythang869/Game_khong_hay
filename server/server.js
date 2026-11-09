'use strict';
/**
 * SERVER REALTIME - Văn Phòng & Thế Giới Trốn Việc
 * - Giữ "sổ đăng ký" nhân vật (ai chọn nhân vật nào) => không bao giờ trùng nhân vật
 * - Nhân vật chưa có người chọn = NPC, do server điều khiển (đi dạo 9 khu vực, bị Sếp bắt...)
 * - Sếp cưỡi xe Cub đi tuần theo thời gian server => mọi người thấy Sếp ở cùng một chỗ
 * - Chuyển tiếp chat / emote / âm thanh / chọc ghẹo / máy chiếu giữa mọi người
 */
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
// Ví dụ: ALLOWED_ORIGINS=https://ten-game.vercel.app,http://localhost:8000  (để trống = cho phép tất cả)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

/* ===================== DỮ LIỆU THẾ GIỚI (khớp với index.html) ===================== */
const WORLD_W = 3800, WORLD_H = 2800;
const ZONES = {
  office:   { x: 1380, y: 1080, w: 960,  h: 620 },
  meeting:  { x: 1330, y: 160,  w: 1060, h: 700 },
  museum:   { x: 160,  y: 170,  w: 880,  h: 640 },
  karaoke:  { x: 160,  y: 1080, w: 900,  h: 640 },
  garden:   { x: 160,  y: 1980, w: 920,  h: 640 },
  dalat:    { x: 1360, y: 1980, w: 1000, h: 660 },
  nhatrang: { x: 2680, y: 1980, w: 960,  h: 660 },
  sapa:     { x: 2680, y: 160,  w: 960,  h: 680 },
  india:    { x: 2680, y: 1080, w: 960,  h: 640 }
};
const ZONE_KEYS = Object.keys(ZONES);

const NAMES = [
  'Chị Ấn Độ Bắn Tim', 'Chị Thảo Kính Cận', 'Anh Tuấn Lịch Lãm', 'Chị Tư Mũm Mĩm', 'Chị Năm Túi Vàng',
  'Chị Sáu Mũ Tai Bèo', 'Anh Bảy Áo Vàng', 'Chị Tám Áo Dài', 'Anh Chín Bánh Kem', 'Em Mười Tạo Dáng'
];
const DESKS = [
  [1540, 1320], [1710, 1320], [1880, 1320], [2050, 1320], [2220, 1320],
  [1540, 1540], [1710, 1540], [1880, 1540], [2050, 1540], [2220, 1540]
];
const SOUND_IDS = ['clap', 'wow', 'fart', 'oidoioi', 'fahhh', 'toicongchuyen', '10diem', 'sad', 'ghechua', 'metmoi', 'gidaybanoi'];
const EMOJIS = new Set(['💖', '🤣', '😱', '😭', '🍻']);

/* ===================== SẾP ĐI TUẦN NGẪU NHIÊN & KHÓ ĐOÁN ===================== */
const BOSS_RADAR = 300;   // bán kính phát hiện (tăng lên 300)
const PUNISH_MS = 10000;  // đứng phạt 10 giây
const IMMUNITY_MS = 11333;

// 9 Nút giao đường mòn tương ứng với mạng lưới kết nối 9 khu vực
const BOSS_NODES = [
  { id: 0, x: 600,  y: 490,  zone: 'museum',   neighbors: [1, 3] },
  { id: 1, x: 1860, y: 490,  zone: 'meeting',  neighbors: [0, 2, 4] },
  { id: 2, x: 3160, y: 490,  zone: 'sapa',     neighbors: [1, 5] },
  { id: 3, x: 600,  y: 1390, zone: 'karaoke',  neighbors: [0, 4, 6] },
  { id: 4, x: 1860, y: 1390, zone: 'office',   neighbors: [1, 3, 5, 7] },
  { id: 5, x: 3160, y: 1390, zone: 'india',    neighbors: [2, 4, 8] },
  { id: 6, x: 600,  y: 2300, zone: 'garden',   neighbors: [3, 7] },
  { id: 7, x: 1860, y: 2300, zone: 'dalat',    neighbors: [4, 6, 8] },
  { id: 8, x: 3160, y: 2300, zone: 'nhatrang', neighbors: [5, 7] }
];

function pickBossSpeed() {
  const r = Math.random();
  if (r < 0.25) return 280 + Math.random() * 50;  // Tăng tốc / Rồ ga (280-330 px/s)
  if (r < 0.45) return 140 + Math.random() * 30;  // Đi chậm rình mò (140-170 px/s)
  return 195 + Math.random() * 35;                // Tốc độ bình thường (195-230 px/s)
}

function generateZonePatrolPoints(zk) {
  const z = ZONES[zk];
  if (!z) return [];
  const padX = 140, padY = 120;
  const pts = [
    { x: Math.round(z.x + padX), y: Math.round(z.y + padY) },
    { x: Math.round(z.x + z.w - padX), y: Math.round(z.y + padY) },
    { x: Math.round(z.x + z.w - padX), y: Math.round(z.y + z.h - padY) },
    { x: Math.round(z.x + padX), y: Math.round(z.y + z.h - padY) }
  ];
  pts.forEach(p => {
    p.x += Math.round((Math.random() - 0.5) * 60);
    p.y += Math.round((Math.random() - 0.5) * 50);
  });
  if (Math.random() < 0.5) pts.reverse();
  const count = Math.random() < 0.4 ? 2 : 3;
  return pts.slice(0, count);
}

const boss = { x: BOSS_NODES[1].x, y: BOSS_NODES[1].y };

const bossNav = {
  startX: BOSS_NODES[1].x,
  startY: BOSS_NODES[1].y,
  targetX: BOSS_NODES[4].x,
  targetY: BOSS_NODES[4].y,
  currentNodeId: 1,
  previousNodeId: 1,
  travelled: 0,
  legDist: Math.hypot(BOSS_NODES[4].x - BOSS_NODES[1].x, BOSS_NODES[4].y - BOSS_NODES[1].y) || 1,
  speed: 210,
  curveAmp: 40,
  wobbleAmp: 14,
  subQueue: []
};

function startBossLeg(toX, toY, isSubLeg = false) {
  bossNav.startX = boss.x;
  bossNav.startY = boss.y;
  bossNav.targetX = toX;
  bossNav.targetY = toY;
  bossNav.travelled = 0;
  bossNav.legDist = Math.max(1, Math.hypot(toX - bossNav.startX, toY - bossNav.startY));
  bossNav.speed = pickBossSpeed();
  // Độ uốn lượn cong parabol ngẫu nhiên thay vì đi thẳng
  bossNav.curveAmp = (Math.random() - 0.5) * (isSubLeg ? 50 : 80);
  bossNav.wobbleAmp = (Math.random() - 0.5) * 20;
}

let karaokeDanceUntil = 0;

function isKaraokeZone(x, y, margin = 0) {
  const z = ZONES.karaoke;
  return x >= (z.x - margin) && x <= (z.x + z.w + margin) &&
         y >= (z.y - margin) && y <= (z.y + z.h + margin);
}

function updateBoss(now, dt) {
  // Nếu phòng Karaoke đang có vũ công nhảy múa và Boss đang ở trong hoặc vừa di chuyển vào phòng Karaoke -> Boss đứng im ngắm vũ công
  const bossInKaraoke = isKaraokeZone(boss.x, boss.y, 10);
  if (now < karaokeDanceUntil && bossInKaraoke) {
    return;
  }
  const dSec = Math.min(0.1, (dt || 33) / 1000);
  bossNav.travelled += bossNav.speed * dSec;
  const p = Math.min(1, bossNav.travelled / bossNav.legDist);

  // Vị trí nội suy cơ bản
  const bx = bossNav.startX + (bossNav.targetX - bossNav.startX) * p;
  const by = bossNav.startY + (bossNav.targetY - bossNav.startY) * p;

  // Vector vuông góc để tạo quỹ đạo cong uốn lượn
  const dx = bossNav.targetX - bossNav.startX;
  const dy = bossNav.targetY - bossNav.startY;
  const len = Math.hypot(dx, dy);
  if (len > 5) {
    const nx = -dy / len;
    const ny = dx / len;
    const curveOffset = Math.sin(p * Math.PI) * bossNav.curveAmp;
    const wobbleOffset = Math.sin(p * Math.PI * 2) * bossNav.wobbleAmp;
    boss.x = bx + nx * (curveOffset + wobbleOffset);
    boss.y = by + ny * (curveOffset + wobbleOffset);
  } else {
    boss.x = bx;
    boss.y = by;
  }

  // Khi đã đến đích chặng hiện tại
  if (p >= 1) {
    boss.x = bossNav.targetX;
    boss.y = bossNav.targetY;

    // Nếu còn điểm lượn quanh khu vực -> đi tiếp điểm đó
    if (bossNav.subQueue.length > 0) {
      const nextPt = bossNav.subQueue.shift();
      startBossLeg(nextPt.x, nextPt.y, true);
      return;
    }

    // Đã hoàn thành các điểm lượn, chọn hướng đi tại ngã rẽ
    const currNode = BOSS_NODES[bossNav.currentNodeId];
    if (currNode) {
      // 50% cơ hội lượn quanh khu vực trước khi sang ngã rẽ khác
      if (Math.random() < 0.5) {
        const sweepPts = generateZonePatrolPoints(currNode.zone);
        if (sweepPts.length > 0) {
          bossNav.subQueue = sweepPts;
          const firstPt = bossNav.subQueue.shift();
          startBossLeg(firstPt.x, firstPt.y, true);
          return;
        }
      }

      // Chọn ngã rẽ tiếp theo
      const neighbors = currNode.neighbors;
      let nextId = neighbors[0];
      const forwardNeighbors = neighbors.filter(id => id !== bossNav.previousNodeId);

      // 75% đi tiếp nút mới, 25% quay đầu đột ngột
      if (forwardNeighbors.length > 0 && Math.random() < 0.75) {
        nextId = forwardNeighbors[Math.floor(Math.random() * forwardNeighbors.length)];
      } else {
        nextId = neighbors[Math.floor(Math.random() * neighbors.length)];
      }

      bossNav.previousNodeId = bossNav.currentNodeId;
      bossNav.currentNodeId = nextId;
      const nextNode = BOSS_NODES[nextId];
      startBossLeg(nextNode.x, nextNode.y, false);
    }
  }
}

function zoneOf(x, y) {
  for (const k of ZONE_KEYS) {
    const z = ZONES[k];
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return k;
  }
  return 'trail';
}

function isOfficeZone(x, y, margin = 0) {
  const z = ZONES.office;
  return x >= (z.x - margin) && x <= (z.x + z.w + margin) &&
         y >= (z.y - margin) && y <= (z.y + z.h + margin);
}

/* ===================== TRẠNG THÁI ===================== */
const chars = DESKS.map((d, i) => ({
  id: i + 1,
  x: d[0], y: d[1] + 38,
  tx: d[0], ty: d[1] + 38,
  deskX: d[0], deskY: d[1] + 38,
  owner: null,          // client đang điều khiển (null = NPC)
  name: '', mood: '',
  mv: false,
  stun: 0, punish: 0, immunity: 0,
  aiWait: 1500 + i * 600
}));
const clients = new Set();
let currentProjector = null;

/* ===================== CƠ CHẾ BOSS HP & GẠCH NÉM SẾP ===================== */
const BOSS_MAX_HP = 100;
let bossHp = BOSS_MAX_HP;
let bossDefeated = false;

const MAX_BRICKS = 15;
const bricks = [];
let brickIdSeq = 0;

function spawnBrick() {
  if (bossDefeated || bricks.length >= MAX_BRICKS) return;
  const keys = ZONE_KEYS;
  const zk = keys[Math.floor(Math.random() * keys.length)];
  const z = ZONES[zk];
  const bx = Math.round(z.x + 90 + Math.random() * (z.w - 180));
  const by = Math.round(z.y + 90 + Math.random() * (z.h - 180));
  const b = { id: ++brickIdSeq, x: bx, y: by };
  bricks.push(b);
  broadcast({ t: 'brick_spawn', brick: b });
}

// Cứ mỗi 10 giây xuất hiện ngẫu nhiên 1 cục gạch trên bản đồ
setInterval(() => {
  if (clients.size > 0 && !bossDefeated) {
    spawnBrick();
  }
}, 10000);

/* ===================== TIỆN ÍCH ===================== */
function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }
function broadcast(obj, except) {
  const s = JSON.stringify(obj);
  for (const c of clients) if (c !== except && c.ws.readyState === 1) c.ws.send(s);
}
function cleanName(v, fallback) {
  const s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  return s || fallback;
}
function cleanText(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function pad(n) { return String(n).padStart(2, '0'); }
function rosterOwners() {
  const o = {};
  for (const c of chars) if (c.owner) o[c.id] = { name: c.name, mood: c.mood };
  return o;
}
function broadcastRoster() { broadcast({ t: 'roster', owners: rosterOwners() }); }

function releaseChar(client) {
  if (!client.charId) return;
  const c = chars[client.charId - 1];
  client.charId = 0;
  if (!c || c.owner !== client) return;
  const oldName = c.name;
  c.owner = null;
  c.name = '';
  c.mood = '';
  c.tx = c.x; c.ty = c.y;
  c.aiWait = 1500;
  broadcast({ t: 'sys', text: `🔴 ${oldName} đã rời game - nhân vật #${pad(c.id)} quay lại làm NPC tự đi dạo.` });
  broadcastRoster();
}

function punishChar(c) {
  c.x = c.deskX; c.y = c.deskY;
  c.tx = c.x; c.ty = c.y;
  c.mv = false;
  c.stun = 0;
  c.punish = PUNISH_MS;
  c.immunity = IMMUNITY_MS;
  broadcast({ t: 'caught', id: c.id });
}

/* ===================== VÒNG LẶP GAME (30Hz) ===================== */
function updateNpc(c, dt, f) {
  if (c.stun > 0) { c.mv = false; return; }
  const dist = Math.hypot(c.tx - c.x, c.ty - c.y);
  if (dist > 5) {
    const step = Math.min(3.8 * f, dist);
    c.x += ((c.tx - c.x) / dist) * step;
    c.y += ((c.ty - c.y) / dist) * step;
    c.mv = true;
  } else {
    c.mv = false;
  }
  c.aiWait -= dt;
  if (c.aiWait <= 0) {
    c.aiWait = 4000 + Math.random() * 4600;
    if (Math.random() < 0.25) {
      c.tx = c.deskX; c.ty = c.deskY;
    } else {
      const z = ZONES[ZONE_KEYS[Math.floor(Math.random() * ZONE_KEYS.length)]];
      c.tx = z.x + 140 + Math.random() * (z.w - 280);
      c.ty = z.y + 160 + Math.random() * (z.h - 260);
    }
    if (Math.random() < 0.16) {
      broadcast({ t: 'sound', id: c.id, sid: SOUND_IDS[Math.floor(Math.random() * SOUND_IDS.length)] });
    }
  }
}

let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = Math.min(100, now - lastTick);
  lastTick = now;
  if (clients.size === 0) return;      // không ai online -> không tính toán
  const f = dt / (1000 / 60);
  updateBoss(now, dt);
  const bossInOffice = isOfficeZone(boss.x, boss.y, 30);
  const bossInKaraoke = isKaraokeZone(boss.x, boss.y, 10);
  const bossMesmerized = (now < karaokeDanceUntil) && bossInKaraoke;
  for (const c of chars) {
    if (c.stun > 0) c.stun = Math.max(0, c.stun - dt);
    if (c.immunity > 0) c.immunity = Math.max(0, c.immunity - dt);
    if (c.punish > 0) { c.punish = Math.max(0, c.punish - dt); c.mv = false; continue; }
    if (!c.owner) updateNpc(c, dt, f);
    
    // VÙNG AN TOÀN TUYỆT ĐỐI:
    // 1. Phòng làm việc luôn an toàn 100%
    // 2. Phòng Karaoke khi có dàn vũ công đang nhảy múa (karaokeDanceUntil) là vùng an toàn 100% (người chơi ở trong phòng karaoke không bao giờ bị bắt)
    // 3. Khi Boss đang mê mẩn ngắm vũ công nhảy múa ở Karaoke (bossMesmerized) thì Boss đứng im và không bắt phạt bất kỳ ai
    const inKaraokeSafe = (now < karaokeDanceUntil) && isKaraokeZone(c.x, c.y, 40);
    if (!bossInOffice && !bossMesmerized && !inKaraokeSafe && c.immunity <= 0 && !isOfficeZone(c.x, c.y, 50) && Math.hypot(c.x - boss.x, c.y - boss.y) <= BOSS_RADAR) {
      punishChar(c);
    }
  }
}, 33);

function snapshotMsg() {
  const now = Date.now();
  const bossInKaraoke = isKaraokeZone(boss.x, boss.y, 10);
  const bossMesmerized = (now < karaokeDanceUntil) && bossInKaraoke;
  return {
    t: 'snap',
    b: [Math.round(boss.x), Math.round(boss.y)],
    c: chars.map(c => [c.id, Math.round(c.x), Math.round(c.y), c.mv ? 1 : 0, Math.round(c.punish)]),
    hp: bossHp,
    brk: bricks.map(b => [b.id, b.x, b.y]),
    mz: bossMesmerized ? 1 : 0,
    kd: Math.max(0, karaokeDanceUntil - now)
  };
}
setInterval(() => { if (clients.size) broadcast(snapshotMsg()); }, 66);   // ~15 lần/giây

/* ===================== KẾT NỐI ===================== */
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ok - players: ' + chars.filter(c => c.owner).length);
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({
  server,
  maxPayload: 4096,
  verifyClient: (info) => ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(info.origin)
});

wss.on('connection', (ws) => {
  const client = { ws, token: '', charId: 0, bricks: 0, pineTrees: 0, isAlive: true, winStart: Date.now(), count: 0, lastPrank: 0 };
  clients.add(client);

  send(ws, {
    t: 'welcome',
    roster: rosterOwners(),
    projector: currentProjector,
    bossHp: bossHp,
    maxHp: BOSS_MAX_HP,
    bricks: bricks
  });
  send(ws, snapshotMsg());

  ws.on('pong', () => { client.isAlive = true; });

  ws.on('message', (data) => {
    client.isAlive = true;
    const now = Date.now();
    if (now - client.winStart > 1000) { client.winStart = now; client.count = 0; }
    if (++client.count > 80) return;                 // chống spam

    let m;
    try { m = JSON.parse(data.toString()); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    const me = client.charId ? chars[client.charId - 1] : null;

    switch (m.t) {
      case 'ping':
        send(ws, { t: 'pong' });
        break;

      case 'join': {
        const id = Number(m.charId) | 0;
        const c = chars[id - 1];
        if (!c) return;
        // Cùng 1 tab kết nối lại -> đá kết nối cũ ra
        const token = cleanText(m.token, 60);
        if (token) {
          for (const other of clients) {
            if (other !== client && other.token === token) {
              releaseChar(other);
              try { other.ws.close(4000, 'replaced'); } catch (e) {}
            }
          }
        }
        client.token = token;
        if (c.owner && c.owner !== client) { send(ws, { t: 'joinFail', reason: 'taken' }); return; }
        if (client.charId && client.charId !== id) releaseChar(client);   // đổi nhân vật

        const wasMine = c.owner === client;
        c.owner = client;
        client.charId = id;
        c.name = cleanName(m.name, NAMES[id - 1]);
        c.mood = cleanText(m.mood, 60);
        if (!wasMine) {
          c.x = c.deskX; c.y = c.deskY; c.tx = c.x; c.ty = c.y;
          c.mv = false; c.stun = 0; c.punish = 0; c.immunity = 0;
          broadcast({ t: 'sys', text: `🟢 ${c.name} đã vào game với nhân vật #${pad(id)}!` });
        }
        send(ws, { t: 'joined', charId: id, x: c.x, y: c.y, fresh: !wasMine });
        broadcastRoster();
        break;
      }

      case 'leave':
        releaseChar(client);
        break;

      case 'special_ride': {
        if (!me) return;
        if (m.active) {
          me.immunity = 30000; // Miễn nhiễm trong lúc đang đi thảm bay hoặc đu quay
        } else {
          me.immunity = 3000;  // 3 giây miễn nhiễm sau khi tiếp đất
        }
        break;
      }

      case 'refill_bricks': {
        if (!me || me.punish > 0 || bossDefeated) return;
        if (now - (client.lastGardenRefill || 0) < 10000) return; // Cooldown 10s
        client.lastGardenRefill = now;
        client.bricks = 3;
        send(ws, { t: 'my_bricks', count: client.bricks });
        break;
      }

      case 'uproot_pine': {
        if (!me || me.punish > 0 || bossDefeated) return;
        if ((client.pineTrees || 0) >= 1) return; // Mỗi người chỉ được cầm tối đa 1 cây thông
        if (now - (client.lastPineUproot || 0) < 10000) return; // Cooldown 10s
        client.lastPineUproot = now;
        client.pineTrees = 1;
        send(ws, { t: 'my_pine', count: client.pineTrees });
        broadcast({ t: 'pine_uprooted', id: me.id, byName: me.name });
        break;
      }

      case 'stealth': {
        if (!me) return;
        me.immunity = 5000; // Miễn nhiễm Sếp 5 giây khi tàng hình tại SaPa
        broadcast({ t: 'stealth', id: me.id, duration: 5000 });
        break;
      }

      case 'graffiti': {
        if (!me) return;
        broadcast({ t: 'graffiti', byName: me.name, duration: 15000 });
        break;
      }

      case 'karaoke_dance': {
        if (!me) return;
        karaokeDanceUntil = now + 10000;
        broadcast({ t: 'karaoke_dance', byName: me.name, duration: 10000 });
        break;
      }

      case 'move': {
        if (!me || me.punish > 0) return;
        const x = Number(m.x), y = Number(m.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        me.x = Math.max(80, Math.min(WORLD_W - 80, x));
        me.y = Math.max(80, Math.min(WORLD_H - 80, y));
        me.tx = me.x; me.ty = me.y;
        me.mv = !!m.mv;
        break;
      }

      case 'chat': {
        if (!me) return;
        const text = cleanText(m.text, 100);
        if (!text) return;
        broadcast({ t: 'chat', id: me.id, name: me.name, text, mega: !!m.mega });
        break;
      }

      case 'emote':
        if (!me || !EMOJIS.has(m.emoji)) return;
        broadcast({ t: 'emote', id: me.id, emoji: m.emoji }, client);
        break;

      case 'sound':
        if (!me || !SOUND_IDS.includes(m.sid)) return;
        broadcast({ t: 'sound', id: me.id, sid: m.sid }, client);
        break;

      case 'prank': {
        if (!me || me.punish > 0) return;
        if (!['paper', 'hammer', 'chair'].includes(m.kind)) return;
        if (now - client.lastPrank < 300) return;
        const to = chars[(Number(m.to) | 0) - 1];
        if (!to || to === me) return;
        if (Math.hypot(me.x - to.x, me.y - to.y) > 200) return;     // phải đứng gần
        client.lastPrank = now;
        if (!to.owner) {                                             // NPC bị trêu thì đứng khựng lại
          if (m.kind === 'paper') to.stun = 2340;
          if (m.kind === 'chair') to.stun = 2500;
        }
        broadcast({ t: 'prank', kind: m.kind, from: me.id, to: to.id });
        break;
      }

      case 'projector': {
        if (!me) return;
        const url = cleanText(m.url, 500);
        if (!/^https?:\/\//i.test(url) && !/^[A-Za-z0-9_-]{11}$/.test(url)) return;
        currentProjector = url;
        broadcast({ t: 'projector', url, by: me.name });
        break;
      }

      case 'pickup_brick': {
        if (!me || me.punish > 0 || bossDefeated) return;
        const bId = Number(m.id) | 0;
        const idx = bricks.findIndex(b => b.id === bId);
        if (idx === -1) return;
        const b = bricks[idx];
        if (Math.hypot(me.x - b.x, me.y - b.y) > 140) return;
        if (client.bricks >= 3) return; // Mỗi người cầm tối đa 3 viên gạch
        client.bricks++;
        bricks.splice(idx, 1);
        broadcast({ t: 'brick_picked', id: bId, by: me.id, byName: me.name });
        send(ws, { t: 'my_bricks', count: client.bricks });
        break;
      }

      case 'throw_pine': {
        if (!me || me.punish > 0 || bossDefeated) return;
        if ((client.pineTrees || 0) <= 0) return;
        const distToBoss = Math.hypot(me.x - boss.x, me.y - boss.y);
        if (distToBoss > 510) return;
        client.pineTrees = 0;
        bossHp = Math.max(0, bossHp - 2);
        broadcast({ t: 'pine_hit', from: me.id, fromName: me.name, bossHp, maxHp: BOSS_MAX_HP });
        send(ws, { t: 'my_pine', count: client.pineTrees });

        if (bossHp === 0 && !bossDefeated) {
          bossDefeated = true;
          broadcast({ t: 'game_over', reason: 'boss_defeated' });
          setTimeout(() => {
            bossHp = BOSS_MAX_HP;
            bossDefeated = false;
            bricks.length = 0;
            for (const c of clients) {
              c.bricks = 0;
              c.pineTrees = 0;
              releaseChar(c);
            }
            broadcast({ t: 'reset_lobby' });
          }, 5000);
        }
        break;
      }

      case 'throw_brick': {
        if (!me || me.punish > 0 || bossDefeated) return;
        if (client.bricks <= 0) return;
        const distToBoss = Math.hypot(me.x - boss.x, me.y - boss.y);
        if (distToBoss > 510) return; // Khoảng cách ném an toàn (tầm 470px + độ trễ mạng)
        client.bricks--;
        bossHp = Math.max(0, bossHp - 1);
        broadcast({ t: 'brick_hit', from: me.id, fromName: me.name, bossHp, maxHp: BOSS_MAX_HP });
        send(ws, { t: 'my_bricks', count: client.bricks });

        if (bossHp === 0 && !bossDefeated) {
          bossDefeated = true;
          broadcast({ t: 'game_over', reason: 'boss_defeated' });
          setTimeout(() => {
            bossHp = BOSS_MAX_HP;
            bossDefeated = false;
            bricks.length = 0;
            for (const c of clients) {
              c.bricks = 0;
              c.pineTrees = 0;
              releaseChar(c);
            }
            broadcast({ t: 'reset_lobby' });
          }, 5000);
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    releaseChar(client);
    clients.delete(client);
  });
  ws.on('error', () => {});
});

// Dọn các kết nối "chết" mỗi 25 giây
setInterval(() => {
  for (const c of clients) {
    if (!c.isAlive) { try { c.ws.terminate(); } catch (e) {} continue; }
    c.isAlive = false;
    try { c.ws.ping(); } catch (e) {}
  }
}, 25000);

server.listen(PORT, () => console.log('Game server đang chạy ở cổng ' + PORT));
