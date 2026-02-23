const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const TILE = 32;
const MAP_W = 50;
const MAP_H = 40;
const VIEW_W = 20;
const VIEW_H = 15;

canvas.width = VIEW_W * TILE;
canvas.height = VIEW_H * TILE;

// 0 = wall, 1 = floor
let map = [];
let rooms = [];
let enemies = [];

const player = {
  x: 0,
  y: 0,
  hp: 5
};

// ---------- MAP GENERATION ----------
function createMap() {
  map = Array.from({ length: MAP_H }, () =>
    Array(MAP_W).fill(0)
  );
  rooms = [];
}

function generateRooms() {
  for (let i = 0; i < 8; i++) {
    const w = rand(4, 8);
    const h = rand(4, 8);
    const x = rand(1, MAP_W - w - 1);
    const y = rand(1, MAP_H - h - 1);

    rooms.push({ x, y, w, h });

    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        map[yy][xx] = 1;
      }
    }
  }
}

function connectRooms() {
  for (let i = 1; i < rooms.length; i++) {
    const r1 = rooms[i - 1];
    const r2 = rooms[i];

    const x1 = Math.floor(r1.x + r1.w / 2);
    const y1 = Math.floor(r1.y + r1.h / 2);
    const x2 = Math.floor(r2.x + r2.w / 2);
    const y2 = Math.floor(r2.y + r2.h / 2);

    carveTunnel(x1, y1, x2, y1);
    carveTunnel(x2, y1, x2, y2);
  }
}

function carveTunnel(x1, y1, x2, y2) {
  while (x1 !== x2) {
    map[y1][x1] = 1;
    x1 += x1 < x2 ? 1 : -1;
  }
  while (y1 !== y2) {
    map[y1][x1] = 1;
    y1 += y1 < y2 ? 1 : -1;
  }
}

// ---------- PLAYER ----------
function placePlayer() {
  const r = rooms[0];
  player.x = Math.floor(r.x + r.w / 2);
  player.y = Math.floor(r.y + r.h / 2);
}

document.addEventListener("keydown", e => {
  let dx = 0, dy = 0;
  if (e.key === "w") dy = -1;
  if (e.key === "s") dy = 1;
  if (e.key === "a") dx = -1;
  if (e.key === "d") dx = 1;

  if (map[player.y + dy][player.x + dx] === 1) {
    player.x += dx;
    player.y += dy;
  }
});

// ---------- ENEMIES ----------
function spawnEnemies() {
  enemies = [];
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    enemies.push({
      x: Math.floor(r.x + r.w / 2),
      y: Math.floor(r.y + r.h / 2)
    });
  }
}

function updateEnemies() {
  enemies.forEach(e => {
    let dx = player.x - e.x;
    let dy = player.y - e.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      e.x += Math.sign(dx);
    } else {
      e.y += Math.sign(dy);
    }
  });
}

// ---------- CAMERA + DRAW ----------
function draw() {
  const camX = player.x - Math.floor(VIEW_W / 2);
  const camY = player.y - Math.floor(VIEW_H / 2);

  for (let y = 0; y < VIEW_H; y++) {
    for (let x = 0; x < VIEW_W; x++) {
      const mapX = x + camX;
      const mapY = y + camY;

      if (
        mapY >= 0 &&
        mapY < MAP_H &&
        mapX >= 0 &&
        mapX < MAP_W
      ) {
        ctx.fillStyle =
          map[mapY][mapX] === 1 ? "#555" : "#111";
      } else {
        ctx.fillStyle = "#000";
      }

      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  // Player
  ctx.fillStyle = "cyan";
  ctx.fillRect(
    (player.x - camX) * TILE,
    (player.y - camY) * TILE,
    TILE,
    TILE
  );

  // Enemies
  ctx.fillStyle = "red";
  enemies.forEach(e => {
    ctx.fillRect(
      (e.x - camX) * TILE,
      (e.y - camY) * TILE,
      TILE,
      TILE
    );
  });
}

// ---------- GAME LOOP ----------
function loop() {
  updateEnemies();
  draw();
  requestAnimationFrame(loop);
}

// ---------- UTILS ----------
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------- START ----------
createMap();
generateRooms();
connectRooms();
placePlayer();
spawnEnemies();
loop();
