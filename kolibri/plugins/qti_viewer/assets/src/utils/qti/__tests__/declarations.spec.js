/**
 * Unit tests for QTI variable declarations
 * Tests the parsing and validation of QTI variable declarations
 */

import { QTIVariable, areTypesCompatible, areDeclarationsCompatible } from '../declarations';
import { BASE_TYPE } from '../../../constants';

const parser = new DOMParser();

// Helper function to create QTIVariable from XML string
function createDeclaration(xmlString) {
  const doc = parser.parseFromString(xmlString, 'text/xml');
  return new QTIVariable(doc.documentElement);
}

describe('QTIVariable', () => {
  test('should parse basic response declaration', () => {
    const xmlString =
      '<qti-response-declaration identifier="SCORE" base-type="integer" cardinality="single" />';
    const declaration = createDeclaration(xmlString);

    expect(declaration.identifier).toBe('SCORE');
    expect(declaration.baseType).toBe('integer');
    expect(declaration.cardinality).toBe('single');
  });

  test('should parse declaration with default value', () => {
    const xmlString = `
      <qti-response-declaration identifier="SCORE" base-type="integer" cardinality="single">
        <qti-default-value>
          <qti-value>50</qti-value>
        </qti-default-value>
      </qti-response-declaration>
    `;
    const declaration = createDeclaration(xmlString);

    expect(declaration.defaultValue).toBe(50);
  });

  test('should parse declaration with correct response', () => {
    const xmlString = `
      <qti-response-declaration identifier="CHOICE" base-type="identifier" cardinality="single">
        <qti-correct-response>
          <qti-value>A</qti-value>
        </qti-correct-response>
      </qti-response-declaration>
    `;
    const declaration = createDeclaration(xmlString);

    expect(declaration.correctResponse).toBe('A');
  });

  test('should parse multiple values for multiple cardinality', () => {
    const xmlString = `
      <qti-response-declaration identifier="MULTI" base-type="identifier" cardinality="multiple">
        <qti-correct-response>
          <qti-value>A</qti-value>
          <qti-value>B</qti-value>
          <qti-value>C</qti-value>
        </qti-correct-response>
      </qti-response-declaration>
    `;
    const declaration = createDeclaration(xmlString);

    expect(declaration.correctResponse).toEqual(['A', 'B', 'C']);
  });

  test('should validate compatible types', () => {
    // Numeric types should be compatible
    expect(areTypesCompatible('integer', 'float')).toBe(true);
    expect(areTypesCompatible('float', 'integer')).toBe(true);

    // Same types should be compatible
    expect(areTypesCompatible('string', 'string')).toBe(true);

    // Different non-numeric types should not be compatible
    expect(areTypesCompatible('string', 'boolean')).toBe(false);
  });

  test('should throw TypeError for incompatible values', () => {
    const xmlString =
      '<qti-response-declaration identifier="SCORE" base-type="integer" cardinality="single" />';
    const declaration = createDeclaration(xmlString);

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

  test('should parse boolean values correctly', () => {
    const xmlString = `
      <qti-response-declaration identifier="FLAG" base-type="boolean" cardinality="single">
        <qti-default-value>
          <qti-value>true</qti-value>
        </qti-default-value>
      </qti-response-declaration>
    `;
    const declaration = createDeclaration(xmlString);

    expect(declaration.defaultValue).toBe(true);
    expect(typeof declaration.defaultValue).toBe('boolean');
  });

  test('should parse ordered cardinality values', () => {
    const xmlString = `
      <qti-response-declaration identifier="ORDERED_LIST" base-type="identifier" cardinality="ordered">
        <qti-correct-response>
          <qti-value>First</qti-value>
          <qti-value>Second</qti-value>
          <qti-value>Third</qti-value>
        </qti-correct-response>
      </qti-response-declaration>
    `;
    const declaration = createDeclaration(xmlString);

    expect(declaration.correctResponse).toEqual(['First', 'Second', 'Third']);
    expect(declaration.cardinality).toBe('ordered');
  });

  test('should parse mapping with map entries', () => {
    const xmlString = `
      <qti-response-declaration identifier="MAPPED" base-type="identifier" cardinality="single">
        <qti-mapping default-value="0">
          <qti-map-entry map-key="CHOICE_A" mapped-value="1" />
          <qti-map-entry map-key="CHOICE_B" mapped-value="2" />
          <qti-map-entry map-key="CHOICE_C" mapped-value="3" />
        </qti-mapping>
      </qti-response-declaration>
    `;
    const declaration = createDeclaration(xmlString);

    expect(declaration.mapping).toBeDefined();
    expect(declaration.mapping.defaultValue).toBe(0);
    expect(declaration.mapping.entries.get('CHOICE_A').mappedValue).toBe(1);
    expect(declaration.mapping.entries.get('CHOICE_B').mappedValue).toBe(2);
    expect(declaration.mapping.entries.get('CHOICE_C').mappedValue).toBe(3);
  });

  test('should parse area mapping', () => {
    const xmlString = `
      <qti-response-declaration identifier="HOTSPOT" base-type="point" cardinality="single">
        <qti-area-mapping default-value="0" />
      </qti-response-declaration>
    `;
    const declaration = createDeclaration(xmlString);

    expect(declaration.areaMapping).toBeDefined();
    expect(declaration.areaMapping.defaultValue).toBe(0);
  });

  test('should throw TypeError for invalid point values', () => {
    const xmlString =
      '<qti-response-declaration identifier="POINT" base-type="point" cardinality="single" />';
    const declaration = createDeclaration(xmlString);

    expect(() => {
      declaration.value = [10, 20];
    }).not.toThrow();
    expect(() => {
      declaration.value = [0, 0];
    }).not.toThrow();
    expect(() => {
      declaration.value = [10];
    }).toThrow(TypeError); // Wrong length
    expect(() => {
      declaration.value = 'not a point';
    }).toThrow(TypeError);
  });

  test('should throw TypeError for invalid pair values', () => {
    const xmlString =
      '<qti-response-declaration identifier="PAIR" base-type="pair" cardinality="single" />';
    const declaration = createDeclaration(xmlString);

    expect(() => {
      declaration.value = ['A', 'B'];
    }).not.toThrow();
    expect(() => {
      declaration.value = ['X', 'Y'];
    }).not.toThrow();
    expect(() => {
      declaration.value = ['A'];
    }).toThrow(TypeError); // Wrong length
    expect(() => {
      declaration.value = 'not a pair';
    }).toThrow(TypeError);
  });

  test('should throw TypeError for invalid directed pair values', () => {
    const xmlString =
      '<qti-response-declaration identifier="DIRECTED" base-type="directedPair" cardinality="single" />';
    const declaration = createDeclaration(xmlString);

    expect(() => {
      declaration.value = ['A', 'B'];
    }).not.toThrow();
    expect(() => {
      declaration.value = ['X', 'Y'];
    }).not.toThrow();
    expect(() => {
      declaration.value = ['A'];
    }).toThrow(TypeError); // Wrong length
    expect(() => {
      declaration.value = 'not a directed pair';
    }).toThrow(TypeError);
  });

  test('should throw TypeError for invalid duration values', () => {
    const xmlString =
      '<qti-response-declaration identifier="TIME" base-type="duration" cardinality="single" />';
    const declaration = createDeclaration(xmlString);

    expect(() => {
      declaration.value = 3600;
    }).not.toThrow(); // 1 hour
    expect(() => {
      declaration.value = 0;
    }).not.toThrow(); // 0 seconds
    expect(() => {
      declaration.value = -10;
    }).toThrow(TypeError); // Negative duration
    expect(() => {
      declaration.value = 'not a duration';
    }).toThrow(TypeError);
  });

  test('should throw TypeError for invalid file values', () => {
    const xmlString =
      '<qti-response-declaration identifier="UPLOAD" base-type="file" cardinality="single" />';
    const declaration = createDeclaration(xmlString);

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    expect(() => {
      declaration.value = file;
    }).not.toThrow();

    expect(() => {
      declaration.value = { data: 'content', mimeType: 'text/plain' };
    }).toThrow(TypeError);
    expect(() => {
      declaration.value = 'not a file';
    }).toThrow(TypeError);
    expect(() => {
      declaration.value = 123;
    }).toThrow(TypeError);
  });

  test('should throw TypeError for invalid float values', () => {
    const xmlString =
      '<qti-response-declaration identifier="DECIMAL" base-type="float" cardinality="single" />';
    const declaration = createDeclaration(xmlString);

    expect(() => {
      declaration.value = 3.14;
    }).not.toThrow();
    expect(() => {
      declaration.value = 0.5;
    }).not.toThrow();
    expect(() => {
      declaration.value = 42;
    }).not.toThrow(); // Integer coerced to float, which is valid
    expect(() => {
      declaration.value = 'not a float';
    }).toThrow(TypeError);
  });

  test('should throw TypeError for invalid URI values', () => {
    const xmlString =
      '<qti-response-declaration identifier="LINK" base-type="uri" cardinality="single" />';
    const declaration = createDeclaration(xmlString);

    expect(() => {
      declaration.value = 'https://example.com';
    }).not.toThrow();
    expect(() => {
      declaration.value = 'file:///path/to/file';
    }).not.toThrow();
    expect(() => {
      declaration.value = 123;
    }).toThrow(TypeError);
    expect(() => {
      declaration.value = true;
    }).toThrow(TypeError);
  });

  test('should throw TypeError for invalid record cardinality with no field declarations', () => {
    const xmlString =
      '<qti-response-declaration identifier="RECORD" base-type="string" cardinality="record" />';
    const declaration = createDeclaration(xmlString);

    expect(declaration.cardinality).toBe('record');
    expect(declaration.fieldDeclarations).toBe(null); // No field declarations defined

    // Without field declarations, records should reject any non-empty objects
    expect(() => {
      declaration.value = {};
    }).not.toThrow(); // Empty object is valid
    expect(() => {
      declaration.value = { key1: 'value1' };
    }).toThrow(TypeError); // No field declarations
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

  test('should check declaration compatibility', () => {
    const intDecl = createDeclaration(
      '<qti-response-declaration identifier="INT" base-type="integer" cardinality="single" />',
    );
    const floatDecl = createDeclaration(
      '<qti-response-declaration identifier="FLOAT" base-type="float" cardinality="single" />',
    );
    const stringDecl = createDeclaration(
      '<qti-response-declaration identifier="STRING" base-type="string" cardinality="single" />',
    );
    const multipleDecl = createDeclaration(
      '<qti-response-declaration identifier="MULTIPLE" base-type="string" cardinality="multiple" />',
    );

    // Compatible numeric types
    expect(areDeclarationsCompatible(intDecl, floatDecl)).toBe(true);
    expect(areDeclarationsCompatible(floatDecl, intDecl)).toBe(true);

    // Same type compatibility
    expect(areDeclarationsCompatible(stringDecl, stringDecl)).toBe(true);

    // Different base types
    expect(areDeclarationsCompatible(intDecl, stringDecl)).toBe(false);
    expect(areDeclarationsCompatible(stringDecl, intDecl)).toBe(false);

    // Different cardinality
    expect(areDeclarationsCompatible(stringDecl, multipleDecl)).toBe(false);
    expect(areDeclarationsCompatible(multipleDecl, stringDecl)).toBe(false);
  });
});

describe('Value coercion methods', () => {
  test('should coerce boolean values from multiple input types', () => {
    const declaration = createDeclaration(
      '<qti-response-declaration identifier="BOOL" base-type="boolean" cardinality="single" />',
    );

    // String coercion - QTI strict: only "true" and "false" (case sensitive)
    expect(declaration.coerceValue('true')).toBe(true);
    expect(declaration.coerceValue('false')).toBe(false);
    expect(() => declaration.coerceValue('True')).toThrow(TypeError);
    expect(() => declaration.coerceValue('False')).toThrow(TypeError);

    // Boolean passthrough
    expect(declaration.coerceValue(true)).toBe(true);
    expect(declaration.coerceValue(false)).toBe(false);

    // Invalid types should throw
    expect(() => declaration.coerceValue(1)).toThrow(TypeError);
    expect(() => declaration.coerceValue(0)).toThrow(TypeError);
    expect(declaration.coerceValue('')).toBe(null);
    expect(() => declaration.coerceValue('anything')).toThrow(TypeError);
  });

  test('should coerce integer values from multiple input types', () => {
    const declaration = createDeclaration(
      '<qti-response-declaration identifier="INT" base-type="integer" cardinality="single" />',
    );

    // String coercion
    expect(declaration.coerceValue('42')).toBe(42);
    expect(declaration.coerceValue('-17')).toBe(-17);
    expect(declaration.coerceValue('3.7')).toBe(3);

    // Number passthrough/conversion
    expect(declaration.coerceValue(42)).toBe(42);
    expect(declaration.coerceValue(3.7)).toBe(3);
    expect(declaration.coerceValue(-17)).toBe(-17);

    // Other types should result in NaN for non-numeric inputs
    expect(declaration.coerceValue(true)).toBeNaN();
    expect(declaration.coerceValue(false)).toBeNaN();
  });

  test('should coerce float values from multiple input types', () => {
    const declaration = createDeclaration(
      '<qti-response-declaration identifier="FLOAT" base-type="float" cardinality="single" />',
    );

    // String coercion
    expect(declaration.coerceValue('3.14')).toBe(3.14);
    expect(declaration.coerceValue('-2.5')).toBe(-2.5);
    expect(declaration.coerceValue('42')).toBe(42);

    // Number passthrough
    expect(declaration.coerceValue(3.14)).toBe(3.14);
    expect(declaration.coerceValue(42)).toBe(42);

    // Other types should result in NaN for non-numeric inputs
    expect(declaration.coerceValue(true)).toBeNaN();
    expect(declaration.coerceValue(false)).toBeNaN();
  });

  test('should coerce string values from multiple input types', () => {
    const declaration = createDeclaration(
      '<qti-response-declaration identifier="STR" base-type="string" cardinality="single" />',
    );

    // String passthrough
    expect(declaration.coerceValue('hello')).toBe('hello');
    expect(declaration.coerceValue('')).toBe(null); // Empty string is NULL per QTI spec

    // Non-string types should throw TypeError
    expect(() => declaration.coerceValue(42)).toThrow(TypeError);
    expect(() => declaration.coerceValue(true)).toThrow(TypeError);
    expect(() => declaration.coerceValue(false)).toThrow(TypeError);
    expect(declaration.coerceValue(null)).toBe(null);
  });

  test('should coerce point values from multiple input types', () => {
    const declaration = createDeclaration(
      '<qti-response-declaration identifier="POINT" base-type="point" cardinality="single" />',
    );

    // Array inputs
    expect(declaration.coerceValue([10, 20])).toEqual([10, 20]);
    expect(declaration.coerceValue(['10', '20'])).toEqual([10, 20]);

    // String coercion
    expect(declaration.coerceValue('10 20')).toEqual([10, 20]);
    expect(declaration.coerceValue('3 -2')).toEqual([3, -2]);

    // Invalid inputs should throw
    expect(() => declaration.coerceValue('invalid')).toThrow('Cannot coerce invalid to point');
    expect(() => declaration.coerceValue('10')).toThrow('Cannot coerce 10 to point');
    expect(() => declaration.coerceValue({ x: 10 })).toThrow(
      'Cannot coerce [object Object] to point',
    );
  });

  test('should coerce pair values from multiple input types', () => {
    const declaration = createDeclaration(
      '<qti-response-declaration identifier="PAIR" base-type="pair" cardinality="single" />',
    );

    // Array inputs
    expect(declaration.coerceValue(['A', 'B'])).toEqual(['A', 'B']);
    expect(declaration.coerceValue([1, 2])).toEqual(['1', '2']);

    // String coercion
    expect(declaration.coerceValue('A B')).toEqual(['A', 'B']);
    expect(declaration.coerceValue('Choice1 Choice2')).toEqual(['Choice1', 'Choice2']);

    // Invalid inputs should throw
    expect(() => declaration.coerceValue('single')).toThrow('Cannot coerce single to pair');
    expect(() => declaration.coerceValue({ first: 'A' })).toThrow(
      'Cannot coerce [object Object] to pair',
    );
  });

  test('should coerce duration values from multiple input types', () => {
    const declaration = createDeclaration(
      '<qti-response-declaration identifier="TIME" base-type="duration" cardinality="single" />',
    );

    // Number passthrough
    expect(declaration.coerceValue(3600)).toBe(3600);
    expect(declaration.coerceValue(0)).toBe(0);

    // String coercion
    expect(declaration.coerceValue('3600')).toBe(3600);
    expect(declaration.coerceValue('3.5')).toBe(3.5);

    // Invalid inputs should throw
    expect(() => declaration.coerceValue(-10)).toThrow('Cannot coerce -10 to duration');
    expect(() => declaration.coerceValue('-5')).toThrow('Cannot coerce -5 to duration');
    expect(() => declaration.coerceValue('invalid')).toThrow('Cannot coerce invalid to duration');
  });

  test('should handle file values without coercion', () => {
    const declaration = createDeclaration(
      '<qti-response-declaration identifier="FILE" base-type="file" cardinality="single" />',
    );

    // File objects pass through unchanged
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    expect(declaration.coerceValue(file)).toBe(file);

    // Non-File objects should throw TypeError
    const notAFile = { data: 'content', mimeType: 'text/plain' };
    expect(() => declaration.coerceValue(notAFile)).toThrow(TypeError);
    expect(() => declaration.coerceValue('not a file')).toThrow(TypeError);
  });

  test('should handle null and undefined values in coercion', () => {
    const declaration = createDeclaration(
      '<qti-response-declaration identifier="STR" base-type="string" cardinality="single" />',
    );

    expect(declaration.coerceValue(null)).toBe(null);
    expect(declaration.coerceValue(undefined)).toBe(null);
    expect(declaration.coerceValue('NULL')).toBe(null);
    expect(declaration.coerceValue('')).toBe(null); // Empty string is NULL per QTI spec
  });

  test('should coerce arrays of values correctly', () => {
    const declaration = createDeclaration(
      '<qti-response-declaration identifier="MULTI" base-type="string" cardinality="multiple" />',
    );

    // Only string values should be accepted
    const result = declaration.coerceValue(['hello', 'world', null]);
    expect(result).toEqual(['hello', 'world', null]);

    // Non-string values should throw
    expect(() => declaration.coerceValue(['hello', 42, true, null])).toThrow(TypeError);
  });

  test('should coerce single values to arrays for single cardinality', () => {
    const singleDecl = createDeclaration(
      '<qti-response-declaration identifier="SINGLE" base-type="string" cardinality="single" />',
    );
    const multipleDecl = createDeclaration(
      '<qti-response-declaration identifier="MULTIPLE" base-type="string" cardinality="multiple" />',
    );

    expect(singleDecl.coerceValue(['hello'])).toBe('hello');
    expect(multipleDecl.coerceValue(['hello'])).toEqual(['hello']);
    expect(multipleDecl.coerceValue(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  test('should coerce record cardinality values with no field declarations', () => {
    const recordDecl = createDeclaration(
      '<qti-response-declaration identifier="RECORD" base-type="string" cardinality="record" />',
    );

    // Test that records without field declarations only accept empty objects
    expect(recordDecl.coerceValue({})).toEqual({});

    // Test that non-empty objects are rejected
    expect(() => recordDecl.coerceValue({ key1: 'value1' })).toThrow(
      "Field 'key1' is not defined in record declaration",
    );

    // Test invalid inputs
    expect(() => recordDecl.coerceValue(['key1', 'value1', 'key2', 'value2'])).toThrow(
      'Record cardinality requires a JavaScript object',
    );
    expect(() => recordDecl.coerceValue('invalid')).toThrow(
      'Record cardinality requires a JavaScript object',
    );
  });

  test('should reject record cardinality with different base types when no fields defined', () => {
    const intRecordDecl = createDeclaration(
      '<qti-response-declaration identifier="INT_RECORD" base-type="integer" cardinality="record" />',
    );
    const boolRecordDecl = createDeclaration(
      '<qti-response-declaration identifier="BOOL_RECORD" base-type="boolean" cardinality="record" />',
    );

    // Records without field declarations should reject all non-empty objects
    expect(() => intRecordDecl.coerceValue({ score1: '100' })).toThrow(
      "Field 'score1' is not defined in record declaration",
    );
    expect(() => boolRecordDecl.coerceValue({ flag1: 'true' })).toThrow(
      "Field 'flag1' is not defined in record declaration",
    );
  });

  test('should parse record with field-specific base types', () => {
    const xmlString = `
      <qti-context-declaration cardinality="record" identifier="QTI_CONTEXT">
        <qti-default-value>
          <qti-value base-type="string" field-identifier="candidateIdentifier">Curly</qti-value>
          <qti-value base-type="string" field-identifier="testIdentifier">essay-test</qti-value>
          <qti-value base-type="string" field-identifier="environmentIdentifier">2</qti-value>
          <qti-value base-type="integer" field-identifier="optionalField2">3</qti-value>
        </qti-default-value>
      </qti-context-declaration>
    `;
    const declaration = createDeclaration(xmlString);

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

  test('should strictly validate record with defined field declarations', () => {
    const xmlString = `
      <qti-context-declaration cardinality="record" identifier="QTI_CONTEXT">
        <qti-default-value>
          <qti-value base-type="string" field-identifier="name">Test</qti-value>
          <qti-value base-type="integer" field-identifier="score">100</qti-value>
          <qti-value base-type="boolean" field-identifier="passed">true</qti-value>
        </qti-default-value>
      </qti-context-declaration>
    `;
    const declaration = createDeclaration(xmlString);

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

  test('should coerce values strictly using defined field declarations', () => {
    const xmlString = `
      <qti-context-declaration cardinality="record" identifier="QTI_CONTEXT">
        <qti-default-value>
          <qti-value base-type="string" field-identifier="name">Test</qti-value>
          <qti-value base-type="integer" field-identifier="score">100</qti-value>
          <qti-value base-type="boolean" field-identifier="passed">true</qti-value>
        </qti-default-value>
      </qti-context-declaration>
    `;
    const declaration = createDeclaration(xmlString);

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

  test('should handle complex record with multiple cardinality fields', () => {
    const xmlString = `
      <qti-context-declaration cardinality="record" identifier="COMPLEX_RECORD">
        <qti-default-value>
          <qti-value base-type="string" field-identifier="studentName">John</qti-value>
          <qti-value base-type="identifier" field-identifier="selectedChoices" cardinality="multiple">A</qti-value>
          <qti-value base-type="identifier" field-identifier="selectedChoices" cardinality="multiple">C</qti-value>
          <qti-value base-type="point" field-identifier="coordinates">10 20</qti-value>
        </qti-default-value>
      </qti-context-declaration>
    `;
    const declaration = createDeclaration(xmlString);

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

    // Test invalid complex types
    expect(() => {
      declaration.value = {
        studentName: 'Jane',
        selectedChoices: 'B', // Should be array for multiple cardinality
        coordinates: [5, 15],
      };
    }).toThrow(TypeError);

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
  test('areTypesCompatible should work with all type combinations', () => {
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

  test('areDeclarationsCompatible should check both cardinality and base types', () => {
    const singleInt = createDeclaration(
      '<qti-response-declaration identifier="A" base-type="integer" cardinality="single" />',
    );
    const singleFloat = createDeclaration(
      '<qti-response-declaration identifier="B" base-type="float" cardinality="single" />',
    );
    const multipleInt = createDeclaration(
      '<qti-response-declaration identifier="C" base-type="integer" cardinality="multiple" />',
    );
    const singleString = createDeclaration(
      '<qti-response-declaration identifier="D" base-type="string" cardinality="single" />',
    );

    // Compatible: same cardinality, compatible types
    expect(areDeclarationsCompatible(singleInt, singleFloat)).toBe(true);

    // Incompatible: different cardinality
    expect(areDeclarationsCompatible(singleInt, multipleInt)).toBe(false);

    // Incompatible: different base types
    expect(areDeclarationsCompatible(singleInt, singleString)).toBe(false);

    // Compatible: same everything
    expect(areDeclarationsCompatible(singleInt, singleInt)).toBe(true);
  });
});
