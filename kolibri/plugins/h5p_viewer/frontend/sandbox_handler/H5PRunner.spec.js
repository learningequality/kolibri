import { TextEncoder, TextDecoder } from 'node:util';

import xhrMock from 'xhr-mock';
import { zipSync, strToU8 } from 'fflate';
import H5PShim from './H5PShim';
import H5PRunner from './H5PRunner';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.URL.createObjectURL = blob => `blob:size-${blob.size}`;

const STORAGE_URL = '/content/storage/abc.h5p';
const PEER_URL = STORAGE_URL + '?baseurl=http://192.168.1.2:8080/school/';
const archive = zipSync({
  'h5p.json': strToU8(
    JSON.stringify({
      mainLibrary: 'H5P.Foo',
      preloadedDependencies: [{ machineName: 'H5P.Foo', majorVersion: 1, minorVersion: 0 }],
    }),
  ),
  'H5P.Foo-1.0/library.json': strToU8('{}'),
  'content/content.json': strToU8('{}'),
  'content/my clip.mp4': new Uint8Array(600 * 1024),
  'content/my%20clip.mp4': new Uint8Array(600 * 1024),
});

function dispatchScriptEvent(hostDocument, type = 'load') {
  const observer = new MutationObserver(() => {
    const script = hostDocument.querySelector('script');
    if (script) {
      observer.disconnect();
      script.dispatchEvent(new Event(type));
    }
  });
  observer.observe(hostDocument, { childList: true, subtree: true });
}

