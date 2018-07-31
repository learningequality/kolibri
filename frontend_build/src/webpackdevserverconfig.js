module.exports = {
  address: 'localhost',
  port: 3000,
  host: '0.0.0.0',
  basePath: 'js-dist',
  get publicPath() {
    return (
      'http://' + this.address + ':' + this.port + '/' + (this.basePath ? this.basePath + '/' : '')
    );
  },
};
