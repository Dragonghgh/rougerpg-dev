// =======================
// ROGUELIKE - FRESH START
// 16x16 pixel-art, player/enemy animations, items, inventory, settings
// =======================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const TILE = 16;
const MAP_W = 50;
const MAP_H = 40;
const VIEW_W = 20;
const VIEW_H = 15;

canvas.width = VIEW_W * TILE;
canvas.height = VIEW_H * TILE;

// ---------- GAME STATE ----------
let state = "menu"; // menu, game, dead, settings, inventory
let previousState = "menu";

let map = [];
let rooms = [];
let enemies = [];
let items = [];
let particles = [];
let inventory = [];

let keys = {
  up: "w", down: "s", left: "a", right: "d", attack: " "
};

let player = {
  x: 0, y: 0, hp: 12, maxHp: 12, dmg: 2, level: 1, xp: 0, nextXP: 5,
  dir: "down", frame: 0, frameTimer: 0
};

// ---------- MAP GENERATION ----------
function createMap() {
  map = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(0));
  rooms = [];
  enemies = [];
  items = [];
}

// generate rectangular rooms
function generateRooms() {
  for (let i = 0; i < 7; i++) {
    const w = rand(4, 8), h = rand(4, 8);
    const x = rand(1, MAP_W - w - 1), y = rand(1, MAP_H - h - 1);
    rooms.push({ x, y, w, h });
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) map[yy][xx] = 1;
  }
  // boss room
  const boss = { x: MAP_W - 10, y: MAP_H - 10, w: 8, h: 8 };
  rooms.push(boss);
  for (let yy = boss.y; yy < boss.y + boss.h; yy++)
    for (let xx = boss.x; xx < boss.x + boss.w; xx++) map[yy][xx] = 1;
}

// carve corridors between rooms
function carve(x1, y1, x2, y2) {
  while (x1 !== x2) { map[y1][x1] = 1; x1 += Math.sign(x2 - x1); }
  while (y1 !== y2) { map[y1][x1] = 1; y1 += Math.sign(y2 - y1); }
}

function connectRooms() {
  for (let i = 1; i < rooms.length; i++) {
    const r1 = rooms[i - 1], r2 = rooms[i];
    const x1 = Math.floor(r1.x + r1.w / 2), y1 = Math.floor(r1.y + r1.h / 2);
    const x2 = Math.floor(r2.x + r2.w / 2), y2 = Math.floor(r2.y + r2.h / 2);
    carve(x1, y1, x2, y2);
  }
}

// ---------- PLAYER ----------
function placePlayer() {
  const r = rooms[0];
  player.x = Math.floor(r.x + r.w / 2);
  player.y = Math.floor(r.y + r.h / 2);
  player.hp = player.maxHp;
}

// ---------- ENEMIES ----------
function spawnEnemies() {
  rooms.slice(1).forEach((r, i) => {
    enemies.push({
      x: Math.floor(r.x + r.w / 2),
      y: Math.floor(r.y + r.h / 2),
      hp: i === rooms.length - 1 ? 12 : 4,
      boss: i === rooms.length - 1,
      dir: "down", frame: 0, frameTimer: 0
    });
  });
}

// ---------- ITEMS ----------
function spawnItems() {
  rooms.slice(1, -1).forEach(r => {
    items.push({
      x: Math.floor(r.x + r.w / 2) + 1,
      y: Math.floor(r.y + r.h / 2),
      type: "apple"
    });
  });
}

// ---------- INPUT ----------
document.addEventListener("keydown", e => {
  if (e.key === "Escape") toggleSettings();
  if (state === "menu" && e.key === "Enter") startGame();
  if (state === "dead" && e.key === "r") startGame();
  if (state !== "game") return;

  let dx = 0, dy = 0;
  if (e.key === keys.up) dy = -1;
  if (e.key === keys.down) dy = 1;
  if (e.key === keys.left) dx = -1;
  if (e.key === keys.right) dx = 1;

  if (map[player.y + dy]?.[player.x + dx] === 1) {
    player.x += dx;
    player.y += dy;
    player.dir = dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down";
    player.frameTimer++;
    if (player.frameTimer % 10 === 0) player.frame = (player.frame + 1) % 4;
    pickupItem();
  }

  if (e.key === keys.attack) attack();
  if (e.key === "i") toggleInventory();
});

