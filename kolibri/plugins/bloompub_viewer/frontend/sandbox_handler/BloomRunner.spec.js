import { Buffer } from 'node:buffer';
import { TextEncoder, TextDecoder } from 'node:util';

import xhrMock from 'xhr-mock';
import { zipSync, strToU8 } from 'fflate';
import playerManifest from '../../bloom_build/bloom_build.json';
import BloomRunner from './BloomRunner';

// jsdom provides neither TextEncoder, TextDecoder nor URL.createObjectURL
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const blobs = new Map();
let nextBlobId = 0;
global.URL.createObjectURL = blob => {
  const url = `blob:test-${nextBlobId++}`;
  blobs.set(url, blob);
  return url;
};
global.URL.revokeObjectURL = url => blobs.delete(url);

function readBlob(url, read = 'readAsText') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader[read](blobs.get(url));
  });
}

async function readBlobBytes(url) {
  return Buffer.from(await readBlob(url, 'readAsArrayBuffer'));
}

async function expectNoBlobsContaining(...markers) {
  const blobContents = (await Promise.all(Array.from(blobs.keys(), url => readBlob(url)))).join(
    '\n',
  );
  for (const marker of markers) {
    expect(blobContents).not.toContain(marker);
  }
}

async function playerDocument(iframe) {
  const html = await readBlob(new URL(iframe.src).searchParams.get('url'));
  const book = new DOMParser().parseFromString(html, 'text/html');
  return {
    head: document.importNode(book.head, true),
    body: document.importNode(book.body, true),
  };
}

const BOOK_PATH = '/content/storage/abc.bloompub';

const HTM_NAME = 'book.htm';

function packBook(files, options) {
  return zipSync(
    Object.fromEntries(Object.entries(files).map(([name, content]) => [name, strToU8(content)])),
    options,
  );
}

function serveBook(files, bookPath = BOOK_PATH) {
  serveBookBytes(packBook(files), bookPath);
}

function serveBookBytes(zipData, bookPath = BOOK_PATH) {
  xhrMock.get(bookPath, (req, res) =>
    res
      .status(200)
      .header('Content-Type', 'application/zip')
      .header('Content-Length', zipData.length.toString())
      .body(zipData.buffer),
  );
}

function serveRangeBackedActivity(src, activityFiles) {
  const files = {
    [HTM_NAME]: bookHtm(`<div data-activity="iframe"><iframe src="${src}"></iframe></div>`),
    'meta.json': '{}',
    'padding.mp4': fileOfSize(3 * 1024 * 1024),
    ...activityFiles,
    'trailing.mp4': fileOfSize(3 * 1024 * 1024),
  };
  const zipData = packBook(files, { level: 0 });
  const zipBytes = Buffer.from(zipData.buffer, zipData.byteOffset, zipData.byteLength);
  const activityRanges = Object.values(activityFiles).map(content => {
    const offset = zipBytes.indexOf(content);
    expect(offset).toBeGreaterThanOrEqual(0);
    return [offset, offset + Buffer.byteLength(content)];
  });
  const rangeDownload = jest.fn();
  const fullDownload = jest.fn();
  const send = XMLHttpRequest.prototype.send;
  jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function (...args) {
    let aborted = false;
    this.addEventListener('abort', () => {
      aborted = true;
    });
    this.addEventListener('load', () => {
      if (!aborted && this.status === 200) {
        fullDownload();
      }
    });
    return send.apply(this, args);
  });
  xhrMock.get(BOOK_PATH, (req, res) => {
    const range = req.header('Range');
    if (!range) {
      return res.status(200).header('Content-Length', String(zipData.length)).body(zipData.buffer);
    }
    const [start, end] = range.slice('bytes='.length).split('-').map(Number);
    rangeDownload(start, end + 1);
    const body = zipData.slice(start, end + 1);
    return res
      .status(206)
      .header('Content-Range', `bytes ${start}-${end}/${zipData.length}`)
      .header('Content-Length', String(body.length))
      .body(body.buffer);
  });
  return { rangeDownload, fullDownload, activityRanges };
}

function bookHtm(body) {
  return `<!DOCTYPE html><html><head></head><body>${body}</body></html>`;
}

async function loadBook(body, files, htmName = HTM_NAME, bookPath = BOOK_PATH) {
  serveBook({ [htmName]: bookHtm(body), 'meta.json': '{}', ...files }, bookPath);
  const runner = new BloomRunner();
  const iframe = document.createElement('iframe');
  await runner.init(iframe, bookPath);
  return (await playerDocument(iframe)).body;
}

function fileOfSize(size) {
  return 'x'.repeat(size);
}

