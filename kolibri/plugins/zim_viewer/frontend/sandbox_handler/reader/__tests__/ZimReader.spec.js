// jsdom doesn't expose Text{En,De}coder.
import { TextDecoder, TextEncoder } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ZimReader } from '../ZimReader';
import libzimFixture from './fixtures/libzim.json';

global.TextDecoder = global.TextDecoder || TextDecoder;
global.TextEncoder = global.TextEncoder || TextEncoder;

// https://wiki.openzim.org/wiki/ZIM_file_format#Header
const HEADER_CLUSTER_COUNT_OFFSET = 28;
const HEADER_CLUSTER_PTR_POS_OFFSET = 48;
const HEADER_CHECKSUM_POS_OFFSET = 72;

// Written by fixtures/make_fixtures.py.
const MINIMAL_ZIM_PATH = resolve(__dirname, 'fixtures/minimal.zim');
const LIBZIM_ZIM_PATH = resolve(__dirname, 'fixtures/libzim.zim');

const { descriptors, bodies, clusterRanges } = libzimFixture;
const PAGE_CLUSTER_BYTES = 2 * 4 + bodies['C/page0'].length;
const EMPTY_BLOB_PATH = 'X/listing/titleOrdered/v1';

function load(path) {
  return new Uint8Array(readFileSync(path));
}

function text(entry) {
  return new TextDecoder('utf-8').decode(entry.data);
}

function entryRange(path) {
  const { blobOffset, blobSize, clusterNumber } = descriptors[path];
  if (blobOffset === undefined) {
    return clusterRanges[clusterNumber];
  }
  return `${blobOffset}-${blobOffset + blobSize - 1}`;
}

function rangeHeader(path) {
  return `bytes=${entryRange(path)}`;
}

function wholeCluster(path) {
  const descriptor = { ...descriptors[path] };
  delete descriptor.blobOffset;
  delete descriptor.blobSize;
  return descriptor;
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
  jest.restoreAllMocks();
}

function failRange(range) {
  const served = respond;
  respond = req =>
    req.headers.Range === range
      ? { status: 500, headers: {}, response: new ArrayBuffer(0) }
      : served(req);
}

function corruptCluster(fileBytes, path) {
  const [start, end] = clusterRanges[descriptors[path].clusterNumber].split('-').map(Number);
  const corrupted = fileBytes.slice();
  corrupted.fill(0xff, start + 1, end + 1);
  return corrupted;
}

function captureErrors() {
  return jest.spyOn(console, 'error').mockImplementation(() => {});
}

function shortenRange(range, times) {
  const served = respond;
  let remaining = times;
  respond = req => {
    const res = served(req);
    if (req.headers.Range !== range || remaining === 0) {
      return res;
    }
    remaining -= 1;
    return { ...res, response: res.response.slice(0, res.response.byteLength - 1) };
  };
}

