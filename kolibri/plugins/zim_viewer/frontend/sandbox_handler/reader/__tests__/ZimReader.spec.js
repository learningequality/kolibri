// jsdom doesn't expose Text{En,De}coder.
import { TextDecoder, TextEncoder } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ZimReader } from '../ZimReader';
import libzimFixture from './fixtures/libzim.json';

global.TextDecoder = global.TextDecoder || TextDecoder;
global.TextEncoder = global.TextEncoder || TextEncoder;

const HEADER_CLUSTER_COUNT_OFFSET = 28;

// Written by fixtures/make_fixtures.py.
const MINIMAL_ZIM_PATH = resolve(__dirname, '../../../../test/data/minimal.zim');
const LIBZIM_ZIM_PATH = resolve(__dirname, 'fixtures/libzim.zim');

const { descriptors, bodies, clusterRanges } = libzimFixture;
const PAGE_CLUSTER_BYTES = 2 * 4 + bodies['C/page0'].length;

function load(path) {
  return new Uint8Array(readFileSync(path));
}

function text(entry) {
  return new TextDecoder('utf-8').decode(entry.data);
}

function clusterRange(path) {
  return `bytes=${clusterRanges[descriptors[path].clusterNumber]}`;
}

function resolver(known = descriptors, { onPaths = null } = {}) {
  return async paths => {
    if (onPaths) onPaths(paths);
    return Object.fromEntries(paths.filter(p => known[p]).map(p => [p, known[p]]));
  };
}

let respond;
let xhrCalls;

class MockXHR {
  open(method, url) {
    this.method = method;
    this.url = url;
    this.requestHeaders = {};
    this._cbs = {};
  }
  setRequestHeader(name, value) {
    this.requestHeaders[name] = value;
  }
  addEventListener(type, cb) {
    (this._cbs[type] || (this._cbs[type] = [])).push(cb);
  }
  getResponseHeader(name) {
    const headers = this._res.headers || {};
    const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
    return key === undefined ? null : headers[key];
  }
  _fire(type) {
    (this._cbs[type] || []).forEach(cb => cb());
  }
  send() {
    const req = { url: this.url, headers: this.requestHeaders, responseType: this.responseType };
    xhrCalls.push(req);
    this._res = respond(req);
    this.status = this._res.status;
    this.response = this._res.response;
    this._aborted = false;
    this.readyState = MockXHR.HEADERS_RECEIVED;
    this._fire('readystatechange');
    if (this._aborted) {
      this._fire('abort');
      return;
    }
    this._fire('load');
  }
  abort() {
    this._aborted = true;
  }
}
MockXHR.HEADERS_RECEIVED = 2;

function installXHR() {
  respond = () => ({ status: 200, headers: {}, response: null });
  xhrCalls = [];
  global.XMLHttpRequest = MockXHR;
}
function uninstallXHR() {
  delete global.XMLHttpRequest;
}

