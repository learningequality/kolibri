var fs = require('fs');
var path = require('path');

var kolibriName = fs
  .readFileSync(path.resolve(__dirname, '../../kolibri/utils/KOLIBRI_CORE_JS_NAME'), 'utf-8')
  .trim();

module.exports = kolibriName;
