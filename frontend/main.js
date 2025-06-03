window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById("map");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const mapImg = new Image();
  mapImg.src = "https://runescape.wiki/images/RuneScape_Worldmap.png";

  // Constants: max tile size in RS3 world
  const WORLD_SIZE = 6400;

  // Camera / viewport settings
  let scale = 1;
  let originX = 0;  // panning offset x
  let originY = 0;  // panning offset y

  // Variables for dragging
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginX = 0;
  let dragOriginY = 0;

  let currentPlayers = [];
  let updateTimeout = null;

  // Coördinaten van het zichtbare gebied op de wiki-map afbeelding
// Deze zijn bepaald aan de hand van herkenbare locaties op de kaart
const MAP_TOP_LEFT = { x: 0, y: 0 };   // tile (0,0) op map.png
const MAP_BOTTOM_RIGHT = { x: 4125, y: 3100 }; // tile (max,max) op map.png

function tileToCanvas(tileX, tileY) {
  // Bereken relatieve positie in de wereld (0 tot 1)
  const relX = tileX / WORLD_SIZE;   // 0..1
  const relY = tileY / WORLD_SIZE;   // 0..1
  
  // De kaart afbeelding toont een gedeelte van de wereld: 
  // MAP_TOP_LEFT en MAP_BOTTOM_RIGHT zijn pixel-coördinaten op mapImg waar
  // de wereld (0,0) en (6400,6400) ongeveer liggen.
  
  // X pixel op de kaartafbeelding
  const mapPixelX = MAP_TOP_LEFT.x + relX * (MAP_BOTTOM_RIGHT.x - MAP_TOP_LEFT.x);
  
  // Y pixel op de kaartafbeelding (let op Y-as richting)
  // Op de afbeelding stijgen Y naar beneden, in wereldcoördinaten stijgt Y ook naar beneden?
  // Als niet, moet je Y omkeren:
  const mapPixelY = MAP_TOP_LEFT.y + relY * (MAP_BOTTOM_RIGHT.y - MAP_TOP_LEFT.y);
  
  // Nu zet je deze pixelpositie om naar canvas positie (met pan en zoom)
  const canvasX = originX + mapPixelX * scale;
  const canvasY = originY + mapPixelY * scale;
  
  return { x: canvasX, y: canvasY };
}





  mapImg.onload = () => {
    clampOrigin();
    draw();
    setInterval(updatePlayers, 5000);
  };

  function clampOrigin() {
    const mapWidth = mapImg.width * scale;
    const mapHeight = mapImg.height * scale;

    if (mapWidth < canvas.width) {
      originX = (canvas.width - mapWidth) / 2;
    } else {
      originX = Math.min(0, originX);
      originX = Math.max(canvas.width - mapWidth, originX);
    }

    if (mapHeight < canvas.height) {
      originY = (canvas.height - mapHeight) / 2;
    } else {
      originY = Math.min(0, originY);
      originY = Math.max(canvas.height - mapHeight, originY);
    }
  }

  function drawGrid() {
    const gridWorldSize = 100; // grid in world tiles (100x100)
  
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
  
    const worldLeft = -originX / scale;
    const worldTop = -originY / scale;
    const worldRight = (canvas.width - originX) / scale;
    const worldBottom = (canvas.height - originY) / scale;
  
    const startX = Math.floor(worldLeft / gridWorldSize) * gridWorldSize;
    const endX = Math.ceil(worldRight / gridWorldSize) * gridWorldSize;
  
    for (let x = startX; x <= endX; x += gridWorldSize) {
      const canvasX = originX + x * scale;
      ctx.beginPath();
      ctx.moveTo(canvasX, 0);
      ctx.lineTo(canvasX, canvas.height);
      ctx.stroke();
    }
  
    const startY = Math.floor(worldTop / gridWorldSize) * gridWorldSize;
    const endY = Math.ceil(worldBottom / gridWorldSize) * gridWorldSize;
  
    for (let y = startY; y <= endY; y += gridWorldSize) {
      const canvasY = originY + y * scale;
      ctx.beginPath();
      ctx.moveTo(0, canvasY);
      ctx.lineTo(canvas.width, canvasY);
      ctx.stroke();
    }
  }

  function draw(players = []) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Draw map image with pan and zoom
    ctx.drawImage(
      mapImg,
      originX, originY,
      mapImg.width * scale,
      mapImg.height * scale
    );
  
    // Draw grid on top
    drawGrid();
  
    // Draw players
    for (const player of players) {
      const { rsn, tileX, tileY } = player;
  
      const { x, y } = tileToCanvas(tileX, tileY);

  
      // Blue circle marker zonder rand
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#7CFC00'; // LawnGreen, fris groen
      ctx.fill();      
  
      // Tekst achtergrond (donker transparant)
      const paddingX = 4;
      const paddingY = 2;
      ctx.font = "bold 12px monospace";
      const textWidth = ctx.measureText(rsn).width;
      const textHeight = 16; // schatting hoogte tekst
  
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(x + 15 - paddingX, y - textHeight / 2 - paddingY, textWidth + paddingX * 2, textHeight + paddingY * 2);
  
      // Gele pixelachtige tekst
      ctx.fillStyle = "#FFD700"; // goudgeel
      ctx.fillText(rsn, x + 15, y + 5);
    }
  }

  async function updatePlayers() {
  try {
    const res = await fetch("https://v0-new-project-ptwxymzx9ew.vercel.app/api/players");
    const players = await res.json();
    currentPlayers = players; // Sla spelers op
    draw(currentPlayers);
  } catch (e) {
    console.error("Failed to fetch players:", e);
  }
}

  
  


function scheduleUpdatePlayers() {
  if (updateTimeout) clearTimeout(updateTimeout);
  updateTimeout = setTimeout(updatePlayers, 5000);  // update max 1x per seconde
}

canvas.addEventListener("wheel", e => {
  e.preventDefault();

  const mouseX = e.offsetX;
  const mouseY = e.offsetY;

  const mapX = (mouseX - originX) / scale;
  const mapY = (mouseY - originY) / scale;

  const zoomAmount = -e.deltaY * 0.001;
  const newScale = Math.min(Math.max(scale + zoomAmount, 0.1), 5);

  originX = mouseX - mapX * newScale;
  originY = mouseY - mapY * newScale;

  scale = newScale;
  clampOrigin();

  draw(currentPlayers);    // direct redraw
  scheduleUpdatePlayers(); // debounce data update
});

canvas.addEventListener("mousedown", e => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragOriginX = originX;
  dragOriginY = originY;
});

canvas.addEventListener("mousemove", e => {
  if (!isDragging) return;

  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;

  originX = dragOriginX + dx;
  originY = dragOriginY + dy;

  clampOrigin();

  draw(currentPlayers);    // direct redraw
  scheduleUpdatePlayers(); // debounce data update
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
});

canvas.addEventListener("mouseleave", () => {
  isDragging = false;
});


  // Handle window resize
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    clampOrigin();
    updatePlayers();
  });
});
