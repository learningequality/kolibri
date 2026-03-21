/**
 * Unit tests for QTI variable declarations (refactored with capability pattern)
 * Tests the parsing and validation of QTI variable declarations
 */

import { QTIVariable, areTypesCompatible } from '../variables';
import { BASE_TYPE } from '../../../constants';
import { responseDecl, outcomeDecl, defaultValue, correctResponse } from './qtiXmlHelpers';

// jsdom test env provides DOMParser natively.
const parser = new DOMParser();

// Helper function to create QTIVariable from XML string
function createDeclaration(xmlString) {
  const doc = parser.parseFromString(xmlString, 'text/xml');
  return new QTIVariable(doc.documentElement);
}

describe('QTIVariable', () => {
  it('should parse basic response declaration', () => {
    const declaration = createDeclaration(responseDecl('SCORE', 'integer'));

    expect(declaration.identifier).toBe('SCORE');
    expect(declaration.baseType).toBe('integer');
    expect(declaration.cardinality).toBe('single');
  });

  it('should parse declaration with default value', () => {
    const declaration = createDeclaration(
      responseDecl('SCORE', 'integer', 'single', defaultValue(50)),
    );

    expect(declaration.defaultValue).toBe(50);
  });

  it('should return null for empty qti-default-value with no qti-value children', () => {
    const declaration = createDeclaration(
      responseDecl('SCORE', 'integer', 'single', '<qti-default-value></qti-default-value>'),
    );

    expect(declaration.defaultValue).toBe(null);
  });

  it('should return null for empty qti-default-value on multiple cardinality', () => {
    const declaration = createDeclaration(
      responseDecl('MULTI', 'identifier', 'multiple', '<qti-default-value></qti-default-value>'),
    );

    expect(declaration.defaultValue).toEqual([]);
  });

  it('should parse declaration with correct response', () => {
    const declaration = createDeclaration(
      responseDecl('CHOICE', 'identifier', 'single', correctResponse('A')),
    );

    expect(declaration.correctResponse).toBe('A');
  });

  it('should parse multiple values for multiple cardinality', () => {
    const declaration = createDeclaration(
      responseDecl('MULTI', 'identifier', 'multiple', correctResponse('A', 'B', 'C')),
    );

    expect(declaration.correctResponse).toEqual(['A', 'B', 'C']);
  });

  it('should validate compatible types', () => {
    // Numeric types should be compatible
    expect(areTypesCompatible('integer', 'float')).toBe(true);
    expect(areTypesCompatible('float', 'integer')).toBe(true);

    // Same types should be compatible
    expect(areTypesCompatible('string', 'string')).toBe(true);

    // Different non-numeric types should not be compatible
    expect(areTypesCompatible('string', 'boolean')).toBe(false);
  });

  it('should throw TypeError for incompatible values', () => {
    const declaration = createDeclaration(responseDecl('SCORE', 'integer'));

    // Valid values should not throw
    expect(() => {
      declaration.value = 42;
    }).not.toThrow();
    expect(() => {
      declaration.value = null;
    }).not.toThrow();

    // Invalid values should throw TypeError
    expect(() => {
      declaration.value = 'not a number';
    }).toThrow(TypeError);
    expect(() => {
      declaration.value = [1, 2, 3];
    }).toThrow(TypeError); // Array for single cardinality
  });

  it('should parse boolean values correctly', () => {
    const declaration = createDeclaration(
      responseDecl('FLAG', 'boolean', 'single', defaultValue('true')),
    );

    expect(declaration.defaultValue).toBe(true);
    expect(typeof declaration.defaultValue).toBe('boolean');
  });

  it('should parse ordered cardinality values', () => {
    const declaration = createDeclaration(
      responseDecl(
        'ORDERED_LIST',
        'identifier',
        'ordered',
        correctResponse('First', 'Second', 'Third'),
      ),
    );

    expect(declaration.correctResponse).toEqual(['First', 'Second', 'Third']);
    expect(declaration.cardinality).toBe('ordered');
  });

  // File values are built lazily: new File(...) isn't available at module load in some envs.
  const file = () => new File(['test content'], 'test.txt', { type: 'text/plain' });

  it.each([
    // [baseType, valid values, invalid values]
    [
      'point',
      [
        [10, 20],
        [0, 0],
      ],
      [[10] /* wrong length */, 'not a point'],
    ],
    [
      'pair',
      [
        ['A', 'B'],
        ['X', 'Y'],
      ],
      [['A'] /* wrong length */, 'not a pair'],
    ],
    [
      'directedPair',
      [
        ['A', 'B'],
        ['X', 'Y'],
      ],
      [['A'] /* wrong length */, 'not a directed pair'],
    ],
    // 0 is valid (spec: non-negative); -10 is invalid.
    ['duration', [3600, 0], [-10, 'not a duration']],
    // File base type expects File instances, not plain objects.
    ['file', [file], [{ data: 'content', mimeType: 'text/plain' }, 'not a file', 123]],
    // Integer is coerced to float, which is valid.
    ['float', [3.14, 0.5, 42], ['not a float']],
    ['uri', ['https://example.com', 'file:///path/to/file'], [123, true]],
  ])('should validate value assignment for base-type %s', (baseType, valid, invalid) => {
    const declaration = createDeclaration(responseDecl('VAR', baseType));
    const resolve = v => (typeof v === 'function' ? v() : v);
    for (const v of valid) {
      expect(() => {
        declaration.value = resolve(v);
      }).not.toThrow();
    }
    for (const v of invalid) {
      expect(() => {
        declaration.value = resolve(v);
      }).toThrow(TypeError);
    }
  });

  it('should store runtime fields as-is for a schemaless record (no field declarations)', () => {
    const declaration = createDeclaration(responseDecl('RECORD', 'string', 'record'));

    expect(declaration.cardinality).toBe('record');
    expect(declaration.fieldDeclarations).toBe(null); // Schemaless — no declared fields

    // Schemaless records accept arbitrary runtime fields and store them unchanged
    expect(() => {
      declaration.value = {};
    }).not.toThrow(); // Empty object is valid
    expect(() => {
      declaration.value = { key1: 'value1' };
    }).not.toThrow();
    expect(declaration.value).toEqual({ key1: 'value1' });
    // Non-object values are still rejected
    expect(() => {
      declaration.value = 'single value';
    }).toThrow(TypeError); // Not an object
    expect(() => {
      declaration.value = ['array', 'value'];
    }).toThrow(TypeError); // Array is not valid for record
    expect(() => {
      declaration.value = null;
    }).not.toThrow(); // Null is always compatible
  });
});

