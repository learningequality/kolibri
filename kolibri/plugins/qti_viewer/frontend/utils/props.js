import { Format, ShowHide, Orientation } from '../constants';
import { coerceNumber, validateNumber, validateBoolean } from './qti/values';

const QTI_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_-]{0,31}$/;

/**
 * Validates QTI identifier format.
 * @param {string|null} value - The value to validate.
 * @returns {boolean} - True if valid QTI identifier or null.
 */
const validateQTIIdentifier = value => {
  return QTI_IDENTIFIER_PATTERN.test(value);
};

/**
 * Validates non-negative integer.
 * @param {string|number|null} value - The value to validate.
 * @returns {boolean} - True if non-negative integer or null.
 */
const validateNonNegativeInt = value => {
  value = coerceNumber(value);
  return Number.isInteger(value) && value >= 0;
};

/**
 * Creates an enum validator function.
 * @param {object} enumObject - The enum object to validate against.
 * @returns {Function} Validator function.
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

/**
 * @typedef {object} VuePropConfig
 * @property {Function|Function[]} type - Vue prop type constructor(s).
 * @property {Function} [validator] - Runtime value validator (see Vue docs).
 * @property {boolean} [required] - Whether the prop is required.
 * @property {string|number|boolean} [default] - Default value when the prop is optional.
 */

/**
 * Creates a Vue prop configuration from a base prop object.
 * @param {object} baseProp - Base prop configuration (type, validator, etc.)
 * @param {boolean} [required=true] - Whether the prop is required
 * @param {string|number|boolean} [defaultValue] - Default value when not required; defaults to null
 * @returns {VuePropConfig}
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

// Generator functions for props.
// Each returns a VuePropConfig ready to drop into a component's `props` object.
// Call with `(true)` for a required prop, `(false, defaultValue)` for optional.

/**
 * Prop factory for a QTI identifier attribute.
 * @param {boolean} required - Whether the prop is required
 * @param {string|number|boolean} defaultValue - Default value when not required
 * @returns {VuePropConfig} QTI identifier-shaped String prop.
 */
export const QTIIdentifierProp = (required, defaultValue) =>
  createProp(baseQTIIdentifierProp, required, defaultValue);

/**
 * Prop factory for a non-negative integer attribute.
 * @param {boolean} required - Whether the prop is required
 * @param {string|number|boolean} defaultValue - Default value when not required
 * @returns {VuePropConfig} Non-negative integer prop (accepts Number or String).
 */
export const NonNegativeIntProp = (required, defaultValue) =>
  createProp(baseNonNegativeIntProp, required, defaultValue);

/**
 * Prop factory for a Format enum attribute.
 * @param {boolean} required - Whether the prop is required
 * @param {string|number|boolean} defaultValue - Default value when not required
 * @returns {VuePropConfig} `Format` enum String prop.
 */
export const FormatProp = (required, defaultValue) =>
  createProp(baseFormatProp, required, defaultValue);

/**
 * Prop factory for a show/hide enum attribute.
 * @param {boolean} required - Whether the prop is required
 * @param {string|number|boolean} defaultValue - Default value when not required
 * @returns {VuePropConfig} `ShowHide` enum String prop.
 */
export const ShowHideProp = (required, defaultValue) =>
  createProp(baseShowHideProp, required, defaultValue);

/**
 * Prop factory for an Orientation enum attribute.
 * @param {boolean} required - Whether the prop is required
 * @param {string|number|boolean} defaultValue - Default value when not required
 * @returns {VuePropConfig} `Orientation` enum String prop.
 */
export const OrientationProp = (required, defaultValue) =>
  createProp(baseOrientationProp, required, defaultValue);

/**
 * Prop factory for a free-form string attribute.
 * @param {boolean} required - Whether the prop is required
 * @param {string|number|boolean} defaultValue - Default value when not required
 * @returns {VuePropConfig} Free-form String prop.
 */
export const StringProp = (required, defaultValue) =>
  createProp(baseStringProp, required, defaultValue);

/**
 * Prop factory for a numeric attribute.
 * @param {boolean} required - Whether the prop is required
 * @param {string|number|boolean} defaultValue - Default value when not required
 * @returns {VuePropConfig} Numeric prop (accepts Number or String).
 */
export const NumberProp = (required, defaultValue) =>
  createProp(baseNumberProp, required, defaultValue);

/**
 * Prop factory for a boolean attribute.
 * @param {boolean} required - Whether the prop is required
 * @param {string|number|boolean} defaultValue - Default value when not required
 * @returns {VuePropConfig} Boolean prop (accepts Boolean or String).
 */
export const BooleanProp = (required, defaultValue) =>
  createProp(baseBooleanProp, required, defaultValue);
