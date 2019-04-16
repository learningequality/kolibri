/*
 * A module to polyfill all required Web APIs
 * Use the compat command in the base of this module
 * to double check things that might be missing, and
 * add polyfilled APIs to the compat.js configuration.
 */

const values = require('object.values');
const entries = require('object.entries');
const assign = require('object.assign');
const includes = require('array-includes');

if (!Object.values) {
  values.shim();
}

if (!Object.entries) {
  entries.shim();
}

if (!Object.assign) {
  assign.shim();
}

if (!Array.prototype.includes) {
  includes.shim();
}
