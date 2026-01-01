export const key = (q: number, r: number) => `${q},${r}`;

export const DIRS: Array<{ dq: number; dr: number }> = [
  { dq: +1, dr: 0 },   // 0 E
  { dq: +1, dr: -1 },  // 1 NE
  { dq: 0, dr: -1 },   // 2 NW
  { dq: -1, dr: 0 },   // 3 W
  { dq: -1, dr: +1 },  // 4 SW
  { dq: 0, dr: +1 },   // 5 SE
];

// pointy-top axial -> pixel
export function axialToPixel(
  q: number,
  r: number,
  size: number,
  originX: number,
  originY: number
) {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x: originX + x, y: originY + y };
}

export function hexCorner(
  cx: number,
  cy: number,
  size: number,
  i: number // 0..5
) {
  const angle = (Math.PI / 180) * (60 * i - 30); // pointy-top
  return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) };
}

// cheap point-in-poly for convex hex
export function pointInHex(
  px: number,
  py: number,
  corners: Array<{ x: number; y: number }>
) {
  // ray casting
  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const xi = corners[i].x, yi = corners[i].y;
    const xj = corners[j].x, yj = corners[j].y;
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
