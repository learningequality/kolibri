/**
 * @jest-environment jest-environment-hashi-integration
 */
import http from 'http';
import url from 'url';
import Hashi from '../src/mainClient';
import { events } from '../src/hashiBase';

describe('Hashi integration', () => {
  let app, script;
  const port = 6543;
  const hashiHtml = `
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="google" content="notranslate">
        <script src="http://127.0.0.1:${port}/hashiframe.js" %}"></script>
    </head>
    <body>
    </body>
</html>
`;
  const html5AppHtml = `
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="google" content="notranslate">
        <script>window.localStorage.setItem('test', 'test');</script>
    </head>
    <body>
    </body>
</html>`;
  function runServer() {
    app = http
      .createServer((message, response) => {
        const uri = url.parse(message.url).pathname;
        //header to allow CORS request
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Request-Method', '*');
        response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        response.setHeader('Access-Control-Allow-Headers', '*');
        const requestedWith = message.headers['X-Requested-With'];
        let output;
        let headers;
        if (uri === '/index.html') {
          if (requestedWith && requestedWith === 'XMLHttpRequest') {
            output = html5AppHtml;
          } else {
            output = hashiHtml;
          }
          headers = { 'Content-Type': 'text/html' };
        } else {
          output = script;
          headers = { 'Content-Type': 'text/javascript' };
        }
        response.writeHead(200, headers);
        response.end(output);
      })
      .listen(port, () => {});
  }
  beforeAll(() => {
    script = global.hashiIframeClient;
  });
  beforeEach(() => {
    runServer();
  });
  afterEach(() => {
    app.close();
    app = undefined;
  });
  it('should not be ready if the iframe has not loaded', () => {
    const iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-scripts';
    document.body.appendChild(iframe);
    const hashi = new Hashi({ iframe });
    expect(hashi.ready).toBe(false);
  });
  it('should be ready if the ready event has been triggered', () => {
    const iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-scripts';
    document.body.appendChild(iframe);
    const hashi = new Hashi({ iframe });
    let resolveFn;
    const promise = new Promise(resolve => {
      resolveFn = resolve;
    });
    hashi.on(events.READY, () => {
      resolveFn();
    });
    iframe.src = `http://127.0.0.1:${port}/index.html`;
    return promise.then(() => {
      expect(hashi.ready).toBe(true);
    });
  });
});
