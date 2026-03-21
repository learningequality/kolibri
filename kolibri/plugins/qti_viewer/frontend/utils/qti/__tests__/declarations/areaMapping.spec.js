/**
 * Unit tests for AreaMapping declaration strategy.
 * Verifies that qti-area-mapping elements are parsed and area scoring
 * is registered as a capability on the parent variable.
 */
import AreaMapping from '../../declarations/areaMapping';
import { responseDecl } from '../qtiXmlHelpers';
import { createMockVariable } from './testSetup';

describe('AreaMapping', () => {
  /**
   * Build a response-declaration XML wrapping an area mapping.
   * @param {string} areaMappingAttrs - Attributes on the qti-area-mapping element
   * @param {string} entries - Inner qti-area-map-entry XML
   * @returns {string} qti-response-declaration XML
   */
  function buildXml(areaMappingAttrs, entries) {
    return responseDecl(
      'RESPONSE',
      'point',
      'multiple',
      `<qti-area-mapping ${areaMappingAttrs}>${entries}</qti-area-mapping>`,
    );
  }

  it('should return mapped value for a single point inside a circle', () => {
    const xml = buildXml(
      'default-value="0"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,25" mapped-value="1" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // Point [50, 50] is at center of circle(50,50,25)
    expect(variable.score([50, 50])).toBe(1);
  });

  it('should return default value for a single point outside all areas', () => {
    const xml = buildXml(
      'default-value="0.5"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,10" mapped-value="1" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // Point [200, 200] is outside circle(50,50,10)
    expect(variable.score([200, 200])).toBe(0.5);
  });

  it('should count each area at most once when two points hit the same circle', () => {
    const xml = buildXml(
      'default-value="0"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,25" mapped-value="2" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // Both points are inside the same circle - should only count once
    expect(
      variable.score([
        [50, 50],
        [55, 55],
      ]),
    ).toBe(2);
  });

  it('should sum values when multiple areas are hit', () => {
    const xml = buildXml(
      'default-value="0"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,25" mapped-value="1" />
      <qti-area-map-entry shape="circle" coords="150,150,25" mapped-value="2" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // Two points hitting two different areas
    expect(
      variable.score([
        [50, 50],
        [150, 150],
      ]),
    ).toBe(3);
  });

  it('should clamp score to upper bound', () => {
    const xml = buildXml(
      'default-value="0" upper-bound="2"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,25" mapped-value="1.5" />
      <qti-area-map-entry shape="circle" coords="150,150,25" mapped-value="1.5" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // Sum would be 3, but upper bound clamps to 2
    expect(
      variable.score([
        [50, 50],
        [150, 150],
      ]),
    ).toBe(2);
  });

  it('should detect points inside rect shapes', () => {
    const xml = buildXml(
      'default-value="0"',
      `
      <qti-area-map-entry shape="rect" coords="10,10,100,100" mapped-value="5" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // Point inside the rectangle
    expect(variable.score([50, 50])).toBe(5);
    // Point outside the rectangle
    expect(variable.score([200, 200])).toBe(0);
  });

  it('should return default value for null response', () => {
    const xml = buildXml(
      'default-value="0.25"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,25" mapped-value="1" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    expect(variable.score(null)).toBe(0.25);
  });

  it('should add default value per point that misses all areas', () => {
    const xml = buildXml(
      'default-value="0.5"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,25" mapped-value="1" />
      <qti-area-map-entry shape="circle" coords="150,150,25" mapped-value="1" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // 3 points: 2 hit areas (1 + 1), 1 misses everything (0.5)
    expect(
      variable.score([
        [50, 50],
        [150, 150],
        [999, 999],
      ]),
    ).toBe(2.5);
  });

  it('should score all overlapping areas when a single point falls in multiple areas', () => {
    const xml = buildXml(
      'default-value="0"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,30" mapped-value="1" />
      <qti-area-map-entry shape="rect" coords="30,30,70,70" mapped-value="2" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // Point [50,50] is inside both the circle and the rect — both score
    expect(variable.score([50, 50])).toBe(3);
  });

  it('should register score capability on the variable', () => {
    const xml = buildXml(
      'default-value="0"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,25" mapped-value="1" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    expect(typeof variable.score).toBe('function');
  });

  it('should not penalize a point that hits an already-counted area', () => {
    // Regression: with negative defaultValue, a point inside an already-counted
    // area should NOT receive the default penalty. Only points that are
    // geometrically outside ALL defined areas are true misses.
    const xml = buildXml(
      'default-value="-1"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,25" mapped-value="2" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // Two points, both inside the same circle. Area is counted once (2).
    // Second point hits the same area — should NOT get -1 penalty.
    expect(
      variable.score([
        [50, 50],
        [55, 55],
      ]),
    ).toBe(2);
  });

  it('should only penalize points geometrically outside all areas', () => {
    const xml = buildXml(
      'default-value="-0.5"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,25" mapped-value="2" />
      <qti-area-map-entry shape="circle" coords="150,150,25" mapped-value="3" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // 4 points: hits area1, hits area2, hits area1 again (already counted),
    // misses all areas entirely. Only the last point should get -0.5 penalty.
    expect(
      variable.score([
        [50, 50],
        [150, 150],
        [48, 48],
        [999, 999],
      ]),
    ).toBe(4.5);
  });

  it('should ignore non-numeric lower-bound and upper-bound attributes', () => {
    const xml = buildXml(
      'default-value="0" lower-bound="invalid" upper-bound="invalid"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,25" mapped-value="3" />
      <qti-area-map-entry shape="circle" coords="100,100,25" mapped-value="4" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // With invalid bounds, score should pass through unclamped (not NaN)
    expect(
      variable.score([
        [50, 50],
        [100, 100],
      ]),
    ).toBe(7);
  });

  it('should clamp null response default value to configured bounds', () => {
    const xml = buildXml(
      'default-value="-1" lower-bound="0" upper-bound="5"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,25" mapped-value="3" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // null response should return defaultValue clamped to lower-bound
    expect(variable.score(null)).toBe(0);
  });

  it('should clamp null response default value to upper bound', () => {
    const xml = buildXml(
      'default-value="10" lower-bound="0" upper-bound="5"',
      `
      <qti-area-map-entry shape="circle" coords="50,50,25" mapped-value="3" />
    `,
    );
    const { variable, doc } = createMockVariable(xml);
    const node = doc.querySelector('qti-area-mapping');
    new AreaMapping(node, variable);

    // null response should return defaultValue clamped to upper-bound
    expect(variable.score(null)).toBe(5);
  });
});
