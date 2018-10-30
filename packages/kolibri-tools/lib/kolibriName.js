const fs = require('fs');
const path = require('path');
const ensureDist = require('./ensureDist');

let kolibriName;

const sourcePath = path.resolve(__dirname, '../../../kolibri/utils/KOLIBRI_CORE_JS_NAME');
const distPath = path.resolve(__dirname, '../dist/KOLIBRI_CORE_JS_NAME')

try {
  kolibriName = fs.readFileSync(sourcePath, 'utf-8').trim();
} catch (e) {
  kolibriName = fs.readFileSync(distPath, 'utf-8').trim();
}

function __buildKolibriName() {
  if (!fs.existsSync(sourcePath)) {
    throw new ReferenceError('Attempting to build the kolibriName file from outside the Kolibri source repo');
  }
  const name = fs.readFileSync(sourcePath, 'utf-8').trim();
  ensureDist();
  fs.writeFileSync(distPath, name, { encoding: 'utf-8' });
}

module.exports = {
  kolibriName,
  __buildKolibriName,
};
