/**
 * Unit tests for QTI value coercion utilities
 */

import {
  coerceBoolean,
  validateBoolean,
  validateNumber,
  coercePoint,
  validatePoint,
  coercePair,
  validatePair,
  coerceDuration,
  validateDuration,
  validateFile,
  coerceValueWithBaseType,
  qtiValueKey,
} from '../values.js';

describe('QTI Value Coercion', () => {
  describe('coerceBoolean', () => {
    it('should handle boolean inputs correctly', () => {
      expect(coerceBoolean(true)).toBe(true);
      expect(coerceBoolean(false)).toBe(false);
    });

    it('should handle strict QTI boolean strings', () => {
      expect(coerceBoolean('true')).toBe(true);
      expect(coerceBoolean('false')).toBe(false);
    });

    it('should treat non-standard strings as falsy', () => {
      expect(coerceBoolean('True')).toBe(false);
      expect(coerceBoolean('False')).toBe(false);
      expect(coerceBoolean('TRUE')).toBe(false);
      expect(coerceBoolean('FALSE')).toBe(false);
      expect(coerceBoolean('yes')).toBe(false);
      expect(coerceBoolean('no')).toBe(false);
      expect(coerceBoolean('anything')).toBe(false);
    });

    it('should handle other data types with Boolean() coercion', () => {
      expect(coerceBoolean(1)).toBe(true);
      expect(coerceBoolean(0)).toBe(false);
      expect(coerceBoolean([])).toBe(true);
      expect(coerceBoolean({})).toBe(true);
    });
  });

  describe('validateBoolean', () => {
    it('should validate boolean types', () => {
      expect(validateBoolean(true)).toBe(true);
      expect(validateBoolean(false)).toBe(true);
    });

    it('should validate strict QTI boolean strings', () => {
      expect(validateBoolean('true')).toBe(true);
      expect(validateBoolean('false')).toBe(true);
    });

    it('should reject non-standard strings', () => {
      expect(validateBoolean('True')).toBe(false);
      expect(validateBoolean('False')).toBe(false);
      expect(validateBoolean('TRUE')).toBe(false);
      expect(validateBoolean('FALSE')).toBe(false);
      expect(validateBoolean('yes')).toBe(false);
      expect(validateBoolean('no')).toBe(false);
      expect(validateBoolean('anything')).toBe(false);
      expect(validateBoolean('')).toBe(false);
    });

    it('should reject other data types', () => {
      expect(validateBoolean(1)).toBe(false);
      expect(validateBoolean(0)).toBe(false);
      expect(validateBoolean([])).toBe(false);
      expect(validateBoolean({})).toBe(false);
      expect(validateBoolean(null)).toBe(false);
      expect(validateBoolean(undefined)).toBe(false);
    });
  });

  describe('coercePoint', () => {
    it('should coerce array inputs correctly', () => {
      expect(coercePoint([10, 20])).toEqual([10, 20]);
      expect(coercePoint(['10', '20'])).toEqual([10, 20]);
      expect(coercePoint([3.7, -2.1])).toEqual([3, -2]);
    });

    it('should coerce space-separated string inputs', () => {
      expect(coercePoint('10 20')).toEqual([10, 20]);
      expect(coercePoint('  10    20  ')).toEqual([10, 20]);
      expect(coercePoint('-5 100')).toEqual([-5, 100]);
      expect(coercePoint('3.7 -2.1')).toEqual([3, -2]);
    });

    it('should throw for invalid inputs', () => {
      expect(() => coercePoint('invalid')).toThrow('Cannot coerce invalid to point');
      expect(() => coercePoint('10')).toThrow('Cannot coerce 10 to point');
      expect(() => coercePoint([10])).toThrow('Cannot coerce 10 to point');
      expect(() => coercePoint([10, 20, 30])).toThrow('Cannot coerce 10,20,30 to point');
      expect(() => coercePoint('10 20 30')).toThrow('Cannot coerce 10 20 30 to point');
      expect(() => coercePoint('x y')).toThrow('Cannot coerce x y to point');
    });
  });

  describe('validatePoint', () => {
    it('should validate correct point values', () => {
      expect(validatePoint([10, 20])).toBe(true);
      expect(validatePoint(['10', '20'])).toBe(true);
      expect(validatePoint('10 20')).toBe(true);
      expect(validatePoint('  -5    100  ')).toBe(true);
    });

    it('should reject invalid point values', () => {
      expect(validatePoint('invalid')).toBe(false);
      expect(validatePoint('10')).toBe(false);
      expect(validatePoint([10])).toBe(false);
      expect(validatePoint([10, 20, 30])).toBe(false);
      expect(validatePoint('10 20 30')).toBe(false);
      expect(validatePoint('x y')).toBe(false);
      expect(validatePoint(null)).toBe(false);
      expect(validatePoint(undefined)).toBe(false);
    });
  });

  describe('coercePair', () => {
    it('should coerce array inputs correctly', () => {
      expect(coercePair(['A', 'B'])).toEqual(['A', 'B']);
      expect(coercePair([1, 2])).toEqual(['1', '2']);
      expect(coercePair([true, false])).toEqual(['true', 'false']);
    });

    it('should coerce space-separated string inputs', () => {
      expect(coercePair('A B')).toEqual(['A', 'B']);
      expect(coercePair('  Choice1    Choice2  ')).toEqual(['Choice1', 'Choice2']);
      expect(coercePair('first second')).toEqual(['first', 'second']);
    });

    it('should throw for invalid inputs', () => {
      expect(() => coercePair('invalid')).toThrow('Cannot coerce invalid to pair');
      expect(() => coercePair('single')).toThrow('Cannot coerce single to pair');
      expect(() => coercePair(['A'])).toThrow('Cannot coerce A to pair');
      expect(() => coercePair(['A', 'B', 'C'])).toThrow('Cannot coerce A,B,C to pair');
      expect(() => coercePair('A B C')).toThrow('Cannot coerce A B C to pair');
    });
  });

  describe('validatePair', () => {
    it('should validate correct pair values', () => {
      expect(validatePair(['A', 'B'])).toBe(true);
      expect(validatePair([1, 2])).toBe(true);
      expect(validatePair('A B')).toBe(true);
      expect(validatePair('  Choice1    Choice2  ')).toBe(true);
    });

    it('should reject invalid pair values', () => {
      expect(validatePair('invalid')).toBe(false);
      expect(validatePair('single')).toBe(false);
      expect(validatePair(['A'])).toBe(false);
      expect(validatePair(['A', 'B', 'C'])).toBe(false);
      expect(validatePair('A B C')).toBe(false);
      expect(validatePair(null)).toBe(false);
      expect(validatePair(undefined)).toBe(false);
    });
  });

  describe('coerceDuration', () => {
    it('should coerce valid duration values', () => {
      expect(coerceDuration(3600)).toBe(3600);
      expect(coerceDuration(0)).toBe(0);
      expect(coerceDuration('3600')).toBe(3600);
      expect(coerceDuration('3.5')).toBe(3.5);
    });

    it('should throw for invalid duration values', () => {
      expect(() => coerceDuration(-10)).toThrow('Cannot coerce -10 to duration');
      expect(() => coerceDuration('-5')).toThrow('Cannot coerce -5 to duration');
      expect(() => coerceDuration('invalid')).toThrow('Cannot coerce invalid to duration');
      expect(() => coerceDuration(true)).toThrow('Cannot coerce true to duration');
    });
  });

  describe('validateDuration', () => {
    it('should validate correct duration values', () => {
      expect(validateDuration(3600)).toBe(true);
      expect(validateDuration(0)).toBe(true);
      expect(validateDuration('3600')).toBe(true);
      expect(validateDuration('3.5')).toBe(true);
    });

    it('should reject invalid duration values', () => {
      expect(validateDuration(-10)).toBe(false);
      expect(validateDuration('-5')).toBe(false);
      expect(validateDuration('invalid')).toBe(false);
      expect(validateDuration(true)).toBe(false);
      expect(validateDuration(null)).toBe(false);
      expect(validateDuration(undefined)).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('should validate File objects', () => {
      // Create a mock File object
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      expect(validateFile(file)).toBe(true);
    });

    it('should reject non-File objects', () => {
      expect(validateFile({ data: 'content', mimeType: 'text/plain' })).toBe(false);
      expect(validateFile('not a file')).toBe(false);
      expect(validateFile(123)).toBe(false);
      expect(validateFile(true)).toBe(false);
      expect(validateFile([])).toBe(false);
      expect(validateFile({})).toBe(false);
      expect(validateFile(null)).toBe(false);
      expect(validateFile(undefined)).toBe(false);
    });
  });

  describe('validateNumber', () => {
    it('should accept numeric strings', () => {
      expect(validateNumber('42')).toBe(true);
      expect(validateNumber('-3.14')).toBe(true);
      expect(validateNumber('0')).toBe(true);
    });

    it('should accept number values', () => {
      expect(validateNumber(42)).toBe(true);
      expect(validateNumber(-3.14)).toBe(true);
      expect(validateNumber(0)).toBe(true);
    });

    it('should reject booleans', () => {
      // Number(true) === 1, but booleans are not numeric values in QTI.
      // Accepting them silently produces NaN from parseInt, poisoning arithmetic.
      expect(validateNumber(true)).toBe(false);
      expect(validateNumber(false)).toBe(false);
    });

    it('should reject non-numeric strings', () => {
      expect(validateNumber('not a number')).toBe(false);
      // Note: empty string is handled upstream by coerceValueWithBaseType
      // (returns null before validateNumber is called), so validateNumber
      // itself does not need to reject it. Number('') === 0 in JS.
    });

    it('should reject special numeric values', () => {
      expect(validateNumber(NaN)).toBe(false);
      expect(validateNumber(Infinity)).toBe(false);
      expect(validateNumber(-Infinity)).toBe(false);
    });

    it('should reject objects and arrays', () => {
      expect(validateNumber([])).toBe(false);
      expect(validateNumber({})).toBe(false);
      expect(validateNumber(null)).toBe(false);
      expect(validateNumber(undefined)).toBe(false);
    });
  });

  describe('coerceValueWithBaseType - boolean to numeric rejection', () => {
    it('should throw TypeError when coercing boolean to integer', () => {
      expect(() => coerceValueWithBaseType(true, 'integer')).toThrow(TypeError);
      expect(() => coerceValueWithBaseType(false, 'integer')).toThrow(TypeError);
    });

    it('should throw TypeError when coercing boolean to float', () => {
      expect(() => coerceValueWithBaseType(true, 'float')).toThrow(TypeError);
      expect(() => coerceValueWithBaseType(false, 'float')).toThrow(TypeError);
    });
  });

  describe('coerceValueWithBaseType - integer radix', () => {
    it('should parse integers with explicit radix 10 to avoid octal interpretation', () => {
      // parseInt without radix could interpret leading-zero strings as octal
      // in edge cases; ensure we always use base 10
      expect(coerceValueWithBaseType('010', 'integer')).toBe(10);
      expect(coerceValueWithBaseType('0100', 'integer')).toBe(100);
    });
  });

  describe('qtiValueKey', () => {
    it('should return string representation for primitives', () => {
      expect(qtiValueKey('hello')).toBe('hello');
      expect(qtiValueKey(42)).toBe('42');
      expect(qtiValueKey(true)).toBe('true');
    });

    it('should return JSON for arrays without baseType', () => {
      expect(qtiValueKey([1, 2])).toBe('[1,2]');
      expect(qtiValueKey(['A', 'B'])).toBe('["A","B"]');
    });

    it('should normalize pair order so (B,A) keys the same as (A,B)', () => {
      expect(qtiValueKey(['B', 'A'], 'pair')).toBe(qtiValueKey(['A', 'B'], 'pair'));
    });

    it('should not normalize directedPair order', () => {
      expect(qtiValueKey(['A', 'B'], 'directedPair')).not.toBe(
        qtiValueKey(['B', 'A'], 'directedPair'),
      );
    });

    it('should not normalize non-pair arrays', () => {
      expect(qtiValueKey([1, 2], 'point')).toBe('[1,2]');
      expect(qtiValueKey([2, 1], 'point')).toBe('[2,1]');
    });
  });
});
