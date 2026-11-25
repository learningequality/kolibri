import { TextEncoder, TextDecoder } from 'node:util';

import xhrMock from 'xhr-mock';
import { zipSync, strToU8 } from 'fflate';
import BloomRunner from './BloomRunner';

// jsdom provides neither TextEncoder, TextDecoder nor URL.createObjectURL
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const blobs = new Map();
global.URL.createObjectURL = blob => {
  const url = `blob:http://kolibri.time/book-${blobs.size}`;
  blobs.set(url, blob);
  return url;
};
global.URL.revokeObjectURL = () => {};

const BOOK_PATH = '/content/storage/abc.bloompub';

const HTM_NAME = 'book.htm';

function serveBook(files, storageUrl = BOOK_PATH) {
  const zipContents = {};
  for (const [name, content] of Object.entries(files)) {
    zipContents[name] = strToU8(content);
  }
  const zipData = zipSync(zipContents);
  const url = new URL(storageUrl, window.location);
  const query = url.searchParams.toString();
  const requestUrl = query ? url.pathname + '?' + query : url.pathname;
  xhrMock.get(requestUrl, (req, res) =>
    res
      .status(200)
      .header('Content-Type', 'application/zip')
      .header('Content-Length', zipData.length.toString())
      .body(zipData.buffer),
  );
}

function bookHtm(body) {
  return `<!DOCTYPE html><html><head></head><body>${body}</body></html>`;
}

describe('BloomRunner', () => {
  beforeEach(() => {
    xhrMock.setup();
  });

  afterEach(() => {
    xhrMock.teardown();
    blobs.clear();
  });

  describe('large media', () => {
    it.each([
      [
        BOOK_PATH,
        '/content/static/sandbox/sandbox.html',
        'http://kolibri.time/content/zipcontent/abc.bloompub/video/my%20clip.mp4',
      ],
      [
        `/school${BOOK_PATH}?baseurl=&baseurl=http://192.168.1.2:8080/`,
        '/school/content/static/sandbox/sandbox.html',
        'http://kolibri.time/school/content/zipcontent/http%3A%2F%2F192.168.1.2%3A8080%2F/abc.bloompub/video/my%20clip.mp4',
      ],
    ])('uses the archive URL for %s', async (storageUrl, sandboxPath, expectedUrl) => {
      const previousUrl = window.location.href;
      window.history.pushState({}, '', sandboxPath);
      try {
        serveBook(
          {
            [HTM_NAME]: bookHtm('<video src="video/my%20clip.mp4"></video>'),
            'meta.json': '{}',
            'video/my clip.mp4': 'x'.repeat(600 * 1024),
          },
          storageUrl,
        );
        const runner = new BloomRunner();
        const iframe = document.createElement('iframe');
        await runner.init(iframe, storageUrl);
        const playerUrl = new URL(iframe.src);
        expect(playerUrl.pathname).toBe(
          sandboxPath.replace('sandbox/sandbox.html', 'bloom/bloomplayer.htm'),
        );
        const bookUrl = playerUrl.searchParams.get('url');
        const html = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(blobs.get(bookUrl));
        });
        const book = new DOMParser().parseFromString(html, 'text/html');
        expect(Array.from(book.querySelectorAll('video'), video => video.src)).toEqual([
          expectedUrl,
        ]);
      } finally {
        window.history.replaceState({}, '', previousUrl);
      }
    });
  });

  describe('init', () => {
    beforeEach(() => {
      serveBook({ [HTM_NAME]: bookHtm(''), 'meta.json': '{}' });
    });

    it('rejects when starting the player throws', async () => {
      const failure = new Error('navigation blocked');
      const iframe = {
        set src(value) {
          throw failure;
        },
      };

      await expect(new BloomRunner().init(iframe, BOOK_PATH)).rejects.toBe(failure);
    });
  });

  describe('initBloom', () => {
    function runnerWithIframe(iframe) {
      const runner = new BloomRunner();
      runner.iframe = iframe;
      runner.contentUrl = 'blob:book.htm';
      runner.metaUrl = 'blob:meta.json';
      return runner;
    }

    it('points the player at the book', () => {
      const iframe = {};
      const runner = runnerWithIframe(iframe);

      runner.initBloom();

      const [path, query] = iframe.src.split('?');
      const params = new URLSearchParams(query);
      expect(path).toContain('bloomplayer.htm');
      expect(params.get('url')).toBe('blob:book.htm');
      expect(params.get('metaJsonUrl')).toBe('blob:meta.json');
    });
  });
});
