import { LRUCache } from 'lru-cache';
import { HEADER_SIZE, parseHeader, parsePointerList } from './header';
import { decompressCluster, sliceBlob } from './cluster';
import { CorruptZimError, RangeRequestError, ResolveError } from './errors';
import { parseMultipartByteRanges } from './multipart';

function xhrGet(url, { headers, responseType, abortIf } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    if (responseType) {
      xhr.responseType = responseType;
    }
    if (headers) {
      for (const name of Object.keys(headers)) {
        xhr.setRequestHeader(name, headers[name]);
      }
    }
    if (abortIf) {
      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED && abortIf(xhr)) {
          xhr.abort();
        }
      });
    }
    xhr.addEventListener('load', () => resolve(xhr));
    xhr.addEventListener('abort', () => resolve(null));
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.send();
  });
}

const logging = console; // eslint-disable-line no-console

const DEFAULT_CACHE_BYTES = 32 * 1024 * 1024;

function readEntry({ blobNumber, blobOffset, mimetype, namespace, path }, fetched) {
  const data = blobOffset === undefined ? sliceBlob(fetched, blobNumber) : fetched;
  return { mimetype, namespace, data: data.slice(), path };
}

function fetchedSize(fetched) {
  return fetched instanceof Uint8Array ? fetched.byteLength : fetched.decompressed.byteLength;
}

// Servers may coalesce adjacent requested ranges into one part.
function sliceFromParts(parts, start, endExclusive) {
  for (const part of parts) {
    if (part.start <= start && part.end >= endExclusive - 1) {
      return part.data.subarray(start - part.start, endExclusive - part.start);
    }
  }
  return null;
}

export class ZimReader {
  /**
   * Reads a ZIM file over HTTP range requests; call init() before reading entries.
   * @param {string} fileUrl - URL of the ZIM file, served with HTTP range support
   * @param {object} options - How to resolve entries and how much to cache
   * @param {Function} options.resolveBatch - Called with an array of paths; resolves to
   * `{ clusterNumber, blobNumber, mimetype, namespace, path }` descriptors keyed by the
   * requested path, omitting paths not in the ZIM. It must follow redirects: each
   * descriptor locates the redirect target, and its `path` is the target's path. A
   * descriptor may also carry `blobOffset` and `blobSize`, the entry's bytes in the file,
   * which are then fetched instead of its whole cluster.
   * @param {number} [options.cacheMaxBytes] - Budget for fetched bytes kept in memory
   */
  constructor(fileUrl, { resolveBatch, cacheMaxBytes = DEFAULT_CACHE_BYTES } = {}) {
    this._fileUrl = fileUrl;
    this._resolveBatch = resolveBatch;
    this._cache = new LRUCache({ maxSize: cacheMaxBytes, sizeCalculation: fetchedSize });
    this._inFlight = new Map();
    this._header = null;
    this._clusterPointers = null;
    this._lastClusterEnd = null;
    this._maxRangesPerRequest = 1;
    this._multipartChecked = false;
  }

  async _fetchRange(start, end) {
    const length = end - start + 1;
    const body = await this._sendRange(start, end);
    if (body.byteLength >= length) {
      return body;
    }
    // Chromium can answer concurrent range requests with a short prefix from its cache (#15103).
    const refetched = await this._sendRange(start, end, { bypassCache: true });
    if (refetched.byteLength < length) {
      throw new RangeRequestError(
        206,
        `Truncated range response for bytes=${start}-${end}: expected ${length} bytes, ` +
          `received ${body.byteLength}, then ${refetched.byteLength} with the cache bypassed`,
      );
    }
    return refetched;
  }

  async _sendRange(start, end, { bypassCache = false } = {}) {
    const headers = { Range: `bytes=${start}-${end}` };
    if (bypassCache) {
      headers['Cache-Control'] = 'no-cache';
    }
    let status;
    const xhr = await xhrGet(this._fileUrl, {
      headers,
      responseType: 'arraybuffer',
      abortIf: x => {
        status = x.status;
        return status !== 206;
      },
    });
    if (!xhr) {
      throw new RangeRequestError(status, `Range request failed: ${status}`);
    }
    this._captureMultipartSupport(xhr);
    return new Uint8Array(xhr.response);
  }

  _captureMultipartSupport(xhr) {
    if (this._multipartChecked) {
      return;
    }
    this._multipartChecked = true;
    const max = parseInt(xhr.getResponseHeader('X-Accept-Ranges-Max'), 10);
    if (max > 1) {
      this._maxRangesPerRequest = max;
    }
  }

  async init() {
    this._header = parseHeader(await this._fetchRange(0, HEADER_SIZE - 1));
    const { urlPtrPos, titlePtrPos, clusterPtrPos, mimeListPos, clusterCount, checksumPos } =
      this._header;
    const clusterTableEnd = clusterPtrPos + 8 * clusterCount;
    if (clusterTableEnd > checksumPos) {
      throw new CorruptZimError('Cluster pointer table extends past end of file');
    }
    const [clusterPtrBytes, firstDirentPos] = await Promise.all([
      this._fetchRange(clusterPtrPos, clusterTableEnd - 1),
      this._readFirstDirentPos(),
    ]);
    this._clusterPointers = parsePointerList(clusterPtrBytes, clusterCount);
    const lastClusterStart = this._clusterPointers[clusterCount - 1];
    if (lastClusterStart >= checksumPos) {
      throw new CorruptZimError('Last cluster starts past the end of the file');
    }
    const sectionStarts = [
      firstDirentPos,
      urlPtrPos,
      titlePtrPos,
      clusterPtrPos,
      mimeListPos,
      checksumPos,
    ];
    this._lastClusterEnd = Math.min(...sectionStarts.filter(pos => pos > lastClusterStart));
  }

