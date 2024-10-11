/*
  This module provides mechanisms for validating and initializing javascript
  objects using specifications or "specs" analogous to Vue's prop validation
  objects:

  - validateObject: recursively validates objects based on a spec. It can be
    useful for validation in situations such as using Objects as props, checking
    API responses, parsing JSON-based config files, and other situations where
    validation of objects is useful. It is not run in production.

  - objectWithDefaults: recursively populates default values based on the spec,
    in the same way that Vue prop `default` values work.

  Each `options` object in a spec can have the following attributes:

  - type (primitive data type)
    Most commonly one of: Array, Boolean, Object, Number, or String

  - required (boolean)
    Whether an attribute in the object is required or not. If it is not
    required, a `default` value must be provided.

  - default (value or function)
    Default value for non-required object attributes. Like Vue `data` values,
    array and object types need to use a function to return default values.
    Defaults are used by the `objectWithDefaults` function to populate objects.

  - validator (function)
    Like prop validator functions, this takes a value and returns true or false.

  - spec (object)
    In situations where objects are nested, this property can be used to define
    a "sub-spec" for objects within objects recursively. Note that either a spec
    or a validator function can be provided for nested objects, but not both.
*/

import logger from 'kolibri-logging';

import clone from 'lodash/clone';
import isArray from 'lodash/isArray';
import isBoolean from 'lodash/isBoolean';
import isDate from 'lodash/isDate';
import isFunction from 'lodash/isFunction';
import isPlainObject from 'lodash/isPlainObject';
import isNumber from 'lodash/isNumber';
import isString from 'lodash/isString';
import isSymbol from 'lodash/isSymbol';
import isUndefined from 'lodash/isUndefined';

const logging = logger.getLogger(__filename);

function _fail(msg, dataKey, data) {
  logging.error(`Problem with key '${dataKey}': ${msg}`);
  logging.error('Data:', data);
  return false;
}

function _validateObjectData(data, options, dataKey) {
  const hasData = !isUndefined(data) && data !== null;

  // data is not available but required
  if (options.required && !hasData) {
    return _fail('Required but undefined data', dataKey, data);
  }

  // should only have a validator or a spec, not both
  if (options.validator && options.spec) {
    return _fail('Should either have a validator or a sub-spec', dataKey, data);
  }

  // validation function
  if (hasData && options.validator && !options.validator(data)) {
    return _fail('Validator function failed', dataKey, data);
  }

  // object sub-spec
  if (hasData && options.spec) {
    if (!isPlainObject(data) && !isArray(data)) {
      return _fail('Only objects or arrays can have sub-specs', dataKey, data);
    }

    // If it is an array, we will validate each item in the array
    if (isArray(data)) {
      for (const item of data) {
        if (!validateObject(item, options.spec.spec)) {
          return _fail('Object in Array sub-spec failed', dataKey, item);
        }
      }
    }

    // Here we know it is an Object, but we need to be sure it isn't an Array to avoid
    // checking it again after we already validated the Array in the block above.
    if (isPlainObject(data) && !validateObject(data, options.spec)) {
      return _fail('Validator sub-spec failed', dataKey, data);
    }
  }

  // Check types
  const KNOWN_TYPES = [Array, Boolean, Date, Function, Object, Number, String, Symbol];
  if (isUndefined(options.type)) {
    return _fail('No type information provided', dataKey, data);
  } else if (!KNOWN_TYPES.includes(options.type)) {
    return _fail(`Type '${options.type}' not currently handled`, dataKey);
  } else if (hasData) {
    if (options.type === Array && !isArray(data)) {
      return _fail('Expected Array', dataKey, data);
    } else if (options.type === Boolean && !isBoolean(data)) {
      return _fail('Expected Boolean', dataKey, data);
    } else if (options.type === Date && !isDate(data)) {
      return _fail('Expected Date', dataKey, data);
    } else if (options.type === Function && !isFunction(data)) {
      return _fail('Expected Function', dataKey, data);
    } else if (options.type === Object && !isPlainObject(data)) {
      return _fail('Expected Object', dataKey, data);
    } else if (options.type === Number && !isNumber(data)) {
      return _fail('Expected Number', dataKey, data);
    } else if (options.type === String && !isString(data)) {
      return _fail('Expected String', dataKey, data);
    } else if (options.type === Symbol && !isSymbol(data)) {
      return _fail('Expected Symbol', dataKey, data);
    }
  }

  // ensure spec has a default when not required and not vice-versa
  if (!options.required && isUndefined(options.default)) {
    return _fail('Must be either required or have a default', dataKey, data);
  } else if (options.required && !isUndefined(options.default)) {
    return _fail('Cannot be required and have a default', dataKey, data);
  }

  // objects and arrays must use a generator function for their default value
  if (
    options.default &&
    (options.type === Array || options.type === Object) &&
    !isFunction(options.default)
  ) {
    return _fail('Need a function to return array and object default values', dataKey, data);
  }

  return true;
}

/*
 * Given a JS object and a spec object as defined above, return `true` if the object
 * conforms to the spec and `false` otherwise
 */
export function validateObject(object, spec) {
  // skip validation in production
  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  // Don't end early: provide as much validation messaging as possible
  let isValid = true;
  for (const dataKey in spec) {
    const options = spec[dataKey];
    if (!isPlainObject(options)) {
      logging.error(`Expected an Object for '${dataKey}' in spec. Got:`, options);
      isValid = false;
      continue;
    }
    isValid = _validateObjectData(object[dataKey], options, dataKey) && isValid;
  }

  // Output additional debug info
  if (!isValid) {
    logging.info('Spec:');
    logging.info(spec);
    logging.info('Value:');
    logging.info(object);
  }

  return isValid;
}

/*
 * Given a JS object and a spec object as defined above, return a new object
 * with any necessary default values filled in as per the spec object.
 */
export function objectWithDefaults(object, spec) {
  // create a shallow clone
  const cloned = clone(object);
  // iterate over spec options
  for (const dataKey in spec) {
    const options = spec[dataKey];
    // set defaults if necessary
    if (isUndefined(cloned[dataKey]) && !isUndefined(options.default)) {
      // arrays and objects need to use a function to return defaults
      if (options.default instanceof Function) {
        cloned[dataKey] = options.default();
      }
      // all other types can be assigned directly
      else {
        cloned[dataKey] = options.default;
      }
    }
    // recurse down into sub-specs if necessary
    else if (cloned[dataKey] && options.spec) {
      if (options.type === Array) {
        for (let i = 0; i < cloned[dataKey].length; i++) {
          cloned[dataKey][i] = objectWithDefaults(cloned[dataKey][i], options.spec);
        }
      } else {
        cloned[dataKey] = objectWithDefaults(cloned[dataKey], options.spec);
      }
    }
  }
  // return copy of object with defaults filled in
  return cloned;
}
