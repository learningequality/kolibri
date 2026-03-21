/**
 * QTI Geometry Utilities
 * Point-in-shape detection for QTI area mapping and inside operators
 */

/**
 * Checks if a point is inside a polygon using the ray casting algorithm
 * @param {Array} point - [x, y] coordinates
 * @param {Array} polygon - Array of [x, y] vertices
 * @returns {boolean} - True if point is inside polygon
 */
export function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Checks if a point is inside a shape
 * @param {Array} point - [x, y] coordinates
 * @param {string} shape - Shape type: 'circle', 'rect', 'poly', 'ellipse', 'default'
 * @param {Array} coords - Shape coordinates
 * @returns {boolean} - True if point is inside shape
 */
export function pointInShape(point, shape, coords) {
  if (!Array.isArray(point) || point.length !== 2) return false;
  const [x, y] = point;

  switch (shape) {
    case 'circle': {
      const [cx, cy, r] = coords;
      return Math.pow(x - cx, 2) + Math.pow(y - cy, 2) <= Math.pow(r, 2);
    }
    case 'rect': {
      const [x1, y1, x2, y2] = coords;
      const [minX, maxX] = x1 <= x2 ? [x1, x2] : [x2, x1];
      const [minY, maxY] = y1 <= y2 ? [y1, y2] : [y2, y1];
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }
    case 'poly': {
      const polygon = [];
      for (let i = 0; i < coords.length; i += 2) {
        polygon.push([coords[i], coords[i + 1]]);
      }
      return pointInPolygon([x, y], polygon);
    }
    case 'ellipse': {
      const [cx, cy, rx, ry] = coords;
      // When rx or ry is 0, division yields Infinity → expression > 1 → false,
      // which is correct: a zero-radius ellipse has no area.
      return Math.pow(x - cx, 2) / Math.pow(rx, 2) + Math.pow(y - cy, 2) / Math.pow(ry, 2) <= 1;
    }
    case 'default':
      return true;
    default:
      return false;
  }
}
