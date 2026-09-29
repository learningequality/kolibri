const { stampComposableIds } = require('./composableIds');

module.exports = function composableIdLoader(source, map) {
  const stamped =
    !this.resourcePath.endsWith('.vue') &&
    stampComposableIds(source, this.resourcePath, {
      production: this.mode === 'production',
    });
  if (!stamped) {
    this.callback(null, source, map);
    return;
  }
  const code = this.hot ? `${stamped.code}\nif (module.hot) module.hot.decline();\n` : stamped.code;
  this.callback(null, code, stamped.map);
};
