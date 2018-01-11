/*
  Validation for vue router "location descriptor objects".
  See e.g. https://router.vuejs.org/en/api/router-link.html
*/

import every from 'lodash/every';
import keys from 'lodash/keys';

export function validateLinkObject(object) {
  const validKeys = ['name', 'path', 'params', 'query'];
  return every(keys(object), key => validKeys.includes(key));
}

export function validateUsername(username) {
  const hasPuncRe = /[\s`~!@#$%^&*()\-+={}\[\]\|\\\/:;"'<>,\.\?]/; // eslint-disable-line
  return !hasPuncRe.test(username);
}
