import { BASE_TYPE } from '../../constants';

/**
 * A coerced QTI value. Its concrete shape follows the variable's base type and
 * cardinality: boolean, number, string, or point/pair tuples for single values;
 * arrays of these for multiple/ordered cardinality; or null.
 * @typedef {(boolean|number|string|Array<number|string>|Array<Array<number|string>>|null)} QTIValue
 */

/**
 * Build a string key for a QTI value, suitable for use in frequency maps.
 * For pair baseType, normalizes element order so (A,B) and (B,A) produce the same key.
 * @param {QTIValue} v - The value to key
 * @param {string} [baseType] - Optional QTI base type
 * @returns {string} A string key
 */
export function qtiValueKey(v, baseType) {
  if (typeof v === 'object' && v !== null) {
    // Pairs are unordered: normalize by sorting so (B,A) keys the same as (A,B)
    if (baseType === BASE_TYPE.PAIR && Array.isArray(v) && v.length === 2) {
      const sorted = v[0] <= v[1] ? v : [v[1], v[0]];
      return JSON.stringify(sorted);
    }
    return JSON.stringify(v);
  }
  return String(v);
}

export function coerceBoolean(value) {
  if (typeof value === 'string') {
    return value === 'true';
  }
  return Boolean(value);
}

export function coerceNumber(value) {
  return Number(value);
}

export const validateNumber = value => {
  // Reject types that Number() silently coerces (e.g. true→1, null→0,
  // []→0) but that are not meaningful QTI numeric values. Only accept
  // strings and numbers as input — everything else is a type error.
  if (typeof value !== 'string' && typeof value !== 'number') {
    return false;
  }
  const num = coerceNumber(value);
  return !isNaN(num) && isFinite(num);
};

export const validateBoolean = value => {
  if (typeof value === 'boolean') {
    return true;
  }
  if (value === 'true' || value === 'false') {
    return true;
  }
  return false;
};

/**
 * Helper function to parse space-separated values
 * @param {string} str - Space-separated string
 * @param {Function} coerceFn - Function to coerce each value
 * @returns {Array} - Array of coerced values
 */
function parseSpaceSeparated(str, coerceFn) {
  return str.trim().split(/\s+/).map(coerceFn);
}

/**
 * Coerces a value to a QTI point (array of two integers).
 * @param {string|Array<string|number>} value - The value to coerce; accepts an
 * `[x, y]` array or a space-separated string.
 * @returns {[number, number]} `[x, y]` array of integers.
 * @throws {TypeError} When `value` cannot be coerced to a point.
 */
export function coercePoint(value) {
  if (Array.isArray(value) && value.length === 2) {
    return [parseInt(value[0], 10), parseInt(value[1], 10)];
  }
  if (typeof value === 'string') {
    const parts = parseSpaceSeparated(value, v => parseInt(v, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts;
    }
  }
  throw new TypeError(`Cannot coerce ${value} to point`);
}

/**
 * Validates if a value can be coerced to a QTI point.
 * @param {string|Array<string|number>} value - The value to validate.
 * @returns {boolean} True if valid point.
 */
export function validatePoint(value) {
  try {
    coercePoint(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Coerces a value to a QTI pair (array of two strings).
 * @param {string|Array<string|number>} value - The value to coerce; accepts a
 * `[first, second]` array or a space-separated string.
 * @returns {[string, string]} `[first, second]` array of strings.
 * @throws {TypeError} When `value` cannot be coerced to a pair.
 */
export function coercePair(value) {
  if (Array.isArray(value) && value.length === 2) {
    return [String(value[0]), String(value[1])];
  }
  if (typeof value === 'string') {
    const parts = parseSpaceSeparated(value, String);
    if (parts.length === 2) {
      return parts;
    }
  }
  throw new TypeError(`Cannot coerce ${value} to pair`);
}

/**
 * Validates if a value can be coerced to a QTI pair.
 * @param {string|Array<string|number>} value - The value to validate.
 * @returns {boolean} True if valid pair.
 */
export function validatePair(value) {
  try {
    coercePair(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Coerces a value to a QTI duration (non-negative number).
 * @param {string|number} value - The value to coerce.
 * @returns {number} The coerced duration value.
 * @throws {TypeError} When `value` cannot be coerced to a non-negative number.
 */
export function coerceDuration(value) {
  const num = parseFloat(value);
  if (!isNaN(num) && num >= 0) {
    return num;
  }
  throw new TypeError(`Cannot coerce ${value} to duration`);
}

/**
 * Validates if a value can be coerced to a QTI duration.
 * @param {string|number} value - The value to validate.
 * @returns {boolean} True if valid duration.
 */
export function validateDuration(value) {
  try {
    coerceDuration(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a value is a valid QTI file (JavaScript File object).
 * @param {unknown} value - The value to validate.
 * @returns {boolean} True if `value` is a `File` instance.
 */
export function validateFile(value) {
  return value instanceof File;
}

/**
 * Coerces a value to the specified QTI base type.
 * @param {unknown} value - The value to coerce.
 * @param {string} baseType - The QTI base type.
 * @returns {unknown} The coerced value, or null when `value` is null/undefined/empty.
 * @throws {TypeError} When `value` cannot be coerced to the requested base type.
 */
export function coerceValueWithBaseType(value, baseType) {
  // Empty containers and empty strings are treated as NULL in QTI per
  // qti-is-null
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpIsNull
  // We also accept the string 'NULL' as null.
  if (value === null || value === undefined || value === 'NULL') {
    return null;
  }
  // Empty string is a valid value for string-like types (a candidate can
  // submit an empty text entry); for all other types it represents no value.
  if (
    value === '' &&
    baseType !== BASE_TYPE.STRING &&
    baseType !== BASE_TYPE.IDENTIFIER &&
    baseType !== BASE_TYPE.URI
  ) {
    return null;
  }

  switch (baseType) {
    case BASE_TYPE.BOOLEAN:
      if (!validateBoolean(value)) {
        throw new TypeError(`Cannot coerce ${value} to boolean`);
      }
      return coerceBoolean(value);
    case BASE_TYPE.INTEGER:
      if (!validateNumber(value)) {
        throw new TypeError(`Cannot coerce ${value} to integer`);
      }
      return parseInt(value, 10);
    case BASE_TYPE.FLOAT:
      if (!validateNumber(value)) {
        throw new TypeError(`Cannot coerce ${value} to float`);
      }
      return parseFloat(value);
    case BASE_TYPE.STRING:
    case BASE_TYPE.IDENTIFIER:
    case BASE_TYPE.URI:
      if (typeof value !== 'string') {
        throw new TypeError(`Cannot coerce ${value} to string`);
      }
      return value;
    case BASE_TYPE.POINT:
      return coercePoint(value);
    case BASE_TYPE.PAIR:
    case BASE_TYPE.DIRECTED_PAIR:
      return coercePair(value);
    case BASE_TYPE.DURATION:
      return coerceDuration(value);
    case BASE_TYPE.FILE:
      if (!validateFile(value)) {
        throw new TypeError(`Cannot coerce ${value} to file`);
      }
      return value;
    default:
      return value;
  }
}
