'use strict';

const GROUP_PROPS = 'props';
const GROUP_DATA = 'data';
const GROUP_COMPUTED = 'computed';
const GROUP_METHODS = 'methods';
const GROUP_WATCH = 'watch';

const PROPERTY_LABEL = {
  [GROUP_PROPS]: 'property',
  [GROUP_DATA]: 'data',
  [GROUP_COMPUTED]: 'computed property',
  [GROUP_METHODS]: 'method',
};

module.exports = {
  GROUP_PROPS,
  GROUP_DATA,
  GROUP_COMPUTED,
  GROUP_METHODS,
  GROUP_WATCH,
  PROPERTY_LABEL,
};
