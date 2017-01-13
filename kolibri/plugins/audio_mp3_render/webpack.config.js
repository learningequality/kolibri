/*
 * This file defines additional webpack configuration for this plugin.
 * It will be bundled into the webpack configuration at build time.
 */

module.exports = {
  module: {
    loaders: [
      // Allows <video> and <audio> HTML5 tags work on all major browsers.
      {
        test: /html5media\/dist\/api\/1\.1\.8\/html5media/,
        loader: "imports?this=>window"
      }
    ]
  }
};
