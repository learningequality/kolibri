import { TextDecoder, TextEncoder } from 'node:util';
import { EntryKinds, loadArticleIntoIframe } from '../articleLoader';

global.TextDecoder = global.TextDecoder || TextDecoder;
global.TextEncoder = global.TextEncoder || TextEncoder;
global.URL.createObjectURL = global.URL.createObjectURL || (() => 'blob:test/fake');
global.URL.revokeObjectURL = global.URL.revokeObjectURL || (() => {});

function makeMockReader({ article, entries = {} }) {
  return {
    getEntry: jest.fn(async path => {
      if (path === 'C/Index') return article;
      throw new Error('unexpected getEntry path: ' + path);
    }),
    getEntries: jest.fn(async paths => {
      const map = new Map();
      for (const p of paths) if (entries[p]) map.set(p, entries[p]);
      return map;
    }),
  };
}

describe('loadArticleIntoIframe', () => {
  it('writes the rewritten HTML into iframe.srcdoc', async () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const reader = makeMockReader({
      article: {
        mimetype: 'text/html',
        namespace: 'C',
        path: 'C/Index',
        data: new TextEncoder().encode('<html><body><img src="../I/a.png"/></body></html>'),
      },
      entries: {
        'I/a.png': {
          mimetype: 'image/png',
          namespace: 'I',
          data: new Uint8Array([1, 2, 3]),
        },
      },
    });

    const { basePath } = await loadArticleIntoIframe(reader, 'C/Index', iframe);

    expect(iframe.srcdoc).toContain('<img');
    expect(iframe.srcdoc).toContain('blob:test/fake');
    expect(iframe.srcdoc).not.toContain('../I/a.png');
    expect(basePath).toBe('C/Index');
  });

  it('returns every object URL it created so the caller can revoke them', async () => {
    const created = [];
    global.URL.createObjectURL = jest.fn(() => {
      const url = `blob:test/${created.length}`;
      created.push(url);
      return url;
    });
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const reader = makeMockReader({
      article: {
        mimetype: 'text/html',
        namespace: 'C',
        path: 'C/Index',
        data: new TextEncoder().encode(
          '<html><body><img src="../I/a.png"/><img src="../I/b.png"/></body></html>',
        ),
      },
      entries: {
        'I/a.png': { mimetype: 'image/png', namespace: 'I', data: new Uint8Array([1]) },
        'I/b.png': { mimetype: 'image/png', namespace: 'I', data: new Uint8Array([2]) },
      },
    });

    const { objectUrls } = await loadArticleIntoIframe(reader, 'C/Index', iframe);

    expect(objectUrls.slice().sort()).toEqual(created.slice().sort());
    expect(objectUrls).toHaveLength(2);
  });

  it('hands a non-HTML entry back as an object URL, leaving the article in the iframe', async () => {
    global.URL.createObjectURL = jest.fn(() => 'blob:test/svg');
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    iframe.srcdoc = '<p>previous article</p>';
    const reader = makeMockReader({
      article: {
        mimetype: 'image/svg+xml',
        namespace: 'C',
        path: 'C/Index',
        data: new Uint8Array([1, 2, 3]),
      },
    });

    const result = await loadArticleIntoIframe(reader, 'C/Index', iframe);

    expect(result).toEqual({
      kind: EntryKinds.FILE,
      basePath: 'C/Index',
      objectUrls: ['blob:test/svg'],
      file: { url: 'blob:test/svg', mimetype: 'image/svg+xml', name: 'Index' },
    });
    expect(iframe.srcdoc).toBe('<p>previous article</p>');
    expect(iframe).not.toHaveAttribute('src');
  });

  it('hands a natively renderable entry back instead of writing it into the iframe', async () => {
    global.URL.createObjectURL = jest.fn(() => 'blob:test/unexpected');
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const data = new Uint8Array([1, 2, 3]);
    const reader = makeMockReader({
      article: { mimetype: 'application/pdf', namespace: 'I', path: 'I/Doc.pdf', data },
    });

    const result = await loadArticleIntoIframe(reader, 'C/Index', iframe, {
      nativeTypes: ['application/pdf'],
    });

    expect(result).toEqual({
      kind: EntryKinds.NATIVE,
      basePath: 'I/Doc.pdf',
      objectUrls: [],
      file: { mimetype: 'application/pdf', data, name: 'Doc.pdf' },
    });
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    expect(iframe).not.toHaveAttribute('src');
  });

  it('matches a whole MIME family by a family/* pattern', async () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const reader = makeMockReader({
      article: {
        mimetype: 'video/webm',
        namespace: 'I',
        path: 'I/Clip.webm',
        data: new Uint8Array([1]),
      },
    });

    const result = await loadArticleIntoIframe(reader, 'C/Index', iframe, {
      nativeTypes: ['video/*'],
    });

    expect(result.kind).toBe(EntryKinds.NATIVE);
  });

  it('renders an HTML entry with MIME parameters as HTML, decoded by its charset', async () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const reader = makeMockReader({
      article: {
        mimetype: 'Text/HTML; charset=iso-8859-1',
        namespace: 'C',
        path: 'C/Index',
        data: new Uint8Array([...new TextEncoder().encode('<p>caf'), 0xe9, 0x3c, 0x2f, 0x70, 0x3e]),
      },
    });

    const result = await loadArticleIntoIframe(reader, 'C/Index', iframe);

    expect(result.kind).toBe(EntryKinds.HTML);
    expect(iframe.srcdoc).toContain('<p>café</p>');
  });

  it('matches native types by MIME essence and hands the host the essence', async () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const data = new Uint8Array([1]);
    const reader = makeMockReader({
      article: {
        mimetype: 'Application/PDF; name=Doc',
        namespace: 'C',
        path: 'C/Doc.pdf',
        data,
      },
    });

    const result = await loadArticleIntoIframe(reader, 'C/Index', iframe, {
      nativeTypes: ['application/pdf'],
    });

    expect(result.kind).toBe(EntryKinds.NATIVE);
    expect(result.file).toEqual({ mimetype: 'application/pdf', data, name: 'Doc.pdf' });
  });

  it('follows references inside a stylesheet whose MIME type has parameters', async () => {
    const enc = new TextEncoder();
    const requested = [];
    const byPath = {
      'C/style.css': {
        mimetype: 'text/css; charset=utf-8',
        data: enc.encode('.x{background:url(icon.png)}'),
      },
    };
    const reader = {
      getEntry: jest.fn(async () => ({
        mimetype: 'text/html',
        path: 'C/Index',
        data: enc.encode('<html><head><link rel="stylesheet" href="style.css"/></head></html>'),
      })),
      getEntries: jest.fn(async paths => {
        requested.push(...paths);
        const map = new Map();
        for (const p of paths) if (byPath[p]) map.set(p, byPath[p]);
        return map;
      }),
    };
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    await loadArticleIntoIframe(reader, 'C/Index', iframe);

    expect(requested).toContain('C/icon.png');
  });

  it('writes nothing, and revokes what it made, once superseded', async () => {
    const created = [];
    global.URL.createObjectURL = jest.fn(() => {
      const url = `blob:test/${created.length}`;
      created.push(url);
      return url;
    });
    global.URL.revokeObjectURL = jest.fn();
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const reader = makeMockReader({
      article: {
        mimetype: 'text/html',
        namespace: 'C',
        path: 'C/Index',
        data: new TextEncoder().encode('<html><body><img src="../I/a.png"/></body></html>'),
      },
      entries: {
        'I/a.png': { mimetype: 'image/png', namespace: 'I', data: new Uint8Array([1]) },
      },
    });

    const result = await loadArticleIntoIframe(reader, 'C/Index', iframe, {
      isCurrent: () => false,
    });

    expect(result).toBeNull();
    expect(iframe.srcdoc).toBe('');
    expect(global.URL.revokeObjectURL.mock.calls.map(c => c[0])).toEqual(created);
  });

  it('uses the canonical (post-redirect) path as the base for relative resolution', async () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const reader = {
      getEntry: jest.fn(async () => ({
        mimetype: 'text/html',
        namespace: 'C',
        path: 'C/Wikipedia:Offline',
        data: new TextEncoder().encode('<html><body><img src="./_assets_/x.png"/></body></html>'),
      })),
      getEntries: jest.fn(async paths => {
        expect(paths).toEqual(['C/_assets_/x.png']);
        return new Map([
          [
            'C/_assets_/x.png',
            { mimetype: 'image/png', namespace: 'C', data: new Uint8Array([1]) },
          ],
        ]);
      }),
    };

    const { basePath } = await loadArticleIntoIframe(reader, 'W/mainPage', iframe);
    expect(reader.getEntries).toHaveBeenCalled();
    expect(basePath).toBe('C/Wikipedia:Offline');
  });

  it('rewrites CSS url() in <style> blocks and recursively inside linked stylesheets', async () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const enc = new TextEncoder();
    const byPath = {
      'C/style.css': {
        mimetype: 'text/css',
        data: enc.encode('.x{background:url(icon.svg)}'),
      },
      'C/bg.png': { mimetype: 'image/png', data: new Uint8Array([1]) },
      'C/icon.svg': { mimetype: 'image/svg+xml', data: new Uint8Array([2]) },
    };
    const requested = [];
    const reader = {
      getEntry: jest.fn(async () => ({
        mimetype: 'text/html',
        path: 'C/Index',
        data: enc.encode(
          '<html><head>' +
            '<link rel="stylesheet" href="style.css"/>' +
            '<style>div{background:url(bg.png)}</style>' +
            '</head><body></body></html>',
        ),
      })),
      getEntries: jest.fn(async paths => {
        requested.push(...paths);
        const map = new Map();
        for (const p of paths) if (byPath[p]) map.set(p, byPath[p]);
        return map;
      }),
    };

    await loadArticleIntoIframe(reader, 'C/Index', iframe);

    expect(requested).toContain('C/icon.svg');
    expect(iframe.srcdoc).toContain('blob:');
    expect(iframe.srcdoc).not.toContain('url(bg.png)');
    expect(iframe.srcdoc).not.toContain('href="style.css"');
  });

  it('decodes references exactly once, matching ZIM paths with literal percent-encoding', async () => {
    const enc = new TextEncoder();
    const requested = [];
    const reader = {
      getEntry: jest.fn(async () => ({
        mimetype: 'text/html',
        path: 'C/Architecture',
        data: enc.encode('<html><body><img src="./_assets_/h/Foo%252C_Bar.jpg"/></body></html>'),
      })),
      getEntries: jest.fn(async paths => {
        requested.push(...paths);
        return new Map();
      }),
    };
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    await loadArticleIntoIframe(reader, 'C/Architecture', iframe);

    expect(requested).toEqual(['C/_assets_/h/Foo%2C_Bar.jpg']);
  });

  it('batches sibling references into one getEntries per level, not per file', async () => {
    const enc = new TextEncoder();
    const byPath = {
      'C/a.css': { mimetype: 'text/css', data: enc.encode('.a{background:url(ia.png)}') },
      'C/b.css': { mimetype: 'text/css', data: enc.encode('.b{background:url(ib.png)}') },
      'C/ia.png': { mimetype: 'image/png', data: new Uint8Array([1]) },
      'C/ib.png': { mimetype: 'image/png', data: new Uint8Array([2]) },
    };
    const calls = [];
    const reader = {
      getEntry: jest.fn(async () => ({
        mimetype: 'text/html',
        path: 'C/Index',
        data: enc.encode(
          '<html><head>' +
            '<link rel="stylesheet" href="a.css"/>' +
            '<link rel="stylesheet" href="b.css"/>' +
            '</head><body></body></html>',
        ),
      })),
      getEntries: jest.fn(async paths => {
        calls.push([...paths]);
        const map = new Map();
        for (const p of paths) if (byPath[p]) map.set(p, byPath[p]);
        return map;
      }),
    };
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    await loadArticleIntoIframe(reader, 'C/Index', iframe);

    expect(calls.length).toBe(2);
    expect([...calls[0]].sort()).toEqual(['C/a.css', 'C/b.css']);
    expect([...calls[1]].sort()).toEqual(['C/ia.png', 'C/ib.png']);
  });
});
