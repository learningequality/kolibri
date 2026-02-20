import { Format, ShowHide, Orientation } from '../constants';
import { coerceNumber, validateNumber, validateBoolean } from './qti/values';

const QTI_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_-]{0,31}$/;

/**
 * Validates QTI identifier format
 * @param {string|null} value - The value to validate
 * @returns {boolean} - True if valid QTI identifier or null
 */
const validateQTIIdentifier = value => {
  return QTI_IDENTIFIER_PATTERN.test(value);
};

/**
 * Validates non-negative integer
 * @param {string|number|null} value - The value to validate
 * @returns {boolean} - True if non-negative integer or null
 */
const validateNonNegativeInt = value => {
  value = coerceNumber(value);
  return Number.isInteger(value) && value >= 0;
};

/**
 * Creates an enum validator function
 * @param {Object} enumObject - The enum object to validate against
 * @returns {Function} Validator function
 */
const createEnumValidator = enumObject => {
  return value => Object.values(enumObject).includes(value);
};

/**
 * Validates Format enum values
 */
const validateFormat = createEnumValidator(Format);

/**
 * Validates ShowHide enum values
 */
const validateShowHide = createEnumValidator(ShowHide);

/**
 * Validates Orientation enum values
 */
const validateOrientation = createEnumValidator(Orientation);

// Common factory function for creating props
/**
 * Creates a Vue prop configuration from a base prop object
 * @param {Object} baseProp - Base prop configuration (type, validator, etc.)
 * @param {boolean} required - Whether the prop is required (default: true)
 * @param {*} defaultValue - Default value (default: null when not required)
 * @returns {Object} Vue prop configuration
 */
const createProp = (baseProp, required = true, defaultValue) => {
  const prop = { ...baseProp };

  if (required) {
    prop.required = true;
  } else {
    prop.default = defaultValue !== undefined ? defaultValue : null;
  }

  return prop;
};

// Base prop configurations
const baseQTIIdentifierProp = { type: String, validator: validateQTIIdentifier };
const baseNonNegativeIntProp = { type: [Number, String], validator: validateNonNegativeInt };
const baseFormatProp = { type: String, validator: validateFormat };
const baseShowHideProp = { type: String, validator: validateShowHide };
const baseOrientationProp = { type: String, validator: validateOrientation };
const baseStringProp = { type: String };
const baseNumberProp = { type: [Number, String], validator: validateNumber };
const baseBooleanProp = { type: [Boolean, String], validator: validateBoolean };

// Generator functions for props
export const QTIIdentifierProp = (required, defaultValue) =>
  createProp(baseQTIIdentifierProp, required, defaultValue);

export const NonNegativeIntProp = (required, defaultValue) =>
  createProp(baseNonNegativeIntProp, required, defaultValue);

export const FormatProp = (required, defaultValue) =>
  createProp(baseFormatProp, required, defaultValue);

export const ShowHideProp = (required, defaultValue) =>
  createProp(baseShowHideProp, required, defaultValue);

export const OrientationProp = (required, defaultValue) =>
  createProp(baseOrientationProp, required, defaultValue);

export const StringProp = (required, defaultValue) =>
  createProp(baseStringProp, required, defaultValue);

export const NumberProp = (required, defaultValue) =>
  createProp(baseNumberProp, required, defaultValue);

export const BooleanProp = (required, defaultValue) =>
  createProp(baseBooleanProp, required, defaultValue);
