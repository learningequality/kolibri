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

function serveBook(files) {
  const zipContents = {};
  for (const [name, content] of Object.entries(files)) {
    zipContents[name] = strToU8(content);
  }
  const zipData = zipSync(zipContents);
  xhrMock.get(BOOK_PATH, (req, res) =>
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

async function loadBook(body, audioFiles) {
  serveBook({ [HTM_NAME]: bookHtm(body), 'meta.json': '{}', ...audioFiles });
  const runner = new BloomRunner();
  await runner.init(document.createElement('iframe'), BOOK_PATH);
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
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    xhrMock.teardown();
  });

  describe('init', () => {
    const META_JSON = '{"title":"A book"}';

    beforeEach(() => {
      serveBook({ [HTM_NAME]: bookHtm(''), 'meta.json': META_JSON });
    });

    it('starts the player on the book, whatever the frame is showing', async () => {
      // The player replaces the frame's document, so there is nothing to wait for.
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

  describe('stylesheet links in the book', () => {
    it('keeps the href the book gave each replaced link in data-original-href', async () => {
      serveBook({
        [HTM_NAME]:
          '<!DOCTYPE html><html><head>' +
          '<link rel="stylesheet" type="text/css" href="defaultLangStyles.css">' +
          '<link rel="stylesheet" type="text/css" href="missing.css">' +
          '</head><body></body></html>',
        'meta.json': '{}',
        'defaultLangStyles.css': fileOfSize(7),
      });
      const runner = new BloomRunner();
      await runner.init(document.createElement('iframe'), BOOK_PATH);
      const htm = await runner.zip.file(HTM_NAME);
      document.head.innerHTML = new DOMParser().parseFromString(
        htm.toString(),
        'text/html',
      ).head.innerHTML;
      const [replaced, missing] = document.head.querySelectorAll('link');

      expect(replaced).toHaveAttribute('href', blobUrlOfSize(7));
      expect(replaced).toHaveAttribute('data-original-href', 'defaultLangStyles.css');
      expect(missing).toHaveAttribute('href', 'missing.css');
      expect(missing).not.toHaveAttribute('data-original-href');
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

    it('points audio over the large media threshold at its zipcontent URL', async () => {
      const dom = await loadBook(
        '<div class="bloom-page" data-backgroundaudio="tune.mp3">' +
          '<span id="s1" class="audio-sentence">Hi</span></div>',
        { 'audio/s1.mp3': fileOfSize(600 * 1024), 'audio/tune.mp3': fileOfSize(600 * 1024) },
      );

      const zipcontentUrl = new URL('../../zipcontent/abc.bloompub', window.location).href;
      expect(dom.querySelector('.audio-sentence')).toHaveAttribute(
        'data-audio-src',
        `${zipcontentUrl}/audio/s1.mp3`,
      );
      expect(dom.querySelector('.bloom-page')).toHaveAttribute(
        'data-backgroundaudio',
        `${zipcontentUrl}/audio/tune.mp3`,
      );
    });

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
