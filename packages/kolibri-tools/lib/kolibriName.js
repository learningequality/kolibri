const fs = require('fs');
const path = require('path');
const ensureDist = require('./ensureDist');

const sourcePath = path.resolve(__dirname, '../../../kolibri/utils/kolibri_js_names.json');
const distPath = path.resolve(__dirname, '../dist/kolibri_js_names.json');

let names;

try {
  names = require(sourcePath);
} catch (e) {
  names = require(distPath);
}

const kolibriName = names['KOLIBRI_CORE_JS_NAME'];
const kolibriPluginDataName = names['KOLIBRI_JS_PLUGIN_DATA_NAME'];

function __buildKolibriName() {
  if (!fs.existsSync(sourcePath)) {
    throw new ReferenceError(
      'Attempting to build the kolibriName file from outside the Kolibri source repo'
    );
  }
  const nameFile = fs.readFileSync(sourcePath, 'utf-8').trim();
  ensureDist();
  fs.writeFileSync(distPath, nameFile, { encoding: 'utf-8' });
}

module.exports = {
  kolibriName,
  kolibriPluginDataName,
  __buildKolibriName,
};
