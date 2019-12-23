const http = require('http');
const path = require('path');
const url = require('url');
const { join } = require('path');
const MemoryFileSystem = require('memory-fs');
const webpack = require('webpack');
const webpackConfig = require('../hashi/webpack.config');

function generateIframeClientCode() {
  // Modified from https://github.com/knpwrs/webpack-to-memory/blob/master/src/index.js
  return new Promise((resolve, reject) => {
    webpackConfig.output.filename = 'hashiframe.js';
    // Remove any plugins to prevent tests from writing erroneous
    // hashi filenames to Kolibri.
    webpackConfig.plugins = [];
    const compiler = webpack(webpackConfig);
    // Compile hashi iframe client to in-memory file system.
    const fs = new MemoryFileSystem();
    compiler.outputFileSystem = fs;
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      if (stats.hasErrors()) {
        const errors = stats.compilation ? stats.compilation.errors : null;
        reject(errors);
        return;
      }
      const { outputPath } = compiler;
      // Read each file and compile module
      const path = join(outputPath, webpackConfig.output.filename);
      resolve(fs.readFileSync(path, 'utf8'));
    });
  });
}

const mainClientConfig = {
  entry: path.resolve(__dirname, './test/integration/testMainClient.js'),
  output: {
    filename: 'hashimain.js',
    path: path.resolve(__dirname),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'buble-loader',
        include: [path.join(__dirname, 'src'), path.join(__dirname, 'test/integration')],
        options: {
          objectAssign: 'Object.assign',
        },
      },
    ],
  },
};

function generateMainClientCode() {
  // Modified from https://github.com/knpwrs/webpack-to-memory/blob/master/src/index.js
  return new Promise((resolve, reject) => {
    const compiler = webpack(mainClientConfig);
    // Compile hashi iframe client to in-memory file system.
    const fs = new MemoryFileSystem();
    compiler.outputFileSystem = fs;
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      if (stats.hasErrors()) {
        const errors = stats.compilation ? stats.compilation.errors : null;
        reject(errors);
        return;
      }
      const { outputPath } = compiler;
      // Read each file and compile module
      const path = join(outputPath, mainClientConfig.output.filename);
      resolve(fs.readFileSync(path, 'utf8'));
    });
  });
}

let iframeScript, mainScript;
const port = 6543;
const hashiHtmlTemplate = function(headSnippet, bodySnippet = '', setWindowName = true) {
  const windowNameSnippet = `<script>window.name = 'hashi';</script>`;
  return `
<!DOCTYPE html>
<html>
  <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="google" content="notranslate">
      ${setWindowName ? windowNameSnippet : ''}
      ${headSnippet}
      <script src="http://127.0.0.1:${port}/hashiframe.js"></script>
  </head>
  <body>
  ${bodySnippet}
  </body>
</html>
`;
};

const iframeWrapperTemplate = function(src, snippet) {
  return `
<!DOCTYPE html>
<html>
  <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="google" content="notranslate">
  </head>
  <body>
  <iframe id="hashi" sandbox="allow-scripts" src="http://127.0.0.1:${port}/${src}" name="hashi"></iframe>
  <script src="http://127.0.0.1:${port}/hashimain.js"></script>
  <script>${snippet}</script>
  </body>
</html>
`;
};

const jsSnippet = function(number) {
  return `window.loadTimes = window.loadTimes || {}; window.loadTimes[${number}] = window.performance.now();`;
};

const wrapInScript = function(js) {
  return `<script>${js}</script>`;
};

const wrapInTemplate = function(script) {
  return `<template hashi-script="true">${script}</template>`;
};

const jsCheck = /\/test([0-9]{1})\.js/;

