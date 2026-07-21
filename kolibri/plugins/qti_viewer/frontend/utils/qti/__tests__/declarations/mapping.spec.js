/**
 * Unit tests for Mapping declaration strategy.
 * Verifies that qti-mapping elements are parsed and the score
 * capability is registered on the parent variable.
 */
import Mapping from '../../declarations/mapping';
import { responseDecl } from '../qtiXmlHelpers';
import { createMockVariable } from './testSetup';

/**
 * Build a mapping declaration, parse it, and attach the Mapping strategy.
 * @param {object} opts - Mapping build options
 * @param {string} [opts.baseType='identifier'] - QTI base type of the response
 * @param {string} [opts.cardinality='single'] - Cardinality of the response
 * @param {string} [opts.mappingAttrs=''] - attributes on qti-mapping
 * @param {string} opts.entries - inner qti-map-entry XML
 * @returns {object} the QTIVariable instance
 */
function buildMapping({
  baseType = 'identifier',
  cardinality = 'single',
  mappingAttrs = '',
  entries,
}) {
  const xml = responseDecl(
    'RESPONSE',
    baseType,
    cardinality,
    `<qti-mapping ${mappingAttrs}>${entries}</qti-mapping>`,
  );
  const { variable, doc } = createMockVariable(xml);
  new Mapping(doc.querySelector('qti-mapping'), variable);
  return variable;
}

