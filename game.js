const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ---------- CONFIG ----------
const TILE = 32;
const MAP_W = 50;
const MAP_H = 40;
const VIEW_W = 20;
const VIEW_H = 15;

canvas.width = VIEW_W * TILE;
canvas.height = VIEW_H * TILE;

// ---------- STATE ----------
let gameState = "menu"; // menu, game, dead, settings
let previousState = "menu";

let map = [];
let rooms = [];
let enemies = [];
let items = [];

// ---------- TIMERS ----------
let lastEnemyMove = 0;
let lastHitTime = 0;
let flashTime = 0;

const ENEMY_DELAY = 400;
const HIT_COOLDOWN = 800;
const FLASH_DURATION = 200;

// ---------- PLAYER ----------
const player = {
  x: 0,
  y: 0,
  hp: 12,
  maxHp: 12,
  dmg: 2,
  level: 1,
  xp: 0,
  nextXP: 5
};

// ---------- MAP ----------
function createMap() {
  map = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(0));
  rooms = [];
  enemies = [];
  items = [];
}

function generateRooms() {
  for (let i = 0; i < 7; i++) {
    const w = rand(4, 8);
    const h = rand(4, 8);
    const x = rand(1, MAP_W - w - 1);
    const y = rand(1, MAP_H - h - 1);

    rooms.push({ x, y, w, h });
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        map[yy][xx] = 1;
  }

  // Boss room
  const boss = { x: MAP_W - 10, y: MAP_H - 10, w: 8, h: 8 };
  rooms.push(boss);
  for (let yy = boss.y; yy < boss.y + boss.h; yy++)
    for (let xx = boss.x; xx < boss.x + boss.w; xx++)
      map[yy][xx] = 1;
}

function connectRooms() {
  for (let i = 1; i < rooms.length; i++) {
    carve(
      Math.floor(rooms[i - 1].x + rooms[i - 1].w / 2),
      Math.floor(rooms[i - 1].y + rooms[i - 1].h / 2),
      Math.floor(rooms[i].x + rooms[i].w / 2),
      Math.floor(rooms[i].y + rooms[i].h / 2)
    );
  }
}

function carve(x1, y1, x2, y2) {
  while (x1 !== x2) {
    map[y1][x1] = 1;
    x1 += Math.sign(x2 - x1);
  }
  while (y1 !== y2) {
    map[y1][x1] = 1;
    y1 += Math.sign(y2 - y1);
  }
}

// ---------- PLAYER ----------
function placePlayer() {
  const r = rooms[0];
  player.x = Math.floor(r.x + r.w / 2);
  player.y = Math.floor(r.y + r.h / 2);
  player.hp = player.maxHp;
  lastHitTime = 0;
}

// ---------- INPUT ----------
document.addEventListener("keydown", e => {
  if (e.key === "Escape") toggleSettings();

  if (gameState === "menu" && e.key === "Enter") startGame();
  if (gameState === "dead" && e.key === "r") startGame();
  if (gameState !== "game") return;

  let dx = 0, dy = 0;
  if (e.key === "w") dy = -1;
  if (e.key === "s") dy = 1;
  if (e.key === "a") dx = -1;
  if (e.key === "d") dx = 1;

  if (map[player.y + dy]?.[player.x + dx] === 1) {
    player.x += dx;
    player.y += dy;
    pickupItem();
  }

  if (e.key === " ") attack();
});

// ---------- SETTINGS ----------
function toggleSettings() {
  if (gameState === "settings") {
    gameState = previousState;
  } else {
    previousState = gameState;
    gameState = "settings";
  }
}

// ---------- ENEMIES ----------
function spawnEnemies() {
  rooms.slice(1).forEach((r, i) => {
    enemies.push({
      x: Math.floor(r.x + r.w / 2),
      y: Math.floor(r.y + r.h / 2),
      hp: i === rooms.length - 1 ? 12 : 4,
      boss: i === rooms.length - 1
    });
  });
}

