const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const TILE_SIZE = 32;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;

canvas.width = MAP_WIDTH * TILE_SIZE;
canvas.height = MAP_HEIGHT * TILE_SIZE;

// 0 = wall, 1 = floor
let map = [];

// Create empty map full of walls
function createMap() {
  map = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    let row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push(0);
    }
    map.push(row);
  }
}

// Carve random rooms
function generateRooms() {
  for (let i = 0; i < 6; i++) {
    let roomWidth = rand(3, 6);
    let roomHeight = rand(3, 6);
    let roomX = rand(1, MAP_WIDTH - roomWidth - 1);
    let roomY = rand(1, MAP_HEIGHT - roomHeight - 1);

    for (let y = roomY; y < roomY + roomHeight; y++) {
      for (let x = roomX; x < roomX + roomWidth; x++) {
        map[y][x] = 1;
      }
    }
  }
}

// Draw map
function drawMap() {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (map[y][x] === 1) {
        ctx.fillStyle = "#666"; // floor
      } else {
        ctx.fillStyle = "#222"; // wall
      }
      ctx.fillRect(
        x * TILE_SIZE,
        y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
}

// Utility random function
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Init
createMap();
generateRooms();
drawMap();