describe('Mapping', () => {
  it('should score a single cardinality mapped response', () => {
    const variable = buildMapping({
      entries: `<qti-map-entry map-key="A" mapped-value="1" />
                <qti-map-entry map-key="B" mapped-value="0.5" />`,
    });
    expect(variable.score('A')).toBe(1);
  });

  it('should return default value for an unmapped single response', () => {
    const variable = buildMapping({
      mappingAttrs: 'default-value="-0.5"',
      entries: `<qti-map-entry map-key="A" mapped-value="1" />`,
    });
    expect(variable.score('Z')).toBe(-0.5);
  });

  it('should sum scores for multiple cardinality responses', () => {
    const variable = buildMapping({
      cardinality: 'multiple',
      entries: `<qti-map-entry map-key="A" mapped-value="1" />
                <qti-map-entry map-key="B" mapped-value="0.5" />`,
    });
    expect(variable.score(['A', 'B'])).toBe(1.5);
  });

  it('should deduplicate identical values before scoring', () => {
    const variable = buildMapping({
      cardinality: 'multiple',
      entries: `<qti-map-entry map-key="A" mapped-value="1" />
                <qti-map-entry map-key="B" mapped-value="0.5" />`,
    });
    expect(variable.score(['A', 'A', 'B'])).toBe(1.5);
  });

  it('should clamp score to upper bound', () => {
    const variable = buildMapping({
      cardinality: 'multiple',
      mappingAttrs: 'upper-bound="2"',
      entries: `<qti-map-entry map-key="A" mapped-value="1" />
                <qti-map-entry map-key="B" mapped-value="1" />
                <qti-map-entry map-key="C" mapped-value="1" />`,
    });
    expect(variable.score(['A', 'B', 'C'])).toBe(2);
  });

  it('should clamp score to lower bound', () => {
    const variable = buildMapping({
      cardinality: 'multiple',
      mappingAttrs: 'default-value="-1" lower-bound="0"',
      entries: `<qti-map-entry map-key="A" mapped-value="1" />`,
    });
    expect(variable.score(['X', 'Y'])).toBe(0);
  });

  it('should return default value for null response', () => {
    const variable = buildMapping({
      mappingAttrs: 'default-value="0.5"',
      entries: `<qti-map-entry map-key="A" mapped-value="1" />`,
    });
    expect(variable.score(null)).toBe(0.5);
  });

  // Empty containers are treated as NULL per qti-is-null, so an
  // empty-container response scores as a null response — defaultValue, not 0
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpIsNull
  it('should return default value for empty-container response', () => {
    const variable = buildMapping({
      cardinality: 'multiple',
      mappingAttrs: 'default-value="0.5"',
      entries: `<qti-map-entry map-key="A" mapped-value="1" />`,
    });
    expect(variable.score([])).toBe(0.5);
  });

  it('should parse default-value="0" as 0, not as a falsy fallback', () => {
    const variable = buildMapping({
      mappingAttrs: 'default-value="0"',
      entries: `<qti-map-entry map-key="A" mapped-value="1" />`,
    });
    expect(variable.score('Z')).toBe(0);
  });

  it('should clamp null-response default value to configured bounds', () => {
    const clampedLow = buildMapping({
      mappingAttrs: 'default-value="-1" lower-bound="0" upper-bound="2"',
      entries: `<qti-map-entry map-key="A" mapped-value="1" />`,
    });
    expect(clampedLow.score(null)).toBe(0);

    const clampedHigh = buildMapping({
      mappingAttrs: 'default-value="5" lower-bound="0" upper-bound="2"',
      entries: `<qti-map-entry map-key="A" mapped-value="1" />`,
    });
    expect(clampedHigh.score(null)).toBe(2);
  });

  it('should ignore non-numeric lower-bound and upper-bound attributes', () => {
    const variable = buildMapping({
      cardinality: 'multiple',
      mappingAttrs: 'default-value="0" lower-bound="bad" upper-bound="also-bad"',
      entries: `<qti-map-entry map-key="A" mapped-value="1" />
                <qti-map-entry map-key="B" mapped-value="2" />`,
    });
    expect(variable.score(['A', 'B'])).toBe(3);
  });

  describe('pair and directedPair normalization', () => {
    // QTI pair values are unordered: (A,B) === (B,A). directedPair is ordered.
    // Map keys use space-separated format ("A B").

    it('should match pair response against space-separated map-key in either order', () => {
      const variable = buildMapping({
        baseType: 'pair',
        entries: `<qti-map-entry map-key="A B" mapped-value="2" />`,
      });
      expect(variable.score(['A', 'B'])).toBe(2);
      expect(variable.score(['B', 'A'])).toBe(2);
    });

    it('should deduplicate reversed pairs in multiple cardinality', () => {
      const variable = buildMapping({
        baseType: 'pair',
        cardinality: 'multiple',
        mappingAttrs: 'default-value="0"',
        entries: `<qti-map-entry map-key="A B" mapped-value="2" />
                  <qti-map-entry map-key="C D" mapped-value="3" />`,
      });
      // ["A","B"] and ["B","A"] dedupe to one pair
      expect(
        variable.score([
          ['A', 'B'],
          ['B', 'A'],
          ['C', 'D'],
        ]),
      ).toBe(5);
    });

    it('should preserve directedPair order (A,B) !== (B,A)', () => {
      const variable = buildMapping({
        baseType: 'directedPair',
        entries: `<qti-map-entry map-key="A B" mapped-value="2" />`,
      });
      expect(variable.score(['A', 'B'])).toBe(2);
      expect(variable.score(['B', 'A'])).toBe(0);
    });

    it('should match point response against space-separated map-key', () => {
      const variable = buildMapping({
        baseType: 'point',
        mappingAttrs: 'default-value="0"',
        entries: `<qti-map-entry map-key="100 200" mapped-value="5" />`,
      });
      expect(variable.score([100, 200])).toBe(5);
    });
  });

  describe('case sensitivity', () => {
    it('should match case-insensitively when case-sensitive="false"', () => {
      const variable = buildMapping({
        mappingAttrs: 'default-value="0"',
        entries: `<qti-map-entry map-key="Hello" mapped-value="1" case-sensitive="false" />`,
      });
      expect(variable.score('hello')).toBe(1);
      expect(variable.score('HELLO')).toBe(1);
      expect(variable.score('Hello')).toBe(1);
    });

    it('should match case-sensitively by default', () => {
      const variable = buildMapping({
        mappingAttrs: 'default-value="0"',
        entries: `<qti-map-entry map-key="Hello" mapped-value="1" />`,
      });
      expect(variable.score('hello')).toBe(0);
      expect(variable.score('Hello')).toBe(1);
    });

    it('should handle mixed case-sensitive and case-insensitive entries', () => {
      const variable = buildMapping({
        cardinality: 'multiple',
        mappingAttrs: 'default-value="0"',
        entries: `<qti-map-entry map-key="Alpha" mapped-value="1" case-sensitive="false" />
                  <qti-map-entry map-key="Beta" mapped-value="2" case-sensitive="true" />`,
      });
      // "alpha" matches CI entry, "beta" does NOT match CS entry
      expect(variable.score(['alpha', 'beta'])).toBe(1);
      // "ALPHA" matches CI, "Beta" matches CS
      expect(variable.score(['ALPHA', 'Beta'])).toBe(3);
    });

    it('should dedupe by raw response value, not by case-insensitive key', () => {
      // Spec: dedupe response values (string-equal), then look up each.
      // "Alpha" !== "alpha" as strings, so both are scored independently.
      const variable = buildMapping({
        cardinality: 'multiple',
        mappingAttrs: 'default-value="0"',
        entries: `<qti-map-entry map-key="Hello" mapped-value="2" case-sensitive="false" />`,
      });
      expect(variable.score(['hello', 'HELLO'])).toBe(4);
      // Identical values ARE deduped
      expect(variable.score(['hello', 'hello'])).toBe(2);
    });

    it('should normalize pair order for case-insensitive entries', () => {
      const variable = buildMapping({
        baseType: 'pair',
        mappingAttrs: 'default-value="0"',
        entries: `<qti-map-entry map-key="B A" mapped-value="3" case-sensitive="false" />`,
      });
      // Response ["A","B"] normalizes to key "A B"; CI entry "B A" also normalizes.
      expect(variable.score(['A', 'B'])).toBe(3);
      expect(variable.score(['B', 'A'])).toBe(3);
    });

    it('should not normalize directedPair order for case-insensitive entries', () => {
      const variable = buildMapping({
        baseType: 'directedPair',
        mappingAttrs: 'default-value="0"',
        entries: `<qti-map-entry map-key="B A" mapped-value="3" case-sensitive="false" />`,
      });
      expect(variable.score(['B', 'A'])).toBe(3);
      expect(variable.score(['A', 'B'])).toBe(0);
    });
  });
});
