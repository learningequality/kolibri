import { LRUCache } from 'lru-cache';
import { HEADER_SIZE, parseHeader, parsePointerList } from './header';
import { decompressCluster, sliceBlob } from './cluster';
import { CorruptZimError, ResolveError } from './errors';
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

const DEFAULT_CACHE_BYTES = 32 * 1024 * 1024;

const DEFAULT_MAX_RANGES = 100;

// Servers may coalesce adjacent requested ranges into one part.
function sliceClusterFromParts(parts, start, endExclusive) {
  for (const part of parts) {
    if (part.start <= start && part.end >= endExclusive - 1) {
      return part.data.subarray(start - part.start, endExclusive - part.start);
    }
  }
  return null;
}

// Promise.withResolvers needs Node 22; Kolibri's Jest runs on Node 20.
function withResolvers() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export class ZimReader {
  /**
   * Reads a ZIM file over HTTP range requests; call init() before reading entries.
   * @param {string} fileUrl - URL of the ZIM file, served with HTTP range support
   * @param {object} options - How to resolve entries and how much to cache
   * @param {Function} options.resolveBatch - Called with an array of paths; resolves to
   * descriptors keyed by path, omitting paths not in the ZIM
   * @param {number} [options.cacheMaxBytes] - Budget for decompressed clusters kept in memory
   */
  constructor(fileUrl, { resolveBatch, cacheMaxBytes = DEFAULT_CACHE_BYTES } = {}) {
    this.fileUrl = fileUrl;
    this.resolveBatch = resolveBatch;
    this._cache = new LRUCache({
      maxSize: cacheMaxBytes,
      sizeCalculation: cluster => cluster.decompressed.byteLength,
    });
    this._inFlightClusters = new Map();
    this.header = null;
    this.clusterPointers = null;
    this.multipartSupported = false;
    this.maxRangesPerRequest = DEFAULT_MAX_RANGES;
    this._multipartChecked = false;
  }

  async _fetchRange(start, end) {
    let status;
    const xhr = await xhrGet(this.fileUrl, {
      headers: { Range: `bytes=${start}-${end}` },
      responseType: 'arraybuffer',
      abortIf: x => {
        status = x.status;
        return status !== 206;
      },
    });
    if (!xhr) {
      throw new ResolveError(status, `Range request failed: ${status}`);
    }
    this._captureMultipartSupport(xhr);
    return new Uint8Array(xhr.response);
  }

  _captureMultipartSupport(xhr) {
    if (this._multipartChecked) {
      return;
    }
    this._multipartChecked = true;
    const max = xhr.getResponseHeader('X-Accept-Ranges-Max');
    if (max) {
      this.multipartSupported = true;
      this.maxRangesPerRequest = parseInt(max, 10) || DEFAULT_MAX_RANGES;
    }
  }

  async init() {
    this.header = parseHeader(await this._fetchRange(0, HEADER_SIZE - 1));
    const { urlPtrPos, titlePtrPos, clusterPtrPos, mimeListPos, clusterCount, checksumPos } =
      this.header;
    const clusterTableEnd = clusterPtrPos + 8 * clusterCount;
    if (clusterTableEnd > checksumPos) {
      throw new CorruptZimError('Cluster pointer table extends past end of file');
    }
    const [clusterPtrBytes, firstDirentPos] = await Promise.all([
      this._fetchRange(clusterPtrPos, clusterTableEnd - 1),
      this._readFirstDirentPos(),
    ]);
    this.clusterPointers = parsePointerList(clusterPtrBytes, clusterCount);
    const lastClusterStart = this.clusterPointers[clusterCount - 1];
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
    const { urlPtrPos, articleCount } = this.header;
    if (!articleCount) {
      return null;
    }
    return parsePointerList(await this._fetchRange(urlPtrPos, urlPtrPos + 7), 1)[0];
  }

  _clusterByteRange(clusterNumber) {
    const start = this.clusterPointers[clusterNumber];
    let end;
    if (clusterNumber + 1 < this.clusterPointers.length) {
      end = this.clusterPointers[clusterNumber + 1];
    } else {
      end = this._lastClusterEnd;
    }
    return { start, end };
  }

  async _getCluster(clusterNumber) {
    const cached = this._cache.get(clusterNumber);
    if (cached) return cached;
    const inFlight = this._inFlightClusters.get(clusterNumber);
    if (inFlight) return inFlight;
    const { start, end } = this._clusterByteRange(clusterNumber);
    const fetchPromise = this._fetchRange(start, end - 1)
      .then(decompressCluster)
      .then(cluster => {
        this._cache.set(clusterNumber, cluster);
        return cluster;
      });
    this._inFlightClusters.set(clusterNumber, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this._inFlightClusters.delete(clusterNumber);
    }
  }

  async _getClusters(clusterNumbers) {
    const unique = [...new Set(clusterNumbers)];
    const toFetch = unique.filter(n => !this._cache.has(n) && !this._inFlightClusters.has(n));
    const batches = [];
    if (this.multipartSupported && toFetch.length > 1) {
      for (let i = 0; i < toFetch.length; i += this.maxRangesPerRequest) {
        batches.push(this._fetchClustersMultipart(toFetch.slice(i, i + this.maxRangesPerRequest)));
      }
    }
    const [clusters] = await Promise.all([
      Promise.all(unique.map(n => this._getCluster(n))),
      ...batches,
    ]);
    return new Map(unique.map((n, i) => [n, clusters[i]]));
  }

  async _fetchClustersMultipart(clusterNumbers) {
    const deferreds = new Map();
    for (const n of clusterNumbers) {
      const deferred = withResolvers();
      deferred.promise.catch(() => {});
      deferreds.set(n, deferred);
      this._inFlightClusters.set(n, deferred.promise);
    }
    try {
      const parts = await this._fetchMultipartParts(clusterNumbers);
      const missing = this._cacheCoveredClusters(clusterNumbers, parts, deferreds);
      await Promise.all(
        missing.map(async n => {
          this._inFlightClusters.delete(n);
          deferreds.get(n).resolve(await this._getCluster(n));
        }),
      );
    } catch (err) {
      for (const d of deferreds.values()) {
        d.reject(err);
      }
      throw err;
    } finally {
      for (const [n, d] of deferreds) {
        if (this._inFlightClusters.get(n) === d.promise) {
          this._inFlightClusters.delete(n);
        }
      }
    }
  }

  async _fetchMultipartParts(clusterNumbers) {
    const rangeSpecs = clusterNumbers.map(n => {
      const { start, end } = this._clusterByteRange(n);
      return `${start}-${end - 1}`;
    });
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

  _cacheCoveredClusters(clusterNumbers, parts, deferreds) {
    const missing = [];
    for (const n of clusterNumbers) {
      const { start, end } = this._clusterByteRange(n);
      const sliced = parts ? sliceClusterFromParts(parts, start, end) : null;
      if (!sliced) {
        missing.push(n);
        continue;
      }
      const cluster = decompressCluster(sliced);
      this._cache.set(n, cluster);
      deferreds.get(n).resolve(cluster);
    }
    return missing;
  }

  async _fetchRanges(rangeSpecs) {
    let xhr;
    try {
      xhr = await xhrGet(this.fileUrl, {
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
    const entries = await this.getEntries([path]);
    const entry = entries.get(path);
    if (!entry) throw new ResolveError(404, 'Entry not found');
    return entry;
  }

  /**
   * Resolve `paths` in one batch and read their entries.
   * @param {Array<string>} paths - Entry paths to fetch
   * @returns {Promise<Map<string, object>>} path → { mimetype, namespace, data, path },
   * where `path` is post-redirect; paths not in the ZIM are absent from the map
   */
  async getEntries(paths) {
    const descriptors = await this.resolveBatch([...new Set(paths)]);
    const clusters = await this._getClusters(Object.values(descriptors).map(d => d.clusterNumber));
    const entries = new Map();
    for (const [path, descriptor] of Object.entries(descriptors)) {
      const { clusterNumber, blobNumber, mimetype, namespace } = descriptor;
      const data = sliceBlob(clusters.get(clusterNumber), blobNumber);
      entries.set(path, { mimetype, namespace, data, path: descriptor.path });
    }
    return entries;
  }
}