function updateEnemies() {
  const now = Date.now();
  if (now - lastEnemyMove < ENEMY_DELAY) return;
  lastEnemyMove = now;

  enemies.forEach(e => {
    let dx = player.x - e.x;
    let dy = player.y - e.y;

    let mx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
    let my = mx === 0 ? Math.sign(dy) : 0;

    // attack instead of stacking
    if (e.x + mx === player.x && e.y + my === player.y) {
      if (now - lastHitTime > HIT_COOLDOWN) {
        player.hp--;
        lastHitTime = now;
        flashTime = now;

        // knockback player
        if (map[player.y - my]?.[player.x - mx] === 1) {
          player.x -= mx;
          player.y -= my;
        }

        if (player.hp <= 0) gameState = "dead";
      }
      return;
    }

    if (map[e.y + my]?.[e.x + mx] === 1) {
      e.x += mx;
      e.y += my;
    }
  });
}

// ---------- COMBAT ----------
function attack() {
  enemies = enemies.filter(e => {
    const dist = Math.abs(e.x - player.x) + Math.abs(e.y - player.y);
    if (dist === 1) {
      e.hp -= player.dmg;

      // enemy knockback
      const kx = Math.sign(e.x - player.x);
      const ky = Math.sign(e.y - player.y);
      if (map[e.y + ky]?.[e.x + kx] === 1) {
        e.x += kx;
        e.y += ky;
      }

      if (e.hp <= 0) {
        gainXP(e.boss ? 5 : 1);
        return false;
      }
    }
    return true;
  });
}

// ---------- XP ----------
function gainXP(amount) {
  player.xp += amount;
  if (player.xp >= player.nextXP) {
    player.level++;
    player.xp = 0;
    player.nextXP += 5;
    player.maxHp += 2;
    player.hp = player.maxHp;
    player.dmg++;
  }
}

// ---------- ITEMS ----------
function spawnItems() {
  rooms.slice(1, -1).forEach(r => {
    items.push({
      x: Math.floor(r.x + r.w / 2) + 1,
      y: Math.floor(r.y + r.h / 2)
    });
  });
}

function pickupItem() {
  items = items.filter(i => {
    if (i.x === player.x && i.y === player.y) {
      player.hp = Math.min(player.maxHp, player.hp + 4);
      return false;
    }
    return true;
  });
}

// ---------- DRAW ----------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === "menu") {
    drawCentered("ROGUELIKE", 200, 32);
    drawCentered("ENTER – Start", 240, 16);
    drawCentered("ESC – Settings", 265, 14);
    return;
  }

  if (gameState === "dead") {
    drawCentered("YOU DIED", 200, 32, "red");
    drawCentered("R – Restart", 240, 16);
    return;
  }

  if (gameState === "settings") {
    drawCentered("SETTINGS", 160, 28);
    drawCentered("W A S D – Move", 200, 16);
    drawCentered("SPACE – Attack", 225, 16);
    drawCentered("ESC – Close Menu", 250, 16);
    drawCentered("ENTER – Start Game", 275, 16);
    return;
  }

  const camX = player.x - Math.floor(VIEW_W / 2);
  const camY = player.y - Math.floor(VIEW_H / 2);

  for (let y = 0; y < VIEW_H; y++) {
    for (let x = 0; x < VIEW_W; x++) {
      const mx = x + camX;
      const my = y + camY;
      ctx.fillStyle = map[my]?.[mx] === 1 ? "#444" : "#111";
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  ctx.fillStyle = "green";
  items.forEach(i =>
    ctx.fillRect((i.x - camX) * TILE, (i.y - camY) * TILE, TILE, TILE)
  );

  enemies.forEach(e => {
    ctx.fillStyle = e.boss ? "purple" : "red";
    ctx.fillRect((e.x - camX) * TILE, (e.y - camY) * TILE, TILE, TILE);
  });

  ctx.fillStyle =
    Date.now() - flashTime < FLASH_DURATION ? "white" : "cyan";
  ctx.fillRect(
    (player.x - camX) * TILE,
    (player.y - camY) * TILE,
    TILE,
    TILE
  );

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
  if (gameState === "game") updateEnemies();
  draw();
  requestAnimationFrame(loop);
}

// ---------- START ----------
function startGame() {
  gameState = "game";
  createMap();
  generateRooms();
  connectRooms();
  placePlayer();
  spawnEnemies();
  spawnItems();
}

loop();

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
