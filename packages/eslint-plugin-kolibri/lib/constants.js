'use strict';

const GROUP_PROPS = 'props';
const GROUP_DATA = 'data';
const GROUP_COMPUTED = 'computed';
const GROUP_METHODS = 'methods';
const GROUP_WATCH = 'watch';
const GROUP_$TRS = '$trs';

const PROPERTY_LABEL = {
  [GROUP_PROPS]: 'property',
  [GROUP_DATA]: 'data',
  [GROUP_COMPUTED]: 'computed property',
  [GROUP_METHODS]: 'method',
};

const VUEX_STATE = 'state';
const VUEX_GETTER = 'getter';
const VUEX_MUTATION = 'mutation';
const VUEX_ACTION = 'action';

module.exports = {
  GROUP_PROPS,
  GROUP_DATA,
  GROUP_COMPUTED,
  GROUP_METHODS,
  GROUP_$TRS,
  GROUP_WATCH,
  PROPERTY_LABEL,
  VUEX_STATE,
  VUEX_GETTER,
  VUEX_MUTATION,
  VUEX_ACTION,
};
