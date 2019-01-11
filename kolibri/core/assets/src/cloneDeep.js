import isPlainObject from 'lodash/isPlainObject';

/* eslint-disable no-use-before-define */
const cloneArray = array => array.map(item => cloneDeep(item));

const cloneObject = object => {
  const clone = {};
  Object.keys(object).forEach(key => {
    clone[key] = cloneDeep(object[key]);
  });
  return clone;
};

/* eslint-enable no-use-before-define */

const cloneDeep = object => {
  if (Array.isArray(object)) {
    // is an array
    return cloneArray(object);
  } else if (object && isPlainObject(object)) {
    // is an object
    return cloneObject(object);
  }
  // Do not bother converting other values.
  return object;
};

export { cloneDeep as default };
