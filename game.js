const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const TILE = 32;
const MAP_W = 50;
const MAP_H = 40;
const VIEW_W = 20;
const VIEW_H = 15;

canvas.width = VIEW_W * TILE;
canvas.height = VIEW_H * TILE;

// 0 wall, 1 floor
let map = [];
let rooms = [];
let enemies = [];
let items = [];

let gameState = "menu";

const player = {
  x: 0,
  y: 0,
  hp: 10,
  maxHp: 10,
  dmg: 2
};

// ---------- MAP ----------
function createMap() {
  map = Array.from({ length: MAP_H }, () =>
    Array(MAP_W).fill(0)
  );
  rooms = [];
  enemies = [];
  items = [];
}

function generateRooms() {
  for (let i = 0; i < 8; i++) {
    const w = rand(4, 8);
    const h = rand(4, 8);
    const x = rand(1, MAP_W - w - 1);
    const y = rand(1, MAP_H - h - 1);

    rooms.push({ x, y, w, h });

    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        map[yy][xx] = 1;
  }
}

function connectRooms() {
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    carve(
      Math.floor(a.x + a.w / 2),
      Math.floor(a.y + a.h / 2),
      Math.floor(b.x + b.w / 2),
      Math.floor(b.y + b.h / 2)
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
}

document.addEventListener("keydown", e => {
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

// ---------- ENEMIES ----------
function spawnEnemies() {
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    enemies.push({
      x: Math.floor(r.x + r.w / 2),
      y: Math.floor(r.y + r.h / 2),
      hp: 3
    });
  }
}

function updateEnemies() {
  enemies.forEach(e => {
    let dx = player.x - e.x;
    let dy = player.y - e.y;

    if (Math.abs(dx) > Math.abs(dy))
      e.x += Math.sign(dx);
    else
      e.y += Math.sign(dy);

    if (e.x === player.x && e.y === player.y) {
      player.hp--;
      if (player.hp <= 0) gameState = "dead";
    }
  });
}

// ---------- COMBAT ----------
function attack() {
  enemies = enemies.filter(e => {
    const dist =
      Math.abs(e.x - player.x) +
      Math.abs(e.y - player.y);

    if (dist === 1) {
      e.hp -= player.dmg;
      return e.hp > 0;
    }
    return true;
  });
}

// ---------- ITEMS ----------
function spawnItems() {
  rooms.slice(1).forEach(r => {
    items.push({
      x: Math.floor(r.x + r.w / 2) + 1,
      y: Math.floor(r.y + r.h / 2),
      type: "heal"
    });
  });
}

function pickupItem() {
  items = items.filter(i => {
    if (i.x === player.x && i.y === player.y) {
      player.hp = Math.min(player.maxHp, player.hp + 3);
      return false;
    }
    return true;
  });
}

// ---------- DRAW ----------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === "menu") {
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.fillText("ROGUELIKE", 180, 200);
    ctx.font = "16px Arial";
    ctx.fillText("Press ENTER to Start", 200, 240);
    return;
  }

  if (gameState === "dead") {
    ctx.fillStyle = "red";
    ctx.font = "30px Arial";
    ctx.fillText("YOU DIED", 200, 200);
    ctx.font = "16px Arial";
    ctx.fillText("Press R to Restart", 210, 240);
    return;
  }

  const camX = player.x - Math.floor(VIEW_W / 2);
  const camY = player.y - Math.floor(VIEW_H / 2);

  for (let y = 0; y < VIEW_H; y++) {
    for (let x = 0; x < VIEW_W; x++) {
      const mx = x + camX;
      const my = y + camY;
      ctx.fillStyle =
        map[my]?.[mx] === 1 ? "#444" : "#111";
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  ctx.fillStyle = "green";
  items.forEach(i =>
    ctx.fillRect(
      (i.x - camX) * TILE,
      (i.y - camY) * TILE,
      TILE,
      TILE
    )
  );

  ctx.fillStyle = "red";
  enemies.forEach(e =>
    ctx.fillRect(
      (e.x - camX) * TILE,
      (e.y - camY) * TILE,
      TILE,
      TILE
    )
  );

  ctx.fillStyle = "cyan";
  ctx.fillRect(
    (player.x - camX) * TILE,
    (player.y - camY) * TILE,
    TILE,
    TILE
  );

  ctx.fillStyle = "white";
  ctx.fillText(`HP: ${player.hp}`, 10, 20);
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