function rangeLength(range) {
  const [start, end] = range.replace('bytes=', '').split('-').map(Number);
  return end - start + 1;
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

// Mirrors coalesce_ranges in kolibri/utils/kolibri_whitenoise.py (#15602).
function coalesceRanges(ranges) {
  const merged = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

function multipartResponse(fileBytes, requestedRanges, { truncateLastPart }) {
  const boundary = 'TESTBOUNDARY';
  const enc = new TextEncoder();
  const chunks = [];
  const ranges = coalesceRanges(requestedRanges);
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

  it('init() requests byte ranges of the file as array buffers', async () => {
    respond = serve(load(LIBZIM_ZIM_PATH));
    const reader = new ZimReader('/file.zim', { resolveBatch: resolver() });
    await reader.init();
    expect(xhrCalls.length).toBeGreaterThan(0);
    for (const call of xhrCalls) {
      expect(call.url).toBe('/file.zim');
      expect(call.headers.Range).toMatch(/^bytes=\d+-\d+$/);
      expect(call.responseType).toBe('arraybuffer');
    }
  });

  it('rejects a last cluster pointer at or past the checksum', async () => {
    const bytes = load(LIBZIM_ZIM_PATH);
    const view = new DataView(bytes.buffer);
    const clusterPtrPos = Number(view.getBigUint64(HEADER_CLUSTER_PTR_POS_OFFSET, true));
    const checksumPos = view.getBigUint64(HEADER_CHECKSUM_POS_OFFSET, true);
    view.setBigUint64(clusterPtrPos + 8 * (clusterRanges.length - 1), checksumPos, true);
    respond = serve(bytes);
    const reader = new ZimReader('/file.zim', { resolveBatch: resolver() });
    await expect(reader.init()).rejects.toMatchObject({ name: 'CorruptZimError' });
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
    await expect(reader.init()).rejects.toMatchObject({ name: 'RangeRequestError', status: 200 });
    expect(abort).toHaveBeenCalled();
    abort.mockRestore();
  });

  it('init() rejects a file that is not a ZIM', async () => {
    respond = serve(new Uint8Array(4096));
    const reader = new ZimReader('/file.zim', { resolveBatch: resolver() });
    await expect(reader.init()).rejects.toMatchObject({ name: 'NotZimError' });
  });

  it('init() refetches a short header response past the browser cache', async () => {
    respond = serve(load(LIBZIM_ZIM_PATH));
    shortenRange('bytes=0-79', 1);
    const reader = new ZimReader('/file.zim', { resolveBatch: resolver() });
    await reader.init();
    const headerCalls = xhrCalls.filter(call => call.headers.Range === 'bytes=0-79');
    expect(headerCalls.map(call => call.headers['Cache-Control'])).toEqual([undefined, 'no-cache']);
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

  it('fetches only the blob of an entry the resolver gives a byte range', async () => {
    const reader = await openReader();
    const entry = await reader.getEntry('C/page1');
    expect(xhrCalls.map(call => call.headers.Range)).toEqual([rangeHeader('C/page1')]);
    expect(rangeHeader('C/page1')).not.toBe(
      `bytes=${clusterRanges[descriptors['C/page1'].clusterNumber]}`,
    );
    expect(text(entry)).toBe(bodies['C/page1']);
  });

  it('reads an empty blob without a request', async () => {
    const reader = await openReader();
    const entry = await reader.getEntry(EMPTY_BLOB_PATH);
    expect(xhrCalls).toEqual([]);
    expect(entry.data).toHaveLength(0);
  });

  it('fetches the last cluster without the dirents and pointer lists after it', async () => {
    const lastCluster = clusterRanges.length - 1;
    const path = Object.keys(descriptors).find(p => descriptors[p].clusterNumber === lastCluster);
    const reader = await openReader(undefined, {
      resolveBatch: resolver({ [path]: wholeCluster(path) }),
    });
    await reader.getEntry(path);
    expect(xhrCalls.map(call => call.headers.Range)).toEqual([
      `bytes=${clusterRanges[lastCluster]}`,
    ]);
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
      message: 'Entry not found: C/Missing',
    });
  });

  it('getEntries drops and logs the entries of a cluster that fails to load', async () => {
    const reader = await openReader();
    failRange(rangeHeader('C/page2'));
    const errors = captureErrors();

    const entries = await reader.getEntries(['C/page0', 'C/page2']);

    expect([...entries.keys()]).toEqual(['C/page0']);
    expect(text(entries.get('C/page0'))).toBe(bodies['C/page0']);
    expect(errors).toHaveBeenCalledTimes(1);
  });

  it('getEntry rejects with the error of a cluster that fails to load', async () => {
    const reader = await openReader();
    failRange(rangeHeader('C/page2'));

    await expect(reader.getEntry('C/page2')).rejects.toMatchObject({
      name: 'RangeRequestError',
      status: 500,
    });
  });

  it('refetches a short cluster response past the browser cache', async () => {
    const reader = await openReader();
    const range = rangeHeader('C/page0');
    shortenRange(range, 1);

    const entry = await reader.getEntry('C/page0');

    expect(xhrCalls.map(call => [call.headers.Range, call.headers['Cache-Control']])).toEqual([
      [range, undefined],
      [range, 'no-cache'],
    ]);
    expect(text(entry)).toBe(bodies['C/page0']);
  });

  it('rejects a cluster response still short with the cache bypassed', async () => {
    const reader = await openReader();
    const range = rangeHeader('C/page0');
    const length = rangeLength(range);
    shortenRange(range, 2);

    const error = await reader.getEntry('C/page0').catch(e => e);

    expect(error.name).toBe('RangeRequestError');
    expect(error.message).toContain(
      `expected ${length} bytes, received ${length - 1}, then ${length - 1}`,
    );
  });
});

describe('ZimReader multi-range fetching', () => {
  beforeEach(installXHR);
  afterEach(uninstallXHR);

  it('refetches only the least recently used entry once past the cache byte budget', async () => {
    const reader = await openReader(undefined, { cacheMaxBytes: 2 * PAGE_CLUSTER_BYTES });

    await reader.getEntry('C/page0');
    await reader.getEntry('C/page1');
    await reader.getEntry('C/page0');
    await reader.getEntry('C/page2');
    xhrCalls = [];
    await reader.getEntry('C/page0');
    const entry = await reader.getEntry('C/page1');

    expect(xhrCalls.map(call => call.headers.Range)).toEqual([rangeHeader('C/page1')]);
    expect(text(entry)).toBe(bodies['C/page1']);
  });

  it('downloads a cluster larger than the cache byte budget once', async () => {
    const reader = await openReader(undefined, { cacheMaxBytes: 1 });

    const entry = await reader.getEntry('C/page0');

    expect(xhrCalls.map(call => call.headers.Range)).toEqual([rangeHeader('C/page0')]);
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

  it('fetches distinct clusters and blobs in one multi-range request and caches them', async () => {
    const reader = await openReader(undefined, {
      server: { advertiseMax: 100, multipart: true },
    });
    const paths = ['C/page0', 'C/page1', 'C/page3'];

    const entries = await reader.getEntries(paths);
    await reader.getEntries(paths);

    expect(xhrCalls.map(call => call.headers.Range)).toEqual([
      'bytes=' + paths.map(entryRange).join(','),
    ]);
    for (const path of paths) {
      expect(text(entries.get(path))).toBe(bodies[path]);
    }
  });

  it('returns entry bytes that own their buffer, not a view of the cluster', async () => {
    const reader = await openReader(undefined, {
      server: { advertiseMax: 100, multipart: true },
    });
    const paths = ['C/page0', 'C/page1', 'C/page3'];

    const entries = await reader.getEntries(paths);

    for (const path of paths) {
      expect(entries.get(path).data.buffer.byteLength).toBe(bodies[path].length);
    }
  });

  it('chunks requests to the advertised cap', async () => {
    const reader = await openReader(undefined, { server: { advertiseMax: 2, multipart: true } });

    await reader.getEntries(['C/page0', 'C/page1', 'C/page2', 'C/page3']);

    expect(multiRangeCalls()).toHaveLength(2);
    expect(xhrCalls).toHaveLength(2);
  });

  it('fetches a lone range left over after chunking with one plain range request', async () => {
    const reader = await openReader(undefined, { server: { advertiseMax: 2, multipart: true } });
    const paths = ['C/page0', 'C/page1', 'C/page3'];

    const entries = await reader.getEntries(paths);

    expect(xhrCalls.map(call => call.headers.Range)).toEqual([
      'bytes=' + ['C/page0', 'C/page1'].map(entryRange).join(','),
      rangeHeader('C/page3'),
    ]);
    for (const path of paths) {
      expect(text(entries.get(path))).toBe(bodies[path]);
    }
  });

  it.each(['-1', '0', '1', 'many'])(
    'fetches clusters one range at a time when the advertised cap is %s',
    async advertiseMax => {
      const reader = await openReader(undefined, { server: { advertiseMax, multipart: true } });
      const paths = ['C/page0', 'C/page2'];

      const entries = await reader.getEntries(paths);

      expect(xhrCalls.map(call => call.headers.Range)).toEqual(paths.map(rangeHeader));
      for (const path of paths) {
        expect(text(entries.get(path))).toBe(bodies[path]);
      }
    },
  );

  it('does not attempt multi-range when support was not detected', async () => {
    const reader = await openReader();

    const entries = await reader.getEntries(['C/page0', 'C/page2']);

    expect(xhrCalls.map(call => call.headers.Range)).toEqual([
      rangeHeader('C/page0'),
      rangeHeader('C/page2'),
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

  it('falls back to per-range fetches when a multi-range response is not multipart', async () => {
    const reader = await openReader(undefined, { server: { advertiseMax: 100 } });
    const paths = ['C/page0', 'C/page1', 'C/page3'];

    const entries = await reader.getEntries(paths);

    expect(xhrCalls.filter(c => !c.headers.Range.includes(',')).map(c => c.headers.Range)).toEqual(
      paths.map(rangeHeader),
    );
    for (const path of paths) {
      expect(text(entries.get(path))).toBe(bodies[path]);
    }
  });

  it('refetches a range whose multipart part arrived truncated', async () => {
    const reader = await openReader(undefined, {
      server: { advertiseMax: 100, multipart: true, truncateLastPart: true },
    });
    const paths = ['C/page0', 'C/page1', 'C/page3'];

    const entries = await reader.getEntries(paths);

    expect(xhrCalls.filter(c => !c.headers.Range.includes(',')).map(c => c.headers.Range)).toEqual([
      rangeHeader('C/page3'),
    ]);
    for (const path of paths) {
      expect(text(entries.get(path))).toBe(bodies[path]);
    }
  });

  it('drops only the entries of a batched cluster that fails to decompress', async () => {
    const fileBytes = corruptCluster(load(LIBZIM_ZIM_PATH), 'C/page0');
    const reader = await openReader(fileBytes, { server: { advertiseMax: 100, multipart: true } });
    const errors = captureErrors();

    const entries = await reader.getEntries(['C/page0', 'C/page1', 'C/page3']);

    expect([...entries.keys()].sort()).toEqual(['C/page1', 'C/page3']);
    expect(text(entries.get('C/page1'))).toBe(bodies['C/page1']);
    expect(text(entries.get('C/page3'))).toBe(bodies['C/page3']);
    expect(errors).toHaveBeenCalledTimes(1);
  });

  it('drops only the entries of a batched cluster with a corrupt offset table', async () => {
    const fileBytes = corruptCluster(load(LIBZIM_ZIM_PATH), 'C/page1');
    const reader = await openReader(fileBytes, {
      server: { advertiseMax: 100, multipart: true },
      resolveBatch: resolver({ ...descriptors, 'C/page1': wholeCluster('C/page1') }),
    });
    const errors = captureErrors();

    const entries = await reader.getEntries(['C/page0', 'C/page1', 'C/page3']);

    expect([...entries.keys()].sort()).toEqual(['C/page0', 'C/page3']);
    expect(text(entries.get('C/page0'))).toBe(bodies['C/page0']);
    expect(text(entries.get('C/page3'))).toBe(bodies['C/page3']);
    expect(errors).toHaveBeenCalledTimes(1);
  });

  it('drops only the entries of a batched range whose refetch fails', async () => {
    const reader = await openReader(undefined, {
      server: { advertiseMax: 100, multipart: true, truncateLastPart: true },
    });
    failRange(rangeHeader('C/page3'));
    const errors = captureErrors();

    const entries = await reader.getEntries(['C/page0', 'C/page1', 'C/page3']);

    expect([...entries.keys()].sort()).toEqual(['C/page0', 'C/page1']);
    expect(errors).toHaveBeenCalledTimes(1);
  });

  it('leaves no unhandled rejection when a batch fails with no concurrent waiter', async () => {
    const reader = await openReader(undefined, { server: { advertiseMax: 100 } });
    respond = () => ({ status: 500, headers: {}, response: new ArrayBuffer(0) });
    captureErrors();
    expect((await reader.getEntries(['C/page0', 'C/page2'])).size).toBe(0);
    await new Promise(resolve => setTimeout(resolve, 0));
  });
});
