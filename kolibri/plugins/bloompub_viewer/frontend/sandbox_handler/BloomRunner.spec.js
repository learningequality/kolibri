import { TextEncoder, TextDecoder } from 'node:util';

import xhrMock from 'xhr-mock';
import { zipSync, strToU8 } from 'fflate';
import playerManifest from '../../bloom_build/bloom_build.json';
import BloomRunner from './BloomRunner';

// jsdom provides neither TextEncoder, TextDecoder nor URL.createObjectURL
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const blobs = new Map();
global.URL.createObjectURL = blob => {
  const url = blobUrlOfSize(blob.size);
  blobs.set(url, blob);
  return url;
};

async function playerDocument(iframe) {
  const blob = blobs.get(new URL(iframe.src).searchParams.get('url'));
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(blob);
  });
}
global.URL.revokeObjectURL = () => {};

const BOOK_PATH = '/content/storage/abc.bloompub';

const HTM_NAME = 'book.htm';

function serveBook(files, bookPath = BOOK_PATH) {
  const zipContents = {};
  for (const [name, content] of Object.entries(files)) {
    zipContents[name] = strToU8(content);
  }
  const zipData = zipSync(zipContents);
  xhrMock.get(bookPath, (req, res) =>
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

async function loadBook(body, audioFiles, htmName = HTM_NAME, bookPath = BOOK_PATH) {
  serveBook({ [htmName]: bookHtm(body), 'meta.json': '{}', ...audioFiles }, bookPath);
  const runner = new BloomRunner();
  const iframe = document.createElement('iframe');
  await runner.init(iframe, bookPath);
  document.body.innerHTML = new DOMParser().parseFromString(
    await playerDocument(iframe),
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

  it.each([
    {
      'book.htm': bookHtm('BOOK<iframe src="activity/index.htm"></iframe>'),
      'activity/index.htm': bookHtm('<iframe src="../book.htm"></iframe>'),
    },
    {
      'book.htm': bookHtm('BOOK'),
      'helper.htm': bookHtm('<iframe src="book.htm"></iframe>'),
    },
    {
      'pages/book.htm': bookHtm('BOOK'),
      'helper.htm': bookHtm('HELPER'),
    },
  ])('preserves fallback archive order: %o', async files => {
    serveBook({ ...files, 'meta.json': '{}' });
    const iframe = document.createElement('iframe');
    await new BloomRunner().init(iframe, BOOK_PATH);
    expect(await playerDocument(iframe)).toContain('BOOK');
  });

  it.each(['../index.htm', '..%2Findex.htm'])(
    'selects the canonical root book even when referenced: %s',
    async src => {
      serveBook({
        'pages/book.htm': bookHtm(`<iframe src="${src}"></iframe>`),
        'index.htm': bookHtm('Activity'),
        'meta.json': '{}',
      });
      const runner = new BloomRunner();
      const iframe = document.createElement('iframe');
      await runner.init(iframe, BOOK_PATH);
      expect(await playerDocument(iframe)).toContain('Activity');
    },
  );

  it.each([
    { 'helper.htm': bookHtm('Helper') },
    { 'helper.htm': bookHtm('<iframe src="index.htm"></iframe>') },
    { 'activities/index.htm': bookHtm('<iframe src="../index.htm"></iframe>') },
  ])('selects the canonical root book before helpers: %o', async helpers => {
    serveBook({
      ...helpers,
      'index.htm': bookHtm('Canonical book<iframe src="activities/index.htm"></iframe>'),
      'meta.json': '{}',
    });
    const iframe = document.createElement('iframe');
    await new BloomRunner().init(iframe, BOOK_PATH);
    expect(await playerDocument(iframe)).toContain('Canonical book');
  });

  it.each([
    '<iframe src="#fallback"></iframe>',
    '<iframe src="book.htm"></iframe>',
    '<iframe src="#fallback" srcdoc="<p>Inline activity</p>"></iframe>',
  ])('loads a book with a self reference: %s', async markup => {
    const dom = await loadBook(markup, {});
    expect(dom.querySelector('iframe')).toBeInTheDocument();
  });

  it('clamps parent paths to the archive root', async () => {
    const dom = await loadBook('<iframe src="../activity.html?mode=1#slide"></iframe>', {
      'activity.html': bookHtm('Activity'),
    });
    expect(dom.querySelector('iframe')).toHaveAttribute(
      'src',
      new URL('../../zipcontent/abc.bloompub/activity.html?mode=1#slide', window.location).href,
    );
  });

  describe('iframe references in the book', () => {
    it('loads encoded activity paths from zipcontent without unpacking their dependencies', async () => {
      const dom = await loadBook(
        '<div data-activity="iframe"><iframe title="Activity" src="activities/Los%20colores/index.html"></iframe></div>',
        {
          'activities/Los colores/index.html': '<script src="100%.js"></script>',
          'activities/Los colores/100%.js': fileOfSize(37),
        },
      );
      const zipcontentUrl = new URL('../../zipcontent/abc.bloompub', window.location).href;
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        `${zipcontentUrl}/activities/Los%20colores/index.html`,
      );
    });

    it.each(['/activities/Los%20colores/index.html', 'activities%2FLos%20colores%2findex.html'])(
      'resolves archive paths from zipcontent: %s',
      async src => {
        const dom = await loadBook(`<iframe src="${src}?mode=1%2F2#slide"></iframe>`, {});
        const zipcontentUrl = new URL('../../zipcontent/abc.bloompub', window.location).href;
        expect(dom.querySelector('iframe')).toHaveAttribute(
          'src',
          `${zipcontentUrl}/activities/Los%20colores/index.html?mode=1%2F2#slide`,
        );
      },
    );

    it('does not unpack an activity with an htm extension', async () => {
      const dom = await loadBook('<iframe src="activities/index.htm"></iframe>', {
        'activities/index.htm': '<img src="100%.png">',
      });
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        new URL('../../zipcontent/abc.bloompub/activities/index.htm', window.location).href,
      );
    });

    it.each(['activities/100%.html', 'https://example.org/100%'])(
      'loads an iframe with an unescaped percent: %s',
      async src => {
        const dom = await loadBook(`<iframe src="${src}" srcdoc="<p>Inline</p>"></iframe>`, {});
        expect(dom.querySelector('iframe')).toHaveAttribute(
          'src',
          new URL(src, new URL('../../zipcontent/abc.bloompub/book.htm', window.location)).href,
        );
      },
    );

    it('selects the canonical book when an activity precedes it in the archive', async () => {
      serveBook({
        'activities/index.htm': '<img src="100%.png">',
        'index.htm': bookHtm('<p>Book</p>'),
        'meta.json': '{}',
      });
      const runner = new BloomRunner();
      const iframe = document.createElement('iframe');
      await runner.init(iframe, BOOK_PATH);
      expect(await playerDocument(iframe)).toContain('<p>Book</p>');
    });

    it('encodes reserved characters in the book directory', async () => {
      const dom = await loadBook('<iframe src="activity.html"></iframe>', {}, 'pages#1/book.htm');
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        new URL('../../zipcontent/abc.bloompub/pages%231/activity.html', window.location).href,
      );
    });

    it('preserves the peer when loading an activity', async () => {
      const peer = encodeURIComponent('http://peer:8080');
      const dom = await loadBook(
        '<iframe src="activity.html"></iframe>',
        {},
        HTM_NAME,
        `${BOOK_PATH}?baseurl=${peer}`,
      );
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        new URL(`../../zipcontent/${peer}/abc.bloompub/activity.html`, window.location).href,
      );
    });

    it.each(['img', 'a', 'object'])('keeps shared %s dependencies', async tag => {
      const attribute = { img: 'src', a: 'href', object: 'data' }[tag];
      const dom = await loadBook(
        `<iframe src="image.png"></iframe><${tag} ${attribute}="image.png"></${tag}>`,
        { 'image.png': fileOfSize(19) },
      );
      expect(dom.querySelector(tag)).toHaveAttribute(attribute, blobUrlOfSize(19));
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        new URL('../../zipcontent/abc.bloompub/image.png', window.location).href,
      );
    });

    it.each(['', ' srcdoc="<p>Inline</p>"'])('preserves invalid sources with%s', async extra => {
      const dom = await loadBook(`<iframe src="http://["${extra}></iframe><p>Book</p>`, {});
      expect(dom.querySelector('iframe')).toHaveAttribute('src', 'http://[');
      expect(dom.querySelector('p')).toHaveTextContent('Book');
    });

    it('keeps empty iframe sources blank', async () => {
      const dom = await loadBook('<iframe src=""></iframe>', {});
      expect(dom.querySelector('iframe')).toHaveAttribute('src', '');
    });

    it('preserves external iframe URLs', async () => {
      const dom = await loadBook('<iframe src="https://example.org/a.html"></iframe>', {});
      expect(dom.querySelector('iframe')).toHaveAttribute('src', 'https://example.org/a.html');
    });

    it('resolves parent paths and query strings against the book location', async () => {
      const dom = await loadBook(
        '<iframe src="../activity.html?lang=es"></iframe>',
        {},
        'pages/book.htm',
      );
      const zipcontentUrl = new URL('../../zipcontent/abc.bloompub', window.location).href;
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        `${zipcontentUrl}/activity.html?lang=es`,
      );
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
