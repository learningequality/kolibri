const path = require('path');
const fs = require('fs');
const CopyWebpackPlugin = require('copy-webpack-plugin');

class ScriptInjectPlugin {
  constructor(options) {
    this.scriptPath = options.scriptPath;
  }

  apply(compiler) {
    compiler.hooks.done.tap('ScriptInjectPlugin', () => {
      const htmlFilePath = path.resolve(
        __dirname,
        '../../kolibri/core/content/static/bloom/bloomplayer.htm',
      );
      if (fs.existsSync(htmlFilePath)) {
        let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
        const scriptTag = `<script src="${path.basename(this.scriptPath)}"></script>`;
        // Inject the script before the closing </body> tag
        htmlContent = htmlContent.replace(/<script/i, `${scriptTag}<script`);
        fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');
      }
    });
  }
}

module.exports = {
  mode: 'none',
  entry: path.resolve(__dirname, './src/bloom.js'),
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, '../../kolibri/core/content/static/bloom'),
    clean: true,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../../node_modules/bloom-player/dist'),
          to: path.resolve(__dirname, '../../kolibri/core/content/static/bloom'),
        },
        {
          from: path.resolve(__dirname, './src/Bloom/requestInterceptor.js'),
          to: path.resolve(__dirname, '../../kolibri/core/content/static/bloom'),
        },
        {
          from: path.resolve(__dirname, './src/Bloom/storageEvent.js'),
          to: path.resolve(__dirname, '../../kolibri/core/content/static/bloom'),
        },
      ],
    }),
    new ScriptInjectPlugin({
      scriptPath: path.resolve(__dirname, './src/Bloom/requestInterceptor.js'),
    }),
  ],
};