  // libzim >= 7 writes the dirents after the clusters, in path order
  // (Creator::writeLastParts), so the first path pointer is the lowest dirent.
  async _readFirstDirentPos() {
    const { urlPtrPos, articleCount } = this._header;
    if (!articleCount) {
      return null;
    }
    return parsePointerList(await this._fetchRange(urlPtrPos, urlPtrPos + 7), 1)[0];
  }

  _clusterByteRange(clusterNumber) {
    const start = this._clusterPointers[clusterNumber];
    let end;
    if (clusterNumber + 1 < this._clusterPointers.length) {
      end = this._clusterPointers[clusterNumber + 1];
    } else {
      end = this._lastClusterEnd;
    }
    return { start, end };
  }

  _rangeFor({ clusterNumber, blobOffset, blobSize }) {
    if (blobOffset !== undefined) {
      return {
        key: `blob:${blobOffset}`,
        start: blobOffset,
        end: blobOffset + blobSize,
        decode: bytes => bytes.slice(),
      };
    }
    return {
      key: `cluster:${clusterNumber}`,
      ...this._clusterByteRange(clusterNumber),
      decode: decompressCluster,
    };
  }

  async _get(range) {
    const cached = this._cache.get(range.key);
    if (cached) return cached;
    if (range.start === range.end) return range.decode(new Uint8Array(0));
    const inFlight = this._inFlight.get(range.key);
    if (inFlight) return inFlight;
    const fetchPromise = this._fetchRange(range.start, range.end - 1)
      .then(range.decode)
      .then(fetched => {
        this._cache.set(range.key, fetched);
        return fetched;
      });
    this._inFlight.set(range.key, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this._inFlight.delete(range.key);
    }
  }

  async _getAll(ranges) {
    const unique = [...new Map(ranges.map(range => [range.key, range])).values()];
    const toFetch = unique.filter(
      range =>
        range.start < range.end && !this._cache.has(range.key) && !this._inFlight.has(range.key),
    );
    for (let i = 0; i < toFetch.length; i += this._maxRangesPerRequest) {
      const batch = toFetch.slice(i, i + this._maxRangesPerRequest);
      if (batch.length > 1) {
        this._fetchMultipart(batch);
      }
    }
    const results = await Promise.allSettled(unique.map(range => this._get(range)));
    const fetched = new Map();
    unique.forEach((range, i) => {
      if (results[i].status === 'fulfilled') {
        fetched.set(range.key, results[i].value);
      } else {
        logging.error(`Failed to load ZIM ${range.key}:`, results[i].reason);
      }
    });
    return fetched;
  }

  _fetchMultipart(ranges) {
    const parts = this._fetchMultipartParts(ranges);
    for (const range of ranges) {
      const fetched = parts
        .then(received => this._decodeFromParts(range, received))
        .finally(() => {
          if (this._inFlight.get(range.key) === fetched) {
            this._inFlight.delete(range.key);
          }
        });
      this._inFlight.set(range.key, fetched);
    }
  }

  async _decodeFromParts(range, parts) {
    const sliced = parts ? sliceFromParts(parts, range.start, range.end) : null;
    if (!sliced) {
      this._inFlight.delete(range.key);
      return this._get(range);
    }
    const fetched = range.decode(sliced);
    this._cache.set(range.key, fetched);
    return fetched;
  }

  async _fetchMultipartParts(ranges) {
    const rangeSpecs = ranges.map(({ start, end }) => `${start}-${end - 1}`);
    const result = await this._fetchRanges(rangeSpecs);
    if (!result) {
      return null;
    }
    try {
      return parseMultipartByteRanges(result.data, result.contentType);
    } catch (e) {
      return null;
    }
  }

  async _fetchRanges(rangeSpecs) {
    let xhr;
    try {
      xhr = await xhrGet(this._fileUrl, {
        headers: { Range: `bytes=${rangeSpecs.join(',')}` },
        responseType: 'arraybuffer',
        abortIf: x =>
          x.status !== 206 ||
          !/multipart\/byteranges/i.test(x.getResponseHeader('Content-Type') || ''),
      });
    } catch (e) {
      return null;
    }
    if (!xhr) {
      return null;
    }
    return {
      data: new Uint8Array(xhr.response),
      contentType: xhr.getResponseHeader('Content-Type') || '',
    };
  }

  async getEntry(path) {
    const descriptor = (await this._resolveBatch([path]))[path];
    if (!descriptor) throw new ResolveError(404, `Entry not found: ${path}`);
    return readEntry(descriptor, await this._get(this._rangeFor(descriptor)));
  }

  /**
   * Resolve `paths` in one batch and read their entries.
   * @param {Array<string>} paths - Entry paths to fetch
   * @returns {Promise<Map<string, object>>} path → { mimetype, namespace, data, path },
   * where `path` is post-redirect; paths not in the ZIM, or that fail to read, are absent
   * from the map
   */
  async getEntries(paths) {
    const descriptors = await this._resolveBatch([...new Set(paths)]);
    const fetched = await this._getAll(Object.values(descriptors).map(d => this._rangeFor(d)));
    const entries = new Map();
    for (const [path, descriptor] of Object.entries(descriptors)) {
      const bytes = fetched.get(this._rangeFor(descriptor).key);
      if (!bytes) {
        continue;
      }
      try {
        entries.set(path, readEntry(descriptor, bytes));
      } catch (err) {
        logging.error(`Failed to read ZIM entry ${path}:`, err);
      }
    }
    return entries;
  }
}