describe('H5PRunner', () => {
  let iframe;
  let runner;
  let loadTimer;

  beforeEach(() => {
    xhrMock.setup();
    jest.spyOn(console, 'debug').mockImplementation();
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    runner = new H5PRunner({ stateUpdated: jest.fn() });
  });

  afterEach(() => {
    clearInterval(loadTimer);
    xhrMock.teardown();
    iframe.remove();
    jest.restoreAllMocks();
  });

  function serveArchive(storageUrl) {
    const url = new URL(storageUrl, window.location);
    url.search = url.searchParams.toString();
    xhrMock.get(url.pathname + url.search, (req, res) =>
      res.status(200).header('Content-Length', String(archive.length)).body(archive.buffer),
    );
  }

  function start() {
    return runner.init(iframe, STORAGE_URL);
  }

  function startWithFrameLoad() {
    const dispatchLoad = () => {
      iframe.dispatchEvent(new Event('load'));
      iframe.dispatchEvent(new Event('load'));
    };
    loadTimer = setInterval(dispatchLoad, 10);
    return start().finally(() => clearInterval(loadTimer));
  }

  describe('init', () => {
    beforeEach(() => serveArchive(STORAGE_URL));

    it('fails when the host page loads without H5P', async () => {
      const init = startWithFrameLoad();

      await expect(init).rejects.toThrow('H5P');
    });

    it('fails when the host page had already loaded without H5P', async () => {
      Object.defineProperty(iframe, 'contentDocument', {
        get: () => ({ readyState: 'complete', URL: 'http://localhost/h5p/h5p.html' }),
      });
      Object.defineProperty(iframe, 'contentWindow', { get: () => ({}) });

      await expect(start()).rejects.toThrow('H5P');
    });

    it('starts H5P once, however many times the host page loads', async () => {
      const H5P = {
        init: jest.fn(),
        instances: [],
        ContentType: jest.fn(),
        XAPIEvent: function () {},
        externalDispatcher: { on: jest.fn() },
      };
      const hostPage = { document: document.implementation.createHTMLDocument() };
      Object.defineProperty(iframe, 'contentWindow', { get: () => hostPage });
      Object.defineProperty(iframe, 'contentDocument', {
        get: () => {
          setTimeout(() => iframe.dispatchEvent(new Event('load')), 0);
          return { readyState: 'complete', URL: 'about:blank' };
        },
      });
      iframe.addEventListener('load', () => (hostPage.H5P = H5P), { once: true });
      dispatchScriptEvent(hostPage.document);
      await start();
      iframe.dispatchEvent(new Event('load'));

      expect(H5P.init).toHaveBeenCalledTimes(1);
    });

    it('fails when the integration script fails to load', async () => {
      const H5P = {
        init: jest.fn(),
        ContentType: jest.fn(),
        XAPIEvent: function () {},
        externalDispatcher: { on: jest.fn() },
      };
      const hostPage = { H5P, document: document.implementation.createHTMLDocument() };
      Object.defineProperty(iframe, 'contentWindow', { get: () => hostPage });
      dispatchScriptEvent(hostPage.document, 'error');
      const init = startWithFrameLoad();

      await expect(init).rejects.toThrow('Failed to load');
      expect(H5P.init).not.toHaveBeenCalled();
    });

    it('fails when H5P throws while starting', async () => {
      const failure = new Error('unsupported library');
      const H5P = {
        init: jest.fn(() => {
          throw failure;
        }),
        ContentType: jest.fn(),
        XAPIEvent: function () {},
        externalDispatcher: { on: jest.fn() },
      };
      const hostPage = { H5P, document: document.implementation.createHTMLDocument() };
      Object.defineProperty(iframe, 'contentWindow', { get: () => hostPage });
      dispatchScriptEvent(hostPage.document);
      const init = startWithFrameLoad();

      await expect(init).rejects.toBe(failure);
    });
  });

  describe.each([
    [STORAGE_URL, 'http://kolibri.time/content/zipcontent/abc.h5p'],
    [
      PEER_URL,
      'http://kolibri.time/content/zipcontent/http%3A%2F%2F192.168.1.2%3A8080%2Fschool%2F/abc.h5p',
    ],
  ])('archive paths for %s', (storageUrl, archiveRoot) => {
    let H5P;
    let previousUrl;

    beforeEach(async () => {
      serveArchive(storageUrl);
      previousUrl = window.location.href;
      window.history.pushState({}, '', '/content/static/sandbox/sandbox.html');
      H5P = {
        init: jest.fn(),
        instances: [],
        ContentType: () => function () {},
        XAPIEvent: function () {},
        externalDispatcher: { on: jest.fn() },
      };
      const hostPage = { H5P, document: document.implementation.createHTMLDocument() };
      Object.defineProperty(iframe, 'contentWindow', { get: () => hostPage });
      Object.defineProperty(iframe, 'contentDocument', {
        get: () => ({ readyState: 'complete', URL: 'http://localhost/h5p/h5p.html' }),
      });
      const shim = new H5PShim();
      runner = new H5PRunner(shim);
      shim.setRunner(runner);
      shim.initialize(hostPage);
      dispatchScriptEvent(hostPage.document);
      await runner.init(iframe, storageUrl);
    });

    afterEach(() => {
      window.history.replaceState({}, '', previousUrl);
    });

    it('serves large media from the archive', () => {
      expect(new URL(H5P.getPath('my clip.mp4')).href).toBe(archiveRoot + '/content/my%20clip.mp4');
    });

    it('serves large media whose name holds a percent escape from the archive', () => {
      expect(new URL(H5P.getPath('my%20clip.mp4')).href).toBe(
        archiveRoot + '/content/my%2520clip.mp4',
      );
    });

    it('serves the content directory from the archive', () => {
      expect(H5P.getContentPath()).toBe(archiveRoot + '/content');
    });

    it('falls back to the archive for library files', () => {
      const ContentType = H5P.ContentType(true);
      const instance = new ContentType();
      instance.libraryInfo = { versionedNameNoSpaces: 'H5P.Foo-1.0' };
      expect(instance.getLibraryFilePath('')).toBe(archiveRoot + '/H5P.Foo-1.0/');
    });

    it('sets the integration library root to the archive', () => {
      expect(iframe.contentWindow.H5PIntegration.urlLibraries).toBe(archiveRoot);
    });
  });
});
