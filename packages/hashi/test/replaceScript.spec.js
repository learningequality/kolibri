/**
 * @jest-environment jest-environment-jsdom-script
 */

import http from 'http';
import replaceScript, { runScriptTypes } from '../src/replaceScript';

function headScript(scriptTag) {
  return `<html><head>${scriptTag}</head></html>`;
}

function bodyScript(scriptTag) {
  return `<html><body>${scriptTag}</body></html>`;
}

function replaceTestScript(callback = () => {}) {
  replaceScript(document.getElementsByTagName('script')[0], callback);
}

const port = 9999;

describe('replaceScript function', () => {
  describe('inline JS', () => {
    it('should execute JS in a script tag in the head with no type', () => {
      window.shouldExecute = jest.fn();
      document.documentElement.innerHTML = headScript('<script>window.shouldExecute();</script>');
      expect(window.shouldExecute).not.toHaveBeenCalled();
      replaceTestScript();
      expect(window.shouldExecute).toHaveBeenCalled();
    });
    it('should execute JS in a script tag in the body with no type', () => {
      window.shouldExecute = jest.fn();
      document.documentElement.innerHTML = bodyScript('<script>window.shouldExecute();</script>');
      expect(window.shouldExecute).not.toHaveBeenCalled();
      replaceTestScript();
      expect(window.shouldExecute).toHaveBeenCalled();
    });
    runScriptTypes.forEach(type => {
      it(`should execute JS in a head script tag with type ${type}`, () => {
        window.shouldExecute = jest.fn();
        document.documentElement.innerHTML = headScript(
          `<script type="${type}">window.shouldExecute();</script>`
        );
        expect(window.shouldExecute).not.toHaveBeenCalled();
        replaceTestScript();
        expect(window.shouldExecute).toHaveBeenCalled();
      });
      it(`should execute JS in a body script tag with type ${type}`, () => {
        window.shouldExecute = jest.fn();
        document.documentElement.innerHTML = bodyScript(
          `<script type="${type}">window.shouldExecute();</script>`
        );
        expect(window.shouldExecute).not.toHaveBeenCalled();
        replaceTestScript();
        expect(window.shouldExecute).toHaveBeenCalled();
      });
    });
  });
  describe('JS from src', () => {
    let app, script;
    function runServer() {
      app = http
        .createServer((request, response) => {
          //header to allow CORS request
          response.setHeader('Access-Control-Allow-Origin', '*');
          response.setHeader('Access-Control-Request-Method', '*');
          response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
          response.setHeader('Access-Control-Allow-Headers', '*');
          response.writeHead(200, { 'Content-Type': 'text/javascript' });
          response.end(script);
        })
        .listen(port, () => {});
    }
    beforeEach(() => {
      runServer();
    });
    afterEach(() => {
      app.close();
      app = undefined;
    });
    it('should execute JS from a script tag src in the head with no type', () => {
      window.shouldExecute = jest.fn();
      script = 'window.shouldExecute()';
      document.documentElement.innerHTML = headScript(
        `<script src="http://127.0.0.1:${port}/test.js"></script>`
      );
      expect(window.shouldExecute).not.toHaveBeenCalled();
      return new Promise(resolve => {
        replaceTestScript(() => {
          expect(window.shouldExecute).toHaveBeenCalled();
          resolve();
        });
      });
    });
    it('should execute JS from a script tag src in the body with no type', () => {
      window.shouldExecute = jest.fn();
      script = 'window.shouldExecute()';
      document.documentElement.innerHTML = bodyScript(
        `<script src="http://127.0.0.1:${port}/test.js"></script>`
      );
      expect(window.shouldExecute).not.toHaveBeenCalled();
      return new Promise(resolve => {
        replaceTestScript(() => {
          expect(window.shouldExecute).toHaveBeenCalled();
          resolve();
        });
      });
    });
    runScriptTypes.forEach(type => {
      it(`should execute JS in a head script tag with type ${type}`, () => {
        window.shouldExecute = jest.fn();
        script = 'window.shouldExecute()';
        document.documentElement.innerHTML = headScript(
          `<script src="http://127.0.0.1:${port}/test.js" type="${type}"></script>`
        );
        expect(window.shouldExecute).not.toHaveBeenCalled();
        return new Promise(resolve => {
          replaceTestScript(() => {
            expect(window.shouldExecute).toHaveBeenCalled();
            resolve();
          });
        });
      });
      it(`should execute JS in a body script tag with type ${type}`, () => {
        window.shouldExecute = jest.fn();
        document.documentElement.innerHTML = bodyScript(
          `<script src="http://127.0.0.1:${port}/test.js" type="${type}"></script>`
        );
        expect(window.shouldExecute).not.toHaveBeenCalled();
        return new Promise(resolve => {
          replaceTestScript(() => {
            expect(window.shouldExecute).toHaveBeenCalled();
            resolve();
          });
        });
      });
    });
  });
});
