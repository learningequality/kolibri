/**
 * Unit tests for QTI geometry utilities
 * Tests point-in-shape detection for area mapping and inside operators
 */

import { pointInPolygon, pointInShape } from '../geometry.js';

describe('pointInPolygon', () => {
  // Triangle with vertices at (0,0), (10,0), (5,10)
  const triangle = [
    [0, 0],
    [10, 0],
    [5, 10],
  ];

  it('returns true for a point inside a triangle', () => {
    expect(pointInPolygon([5, 3], triangle)).toBe(true);
  });

  it('returns false for a point outside a triangle', () => {
    expect(pointInPolygon([0, 10], triangle)).toBe(false);
  });

  it('may include or exclude boundary points depending on edge orientation', () => {
    // Ray casting does not guarantee consistent boundary behavior;
    // verify it returns a boolean without crashing
    const edgeResult = pointInPolygon([5, 0], triangle);
    expect(typeof edgeResult).toBe('boolean');

    const vertexResult = pointInPolygon([0, 0], triangle);
    expect(typeof vertexResult).toBe('boolean');
  });

  it('correctly detects points in a concave polygon', () => {
    // L-shaped concave polygon
    const concave = [
      [0, 0],
      [10, 0],
      [10, 5],
      [5, 5],
      [5, 10],
      [0, 10],
    ];
    // Inside the L
    expect(pointInPolygon([2, 2], concave)).toBe(true);
    expect(pointInPolygon([2, 8], concave)).toBe(true);
    // In the concave cutout (upper-right)
    expect(pointInPolygon([8, 8], concave)).toBe(false);
  });

  it('returns false for a single-point degenerate polygon', () => {
    expect(pointInPolygon([5, 5], [[5, 5]])).toBe(false);
  });
});

describe('pointInShape', () => {
  describe('circle', () => {
    // Circle centered at (5, 5) with radius 3
    const coords = [5, 5, 3];

    it('returns true for a point inside', () => {
      expect(pointInShape([5, 5], 'circle', coords)).toBe(true);
      expect(pointInShape([6, 6], 'circle', coords)).toBe(true);
    });

    it('returns false for a point outside', () => {
      expect(pointInShape([10, 10], 'circle', coords)).toBe(false);
    });

    it('returns true for a point on the boundary', () => {
      expect(pointInShape([8, 5], 'circle', coords)).toBe(true);
    });

    it('handles zero radius', () => {
      expect(pointInShape([5, 5], 'circle', [5, 5, 0])).toBe(true);
      expect(pointInShape([5, 6], 'circle', [5, 5, 0])).toBe(false);
    });
  });

  describe('rect', () => {
    // Rectangle from (2, 3) to (8, 7)
    const coords = [2, 3, 8, 7];

    it('returns true for a point inside', () => {
      expect(pointInShape([5, 5], 'rect', coords)).toBe(true);
    });

    it('returns false for a point outside', () => {
      expect(pointInShape([1, 5], 'rect', coords)).toBe(false);
      expect(pointInShape([5, 8], 'rect', coords)).toBe(false);
    });

    it('returns true for a point on the boundary', () => {
      expect(pointInShape([2, 3], 'rect', coords)).toBe(true);
      expect(pointInShape([8, 7], 'rect', coords)).toBe(true);
    });

    it('handles a degenerate zero-width rect', () => {
      expect(pointInShape([5, 5], 'rect', [5, 3, 5, 7])).toBe(true);
      expect(pointInShape([6, 5], 'rect', [5, 3, 5, 7])).toBe(false);
    });

    it('handles reversed coordinates where x1 > x2 or y1 > y2', () => {
      // coords [8, 7, 2, 3] is the same rect as [2, 3, 8, 7] but reversed
      expect(pointInShape([5, 5], 'rect', [8, 7, 2, 3])).toBe(true);
      expect(pointInShape([2, 3], 'rect', [8, 7, 2, 3])).toBe(true);
      expect(pointInShape([8, 7], 'rect', [8, 7, 2, 3])).toBe(true);
      expect(pointInShape([1, 5], 'rect', [8, 7, 2, 3])).toBe(false);
      expect(pointInShape([5, 8], 'rect', [8, 7, 2, 3])).toBe(false);
    });
  });

  describe('ellipse', () => {
    // Ellipse centered at (5, 5) with rx=4, ry=2
    const coords = [5, 5, 4, 2];

    it('returns true for a point inside', () => {
      expect(pointInShape([5, 5], 'ellipse', coords)).toBe(true);
      expect(pointInShape([7, 5], 'ellipse', coords)).toBe(true);
    });

    it('returns false for a point outside', () => {
      expect(pointInShape([10, 10], 'ellipse', coords)).toBe(false);
    });

    it('returns true for a point on the boundary', () => {
      // (9, 5) is on the boundary: rx=4 from center x=5
      expect(pointInShape([9, 5], 'ellipse', coords)).toBe(true);
      // (5, 7) is on the boundary: ry=2 from center y=5
      expect(pointInShape([5, 7], 'ellipse', coords)).toBe(true);
    });
  });

  describe('poly', () => {
    it('delegates to pointInPolygon with coords paired into vertices', () => {
      // Square from flat coords
      const coords = [0, 0, 10, 0, 10, 10, 0, 10];
      expect(pointInShape([5, 5], 'poly', coords)).toBe(true);
      expect(pointInShape([15, 5], 'poly', coords)).toBe(false);
    });

    it('handles odd-length coords by pairing with undefined', () => {
      // Odd length: last vertex gets undefined for y, which produces NaN comparisons
      const coords = [0, 0, 10, 0, 5];
      const result = pointInShape([3, 1], 'poly', coords);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('default shape', () => {
    it('returns true for the literal "default" shape', () => {
      expect(pointInShape([0, 0], 'default', [])).toBe(true);
      expect(pointInShape([999, 999], 'default', [])).toBe(true);
    });
  });

  describe('unknown shape', () => {
    it('returns false for an unrecognized shape type', () => {
      expect(pointInShape([5, 5], 'hexagon', [1, 2, 3])).toBe(false);
    });
  });

  describe('invalid point', () => {
    it('returns false when point is not a two-element array', () => {
      expect(pointInShape([5], 'circle', [5, 5, 3])).toBe(false);
      expect(pointInShape(null, 'circle', [5, 5, 3])).toBe(false);
      expect(pointInShape('bad', 'circle', [5, 5, 3])).toBe(false);
    });
  });
});
