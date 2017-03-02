module.exports = {
  address: "localhost",
  port: 3000,
  basePath: "js-dist",
  get publicPath() {
    return "http://" + this.address + ":" + this.port + "/" + (this.basePath ? this.basePath + "/" : "");
  },
};
