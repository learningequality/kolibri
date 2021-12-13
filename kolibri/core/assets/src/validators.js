import { ContentNodeKinds, LearningActivities } from 'kolibri.coreVue.vuex.constants';
import logger from 'kolibri.lib.logging';

import clone from 'lodash/clone';
import every from 'lodash/every';
import isArray from 'lodash/isArray';
import isBoolean from 'lodash/isBoolean';
import isDate from 'lodash/isDate';
import isFunction from 'lodash/isFunction';
import isObject from 'lodash/isObject';
import isNumber from 'lodash/isNumber';
import isString from 'lodash/isString';
import isSymbol from 'lodash/isSymbol';
import isUndefined from 'lodash/isUndefined';
import keys from 'lodash/keys';
import values from 'lodash/values';

const logging = logger.getLogger(__filename);

/**
 * Validation for vue router "location descriptor objects".
 * See e.g. https://router.vuejs.org/en/api/router-link.html
 */
export function validateLinkObject(object) {
  const validKeys = ['name', 'path', 'params', 'query'];
  return every(keys(object), key => validKeys.includes(key));
}

export function validateUsername(username) {
  const hasPuncRe = /[\s`~!@#$%^&*()\-+={}\[\]\|\\\/:;"'<>,\.\?]/; // eslint-disable-line
  return !hasPuncRe.test(username);
}

export function validateContentNodeKind(value, others = []) {
  return [...values(ContentNodeKinds), ...others].includes(value);
}

export function validateLearningActivity(arr) {
  const isValidLearningActivity = v => Object.values(LearningActivities).includes(v);
  return arr.length > 0 && arr.every(isValidLearningActivity);
}

function _fail(msg, dataKey, data) {
  logging.error(`Problem with key '${dataKey}': ${msg}`);
  logging.error('Data:', data);
  return false;
}

function _validateObjectData(data, option, dataKey) {
  // data is not available but required
  const hasData = !isUndefined(data) && data !== null;
  if (option.required && !hasData) {
    return _fail('Required but undefined data', dataKey, data);
  }

  // should only have a validator or a spec, not both
  if (option.validator && option.spec) {
    return _fail('Should either have a validator or a sub-spec', dataKey, data);
  }

  // validation function
  if (hasData && option.validator && !option.validator(data)) {
    return _fail('Validator function failed', dataKey, data);
  }

  // object sub-spec
  if (hasData && option.spec) {
    if (!isObject(data)) {
      return _fail('Only objects can have sub-specs', dataKey, data);
    }
    if (!validateObject(data, option.spec)) {
      return _fail('Validator sub-spec failed', dataKey, data);
    }
  }

  // Check types
  const KNOWN_TYPES = [Array, Boolean, Date, Function, Object, Number, String, Symbol];
  if (isUndefined(option.type)) {
    return _fail('No type information provided', dataKey, data);
  } else if (!KNOWN_TYPES.includes(option.type)) {
    _fail(`Type '${option.type}' not currently handled`, dataKey);
    return false;
  }
  if (hasData) {
    if (option.type === Array && !isArray(data)) {
      return _fail('Expected Array', dataKey, data);
    } else if (option.type === Boolean && !isBoolean(data)) {
      return _fail('Expected Boolean', dataKey, data);
    } else if (option.type === Date && !isDate(data)) {
      return _fail('Expected Date', dataKey, data);
    } else if (option.type === Function && !isFunction(data)) {
      return _fail('Expected Function', dataKey, data);
    } else if (option.type === Object && !isObject(data)) {
      return _fail('Expected Object', dataKey, data);
    } else if (option.type === Number && !isNumber(data)) {
      return _fail('Expected Number', dataKey, data);
    } else if (option.type === String && !isString(data)) {
      return _fail('Expected String', dataKey, data);
    } else if (option.type === Symbol && !isSymbol(data)) {
      return _fail('Expected Symbol', dataKey, data);
    }
  }

  // ensure spec has a default when not required
  if (!option.required && isUndefined(option.default)) {
    return _fail('Must be either required or have a default', dataKey, data);
  }

  // objects and arrays must use a generator function for their default value
  if (option.default && (isArray(data) || isObject(data)) && !isFunction(option.default)) {
    return _fail('Need a function to return array and object default values', dataKey, data);
  }

  return true;
}

export function validateObject(object, spec) {
  if (process.env.NODE_ENV !== 'production') {
    // skip validation in production
    return true;
  }

  let isValid = true;
  for (const dataKey in spec) {
    const option = spec[dataKey];
    if (!isObject(option)) {
      logging.error(`Expected an Object for '${dataKey}' in spec. Got:`, option);
      isValid = false;
      continue;
    }
    // Don't end early: provide as much validation messaging as possible
    isValid = _validateObjectData(object[dataKey], option, dataKey) && isValid;
  }
  if (!isValid) {
    logging.error('Spec:');
    logging.error(spec);
    logging.error('Value:');
    logging.error(object);
  }
  return isValid;
}

export function objectWithDefaults(object, spec) {
  // create a shallow clone
  const cloned = clone(object);
  // iterate over spec options
  for (const dataKey in spec) {
    const option = spec[dataKey];
    // set defaults if necessary
    if (isUndefined(cloned[dataKey]) && !isUndefined(option.default)) {
      // arrays and objects need to use a function to return defaults
      const needsFunction = option.type === Array || option.type === Object;
      if (needsFunction && option.default !== null) {
        cloned[dataKey] = option.default();
      }
      // all other types can be assigned directly
      else {
        cloned[dataKey] = option.default;
      }
    }
    // recurse down into sub-specs if necessary
    else if (cloned[dataKey] && option.spec) {
      cloned[dataKey] = objectWithDefaults(cloned[dataKey], option.spec);
    }
  }
  return cloned;
}
