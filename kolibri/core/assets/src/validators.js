import { ContentNodeKinds, LearningActivities } from 'kolibri.coreVue.vuex.constants';
import logger from 'kolibri.lib.logging';

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

function _validationLogger(msg, dataKey, data) {
  logging.error(`Problem with key '${dataKey}': ${msg}`);
  logging.error('Data:', data);
}

function _validateObjectData(data, option, dataKey) {
  // data is not available but required
  const hasData = !isUndefined(data) && data !== null;
  if (option.required && !hasData) {
    _validationLogger('Required but undefined data', dataKey, data);
    return false;
  }

  // validation function
  if (hasData && option.validator && !option.validator(data)) {
    console.log(option.validator);
    _validationLogger('Validator function failed', dataKey, data);
    return false;
  }

  // object sub-spec
  if (hasData && option.spec) {
    const validator = createObjectValidator(option.spec);
    if (!validator(data)) {
      _validationLogger('Validator sub-spec failed', dataKey, data);
      return false;
    }
  }

  // Check types
  const KNOWN_TYPES = [Array, Boolean, Date, Function, Object, Number, String, Symbol];
  if (isUndefined(option.type)) {
    _validationLogger('No type information provided', dataKey, data);
    return false;
  } else if (!KNOWN_TYPES.includes(option.type)) {
    _validationLogger(`Type '${option.type}' not currently handled`, dataKey);
    return false;
  }
  if (hasData) {
    if (option.type === Array && !isArray(data)) {
      _validationLogger('Expected Array', dataKey, data);
      return false;
    } else if (option.type === Boolean && !isBoolean(data)) {
      _validationLogger('Expected Boolean', dataKey, data);
      return false;
    } else if (option.type === Date && !isDate(data)) {
      _validationLogger('Expected Date', dataKey, data);
      return false;
    } else if (option.type === Function && !isFunction(data)) {
      _validationLogger('Expected Function', dataKey, data);
      return false;
    } else if (option.type === Object && !isObject(data)) {
      _validationLogger('Expected Object', dataKey, data);
      return false;
    } else if (option.type === Number && !isNumber(data)) {
      _validationLogger('Expected Number', dataKey, data);
      return false;
    } else if (option.type === String && !isString(data)) {
      _validationLogger('Expected String', dataKey, data);
      return false;
    } else if (option.type === Symbol && !isSymbol(data)) {
      _validationLogger('Expected Symbol', dataKey, data);
      return false;
    }
  }

  // ensure spec has a default when not required
  if (!option.required && isUndefined(option.default)) {
    _validationLogger('Must be either required or have a default', dataKey, data);
    return false;
  }

  // objects and arrays must use a generator function for their default value
  if (option.default && (isArray(data) || isObject(data)) && !isFunction(option.default)) {
    _validationLogger('Need a function to return array and object default values', dataKey, data);
    return false;
  }

  return true;
}

export function createObjectValidator(spec) {
  return function validateObject(value) {
    let isValid = true;
    for (const dataKey in spec) {
      const option = spec[dataKey];
      if (!isObject(option)) {
        logging.error(`Expected an Object for '${dataKey}' in spec. Got:`, option);
        isValid = false;
        continue;
      }
      // Don't end early: provide as much validation messaging as possible
      isValid = _validateObjectData(value[dataKey], option, dataKey) && isValid;
    }
    if (!isValid) {
      logging.error('Spec:');
      logging.error(spec);
      logging.error('Value:');
      logging.error(value);
    }
    return isValid;
  };
}
