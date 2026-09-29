const { stampComposableIds } = require('./composableIds');

module.exports = function composableIdLoader(source, map) {
  const stamped = stampComposableIds(source, this.resourcePath, {
    production: this.mode === 'production',
  });
  if (!stamped) {
    this.callback(null, source, map);
    return;
  }
  this.callback(null, stamped.code, stamped.map);
};