function concat(chunks) {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function multipartResponse(fileBytes, ranges, { truncateLastPart }) {
  const boundary = 'TESTBOUNDARY';
  const enc = new TextEncoder();
  const chunks = [];
  ranges.forEach(([start, end], i) => {
    chunks.push(
      enc.encode(
        `--${boundary}\r\nContent-Type: application/octet-stream\r\n` +
          `Content-Range: bytes ${start}-${end}/${fileBytes.length}\r\n\r\n`,
      ),
    );
    if (truncateLastPart && i === ranges.length - 1) {
      chunks.push(fileBytes.slice(start, end));
      return;
    }
    chunks.push(fileBytes.slice(start, end + 1), enc.encode('\r\n'));
  });
  if (!truncateLastPart) {
    chunks.push(enc.encode(`--${boundary}--\r\n`));
  }
  return {
    status: 206,
    headers: { 'Content-Type': `multipart/byteranges; boundary=${boundary}` },
    response: concat(chunks).buffer,
  };
}

function serve(
  fileBytes,
  { advertiseMax = null, multipart = false, truncateLastPart = false } = {},
) {
  return ({ headers }) => {
    const ranges = headers.Range.replace('bytes=', '')
      .split(',')
      .map(spec => spec.split('-').map(Number));
    if (ranges.length > 1) {
      if (!multipart) {
        return {
          status: 200,
          headers: { 'Content-Type': 'application/octet-stream' },
          response: fileBytes.slice().buffer,
        };
      }
      return multipartResponse(fileBytes, ranges, { truncateLastPart });
    }
    const [[start, end]] = ranges;
    return {
      status: 206,
      headers: advertiseMax ? { 'X-Accept-Ranges-Max': String(advertiseMax) } : {},
      response: fileBytes.slice(start, end + 1).buffer,
    };
  };
}

async function openReader(
  fileBytes = load(LIBZIM_ZIM_PATH),
  { server = {}, resolveBatch = resolver(), cacheMaxBytes } = {},
) {
  respond = serve(fileBytes, server);
  const reader = new ZimReader('/file.zim', { resolveBatch, cacheMaxBytes });
  await reader.init();
  xhrCalls = [];
  return reader;
}

function multiRangeCalls() {
  return xhrCalls.filter(c => c.headers.Range.includes(','));
}

describe('ZimReader', () => {
  beforeEach(installXHR);
  afterEach(uninstallXHR);

  it('init() populates header and clusterPointers', async () => {
    respond = serve(load(LIBZIM_ZIM_PATH));
    const reader = new ZimReader('/file.zim', { resolveBatch: resolver() });
    await reader.init();
    expect(reader.header.articleCount).toBe(Object.keys(descriptors).length);
    expect(reader.header.clusterCount).toBe(clusterRanges.length);
    expect(reader.clusterPointers).toEqual(clusterRanges.map(r => Number(r.split('-')[0])));
    for (const call of xhrCalls) {
      expect(call.url).toBe('/file.zim');
      expect(call.headers.Range).toMatch(/^bytes=\d+-\d+$/);
      expect(call.responseType).toBe('arraybuffer');
    }
  });

  it('rejects a header whose cluster pointer table runs past the file', async () => {
    const bytes = load(LIBZIM_ZIM_PATH);
    new DataView(bytes.buffer).setUint32(HEADER_CLUSTER_COUNT_OFFSET, 1e6, true);
    respond = serve(bytes);
    const reader = new ZimReader('/file.zim', { resolveBatch: resolver() });
    await expect(reader.init()).rejects.toThrow(/cluster pointer table/i);
    expect(xhrCalls).toHaveLength(1);
  });

  it('init() rejects a server that ignores Range, before downloading the body', async () => {
    respond = () => ({ status: 200, headers: {}, response: load(LIBZIM_ZIM_PATH).buffer });
    const abort = jest.spyOn(MockXHR.prototype, 'abort');
    const reader = new ZimReader('/file.zim', { resolveBatch: resolver() });
    await expect(reader.init()).rejects.toMatchObject({ name: 'ResolveError', status: 200 });
    expect(abort).toHaveBeenCalled();
    abort.mockRestore();
  });

  it('getEntry returns the article body for C/Index', async () => {
    const reader = await openReader();
    const entry = await reader.getEntry('C/Index');
    expect(entry.mimetype).toBe('text/html');
    expect(entry.namespace).toBe('C');
    expect(text(entry)).toBe(bodies['C/Index']);
  });

  it('reads entries from both zstd and uncompressed clusters', async () => {
    const reader = await openReader();
    const paths = ['C/page0', 'C/page1', 'C/page2', 'C/page3'];
    const entries = await reader.getEntries(paths);
    for (const path of paths) {
      expect(text(entries.get(path))).toBe(bodies[path]);
    }
  });

  it('fetches the last cluster without the dirents and pointer lists after it', async () => {
    const lastCluster = clusterRanges.length - 1;
    const path = Object.keys(descriptors).find(p => descriptors[p].clusterNumber === lastCluster);
    const reader = await openReader();
    await reader.getEntry(path);
    expect(xhrCalls.map(call => call.headers.Range)).toEqual([clusterRange(path)]);
  });

  it('reads the last cluster of a ZIM whose pointer lists precede the clusters', async () => {
    const minimal = {
      'C/Index': {
        clusterNumber: 0,
        blobNumber: 0,
        mimetype: 'text/html',
        namespace: 'C',
        path: 'C/Index',
      },
    };
    const reader = await openReader(load(MINIMAL_ZIM_PATH), { resolveBatch: resolver(minimal) });
    const entry = await reader.getEntry('C/Index');
    expect(text(entry)).toBe('<html><body>Hello, ZIM</body></html>');
  });

  it('getEntry reads a redirect target from one resolver round trip', async () => {
    let resolverCalls = 0;
    const reader = await openReader(undefined, {
      resolveBatch: resolver(descriptors, { onPaths: () => (resolverCalls += 1) }),
    });
    const entry = await reader.getEntry('C/Redirect');
    expect(entry.path).toBe('C/Index');
    expect(text(entry)).toBe(bodies['C/Index']);
    expect(resolverCalls).toBe(1);
  });

  it('getEntries resolves N paths, deduplicated, in a single batch', async () => {
    let batchCalls = 0;
    let batchPaths = [];
    const reader = await openReader(undefined, {
      resolveBatch: resolver(descriptors, {
        onPaths: paths => {
          batchCalls += 1;
          batchPaths = paths;
        },
      }),
    });
    const entries = await reader.getEntries(['C/page0', 'C/Index', 'C/page0']);
    expect(batchCalls).toBe(1);
    expect(batchPaths).toEqual(['C/page0', 'C/Index']);
    expect(entries.size).toBe(2);
    expect(text(entries.get('C/Index'))).toBe(bodies['C/Index']);
  });

  it('getEntries omits paths the server reported as missing', async () => {
    const reader = await openReader();
    const entries = await reader.getEntries(['C/Index', 'C/Missing']);
    expect(entries.has('C/Index')).toBe(true);
    expect(entries.has('C/Missing')).toBe(false);
  });

  it('getEntry throws ResolveError when the server omits the requested path', async () => {
    const reader = await openReader();
    await expect(reader.getEntry('C/Missing')).rejects.toMatchObject({
      name: 'ResolveError',
      status: 404,
    });
  });
});

describe('ZimReader multi-range fetching', () => {
  beforeEach(installXHR);
  afterEach(uninstallXHR);

  it('refetches only the least recently used cluster once past the cache byte budget', async () => {
    const reader = await openReader(undefined, { cacheMaxBytes: 2 * PAGE_CLUSTER_BYTES });

    await reader.getEntry('C/page0');
    await reader.getEntry('C/page1');
    await reader.getEntry('C/page0');
    await reader.getEntry('C/page2');
    xhrCalls = [];
    await reader.getEntry('C/page0');
    const entry = await reader.getEntry('C/page1');

    expect(xhrCalls.map(call => call.headers.Range)).toEqual([clusterRange('C/page1')]);
    expect(text(entry)).toBe(bodies['C/page1']);
  });

  it('downloads a cluster larger than the cache byte budget once', async () => {
    const reader = await openReader(undefined, { cacheMaxBytes: 1 });

    const entry = await reader.getEntry('C/page0');

    expect(xhrCalls.map(call => call.headers.Range)).toEqual([clusterRange('C/page0')]);
    expect(text(entry)).toBe(bodies['C/page0']);
  });

  it('reads a multi-range batch over the cache byte budget from its one request', async () => {
    const reader = await openReader(undefined, {
      server: { advertiseMax: 100, multipart: true },
      cacheMaxBytes: PAGE_CLUSTER_BYTES,
    });
    const paths = ['C/page0', 'C/page1', 'C/page3'];

    const entries = await reader.getEntries(paths);

    expect(xhrCalls).toHaveLength(1);
    for (const path of paths) {
      expect(text(entries.get(path))).toBe(bodies[path]);
    }
  });

  it('captures multipart support and the cap from X-Accept-Ranges-Max on init', async () => {
    const reader = await openReader(undefined, { server: { advertiseMax: 50 } });
    expect(reader.multipartSupported).toBe(true);
    expect(reader.maxRangesPerRequest).toBe(50);
  });

  it('leaves multipart disabled when the header is absent', async () => {
    const reader = await openReader();
    expect(reader.multipartSupported).toBe(false);
  });

  it('fetches distinct clusters in one multi-range request and caches them', async () => {
    const reader = await openReader(undefined, {
      server: { advertiseMax: 100, multipart: true },
    });
    const paths = ['C/page0', 'C/page1', 'C/page3'];

    const entries = await reader.getEntries(paths);
    await reader.getEntries(paths);

    expect(xhrCalls.map(call => call.headers.Range)).toEqual([
      'bytes=' + paths.map(p => clusterRanges[descriptors[p].clusterNumber]).join(','),
    ]);
    for (const path of paths) {
      expect(text(entries.get(path))).toBe(bodies[path]);
    }
  });

  it('caches a copy, not a view pinning the whole multipart response buffer', async () => {
    const reader = await openReader(undefined, {
      server: { advertiseMax: 100, multipart: true },
    });

    const entries = await reader.getEntries(['C/page0', 'C/page1', 'C/page3']);

    expect(entries.get('C/page1').data.buffer.byteLength).toBe(PAGE_CLUSTER_BYTES);
  });

  it('chunks requests to the advertised cap', async () => {
    const reader = await openReader(undefined, { server: { advertiseMax: 2, multipart: true } });

    await reader.getEntries(['C/page0', 'C/page1', 'C/page2', 'C/page3']);

    expect(multiRangeCalls()).toHaveLength(2);
    expect(xhrCalls).toHaveLength(2);
  });

  it('does not attempt multi-range when support was not detected', async () => {
    const reader = await openReader();

    const entries = await reader.getEntries(['C/page0', 'C/page2']);

    expect(xhrCalls.map(call => call.headers.Range)).toEqual([
      clusterRange('C/page0'),
      clusterRange('C/page2'),
    ]);
    expect(text(entries.get('C/page0'))).toBe(bodies['C/page0']);
    expect(text(entries.get('C/page2'))).toBe(bodies['C/page2']);
  });

  it('dedupes a concurrent getEntry against an in-flight multi-range batch', async () => {
    const reader = await openReader(undefined, {
      server: { advertiseMax: 100, multipart: true },
    });

    const [entries, direct] = await Promise.all([
      reader.getEntries(['C/page0', 'C/page1', 'C/page2']),
      reader.getEntry('C/page1'),
    ]);

    expect(xhrCalls).toHaveLength(1);
    expect(multiRangeCalls()).toHaveLength(1);
    expect(text(direct)).toBe(bodies['C/page1']);
    expect(text(entries.get('C/page1'))).toBe(bodies['C/page1']);
  });

  it('falls back to per-cluster fetches when a multi-range response is not multipart', async () => {
    const reader = await openReader(undefined, { server: { advertiseMax: 100 } });
    const paths = ['C/page0', 'C/page1', 'C/page3'];

    const entries = await reader.getEntries(paths);

    expect(xhrCalls.filter(c => !c.headers.Range.includes(',')).map(c => c.headers.Range)).toEqual(
      paths.map(clusterRange),
    );
    for (const path of paths) {
      expect(text(entries.get(path))).toBe(bodies[path]);
    }
  });

  it('refetches a cluster whose multipart part arrived truncated', async () => {
    const reader = await openReader(undefined, {
      server: { advertiseMax: 100, multipart: true, truncateLastPart: true },
    });
    const paths = ['C/page0', 'C/page1', 'C/page3'];

    const entries = await reader.getEntries(paths);

    expect(xhrCalls.filter(c => !c.headers.Range.includes(',')).map(c => c.headers.Range)).toEqual([
      clusterRange('C/page3'),
    ]);
    for (const path of paths) {
      expect(text(entries.get(path))).toBe(bodies[path]);
    }
  });

  it('leaves no unhandled rejection when a batch fails with no concurrent waiter', async () => {
    const reader = await openReader(undefined, { server: { advertiseMax: 100 } });
    respond = () => ({ status: 500, headers: {}, response: new ArrayBuffer(0) });
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    try {
      await expect(reader.getEntries(['C/page0', 'C/page2'])).rejects.toMatchObject({
        name: 'ResolveError',
      });
      await new Promise(resolve => setTimeout(resolve, 0));
    } finally {
      process.off('unhandledRejection', unhandled);
    }
    expect(unhandled).not.toHaveBeenCalled();
  });
});