// ---------- INVENTORY ----------
let inventoryOpen = false;
function toggleInventory() {
  if (state === "inventory") state = previousState;
  else { previousState = state; state = "inventory"; }
}

// ---------- SETTINGS ----------
function toggleSettings() {
  if (state === "settings") state = previousState;
  else { previousState = state; state = "settings"; }
}

// ---------- COMBAT ----------
function attack() {
  enemies = enemies.filter(e => {
    const dist = Math.abs(e.x - player.x) + Math.abs(e.y - player.y);
    if (dist === 1) {
      e.hp -= player.dmg;
      if (e.hp <= 0) {
        player.xp += e.boss ? 5 : 1;
        if (player.xp >= player.nextXP) levelUp();
        return false;
      }
    }
    return true;
  });
}

// ---------- LEVEL-UP ----------
function levelUp() {
  player.level++;
  player.xp = 0;
  player.nextXP += 5;
  player.maxHp += 2;
  player.hp = player.maxHp;
  player.dmg++;
}

// ---------- PICKUP ----------
function pickupItem() {
  items = items.filter(i => {
    if (i.x === player.x && i.y === player.y) {
      inventory.push(i);
      if (i.type === "apple") player.hp = Math.min(player.maxHp, player.hp + 4);
      return false;
    }
    return true;
  });
}

// ---------- DRAW ----------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state === "menu") {
    drawCentered("ROGUELIKE", 100, 32);
    drawCentered("ENTER – Start", 140, 16);
    drawCentered("ESC – Settings", 160, 14);
    return;
  }
  if (state === "dead") {
    drawCentered("YOU DIED", 100, 32, "red");
    drawCentered("R – Restart", 140, 16);
    return;
  }
  if (state === "settings") {
    drawCentered("SETTINGS", 100, 28);
    drawCentered("ESC – Close Menu", 140, 16);
    drawCentered("I – Inventory", 160, 16);
    return;
  }
  if (state === "inventory") {
    drawCentered("INVENTORY", 100, 28);
    inventory.forEach((i, idx) => {
      ctx.fillStyle = i.type === "apple" ? "red" : "yellow";
      ctx.fillRect(180 + idx * 20, 140, 16, 16);
    });
    drawCentered("ESC – Close Inventory", 180, 16);
    return;
  }

  // --- GAME VIEW ---
  const camX = player.x - Math.floor(VIEW_W / 2);
  const camY = player.y - Math.floor(VIEW_H / 2);

  for (let y = 0; y < VIEW_H; y++)
    for (let x = 0; x < VIEW_W; x++) {
      const mx = x + camX, my = y + camY;
      ctx.fillStyle = map[my]?.[mx] === 1 ? "#555" : "#222";
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }

  // Items
  items.forEach(i => {
    ctx.fillStyle = i.type === "apple" ? "red" : "yellow";
    ctx.fillRect((i.x - camX) * TILE, (i.y - camY) * TILE, TILE, TILE);
  });

  // Enemies
  enemies.forEach(e => {
    ctx.fillStyle = e.boss ? "purple" : "red";
    ctx.fillRect((e.x - camX) * TILE, (e.y - camY) * TILE, TILE, TILE);
  });

  // Player
  ctx.fillStyle = "cyan";
  ctx.fillRect((player.x - camX) * TILE, (player.y - camY) * TILE, TILE, TILE);

  // HUD
  ctx.fillStyle = "white";
  ctx.fillText(`HP: ${player.hp}/${player.maxHp}`, 10, 18);
  ctx.fillText(`LVL: ${player.level} XP: ${player.xp}/${player.nextXP}`, 10, 36);
}

function drawCentered(text, y, size = 20, color = "white") {
  ctx.fillStyle = color;
  ctx.font = `${size}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, y);
  ctx.textAlign = "left";
}

// ---------- LOOP ----------
function loop() {
  draw();
  requestAnimationFrame(loop);
}

// ---------- START GAME ----------
function startGame() {
  state = "game";
  createMap();
  generateRooms();
  connectRooms();
  placePlayer();
  spawnEnemies();
  spawnItems();
}

loop();

// ---------- UTILS ----------
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