const iframeSnippets = {
  '/inlineorder.html':
    wrapInTemplate(wrapInScript(jsSnippet(1))) +
    wrapInTemplate(wrapInScript(jsSnippet(2))) +
    wrapInTemplate(wrapInScript(jsSnippet(3))),
  '/scriptorder.html':
    wrapInTemplate(`<script src="http://127.0.0.1:${port}/test1.js"></script>`) +
    wrapInTemplate(`<script src="http://127.0.0.1:${port}/test2.js"></script>`) +
    wrapInTemplate(`<script src="http://127.0.0.1:${port}/test3.js"></script>`),
  '/error.html':
    wrapInTemplate(wrapInScript('fail!')) +
    wrapInTemplate(wrapInScript(jsSnippet(1))) +
    wrapInTemplate('<script src=""></script>') +
    wrapInTemplate(wrapInScript(jsSnippet(2))) +
    wrapInTemplate('<script src(unknown)></script>') +
    wrapInTemplate(wrapInScript(jsSnippet(3))),
  '/documentwrite.html': wrapInTemplate(
    `<script id="nottest">document.write('<script id="test">');</script>`
  ),
  '/setlocalstorage.html': wrapInTemplate(
    wrapInScript('localStorage.setItem("test", "this is a test");')
  ),
  '/setcookie.html': wrapInTemplate(
    wrapInScript('document.cookie = "test=this is a test;max-age=10000";')
  ),
  '/nowindowname.html': [wrapInTemplate(wrapInScript(jsSnippet(1))), '', false],
  '/incrementaldomrender.html': [
    wrapInTemplate(
      wrapInScript('window.bodyDuringHead = Boolean(document.body); window.headRendered = true;')
    ),
    wrapInTemplate(
      wrapInScript(
        'window.bodyDuringBody = Boolean(document.body); window.nextElementDuringBody = Boolean(document.querySelector("#nextelement")); window.bodyStarted = true;'
      )
    ) + '<div id="nextelement"></div>',
  ],
};

const mainSnippets = {
  '/iframeunloaded.html': iframeWrapperTemplate('', ''),
  '/iframeloaded.html': iframeWrapperTemplate('inlineorder.html', 'window.hashi.initialize({});'),
  '/iframelocalstorage.html': iframeWrapperTemplate(
    'setlocalstorage.html',
    `
    window.hashi.initialize({});
    window.hashi.onStateUpdate(function(data) {
      window.data = data;
    });
    `
  ),
  '/iframecookie.html': iframeWrapperTemplate(
    'setcookie.html',
    `
    window.hashi.initialize({});
    window.hashi.onStateUpdate(function(data) {
      window.data = data;
    });
    `
  ),
};

http
  .createServer((message, response) => {
    const uri = url.parse(message.url).pathname;
    //header to allow CORS request
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Request-Method', '*');
    response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
    response.setHeader('Access-Control-Allow-Headers', '*');
    let output;
    let headers;
    let promise = Promise.resolve();
    if (iframeSnippets[uri]) {
      let snippets = iframeSnippets[uri];
      if (!Array.isArray(snippets)) {
        snippets = [snippets];
      }
      output = hashiHtmlTemplate(...snippets);
      headers = { 'Content-Type': 'text/html' };
    } else if (mainSnippets[uri]) {
      output = mainSnippets[uri];
      headers = { 'Content-Type': 'text/html' };
    } else if (uri === '/hashiframe.js') {
      if (!iframeScript) {
        promise = generateIframeClientCode().then(code => {
          iframeScript = code;
          output = iframeScript;
        });
      } else {
        output = iframeScript;
      }
      headers = { 'Content-Type': 'text/javascript' };
    } else if (uri === '/hashimain.js') {
      if (!mainScript) {
        promise = generateMainClientCode().then(code => {
          mainScript = code;
          output = mainScript;
        });
      } else {
        output = mainScript;
      }
      headers = { 'Content-Type': 'text/javascript' };
    } else if (jsCheck.test(uri)) {
      output = jsSnippet(jsCheck.exec(uri)[1]);
      headers = { 'Content-Type': 'text/javascript' };
    }
    promise.then(() => {
      if (output) {
        response.writeHead(200, headers);
        response.end(output);
      } else {
        response.writeHead(404, {});
        response.end();
      }
    });
  })
  .listen(port, () => {});
