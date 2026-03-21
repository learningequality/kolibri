/**
 * AreaMapping declaration strategy.
 * Parses a qti-area-mapping XML element and provides an area-based
 * scoring capability on the parent QTIVariable.
 * @module declarations/areaMapping
 */
import { pointInShape } from '../geometry.js';
import ScoringDeclaration from './scoringDeclaration.js';

/**
 * Declaration strategy that scores point responses by checking which
 * geometric areas contain the response point(s).
 * @augments ScoringDeclaration
 */
export default class AreaMapping extends ScoringDeclaration {
  /**
   * Parses area-map entries (shape, coords, mapped value) from the element.
   * @param {Element} xmlNode - The qti-area-mapping XML element
   * @param {import('../variables.js').QTIVariable} variable - The parent variable to register on
   */
  constructor(xmlNode, variable) {
    super(xmlNode, variable);

    /** @type {Array<{shape: string, coords: number[], mappedValue: number}>} */
    this.entries = [];
    for (const entry of xmlNode.querySelectorAll('qti-area-map-entry')) {
      this.entries.push({
        shape: entry.getAttribute('shape'),
        coords: entry.getAttribute('coords').split(',').map(Number),
        mappedValue: parseFloat(entry.getAttribute('mapped-value')),
      });
    }
  }

  /**
   * Apply area mapping to compute a score from point response(s).
   * Each area entry is counted at most once across all points.
   * @param {[number, number] | [number, number][]} value - A single point
   * [x, y] or an array of points [[x, y], ...]
   * @returns {number} The computed score
   */
  score(value) {
    if (value == null) return this.clampScore(this.defaultValue);

    // Normalize to array of points: a single point is [x, y] (array of numbers),
    // while multiple points is [[x, y], ...] (array of arrays). Since point
    // coordinates are always numbers, checking value[0] for Array distinguishes them.
    const points = Array.isArray(value) && Array.isArray(value[0]) ? value : [value];

    // Track which area entries have been hit (each area counted only once)
    const hitAreas = new Set();
    let score = 0;
    let missCount = 0;

    for (const point of points) {
      let pointInsideAnyArea = false;
      for (let i = 0; i < this.entries.length; i++) {
        const entry = this.entries[i];
        if (pointInShape(point, entry.shape, entry.coords)) {
          pointInsideAnyArea = true;
          if (!hitAreas.has(i)) {
            hitAreas.add(i);
            score += entry.mappedValue;
          }
        }
      }
      // Only points geometrically outside ALL defined areas are true misses.
      // A point inside an already-counted area is not penalized.
      if (!pointInsideAnyArea) {
        missCount++;
      }
    }

    // Add default value for each point that didn't hit any area
    score += this.defaultValue * missCount;

    return this.clampScore(score);
  }
}