describe('BloomRunner', () => {
  beforeEach(() => {
    xhrMock.setup();
  });

  afterEach(() => {
    blobs.clear();
    jest.restoreAllMocks();
    xhrMock.teardown();
  });

  describe('init', () => {
    const META_JSON = '{"title":"A book"}';
    const BOOK_TEXT = 'Book content';

    beforeEach(() => {
      serveBook({ [HTM_NAME]: bookHtm(`<p>${BOOK_TEXT}</p>`), 'meta.json': META_JSON });
    });

    it('starts the player on the book, whatever the frame is showing', async () => {
      // The player replaces the frame's document, so there is nothing to wait for.
      const runner = new BloomRunner();
      const iframe = document.createElement('iframe');

      await runner.init(iframe, BOOK_PATH);

      const [path, query] = iframe.getAttribute('src').split('?');
      const params = new URLSearchParams(query);
      expect(path).toBe(`../bloom/${playerManifest.filename}`);
      expect((await playerDocument(iframe)).body.querySelector('p')).toHaveTextContent(BOOK_TEXT);
      expect(await readBlob(params.get('metaJsonUrl'))).toBe(META_JSON);
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
    it.each([
      ['defaultLangStyles.css', './defaultLangStyles.css'],
      ['./defaultLangStyles.css', 'defaultLangStyles.css'],
    ])(
      'retains the book href for the last stylesheet alias when %s comes first',
      async (firstHref, lastHref) => {
        const links = [firstHref, lastHref, 'missing.css']
          .map(href => `<link rel="stylesheet" type="text/css" href="${href}">`)
          .join('');
        const stylesheet = 'body { margin: 0; }';
        serveBook({
          [HTM_NAME]: `<!DOCTYPE html><html><head>${links}</head><body></body></html>`,
          'meta.json': '{}',
          'defaultLangStyles.css': stylesheet,
        });
        const iframe = document.createElement('iframe');
        await new BloomRunner().init(iframe, BOOK_PATH);
        const [first, replaced, missing] = (await playerDocument(iframe)).head.querySelectorAll(
          'link',
        );

        expect(first).toHaveAttribute('href', firstHref);
        expect(first).not.toHaveAttribute('data-original-href');
        expect(await readBlob(replaced.getAttribute('href'))).toBe(stylesheet);
        expect(replaced).toHaveAttribute('data-original-href', lastHref);
        expect(missing).toHaveAttribute('href', 'missing.css');
        expect(missing).not.toHaveAttribute('data-original-href');
      },
    );
  });

  it('falls back to the first .htm file when root index.htm is absent', async () => {
    serveBook({
      'preface.html': bookHtm('<p>Preface</p>'),
      'pages/book.htm': bookHtm('<p>Book</p>'),
      'helper.htm': bookHtm('<iframe src="pages/book.htm"></iframe><p>Helper</p>'),
      'meta.json': '{}',
    });
    const iframe = document.createElement('iframe');
    await new BloomRunner().init(iframe, BOOK_PATH);
    expect((await playerDocument(iframe)).body.querySelector('p')).toHaveTextContent('Book');
  });

  it('rejects an archive without an .htm book', async () => {
    serveBook({ undefined: 'Not a book', 'meta.json': '{}' });
    const iframe = document.createElement('iframe');
    await expect(new BloomRunner().init(iframe, BOOK_PATH)).rejects.toThrow();
  });

  it.each([
    ['#fallback', '#fallback'],
    ['book.htm', ''],
  ])('rewrites a self reference %s to the book in zipcontent', async (src, hash) => {
    const dom = await loadBook(`<iframe src="${src}"></iframe>`, {});
    expect(dom.querySelector('iframe')).toHaveAttribute(
      'src',
      new URL(`../../zipcontent/abc.bloompub/book.htm${hash}`, window.location).href,
    );
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

  it('loads encoded and decoded references to the same video', async () => {
    const dom = await loadBook(
      '<video src="clip%20one.mp4"></video><video src="clip one.mp4"></video>',
      {
        'clip one.mp4': 'clip one',
      },
    );
    const videos = dom.querySelectorAll('video');
    expect(videos).toHaveLength(2);
    for (const video of videos) {
      expect(await readBlob(video.getAttribute('src'))).toBe('clip one');
    }
  });

  it.each([
    ['%2Fclip.mp4', 'clip.mp4'],
    ['nested%2F..%2Fclip.mp4', 'pages/clip.mp4'],
    ['media/clip%252F1.mp4', 'pages/media/clip/1.mp4'],
  ])('resolves book video %s to %s as on develop', async (src, member) => {
    const dom = await loadBook(
      `<video src="${src}"></video>`,
      { [member]: 'clip' },
      'pages/book.htm',
    );
    expect(await readBlob(dom.querySelector('video').getAttribute('src'))).toBe('clip');
  });

  it.each([
    ['img', 'src', 'https://example.org/logo.png', 'logo.png'],
    ['img', 'src', '//example.org/logo.png', 'logo.png'],
    ['link', 'href', 'https://example.org/book.css', 'book.css'],
  ])(
    'keeps %s %s %s when the book also references /%s',
    async (tag, attribute, external, member) => {
      const dom = await loadBook(
        `<${tag} ${attribute}="${external}"><${tag} ${attribute}="/${member}">`,
        { [member]: 'book asset' },
      );
      const [remoteAsset, localAsset] = dom.querySelectorAll(tag);
      expect(remoteAsset).toHaveAttribute(attribute, external);
      expect(await readBlob(localAsset.getAttribute(attribute))).toBe('book asset');
    },
  );

  it('loads the last image alias when it uses HTTP shorthand', async () => {
    const logo = 'book logo';
    const dom = await loadBook('<img src="/logo.png"><img src="http:logo.png">', {
      'logo.png': logo,
    });
    const [rootRelative, shorthand] = dom.querySelectorAll('img');
    expect(rootRelative).toHaveAttribute('src', '/logo.png');
    expect(await readBlob(shorthand.getAttribute('src'))).toBe(logo);
  });

  describe('iframe references in the book', () => {
    it('uses the deployment prefix in an activity URL', async () => {
      const originalUrl = window.location.href;
      window.history.replaceState(null, '', '/prefix_test/static/sandbox/sandbox-qa.html');
      try {
        const dom = await loadBook('<iframe src="activities/index.html"></iframe>', {
          'activities/index.html': bookHtm('Activity'),
        });
        expect(dom.querySelector('iframe')).toHaveAttribute(
          'src',
          `${window.location.origin}/prefix_test/zipcontent/abc.bloompub/activities/index.html`,
        );
      } finally {
        window.history.replaceState(null, '', originalUrl);
      }
    });

    it('preserves a nonbreaking space at the start of an activity filename', async () => {
      const dom = await loadBook('<iframe src=" &nbsp;activity.html "></iframe>', {
        '\u00a0activity.html': bookHtm('Activity'),
      });
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        new URL('../../zipcontent/abc.bloompub/%C2%A0activity.html', window.location).href,
      );
    });

    it.each(['html', 'htm'])(
      'loads an encoded .%s activity from zipcontent without creating activity blobs',
      async extension => {
        const src = `activities/Los%20colores/index.${extension}`;
        const activityText = 'Activity content';
        const script = 'startActivity();';
        const activityFiles = {
          [`activities/Los colores/index.${extension}`]: `<p>${activityText}</p><script src="player.js"></script>`,
          'activities/Los colores/player.js': script,
        };
        const { rangeDownload, fullDownload, activityRanges } = serveRangeBackedActivity(
          src,
          activityFiles,
        );
        const iframe = document.createElement('iframe');
        await new BloomRunner().init(iframe, BOOK_PATH);

        expect((await playerDocument(iframe)).body.querySelector('iframe')).toHaveAttribute(
          'src',
          new URL(`../../zipcontent/abc.bloompub/${src}`, window.location).href,
        );
        expect(rangeDownload).toHaveBeenCalled();
        expect(fullDownload).not.toHaveBeenCalled();
        const readsActivity = rangeDownload.mock.calls.some(([start, end]) =>
          activityRanges.some(
            ([activityStart, activityEnd]) => start < activityEnd && end > activityStart,
          ),
        );
        expect(readsActivity).toBe(false);
        await expectNoBlobsContaining(activityText, script);
      },
    );

    it('does not create activity blobs when the book is downloaded in full', async () => {
      const src = 'activities/index.html';
      const script = 'startActivity();';
      const activityText = 'Activity content';
      const dom = await loadBook(`<iframe src="${src}"></iframe>`, {
        [src]: `<p>${activityText}</p><script src="player.js"></script>`,
        'activities/player.js': script,
      });

      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        new URL(`../../zipcontent/abc.bloompub/${src}`, window.location).href,
      );
      await expectNoBlobsContaining(activityText, script);
    });

    it('points every activity iframe at its own zipcontent URL', async () => {
      const dom = await loadBook(
        '<iframe src="one.html"></iframe><iframe src="two.html"></iframe>',
        {
          'one.html': bookHtm('First activity'),
          'two.html': bookHtm('Second activity'),
        },
      );
      const zipcontentUrl = new URL('../../zipcontent/abc.bloompub', window.location).href;
      expect(
        Array.from(dom.querySelectorAll('iframe'), frame => frame.getAttribute('src')),
      ).toEqual([`${zipcontentUrl}/one.html`, `${zipcontentUrl}/two.html`]);
    });

    it.each([
      'activities/Los%20colores/index.html',
      'activities%2FLos%20colores%2findex.html',
      'activities%5Cindex.html',
      'activities//index.html',
    ])('resolves a root-relative URL without decoding %s', async path => {
      const dom = await loadBook(
        `<iframe src="/${path}?mode=1%2F2#slide"></iframe>`,
        {},
        'pages/book.htm',
      );
      const zipcontentUrl = new URL('../../zipcontent/abc.bloompub', window.location).href;
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        `${zipcontentUrl}/${path}?mode=1%2F2#slide`,
      );
    });

    it('points an activity with a literal percent in its filename to zipcontent', async () => {
      const dom = await loadBook('<iframe src="activities/100%.html"></iframe>', {
        'activities/100%.html': bookHtm('Activity'),
      });
      const zipcontentUrl = new URL('../../zipcontent/abc.bloompub', window.location).href;
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        `${zipcontentUrl}/activities/100%.html`,
      );
    });

    it('selects the canonical book when an activity precedes it in the archive', async () => {
      serveBook({
        'activities/index.htm': bookHtm('<p>Activity</p>'),
        'index.htm': bookHtm('<p>Book</p><iframe src="activities/index.htm"></iframe>'),
        'meta.json': '{}',
      });
      const runner = new BloomRunner();
      const iframe = document.createElement('iframe');
      await runner.init(iframe, BOOK_PATH);
      const { body } = await playerDocument(iframe);
      expect(body.querySelector('p')).toHaveTextContent('Book');
      expect(body.querySelector('iframe')).toHaveAttribute(
        'src',
        new URL('../../zipcontent/abc.bloompub/activities/index.htm', window.location).href,
      );
    });

    it.each(['appendix.html', 'appendix.htm'])('keeps iframe content in %s offline', async name => {
      const panel = 'Offline panel';
      const dom = await loadBook(`<object data="${name}" type="text/html"></object>`, {
        [name]: bookHtm('<iframe src="https://example.invalid/panel.html"></iframe>'),
        'panel.html': bookHtm(`<p>${panel}</p>`),
      });
      const attachment = new DOMParser().parseFromString(
        await readBlob(dom.querySelector('object').getAttribute('data')),
        'text/html',
      );
      const src = attachment.querySelector('iframe').getAttribute('src');
      expect(blobs.has(src)).toBe(true);
      expect(await readBlob(src)).toContain(panel);
    });

    it('encodes reserved characters in the book directory', async () => {
      const dom = await loadBook('<iframe src="activity.html"></iframe>', {}, 'pages#1/book.htm');
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        new URL('../../zipcontent/abc.bloompub/pages%231/activity.html', window.location).href,
      );
    });

    it('preserves the peer for activities and large narration', async () => {
      const peer = encodeURIComponent('http://peer:8080');
      const dom = await loadBook(
        '<iframe src="activity.html"></iframe><span id="s1" class="audio-sentence">Hi</span>',
        { 'activity.html': bookHtm('Activity'), 'audio/s1.mp3': fileOfSize(600 * 1024) },
        HTM_NAME,
        `${BOOK_PATH}?baseurl=${peer}`,
      );
      const zipcontentUrl = new URL(`../../zipcontent/${peer}/abc.bloompub`, window.location).href;
      expect(dom.querySelector('iframe')).toHaveAttribute('src', `${zipcontentUrl}/activity.html`);
      expect(dom.querySelector('.audio-sentence')).toHaveAttribute(
        'data-audio-src',
        `${zipcontentUrl}/audio/s1.mp3`,
      );
    });

    it.each([
      ['a', 'href'],
      ['object', 'data'],
    ])('keeps shared %s dependencies', async (tag, attribute) => {
      const dom = await loadBook(
        `<iframe src="image.png"></iframe><${tag} ${attribute}="image.png"></${tag}>`,
        { 'image.png': fileOfSize(19) },
      );
      expect(await readBlob(dom.querySelector(tag).getAttribute(attribute))).toBe(fileOfSize(19));
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        new URL('../../zipcontent/abc.bloompub/image.png', window.location).href,
      );
    });

    it('preserves an invalid iframe source without breaking book loading', async () => {
      const dom = await loadBook('<iframe src="http://["></iframe><p>Book</p>', {});
      expect(dom.querySelector('iframe')).toHaveAttribute('src', 'http://[');
      expect(dom.querySelector('p')).toHaveTextContent('Book');
    });

    it.each([
      ['', ''],
      [' &#9; ', ' \t '],
    ])('preserves blank iframe sources (%j)', async (markup, src) => {
      const dom = await loadBook(`<iframe src="${markup}"></iframe>`, {});
      expect(dom.querySelector('iframe')).toHaveAttribute('src', src);
    });

    it.each([
      ['https://example.org/a.html', 'https://example.org/a.html'],
      [
        `${window.location.protocol}//archive.invalid/a.html`,
        `${window.location.protocol}//archive.invalid/a.html`,
      ],
      [
        `${window.location.protocol}//example.org/a.html`,
        `${window.location.protocol}//example.org/a.html`,
      ],
      ['//example.org/a.html', `${window.location.protocol}//example.org/a.html`],
    ])('preserves external iframe URL %s', async (src, expected) => {
      const dom = await loadBook(`<iframe src="${src}"></iframe>`, {
        'a.html': bookHtm('Local activity'),
      });
      expect(dom.querySelector('iframe')).toHaveAttribute('src', expected);
      await expectNoBlobsContaining('Local activity');
    });

    it('resolves same-scheme relative iframe URLs against the book location', async () => {
      const dom = await loadBook(
        `<iframe src="${window.location.protocol}activity.html?lang=es"></iframe>`,
        { 'pages/activity.html': bookHtm('Activity') },
        'pages/book.htm',
      );
      const zipcontentUrl = new URL('../../zipcontent/abc.bloompub', window.location).href;
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        `${zipcontentUrl}/pages/activity.html?lang=es`,
      );
    });

    it.each([
      ['activities:demo/index.html', 'activities:demo/index.html'],
      [' activities/index.html', '%20activities/index.html'],
    ])('resolves a same-scheme reference with path %s', async (path, expected) => {
      const dom = await loadBook(`<iframe src="${window.location.protocol}${path}"></iframe>`, {});
      const zipcontentUrl = new URL('../../zipcontent/abc.bloompub', window.location).href;
      expect(dom.querySelector('iframe')).toHaveAttribute('src', `${zipcontentUrl}/${expected}`);
    });

    it('treats an opposite-scheme shorthand iframe URL as external', async () => {
      const protocol = window.location.protocol === 'http:' ? 'https:' : 'http:';
      const dom = await loadBook(`<iframe src="${protocol}example.org/a.html"></iframe>`, {});
      expect(dom.querySelector('iframe')).toHaveAttribute('src', `${protocol}//example.org/a.html`);
    });

    it('resolves parent paths and query strings against the book location', async () => {
      const dom = await loadBook(
        '<iframe src="../activity.html?lang=es"></iframe>',
        { 'pages/activity.html': bookHtm('Activity') },
        'pages/chapter/book.htm',
      );
      const zipcontentUrl = new URL('../../zipcontent/abc.bloompub', window.location).href;
      expect(dom.querySelector('iframe')).toHaveAttribute(
        'src',
        `${zipcontentUrl}/pages/activity.html?lang=es`,
      );
    });
  });

  describe('audio references in the book', () => {
    const recording = 'Narración';

    it('keeps narration ids and points data-audio-src at the extracted recording', async () => {
      const dom = await loadBook('<span id="s1" class="audio-sentence">Hi</span>', {
        'audio/s1.mp3': recording,
      });

      const sentence = dom.querySelector('.audio-sentence');
      expect(sentence).toHaveAttribute('id', 's1');
      expect(await readBlobBytes(sentence.getAttribute('data-audio-src'))).toEqual(
        Buffer.from(recording),
      );
    });

    it('resolves the recording data-audio-src names', async () => {
      const dom = await loadBook(
        '<span id="s1" class="audio-sentence" data-audio-src="s1.opus">Hi</span>',
        { 'audio/s1.opus': recording, 'audio/s1.mp3': 'Wrong file' },
      );

      expect(
        await readBlobBytes(dom.querySelector('.audio-sentence').getAttribute('data-audio-src')),
      ).toEqual(Buffer.from(recording));
    });

    it.each(['data-backgroundaudio', 'data-sound', 'data-correct-sound', 'data-wrong-sound'])(
      'points %s at the extracted file',
      async attribute => {
        const dom = await loadBook(`<div class="bloom-page" ${attribute}="tune.mp3"></div>`, {
          'audio/tune.mp3': recording,
        });

        expect(
          await readBlobBytes(dom.querySelector('.bloom-page').getAttribute(attribute)),
        ).toEqual(Buffer.from(recording));
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