describe('Capability pattern', () => {
  it('should return a score via score() when qti-mapping child is present', () => {
    const declaration = createDeclaration(
      responseDecl(
        'MAPPED',
        'identifier',
        'single',
        `<qti-mapping default-value="0">
          <qti-map-entry map-key="A" mapped-value="1" />
          <qti-map-entry map-key="B" mapped-value="2" />
          <qti-map-entry map-key="C" mapped-value="3" />
        </qti-mapping>`,
      ),
    );

    expect(declaration.score('A')).toBe(1);
    expect(declaration.score('B')).toBe(2);
    expect(declaration.score('C')).toBe(3);
    expect(declaration.score('UNKNOWN')).toBe(0);
  });

  it('should return a value via lookup() when qti-interpolation-table child is present', () => {
    const declaration = createDeclaration(
      outcomeDecl(
        'GRADE',
        'float',
        'single',
        `<qti-interpolation-table default-value="-1">
          <qti-interpolation-table-entry source-value="50" target-value="0" include-boundary="true" />
          <qti-interpolation-table-entry source-value="70" target-value="1" include-boundary="true" />
          <qti-interpolation-table-entry source-value="90" target-value="2" include-boundary="false" />
        </qti-interpolation-table>`,
      ),
    );

    // Value below first entry boundary
    expect(declaration.lookup(30)).toBe(0);
    // Value at boundary (included)
    expect(declaration.lookup(50)).toBe(0);
    // Value between entries
    expect(declaration.lookup(60)).toBe(1);
    // Value above all entries
    expect(declaration.lookup(95)).toBe(-1);
  });

  it('should return parsed values via defaultValue and correctResponse getters', () => {
    const declaration = createDeclaration(
      responseDecl('CHOICE', 'identifier', 'single', defaultValue('X') + correctResponse('A')),
    );

    expect(declaration.defaultValue).toBe('X');
    expect(declaration.correctResponse).toBe('A');
  });

  it('should NOT expose mapping, areaMapping, or lookupTable properties', () => {
    const declaration = createDeclaration(
      responseDecl(
        'MAPPED',
        'identifier',
        'single',
        `<qti-mapping default-value="0">
          <qti-map-entry map-key="A" mapped-value="1" />
        </qti-mapping>`,
      ),
    );

    expect(declaration.mapping).toBeUndefined();
    expect(declaration.areaMapping).toBeUndefined();
    expect(declaration.lookupTable).toBeUndefined();
  });

  it('should return null for unregistered capabilities', () => {
    const declaration = createDeclaration(responseDecl('PLAIN', 'string'));

    expect(declaration.defaultValue).toBeNull();
    expect(declaration.correctResponse).toBeNull();
    expect(declaration.score('anything')).toBeNull();
    expect(declaration.lookup(42)).toBeNull();
  });

  it('should return a value via lookup() when qti-match-table child is present', () => {
    const declaration = createDeclaration(
      outcomeDecl(
        'FEEDBACK',
        'identifier',
        'single',
        `<qti-match-table default-value="many">
          <qti-match-table-entry source-value="0" target-value="none" />
          <qti-match-table-entry source-value="1" target-value="one" />
          <qti-match-table-entry source-value="2" target-value="two" />
        </qti-match-table>`,
      ),
    );

    expect(declaration.lookup(0)).toBe('none');
    expect(declaration.lookup(1)).toBe('one');
    expect(declaration.lookup(2)).toBe('two');
    expect(declaration.lookup(99)).toBe('many');
  });

  it('should use defaultValue getter for initial reactive value and reset', () => {
    const declaration = createDeclaration(
      responseDecl('SCORE', 'integer', 'single', defaultValue(50)),
    );

    // Initial value comes from defaultValue capability
    expect(declaration.value).toBe(50);

    // Change the value
    declaration.value = 99;
    expect(declaration.value).toBe(99);

    // Reset should restore defaultValue
    declaration.reset();
    expect(declaration.value).toBe(50);
  });
});

