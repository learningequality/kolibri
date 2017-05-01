
/*
  Validation for vue router "location descriptor objects".
  See e.g. https://router.vuejs.org/en/api/router-link.html
*/


const every = require('lodash/every');
const keys = require('lodash/keys');

module.exports = function validateLinkObject(object) {
  const validKeys = ['name', 'path', 'params', 'query'];
  return every(keys(object), key => validKeys.includes(key));
};

