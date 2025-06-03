if (!window.alt1) {
  alert("This app must be run inside Alt1!");
}

alt1.identifyApp("runescape-galaxy", "RS Galaxy", "rs");

const reader = new MinimapReader();
const rsn = prompt("Enter your RSN:");

function getTileFromMinimap() {
  const loc = reader.findMyPlayer();
  if (!loc) {
    console.warn("Could not detect player on minimap.");
    return null;
  }
  return { x: loc.x, y: loc.y };
}

function sendLocation() {
  const tile = getTileFromMinimap();
  if (!tile) return;

  fetch("https://v0-new-project-ptwxymzx9ew.vercel.app/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rsn,
      tileX: tile.x,
      tileY: tile.y,
      timestamp: Date.now()
    })
  }).catch((err) => console.error("Failed to send location:", err));
}

setInterval(sendLocation, 5000);