// Per-base-type coercion (bool/int/float/string/point/pair/duration/file/uri)
// is covered in values.spec.js for coerceValueWithBaseType, which
// QTIVariable.coerceValue delegates to for single cardinality. Tests here
// focus on QTIVariable-specific behavior: cardinality wrapping and records.
describe('Value coercion methods', () => {
  it('should handle null and undefined values in coercion', () => {
    const declaration = createDeclaration(responseDecl('STR', 'string'));

    expect(declaration.coerceValue(null)).toBe(null);
    expect(declaration.coerceValue(undefined)).toBe(null);
    expect(declaration.coerceValue('NULL')).toBe(null);
    // Empty string is a valid value for string types, not NULL
    expect(declaration.coerceValue('')).toBe('');
  });

  it('should coerce arrays of values correctly', () => {
    const declaration = createDeclaration(responseDecl('MULTI', 'string', 'multiple'));

    // Only string values should be accepted
    const result = declaration.coerceValue(['hello', 'world', null]);
    expect(result).toEqual(['hello', 'world', null]);

    // Non-string values should throw
    expect(() => declaration.coerceValue(['hello', 42, true, null])).toThrow(TypeError);
  });

  it('should coerce single values to arrays for single cardinality', () => {
    const singleDecl = createDeclaration(responseDecl('SINGLE', 'string'));
    const multipleDecl = createDeclaration(responseDecl('MULTIPLE', 'string', 'multiple'));

    expect(singleDecl.coerceValue(['hello'])).toBe('hello');
    expect(multipleDecl.coerceValue(['hello'])).toEqual(['hello']);
    expect(multipleDecl.coerceValue(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('should store schemaless record fields without coercion', () => {
    const recordDecl = createDeclaration(responseDecl('RECORD', 'string', 'record'));

    // Empty object round-trips
    expect(recordDecl.coerceValue({})).toEqual({});

    // Arbitrary runtime fields — including a nested object (e.g. a custom
    // interaction's answer state) — are stored unchanged
    const record = { correct: true, simpleAnswer: '42', answerState: { widgets: {} } };
    expect(recordDecl.coerceValue(record)).toEqual(record);

    // Non-object inputs are still rejected
    expect(() => recordDecl.coerceValue(['key1', 'value1', 'key2', 'value2'])).toThrow(
      'Record cardinality requires a JavaScript object',
    );
    expect(() => recordDecl.coerceValue('invalid')).toThrow(
      'Record cardinality requires a JavaScript object',
    );
  });

  it('should preserve schemaless record field values without base-type coercion', () => {
    const intRecordDecl = createDeclaration(responseDecl('INT_RECORD', 'integer', 'record'));
    const boolRecordDecl = createDeclaration(responseDecl('BOOL_RECORD', 'boolean', 'record'));

    // Without a declared schema there is no base type to coerce to; values are
    // stored exactly as supplied.
    expect(intRecordDecl.coerceValue({ score1: '100' })).toEqual({ score1: '100' });
    expect(boolRecordDecl.coerceValue({ flag1: 'true' })).toEqual({ flag1: 'true' });
  });

  it('should parse record with field-specific base types', () => {
    const declaration = createDeclaration(
      `<qti-context-declaration cardinality="record" identifier="QTI_CONTEXT">
        <qti-default-value>
          <qti-value base-type="string" field-identifier="candidateIdentifier">Curly</qti-value>
          <qti-value base-type="string" field-identifier="testIdentifier">essay-test</qti-value>
          <qti-value base-type="string" field-identifier="environmentIdentifier">2</qti-value>
          <qti-value base-type="integer" field-identifier="optionalField2">3</qti-value>
        </qti-default-value>
      </qti-context-declaration>`,
    );

    expect(declaration.cardinality).toBe('record');
    expect(declaration.fieldDeclarations).toBeDefined();
    expect(declaration.fieldDeclarations.candidateIdentifier.baseType).toBe('string');
    expect(declaration.fieldDeclarations.testIdentifier.baseType).toBe('string');
    expect(declaration.fieldDeclarations.environmentIdentifier.baseType).toBe('string');
    expect(declaration.fieldDeclarations.optionalField2.baseType).toBe('integer');

    expect(declaration.defaultValue).toEqual({
      candidateIdentifier: 'Curly',
      testIdentifier: 'essay-test',
      environmentIdentifier: '2',
      optionalField2: 3,
    });
  });

  it('should strictly validate record with defined field declarations', () => {
    const declaration = createDeclaration(
      `<qti-context-declaration cardinality="record" identifier="QTI_CONTEXT">
        <qti-default-value>
          <qti-value base-type="string" field-identifier="name">Test</qti-value>
          <qti-value base-type="integer" field-identifier="score">100</qti-value>
          <qti-value base-type="boolean" field-identifier="passed">true</qti-value>
        </qti-default-value>
      </qti-context-declaration>`,
    );

    // Valid values matching exactly the defined field specifications
    expect(() => {
      declaration.value = {
        name: 'John Doe',
        score: 95,
        passed: true,
      };
    }).not.toThrow();

    // Partial object with only defined fields should be valid
    expect(() => {
      declaration.value = {
        name: 'Jane Smith',
        score: 87,
      };
    }).not.toThrow();

    // Invalid values - wrong types for specific fields
    expect(() => {
      declaration.value = {
        name: 123, // Should be string
        score: 95,
        passed: true,
      };
    }).toThrow(TypeError);

    expect(() => {
      declaration.value = {
        name: 'John Doe',
        score: 'not a number', // Should be integer
        passed: true,
      };
    }).toThrow(TypeError);

    expect(() => {
      declaration.value = {
        name: 'John Doe',
        score: 95,
        passed: 'not a boolean', // Should be boolean
      };
    }).toThrow(TypeError);

    // Invalid - field not defined in the declaration
    expect(() => {
      declaration.value = {
        name: 'John Doe',
        score: 95,
        undefinedField: 'this field was not declared', // Not in field declarations
      };
    }).toThrow(TypeError);

    // Invalid - array instead of object
    expect(() => {
      declaration.value = ['name', 'John', 'score', 95];
    }).toThrow(TypeError);

    // Empty object should be valid (no fields to validate)
    expect(() => {
      declaration.value = {};
    }).not.toThrow();
  });

  it('should coerce values strictly using defined field declarations', () => {
    const declaration = createDeclaration(
      `<qti-context-declaration cardinality="record" identifier="QTI_CONTEXT">
        <qti-default-value>
          <qti-value base-type="string" field-identifier="name">Test</qti-value>
          <qti-value base-type="integer" field-identifier="score">100</qti-value>
          <qti-value base-type="boolean" field-identifier="passed">true</qti-value>
        </qti-default-value>
      </qti-context-declaration>`,
    );

    // Test coercion with defined fields only - non-string name should throw
    expect(() =>
      declaration.coerceValue({
        name: 123, // Non-string should throw TypeError
        score: '95',
        passed: 'true',
      }),
    ).toThrow(TypeError);

    // Valid coercion
    expect(
      declaration.coerceValue({
        name: 'John', // String value
        score: '95', // Will be coerced to integer via field declaration
        passed: 'true', // Will be coerced to boolean via field declaration
      }),
    ).toEqual({
      name: 'John',
      score: 95,
      passed: true,
    });

    // Test partial object coercion - non-string name should throw
    expect(() =>
      declaration.coerceValue({
        name: 789, // Non-string should throw TypeError
        score: '92',
        // passed field omitted - should be fine
      }),
    ).toThrow(TypeError);

    // Test that undefined fields cause errors during coercion
    expect(() =>
      declaration.coerceValue({
        name: 'John',
        score: 95,
        undefinedField: 'this should cause an error',
      }),
    ).toThrow("Field 'undefinedField' is not defined in record declaration");
  });

  it('should handle complex record with multiple cardinality fields', () => {
    const declaration = createDeclaration(
      `<qti-context-declaration cardinality="record" identifier="COMPLEX_RECORD">
        <qti-default-value>
          <qti-value base-type="string" field-identifier="studentName">John</qti-value>
          <qti-value base-type="identifier" field-identifier="selectedChoices" cardinality="multiple">A</qti-value>
          <qti-value base-type="identifier" field-identifier="selectedChoices" cardinality="multiple">C</qti-value>
          <qti-value base-type="point" field-identifier="coordinates">10 20</qti-value>
        </qti-default-value>
      </qti-context-declaration>`,
    );

    expect(declaration.cardinality).toBe('record');
    expect(declaration.fieldDeclarations).toBeDefined();
    expect(declaration.fieldDeclarations.studentName.baseType).toBe('string');
    expect(declaration.fieldDeclarations.selectedChoices.baseType).toBe('identifier');
    expect(declaration.fieldDeclarations.selectedChoices.cardinality).toBe('multiple');
    expect(declaration.fieldDeclarations.coordinates.baseType).toBe('point');

    // Test that the parsed default value has the correct structure
    expect(declaration.defaultValue).toEqual({
      studentName: 'John',
      selectedChoices: ['A', 'C'],
      coordinates: [10, 20],
    });

    // Test validation with complex types
    expect(() => {
      declaration.value = {
        studentName: 'Jane',
        selectedChoices: ['B', 'D', 'E'],
        coordinates: [5, 15],
      };
    }).not.toThrow();

    // Scalar value for multiple cardinality field is auto-wrapped into an array
    declaration.value = {
      studentName: 'Jane',
      selectedChoices: 'B',
      coordinates: [5, 15],
    };
    expect(declaration.value.selectedChoices).toEqual(['B']);

    expect(() => {
      declaration.value = {
        studentName: 'Jane',
        selectedChoices: ['B', 'D'],
        coordinates: [5], // Should be array of length 2 for point
      };
    }).toThrow(TypeError);
  });
});

describe('Pure compatibility functions', () => {
  it('areTypesCompatible should work with all type combinations', () => {
    // Same types
    expect(areTypesCompatible(BASE_TYPE.STRING, BASE_TYPE.STRING)).toBe(true);
    expect(areTypesCompatible(BASE_TYPE.BOOLEAN, BASE_TYPE.BOOLEAN)).toBe(true);
    expect(areTypesCompatible(BASE_TYPE.INTEGER, BASE_TYPE.INTEGER)).toBe(true);
    expect(areTypesCompatible(BASE_TYPE.FLOAT, BASE_TYPE.FLOAT)).toBe(true);

    // Numeric compatibility
    expect(areTypesCompatible(BASE_TYPE.INTEGER, BASE_TYPE.FLOAT)).toBe(true);
    expect(areTypesCompatible(BASE_TYPE.FLOAT, BASE_TYPE.INTEGER)).toBe(true);

    // Non-compatible types
    expect(areTypesCompatible(BASE_TYPE.STRING, BASE_TYPE.BOOLEAN)).toBe(false);
    expect(areTypesCompatible(BASE_TYPE.INTEGER, BASE_TYPE.STRING)).toBe(false);
    expect(areTypesCompatible(BASE_TYPE.FLOAT, BASE_TYPE.BOOLEAN)).toBe(false);
    expect(areTypesCompatible(BASE_TYPE.POINT, BASE_TYPE.PAIR)).toBe(false);
  });
});

describe('Empty string handling', () => {
  // QTIVariable.coerceValue delegates to coerceValueWithBaseType, which
  // preserves empty string for string-like types (a candidate may submit
  // an empty text entry) and returns null for others.
  it.each([
    ['string', ''],
    ['identifier', ''],
    ['uri', ''],
    ['integer', null],
    ['float', null],
    ['boolean', null],
  ])('should coerce empty string to %p for %s base type', (baseType, expected) => {
    const decl = createDeclaration(responseDecl('R', baseType));
    decl.value = '';
    expect(decl.value).toBe(expected);
  });

  it('should work correctly in full QTI assessment item context', () => {
    // Test with a text entry interaction where the candidate submits empty string.
    // Empty string is a valid response for string types.
    const doc = parser.parseFromString(
      `<qti-assessment-item>
        ${responseDecl('RESPONSE', 'string', 'single', correctResponse('hello'))}
        ${outcomeDecl('SCORE', 'float', 'single', defaultValue(0))}
      </qti-assessment-item>`,
      'text/xml',
    );
    const rDecl = new QTIVariable(doc.querySelector('qti-response-declaration'));
    const oDecl = new QTIVariable(doc.querySelector('qti-outcome-declaration'));

    // Set response to empty string — should be preserved for string type
    rDecl.value = '';
    expect(rDecl.value).toBe('');

    // Set outcome to empty string — should become null for float type
    oDecl.value = '';
    expect(oDecl.value).toBe(null);
  });
});
