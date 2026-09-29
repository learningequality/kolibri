const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { createTransformer } = require('babel-jest');
const { stampComposableIds } = require('kolibri-build/src/composableIds');

const babelTransformer = createTransformer();
const stamperVersion = createHash('sha256')
  .update(fs.readFileSync(require.resolve('kolibri-build/src/composableIds')))
  .digest('hex');

function stamp(source, filename) {
  const stamped = stampComposableIds(source, filename);
  return stamped ? stamped.code : source;
}

module.exports = {
  canInstrument: babelTransformer.canInstrument,
  getCacheKey(source, filename, options) {
    return `${babelTransformer.getCacheKey(source, filename, options)}:${stamperVersion}`;
  },
  process(source, filename, options) {
    return babelTransformer.process(stamp(source, filename), filename, options);
  },
  processAsync(source, filename, options) {
    return babelTransformer.processAsync(stamp(source, filename), filename, options);
  },
};
