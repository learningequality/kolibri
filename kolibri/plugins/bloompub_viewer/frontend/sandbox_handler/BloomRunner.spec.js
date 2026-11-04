import { TextEncoder, TextDecoder } from 'node:util';

import xhrMock from 'xhr-mock';
import { zipSync, strToU8 } from 'fflate';
import playerManifest from '../../bloom_build/bloom_build.json';
import BloomRunner from './BloomRunner';

// jsdom provides neither TextEncoder, TextDecoder nor URL.createObjectURL
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

global.URL.createObjectURL = blob => blobUrlOfSize(blob.size);
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
  url.search = url.searchParams.toString();
  xhrMock.get(url.pathname + url.search, (req, res) =>
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

async function loadBook(body, audioFiles, storageUrl = BOOK_PATH) {
  serveBook({ [HTM_NAME]: bookHtm(body), 'meta.json': '{}', ...audioFiles }, storageUrl);
  const runner = new BloomRunner();
  await runner.init(document.createElement('iframe'), storageUrl);
  const htm = await runner.zip.file(HTM_NAME);
  document.body.innerHTML = new DOMParser().parseFromString(
    htm.toString(),
    'text/html',
  ).body.innerHTML;
  return document.body;
}

function blobUrlOfSize(size) {
  return `blob:size-${size}`;
}

function fileOfSize(size) {
  return 'x'.repeat(size);
}

describe('BloomRunner', () => {
  beforeEach(() => {
    xhrMock.setup();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    xhrMock.teardown();
  });

  describe('large media', () => {
    const previousUrl = window.location.href;

    afterEach(() => {
      window.history.replaceState({}, '', previousUrl);
    });

    it.each([
      [
        BOOK_PATH,
        '/content/static/sandbox/sandbox.html',
        'http://kolibri.time/content/zipcontent/abc.bloompub',
      ],
      [
        `/school${BOOK_PATH}?baseurl=&baseurl=http://192.168.1.2:8080/`,
        '/school/content/static/sandbox/sandbox.html',
        'http://kolibri.time/school/content/zipcontent/http%3A%2F%2F192.168.1.2%3A8080%2F/abc.bloompub',
      ],
    ])(
      'points video, narration and background audio for %s at zipcontent',
      async (storageUrl, sandboxPath, zipcontentUrl) => {
        window.history.pushState({}, '', sandboxPath);
        const dom = await loadBook(
          '<div class="bloom-page" data-backgroundaudio="tune.mp3">' +
            '<span id="s1" class="audio-sentence">Hi</span>' +
            '<video src="video/my%20clip.mp4"></video>' +
            '<video><source src="video/my%20clip.mp4"></video></div>',
          {
            'video/my clip.mp4': fileOfSize(600 * 1024),
            'audio/s1.mp3': fileOfSize(600 * 1024),
            'audio/tune.mp3': fileOfSize(600 * 1024),
          },
          storageUrl,
        );

        const videoUrl = `${zipcontentUrl}/video/my%20clip.mp4`;
        const sentence = dom.querySelector('.audio-sentence');
        expect(dom.querySelector('video[src]')).toHaveAttribute('src', videoUrl);
        expect(dom.querySelector('source')).toHaveAttribute('src', videoUrl);
        expect(sentence).toHaveAttribute('id', 's1');
        expect(sentence).toHaveAttribute('data-audio-src', `${zipcontentUrl}/audio/s1.mp3`);
        expect(dom.querySelector('.bloom-page')).toHaveAttribute(
          'data-backgroundaudio',
          `${zipcontentUrl}/audio/tune.mp3`,
        );
      },
    );
  });

  describe('init', () => {
    const META_JSON = '{"title":"A book"}';

    beforeEach(() => {
      serveBook({ [HTM_NAME]: bookHtm(''), 'meta.json': META_JSON });
    });

    it('starts the player on the book, whatever the frame is showing', async () => {
      const runner = new BloomRunner();
      const iframe = document.createElement('iframe');

      await runner.init(iframe, BOOK_PATH);

      const htm = await runner.zip.file(HTM_NAME);
      const [path, query] = iframe.getAttribute('src').split('?');
      const params = new URLSearchParams(query);
      expect(path).toBe(`../bloom/${playerManifest.filename}`);
      expect(params.get('url')).toBe(blobUrlOfSize(htm.toString().length));
      expect(params.get('metaJsonUrl')).toBe(blobUrlOfSize(META_JSON.length));
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

  describe('audio references in the book', () => {
    it('keeps narration ids and points data-audio-src at the extracted recording', async () => {
      const dom = await loadBook('<span id="s1" class="audio-sentence">Hi</span>', {
        'audio/s1.mp3': fileOfSize(11),
      });

      const sentence = dom.querySelector('.audio-sentence');
      expect(sentence).toHaveAttribute('id', 's1');
      expect(sentence).toHaveAttribute('data-audio-src', blobUrlOfSize(11));
    });

    it('resolves the recording data-audio-src names', async () => {
      const dom = await loadBook(
        '<span id="s1" class="audio-sentence" data-audio-src="s1.opus">Hi</span>',
        { 'audio/s1.opus': fileOfSize(13), 'audio/s1.mp3': fileOfSize(11) },
      );

      expect(dom.querySelector('.audio-sentence')).toHaveAttribute(
        'data-audio-src',
        blobUrlOfSize(13),
      );
    });

    it.each(['data-backgroundaudio', 'data-sound', 'data-correct-sound', 'data-wrong-sound'])(
      'points %s at the extracted file',
      async attribute => {
        const dom = await loadBook(`<div class="bloom-page" ${attribute}="tune.mp3"></div>`, {
          'audio/tune.mp3': fileOfSize(11),
        });

        expect(dom.querySelector('.bloom-page')).toHaveAttribute(attribute, blobUrlOfSize(11));
      },
    );

    it('leaves the attributes alone when the audio file is missing', async () => {
      const dom = await loadBook(
        '<div class="bloom-page" data-backgroundaudio="tune.mp3">' +
          '<span id="s1" class="audio-sentence" data-audio-src="s1.opus">Hi</span></div>',
        {},
      );

      expect(dom.querySelector('.audio-sentence')).toHaveAttribute('data-audio-src', 's1.opus');
      expect(dom.querySelector('.bloom-page')).toHaveAttribute('data-backgroundaudio', 'tune.mp3');
    });

    it('adds no data-audio-src when the narration file is missing', async () => {
      const dom = await loadBook('<span id="s1" class="audio-sentence">Hi</span>', {});

      expect(dom.querySelector('.audio-sentence')).not.toHaveAttribute('data-audio-src');
    });
  });
});
