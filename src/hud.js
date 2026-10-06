// src/hud.js
export const formatScore = (n, digits = 6) => String(Math.max(0, Math.floor(n))).padStart(digits, '0');
export const formatTime = (seconds) => String(Math.max(0, Math.ceil(seconds))).padStart(3, '0');

export function hudItems(session, time, levelName) {
  return [
    { x: 8, label: 'SCORE', value: formatScore(session.score) },
    { x: 72, label: 'COINS', value: `x${String(session.coins).padStart(2, '0')}` },
    { x: 120, label: 'LIVES', value: `x${session.lives}` },
    { x: 168, label: 'WORLD', value: levelName },
    { x: 216, label: 'TIME', value: formatTime(time) },
  ];
}

export function drawHud(ctx, session, time, levelName) {
  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  for (const item of hudItems(session, time, levelName)) {
    ctx.fillText(item.label, item.x, 12);
    ctx.fillText(item.value, item.x, 22);
  }
}
