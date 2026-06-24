// Polyfills must be imported FIRST before any zip.js imports
import 'fastestsmallesttextencoderdecoder';
import 'web-streams-polyfill/polyfill';

import xhrMock from 'xhr-mock';
import AdaptiveHttpReader from '../src/AdaptiveHttpReader';

// Ensure URL APIs exist for jest.spyOn (jsdom doesn't provide them)
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = () => '';
}
if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = () => {};
}

const DEFAULT_MAX_FULL_LOAD_SIZE = 2.5 * 1024 * 1024; // 2.5MB
const DEFAULT_LARGE_MEDIA_THRESHOLD = 500 * 1024; // 500KB

const TEST_MAX_SIZE = 1 * 1024 * 1024; // 1MB for testing
const LARGE_MEDIA_THRESHOLD = 500 * 1024; // 500KB

// ZIP format constants (must match AdaptiveHttpReader.js)
const ZIP_LOCAL_HEADER_SIZE = 30;
const ZIP_EXTRA_FIELD_ESTIMATE = 100;

// Helper to create test data of specific size
function createTestData(sizeBytes) {
  const data = new Uint8Array(sizeBytes);
  for (let i = 0; i < sizeBytes; i++) {
    data[i] = i % 256;
  }
  return data;
}

// Mock server that tracks requests
function createMockServer(data, url, options = {}) {
  const { supportsRanges = true } = options;

  const stats = {
    requestCount: 0,
    requests: [],
    totalBytesSent: 0,
    aborted: false,
  };

  xhrMock.reset();
  xhrMock.get(url, (req, res) => {
    stats.requestCount++;
    const rangeHeader = req.header('Range');

    stats.requests.push({
      type: rangeHeader ? 'range' : 'full',
      rangeHeader,
    });

    if (!rangeHeader) {
      // Full file request
      stats.totalBytesSent += data.length;
      let response = res.status(200).header('Content-Length', data.length.toString());

      if (supportsRanges) {
        response = response.header('Accept-Ranges', 'bytes');
      }
      return response.body(data.buffer);
    }

    // Range request
    if (!supportsRanges) {
      // Server doesn't support ranges - return full file with 200
      stats.totalBytesSent += data.length;
      return res.status(200).header('Content-Length', data.length.toString()).body(data.buffer);
    }

    const [start, end] = rangeHeader.replace('bytes=', '').split('-').map(Number);
    const actualEnd = isNaN(end) ? data.length - 1 : Math.min(end, data.length - 1);

    if (start >= data.length) {
      return res.status(416).reason('Requested range not satisfiable');
    }

    const slicedData = data.slice(start, actualEnd + 1);
    stats.totalBytesSent += slicedData.length;

    return res
      .status(206)
      .header('Content-Range', `bytes ${start}-${actualEnd}/${data.length}`)
      .header('Content-Length', slicedData.length.toString())
      .header('Accept-Ranges', 'bytes')
      .body(slicedData.buffer);
  });

  return stats;
}

// =============================================================================
// Test Helper Factories
// =============================================================================

/**
 * Standard test scenarios for common file sizes.
 */
const TestScenarios = {
  SMALL_FILE: { size: 500 * 1024, url: 'small.zip' },
  LARGE_FILE: { size: 5 * 1024 * 1024, url: 'large.zip' },
  MEDIUM_FILE: { size: 1.5 * 1024 * 1024, url: 'medium.zip' },
  TINY_FILE: { size: 100 * 1024, url: 'tiny.zip' },
};

/**
 * Factory to create a reader with mock server setup.
 * Reduces boilerplate for tests that need a fully initialized reader.
 * @param {object} scenario - Test scenario with size and url (or custom {size, url})
 * @param {object} options - Additional options
 * @param {number} options.maxFullLoadSize - Override maxFullLoadSize
 * @param {number} options.largeMediaThreshold - Override largeMediaThreshold
 * @param {number} options.chunkSize - Override chunkSize
 * @param {object} options.serverOptions - Options passed to createMockServer
 * @returns {Promise<{reader: AdaptiveHttpReader, data: Uint8Array, stats: object}>} -
 * Reader, generated test bytes, and mock-server request stats
 */
async function setupReader(scenario, options = {}) {
  const data = createTestData(scenario.size);
  const stats = createMockServer(data, scenario.url, options.serverOptions || {});

  const reader = new AdaptiveHttpReader(scenario.url, {
    maxFullLoadSize: options.maxFullLoadSize ?? TEST_MAX_SIZE,
    largeMediaThreshold: options.largeMediaThreshold ?? LARGE_MEDIA_THRESHOLD,
    chunkSize: options.chunkSize,
  });

  await reader.init();

  return { reader, data, stats };
}

/**
 * Create a reader without initializing (for testing constructor/pre-init behavior).
 * @param {string} url - URL for the ZIP resource
 * @param {object} [options] - Reader overrides
 * @returns {AdaptiveHttpReader} - Uninitialised reader
 */
function createReader(url, options = {}) {
  return new AdaptiveHttpReader(url, {
    maxFullLoadSize: options.maxFullLoadSize ?? TEST_MAX_SIZE,
    largeMediaThreshold: options.largeMediaThreshold ?? LARGE_MEDIA_THRESHOLD,
    chunkSize: options.chunkSize,
  });
}

// =============================================================================
// Entry Creation Helpers (for chunk tests)
// =============================================================================

/**
 * Build a ZIP central-directory entry descriptor for feeding into `_buildChunks()`.
 * @param {string} filename - Path recorded on the entry
 * @param {number} offset - Byte offset in ZIP file
 * @param {number} size - Compressed size (uncompressed defaults to same)
 * @param {object} [options] - Additional overrides (uncompressedSize, directory)
 * @param {number} options.uncompressedSize - Override uncompressed size
 * @param {boolean} options.directory - Mark as directory entry
 * @returns {object} Entry object compatible with _buildChunks()
 */
function createEntry(filename, offset, size, options = {}) {
  return {
    filename,
    offset,
    compressedSize: size,
    uncompressedSize: options.uncompressedSize ?? size,
    directory: options.directory ?? false,
  };
}

/**
 * Create multiple entries from compact specifications.
 * Each spec is [filename, offset, size] or [filename, offset, size, options].
 * @param {...Array} specs - Entry specifications
 * @returns {Array} Array of entry objects
 * @example
 * createEntries(
 *   ['a.txt', 0, 100],
 *   ['b.txt', 200, 100],
 *   ['large.mp4', 500, 5000],
 * )
 */
function createEntries(...specs) {
  return specs.map(([filename, offset, size, options]) =>
    createEntry(filename, offset, size, options || {}),
  );
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Shared Jest assertion helpers used across AdaptiveHttpReader suites.
 */
const expectations = {
  /**
   * Assert reader is in lazy mode (large file was detected).
   * @param {AdaptiveHttpReader} reader - Reader under test
   * @param {number} [expectedSize] - Optional expected total size
   */
  lazyMode: (reader, expectedSize) => {
    expect(reader.useLazyMode).toBe(true);
    expect(reader._fullData).toBeNull();
    if (expectedSize !== undefined) {
      expect(reader.size).toBe(expectedSize);
    }
  },

  /**
   * Assert reader is in fast mode (small file, fully cached).
   * @param {AdaptiveHttpReader} reader - Reader under test
   * @param {number} [expectedSize] - Optional expected byte length of cached data
   */
  fastMode: (reader, expectedSize) => {
    expect(reader.useLazyMode).toBe(false);
    expect(reader._fullData).not.toBeNull();
    if (expectedSize !== undefined) {
      expect(reader._fullData.byteLength).toBe(expectedSize);
    }
  },

  /**
   * Assert only a single full (non-range) request was made.
   * @param {object} stats - Mock server stats
   */
  singleFullRequest: stats => {
    expect(stats.requestCount).toBe(1);
    expect(stats.requests[0].type).toBe('full');
    expect(stats.requests[0].rangeHeader).toBeFalsy();
  },

  /**
   * Assert no range requests were made.
   * @param {object} stats - Mock server stats
   */
  noRangeRequests: stats => {
    const rangeRequests = stats.requests.filter(r => r.type === 'range');
    expect(rangeRequests.length).toBe(0);
  },

  /**
   * Assert at least one range request was made.
   * @param {object} stats - Mock server stats
   */
  hasRangeRequests: stats => {
    const rangeRequests = stats.requests.filter(r => r.type === 'range');
    expect(rangeRequests.length).toBeGreaterThan(0);
  },

  /**
   * Assert exact number of range requests.
   * @param {object} stats - Mock server stats
   * @param {number} count - Expected range request count
   */
  rangeRequestCount: (stats, count) => {
    const rangeRequests = stats.requests.filter(r => r.type === 'range');
    expect(rangeRequests.length).toBe(count);
  },

  /**
   * Assert request count hasn't changed from baseline.
   * @param {object} stats - Mock server stats
   * @param {number} baseline - Previous requestCount to compare against
   */
  noAdditionalRequests: (stats, baseline) => {
    expect(stats.requestCount).toBe(baseline);
  },

  /**
   * Verify data correctness using createTestData's i % 256 pattern.
   * @param {Uint8Array} chunk - Chunk to inspect
   * @param {number} startOffset - Offset at which the chunk begins
   */
  dataMatches: (chunk, startOffset) => {
    expect(chunk[0]).toBe(startOffset % 256);
    if (chunk.length > 1) {
      expect(chunk[chunk.length - 1]).toBe((startOffset + chunk.length - 1) % 256);
    }
  },
};

describe('AdaptiveHttpReader', () => {
  beforeEach(() => {
    xhrMock.setup();
    jest
      .spyOn(global.URL, 'createObjectURL')
      .mockImplementation(() => `blob:mock-${Math.random().toString(36).substring(2, 11)}`);
    jest.spyOn(global.URL, 'revokeObjectURL').mockImplementation(() => {});
  });
  afterEach(() => {
    xhrMock.teardown();
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('sets maxFullLoadSize and largeMediaThreshold from options', () => {
      const reader = new AdaptiveHttpReader('test.zip', {
        maxFullLoadSize: 5 * 1024 * 1024,
        largeMediaThreshold: 1 * 1024 * 1024,
      });

      expect(reader.maxFullLoadSize).toBe(5 * 1024 * 1024);
      expect(reader.largeMediaThreshold).toBe(1 * 1024 * 1024);
    });

    it('uses defaults when options not provided', () => {
      const reader = new AdaptiveHttpReader('test.zip');

      expect(reader.maxFullLoadSize).toBe(DEFAULT_MAX_FULL_LOAD_SIZE);
      expect(reader.largeMediaThreshold).toBe(DEFAULT_LARGE_MEDIA_THRESHOLD);
    });
  });

  describe('Fast path (small files < maxFullLoadSize)', () => {
    it('downloads entire file in ONE request (no Range header)', async () => {
      const { stats } = await setupReader(TestScenarios.SMALL_FILE);
      expectations.singleFullRequest(stats);
    });

    it('sets useLazyMode to false for small files', async () => {
      const { reader } = await setupReader(TestScenarios.SMALL_FILE);
      expect(reader.useLazyMode).toBe(false);
    });

    it('caches full data in _fullData', async () => {
      const { reader, data } = await setupReader(TestScenarios.SMALL_FILE);
      expectations.fastMode(reader, data.length);
    });

    it('readUint8Array() returns data from cached _fullData (no additional requests)', async () => {
      const { reader, stats } = await setupReader(TestScenarios.SMALL_FILE);

      const chunk = await reader.readUint8Array(100, 50);

      expect(stats.requestCount).toBe(1);
      expect(chunk.length).toBe(50);
      expectations.dataMatches(chunk, 100);
    });

    it('does NOT make any Range requests for small files', async () => {
      const { reader, stats } = await setupReader(TestScenarios.SMALL_FILE);

      await reader.readUint8Array(0, 100);
      await reader.readUint8Array(1000, 200);
      await reader.readUint8Array(5000, 500);

      expectations.noRangeRequests(stats);
    });
  });

  describe('Lazy path - ABORT ON LARGE FILE (CORE FEATURE)', () => {
    it('aborts download when Content-Length header > maxFullLoadSize', async () => {
      const { reader, data } = await setupReader(TestScenarios.LARGE_FILE);
      // Note: xhr-mock doesn't accurately simulate abort behavior (sends full body synchronously)
      // In real browsers, xhr.abort() prevents body download after headers are received
      expectations.lazyMode(reader, data.length);
    });

    it('sets useLazyMode to true after abort', async () => {
      const { reader } = await setupReader(TestScenarios.LARGE_FILE);
      expect(reader.useLazyMode).toBe(true);
    });

    it('does NOT download full file - _fullData is null after abort', async () => {
      const { reader } = await setupReader(TestScenarios.LARGE_FILE);
      // Note: xhr-mock doesn't accurately simulate network-level abort, but the code
      // correctly rejects and doesn't assign _fullData when Content-Length > threshold
      expectations.lazyMode(reader);
    });

    it('correctly reports file size after abort', async () => {
      const { reader, data } = await setupReader(TestScenarios.LARGE_FILE);
      expect(reader.size).toBe(data.length);
    });
  });

  describe('Lazy path - Range requests', () => {
    it('readUint8Array() makes Range request for large files', async () => {
      const { reader, stats } = await setupReader(TestScenarios.LARGE_FILE);

      await reader.readUint8Array(1000, 500);

      expectations.hasRangeRequests(stats);
    });

    it('only downloads requested byte range', async () => {
      const { reader, stats } = await setupReader(TestScenarios.LARGE_FILE);
      const initialBytesSent = stats.totalBytesSent;

      await reader.readUint8Array(1000, 500);

      // Should have only downloaded ~500 bytes more, not the full file
      const additionalBytes = stats.totalBytesSent - initialBytesSent;
      expect(additionalBytes).toBeLessThan(10000);
    });
  });

  describe('Fallback (server does not support ranges)', () => {
    it('completes full download if server returns 200 for Range request', async () => {
      const { reader, data } = await setupReader(
        { size: 500 * 1024, url: 'no-range.zip' },
        { serverOptions: { supportsRanges: false } },
      );
      expect(reader.size).toBe(data.length);
      expect(reader._fullData).not.toBeNull();
    });

    it('sets useLazyMode to false when ranges not supported', async () => {
      const { reader } = await setupReader(
        { size: 500 * 1024, url: 'no-range.zip' },
        { serverOptions: { supportsRanges: false } },
      );
      expect(reader.useLazyMode).toBe(false);
    });
  });

  describe('shouldLoadFromUrl()', () => {
    // Parameterized tests for media type detection
    const mediaTypeTestCases = [
      // [filename, size in KB, expected result, description]
      ['media/video.mp4', 600, true, 'large video (.mp4)'],
      ['media/audio.mp3', 600, true, 'large audio (.mp3)'],
      ['media/video.webm', 600, true, 'large video (.webm)'],
      ['media/audio.ogg', 600, true, 'large audio (.ogg)'],
      ['media/small-video.mp4', 400, false, 'small video (below threshold)'],
      ['data/large-data.json', 600, false, 'large non-media (.json)'],
      ['docs/readme.txt', 600, false, 'large text (.txt)'],
    ];

    it.each(mediaTypeTestCases)('returns %s for %s', (filename, sizeKB, expected) => {
      const reader = createReader('test.zip');
      const entry = { filename, uncompressedSize: sizeKB * 1024 };
      expect(reader.shouldLoadFromUrl(entry)).toBe(expected);
    });
  });

  describe('XHR compatibility', () => {
    it('uses XMLHttpRequest, not fetch, for all requests', async () => {
      const url = 'small.zip';
      const smallData = createTestData(500 * 1024);
      createMockServer(smallData, url);

      // Set up fetch as a mock that would throw if called
      const originalFetch = global.fetch;
      let fetchCalled = false;
      global.fetch = jest.fn(() => {
        fetchCalled = true;
        throw new Error('fetch should not be called');
      });

      try {
        const reader = new AdaptiveHttpReader(url, {
          maxFullLoadSize: TEST_MAX_SIZE,
        });
        await reader.init();

        // fetch should NOT have been called - XHR is used instead
        expect(fetchCalled).toBe(false);
      } finally {
        // Restore original (which may not exist)
        if (originalFetch) {
          global.fetch = originalFetch;
        } else {
          delete global.fetch;
        }
      }
    });
  });

  describe('Lazy path - onprogress fallback (no Content-Length header)', () => {
    // These tests use a custom XHR mock to simulate onprogress being triggered
    // before the full response is available (xhr-mock sends everything synchronously)
    it('aborts download when loaded bytes > maxFullLoadSize and lengthComputable', async () => {
      const OriginalXHR = global.XMLHttpRequest;
      const totalSize = 5 * 1024 * 1024; // 5MB

      let abortCalled = false;

      class MockXHR {
        constructor() {
          this.readyState = 0;
          this.status = 0;
          this.response = null;
          this.responseType = '';
          this._listeners = {};
        }

        addEventListener(event, handler) {
          this._listeners[event] = handler;
        }

        open() {
          this.readyState = 1;
        }

        setRequestHeader() {}

        getResponseHeader(name) {
          if (name === 'Content-Length') return null;
          return null;
        }

        send() {
          this.readyState = 2;
          if (this._listeners.readystatechange) this._listeners.readystatechange();

          if (this._listeners.progress) {
            this._listeners.progress({
              loaded: 2 * 1024 * 1024,
              lengthComputable: true,
              total: totalSize,
            });
          }
        }

        abort() {
          abortCalled = true;
          if (this._listeners.abort) this._listeners.abort();
        }
      }

      global.XMLHttpRequest = MockXHR;

      try {
        const reader = new AdaptiveHttpReader('test.zip', {
          maxFullLoadSize: TEST_MAX_SIZE, // 1MB
        });

        await reader.init();

        expect(abortCalled).toBe(true);
        expect(reader.useLazyMode).toBe(true);
        expect(reader._fullData).toBeNull();
        expect(reader.size).toBe(totalSize);
      } finally {
        global.XMLHttpRequest = OriginalXHR;
      }
    });

    it('completes full download when size is unknown (lengthComputable false)', async () => {
      const OriginalXHR = global.XMLHttpRequest;
      const fileData = createTestData(2 * 1024 * 1024); // 2MB file

      class MockXHR {
        constructor() {
          this.readyState = 0;
          this.status = 0;
          this.response = null;
          this.responseType = '';
          this._listeners = {};
        }

        addEventListener(event, handler) {
          this._listeners[event] = handler;
        }

        open() {
          this.readyState = 1;
        }

        setRequestHeader() {}

        getResponseHeader(name) {
          if (name === 'Content-Length') return null;
          return null;
        }

        send() {
          this.readyState = 2;
          if (this._listeners.readystatechange) this._listeners.readystatechange();

          // onprogress fires with loaded > threshold but size is unknown
          if (this._listeners.progress) {
            this._listeners.progress({ loaded: 2 * 1024 * 1024, lengthComputable: false });
          }

          // Without knowing total size, lazy mode can't work — download completes
          this.status = 200;
          this.response = fileData.buffer;
          if (this._listeners.load) this._listeners.load();
        }

        abort() {
          if (this._listeners.abort) this._listeners.abort();
        }
      }

      global.XMLHttpRequest = MockXHR;

      try {
        const reader = new AdaptiveHttpReader('test.zip', {
          maxFullLoadSize: TEST_MAX_SIZE, // 1MB
        });

        await reader.init();

        // Without knowing the total size, lazy mode can't work
        expect(reader.useLazyMode).toBe(false);
        expect(reader._fullData).not.toBeNull();
        expect(reader.size).toBe(fileData.byteLength);
      } finally {
        global.XMLHttpRequest = OriginalXHR;
      }
    });
  });

  describe('Error handling - full download', () => {
    it('throws on HTTP error (4xx/5xx status)', async () => {
      xhrMock.reset();
      xhrMock.get('error.zip', (req, res) => {
        return res.status(404).reason('Not Found');
      });

      const reader = new AdaptiveHttpReader('error.zip', {
        maxFullLoadSize: TEST_MAX_SIZE,
      });

      await expect(reader.init()).rejects.toThrow('HTTP error: 404');
    });

    it('throws on network error', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      xhrMock.reset();
      xhrMock.get('network-error.zip', () => Promise.reject(new Error('Network error')));

      const reader = new AdaptiveHttpReader('network-error.zip', {
        maxFullLoadSize: TEST_MAX_SIZE,
      });

      await expect(reader.init()).rejects.toThrow('Network error');
      console.error.mockRestore(); // eslint-disable-line no-console
    });
  });

  describe('Error handling - range requests', () => {
    it('throws on HTTP error during range request', async () => {
      const url = 'large-error.zip';
      const largeData = createTestData(5 * 1024 * 1024);

      // First request succeeds (to get into lazy mode), range requests fail
      xhrMock.reset();
      xhrMock.get(url, (req, res) => {
        const rangeHeader = req.header('Range');

        if (!rangeHeader) {
          // Initial request - return Content-Length to trigger lazy mode
          return res
            .status(200)
            .header('Content-Length', largeData.length.toString())
            .body(largeData.buffer);
        }

        // Range request - return error
        return res.status(500).reason('Internal Server Error');
      });

      const reader = new AdaptiveHttpReader(url, {
        maxFullLoadSize: TEST_MAX_SIZE,
      });

      await reader.init();
      expect(reader.useLazyMode).toBe(true);

      // Range request should fail
      await expect(reader.readUint8Array(1000, 500)).rejects.toThrow('HTTP error: 500');
    });

    it('throws on network error during range request', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const url = 'large-network-error.zip';
      const largeData = createTestData(5 * 1024 * 1024);

      xhrMock.reset();
      xhrMock.get(url, (req, res) => {
        const rangeHeader = req.header('Range');

        if (!rangeHeader) {
          return res
            .status(200)
            .header('Content-Length', largeData.length.toString())
            .body(largeData.buffer);
        }

        // Range request - network error
        return Promise.reject(new Error('Network error'));
      });

      const reader = new AdaptiveHttpReader(url, {
        maxFullLoadSize: TEST_MAX_SIZE,
      });

      await reader.init();
      expect(reader.useLazyMode).toBe(true);

      await expect(reader.readUint8Array(1000, 500)).rejects.toThrow('Network error');
      console.error.mockRestore(); // eslint-disable-line no-console
    });
  });

  describe('Range request data correctness', () => {
    it('returns correct bytes for requested range', async () => {
      const { reader } = await setupReader(TestScenarios.LARGE_FILE);
      expect(reader.useLazyMode).toBe(true);

      const chunk = await reader.readUint8Array(1000, 500);

      expect(chunk.length).toBe(500);
      expectations.dataMatches(chunk, 1000);
    });
  });

  describe('Chunked fetching - _buildChunks()', () => {
    it('creates a single chunk from adjacent small entries', () => {
      const reader = createReader('test.zip', { chunkSize: 10000 });
      reader._useLazyMode = true;

      const entries = createEntries(['a.txt', 0, 100], ['b.txt', 200, 100]);
      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(1);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[0].data).toBeNull();
      expect(chunks[0].fetching).toBeNull();
    });

    // Large file boundary tests
    it('single large file between small files creates two separate chunks', () => {
      const reader = createReader('test.zip', { chunkSize: 10000, largeMediaThreshold: 500 });
      const entries = createEntries(
        ['small1.txt', 0, 100],
        ['large.mp4', 200, 600],
        ['small2.txt', 1000, 100],
      );

      const chunks = reader._buildChunks(entries);

      // small1.txt endOffset = offset + header + filename + extra_estimate + compressedSize
      const expectedEnd =
        0 + ZIP_LOCAL_HEADER_SIZE + 'small1.txt'.length + ZIP_EXTRA_FIELD_ESTIMATE + 100;
      expect(chunks.length).toBe(2);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[0].endOffset).toBeLessThanOrEqual(expectedEnd);
      expect(chunks[1].startOffset).toBe(1000);
    });

    it('large file at start of entries - first chunk starts after it', () => {
      const reader = createReader('test.zip', { chunkSize: 10000, largeMediaThreshold: 500 });
      const entries = createEntries(
        ['large.mp4', 0, 600],
        ['small1.txt', 800, 100],
        ['small2.txt', 1000, 100],
      );

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(1);
      expect(chunks[0].startOffset).toBe(800);
    });

    it('large file at end of entries - last chunk ends before it', () => {
      const reader = createReader('test.zip', { chunkSize: 10000, largeMediaThreshold: 500 });
      const entries = createEntries(
        ['small1.txt', 0, 100],
        ['small2.txt', 200, 100],
        ['large.mp4', 500, 600],
      );

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(1);
      expect(chunks[0].endOffset).toBeLessThan(500);
    });

    it('two consecutive large files - gap between chunks', () => {
      const reader = createReader('test.zip', { chunkSize: 10000, largeMediaThreshold: 500 });
      const entries = createEntries(
        ['small1.txt', 0, 100],
        ['large1.mp4', 200, 600],
        ['large2.mp4', 1000, 600],
        ['small2.txt', 2000, 100],
      );

      const chunks = reader._buildChunks(entries);

      const expectedEnd =
        0 + ZIP_LOCAL_HEADER_SIZE + 'small1.txt'.length + ZIP_EXTRA_FIELD_ESTIMATE + 100;
      expect(chunks.length).toBe(2);
      expect(chunks[0].endOffset).toBeLessThanOrEqual(expectedEnd);
      expect(chunks[1].startOffset).toBe(2000);
    });

    it('small file sandwiched between two large files - very small chunk', () => {
      const reader = createReader('test.zip', { chunkSize: 10000, largeMediaThreshold: 500 });
      const entries = createEntries(
        ['large1.mp4', 0, 600],
        ['tiny.txt', 800, 50],
        ['large2.mp4', 1000, 600],
      );

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(1);
      expect(chunks[0].startOffset).toBe(800);
      expect(chunks[0].endOffset).toBeLessThan(1000);
    });

    it('multiple large files interspersed - multiple small chunks', () => {
      const reader = createReader('test.zip', { chunkSize: 10000, largeMediaThreshold: 500 });
      const entries = createEntries(
        ['small1.txt', 0, 100],
        ['large1.mp4', 200, 600],
        ['small2.txt', 1000, 100],
        ['large2.mp4', 1200, 600],
        ['small3.txt', 2000, 100],
      );

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(3);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[1].startOffset).toBe(1000);
      expect(chunks[2].startOffset).toBe(2000);
    });

    // Greedy inclusion tests (no cap on overshoot)
    it('chunk at 90% capacity includes next small file even if it exceeds chunkSize', () => {
      const reader = createReader('test.zip', { chunkSize: 1000, largeMediaThreshold: 5000 });
      const entries = createEntries(['a.txt', 0, 850], ['b.txt', 950, 200]);

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(1);
    });

    it('chunk at 90% capacity includes file that makes it 150% - no cap on overshoot', () => {
      const reader = createReader('test.zip', { chunkSize: 1000, largeMediaThreshold: 5000 });
      const entries = createEntries(['a.txt', 0, 850], ['b.txt', 950, 600]);

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(1);
    });

    it('chunk at 100%+ capacity starts new chunk for next file', () => {
      const reader = createReader('test.zip', { chunkSize: 1000, largeMediaThreshold: 5000 });
      const entries = createEntries(['a.txt', 0, 950], ['b.txt', 1050, 200], ['c.txt', 1350, 100]);

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(2);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[1].startOffset).toBe(1050);
    });

    it('single file larger than chunkSize but smaller than largeMediaThreshold - its own chunk', () => {
      const reader = createReader('test.zip', { chunkSize: 500, largeMediaThreshold: 5000 });
      const entries = createEntries(['medium.txt', 0, 800], ['small.txt', 1000, 100]);

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(2);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[1].startOffset).toBe(1000);
    });

    // Edge case tests
    it('entries not sorted by offset - sorts them before processing', () => {
      const reader = createReader('test.zip', { chunkSize: 10000 });
      // Entries in random order
      const entries = createEntries(['c.txt', 400, 100], ['a.txt', 0, 100], ['b.txt', 200, 100]);

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(1);
      expect(chunks[0].startOffset).toBe(0);
    });

    it('directory entries in list - filtered out', () => {
      const reader = createReader('test.zip', { chunkSize: 10000 });
      const entries = [
        createEntry('folder/', 0, 0, { directory: true }),
        createEntry('folder/a.txt', 100, 100),
        createEntry('another/', 300, 0, { directory: true }),
        createEntry('folder/b.txt', 400, 100),
      ];

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(1);
      // Chunk should only include file entries, not directories
      expect(chunks[0].startOffset).toBe(100);
    });

    it('entry with undefined offset - filtered out', () => {
      const reader = createReader('test.zip', { chunkSize: 10000 });
      const entries = [
        createEntry('a.txt', 0, 100),
        createEntry('nooffset.txt', undefined, 100),
        createEntry('b.txt', 200, 100),
      ];

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(1);
      expect(chunks[0].startOffset).toBe(0);
    });

    it('very small chunkSize - many single-file chunks', () => {
      const reader = createReader('test.zip', { chunkSize: 50 });
      const entries = createEntries(['a.txt', 0, 100], ['b.txt', 200, 100], ['c.txt', 400, 100]);

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(3);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[1].startOffset).toBe(200);
      expect(chunks[2].startOffset).toBe(400);
    });

    it('very large chunkSize - single chunk for all files', () => {
      const reader = createReader('test.zip', { chunkSize: 1000000 });
      const entries = createEntries(
        ['a.txt', 0, 100],
        ['b.txt', 200, 100],
        ['c.txt', 400, 100],
        ['d.txt', 600, 100],
      );

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(1);
      expect(chunks[0].startOffset).toBe(0);
    });

    it('files with very long filenames - header size accounts for filename length', () => {
      const reader = createReader('test.zip', { chunkSize: 500 });
      const longFilename =
        'very/deeply/nested/directory/structure/with/many/levels/' + 'a'.repeat(200) + '.txt';
      const entries = [createEntry(longFilename, 0, 100), createEntry('b.txt', 500, 100)];

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(1);
    });

    it('empty entries array - returns empty chunks', () => {
      const reader = createReader('test.zip', { chunkSize: 10000 });

      const chunks = reader._buildChunks([]);

      expect(chunks).toEqual([]);
    });

    it('all entries are large files - returns empty chunks', () => {
      const reader = createReader('test.zip', { chunkSize: 10000, largeMediaThreshold: 500 });
      const entries = createEntries(['big1.mp4', 0, 1000], ['big2.mp4', 2000, 1000]);

      const chunks = reader._buildChunks(entries);

      expect(chunks).toEqual([]);
    });

    it('fine interleaving - alternating small-large-small-large pattern', () => {
      const reader = createReader('test.zip', { chunkSize: 500, largeMediaThreshold: 400 });
      const entries = createEntries(
        ['s1.txt', 0, 100],
        ['L1.mp4', 200, 500],
        ['s2.txt', 800, 100],
        ['L2.mp4', 1000, 500],
        ['s3.txt', 1600, 100],
        ['L3.mp4', 1800, 500],
        ['s4.txt', 2400, 100],
      );

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(4);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[1].startOffset).toBe(800);
      expect(chunks[2].startOffset).toBe(1600);
      expect(chunks[3].startOffset).toBe(2400);
    });

    it('many small files with occasional large files - realistic H5P scenario', () => {
      const reader = createReader('test.zip', { chunkSize: 2000, largeMediaThreshold: 500 });

      // Build entries programmatically for H5P-like scenario
      const entries = [];
      let offset = 0;

      // First batch: 15 small files
      for (let i = 0; i < 15; i++) {
        entries.push(createEntry(`content/data${i}.json`, offset, 50));
        offset += 100;
      }
      // Large video
      entries.push(createEntry('content/video.mp4', offset, 10000));
      offset += 10500;
      // Second batch: 10 small files
      for (let i = 0; i < 10; i++) {
        entries.push(createEntry(`content/more${i}.json`, offset, 50));
        offset += 100;
      }
      // Large audio
      entries.push(createEntry('content/audio.mp3', offset, 5000));
      offset += 5500;
      // Final batch: 5 small files
      for (let i = 0; i < 5; i++) {
        entries.push(createEntry(`content/final${i}.json`, offset, 50));
        offset += 100;
      }

      const chunks = reader._buildChunks(entries);

      // Should have 3 groups of chunks (separated by 2 large files)
      expect(chunks.length).toBeGreaterThanOrEqual(3);

      // Verify first chunk starts at 0 (first small file)
      expect(chunks[0].startOffset).toBe(0);

      // Verify there's a chunk starting around 12000 (after video)
      const chunksAfterVideo = chunks.filter(c => c.startOffset >= 12000 && c.startOffset < 13000);
      expect(chunksAfterVideo.length).toBeGreaterThan(0);

      // Verify there's a chunk starting around 18500 (after audio)
      const chunksAfterAudio = chunks.filter(c => c.startOffset >= 18500);
      expect(chunksAfterAudio.length).toBeGreaterThan(0);
    });

    it('large non-media files are included in chunks', () => {
      const reader = createReader('test.zip', { chunkSize: 2000, largeMediaThreshold: 500 });

      const entries = [
        // Small file
        createEntry('content/data.json', 0, 50),
        // Large JS library (non-media, should be included in chunks)
        createEntry('H5P.ThreeJS-1.0/dist/three.min.js', 100, 800),
        // Large image (non-media, should be included in chunks)
        createEntry('content/images/panorama.jpg', 1000, 700),
        // Large video (media, should be excluded from chunks)
        createEntry('content/video.mp4', 2000, 5000),
        // Small file after video
        createEntry('content/info.json', 7500, 50),
      ];

      const chunks = reader._buildChunks(entries);

      // All non-media files (including large JS and image) should be covered by chunks.
      // Only the large video should be excluded.
      // So we expect chunks to cover offsets 0-1800ish and 7500+
      // The large JS file at offset 100 should be in a chunk
      const coversJS = chunks.some(c => c.startOffset <= 100 && c.endOffset > 100);
      expect(coversJS).toBe(true);

      // The large image at offset 1000 should be in a chunk
      const coversImage = chunks.some(c => c.startOffset <= 1000 && c.endOffset > 1000);
      expect(coversImage).toBe(true);

      // The large video at offset 2000 should NOT be in any chunk
      const coversVideo = chunks.some(c => c.startOffset <= 2000 && c.endOffset > 2000);
      expect(coversVideo).toBe(false);

      // The small file after the video should be in a chunk
      const coversAfterVideo = chunks.some(c => c.startOffset <= 7500 && c.endOffset > 7500);
      expect(coversAfterVideo).toBe(true);
    });

    it('media files exactly at threshold boundaries are excluded from chunks', () => {
      const reader = new AdaptiveHttpReader('test.zip', {
        chunkSize: 500,
        largeMediaThreshold: 500, // Exactly 500
      });

      const entries = [
        // Audio file exactly at threshold (should be excluded - large media)
        {
          filename: 'exact.mp3',
          offset: 0,
          compressedSize: 500,
          uncompressedSize: 500,
          directory: false,
        },
        // Small file (should be included)
        {
          filename: 'under.txt',
          offset: 600,
          compressedSize: 499,
          uncompressedSize: 499,
          directory: false,
        },
        // Video file over threshold (should be excluded - large media)
        {
          filename: 'over.mp4',
          offset: 1200,
          compressedSize: 501,
          uncompressedSize: 501,
          directory: false,
        },
        // Another small file
        {
          filename: 'small.txt',
          offset: 1800,
          compressedSize: 100,
          uncompressedSize: 100,
          directory: false,
        },
      ];

      const chunks = reader._buildChunks(entries);

      // Only 'under.txt' and 'small.txt' should be in chunks
      // They're separated by 'over.mp4' which is large media
      expect(chunks.length).toBe(2);
      expect(chunks[0].startOffset).toBe(600); // under.txt
      expect(chunks[1].startOffset).toBe(1800); // small.txt
    });

    it('large non-media files at threshold are included in chunks', () => {
      const reader = new AdaptiveHttpReader('test.zip', {
        chunkSize: 500,
        largeMediaThreshold: 500,
      });

      const entries = [
        // Large JS file at threshold (non-media, should be included)
        {
          filename: 'lib/three.min.js',
          offset: 0,
          compressedSize: 500,
          uncompressedSize: 500,
          directory: false,
        },
        // Large image over threshold (non-media, should be included)
        {
          filename: 'images/panorama.jpg',
          offset: 600,
          compressedSize: 700,
          uncompressedSize: 700,
          directory: false,
        },
      ];

      const chunks = reader._buildChunks(entries);

      // Both non-media files should be in chunks despite being >= threshold
      const coversJS = chunks.some(c => c.startOffset <= 0 && c.endOffset > 0);
      expect(coversJS).toBe(true);

      const coversImage = chunks.some(c => c.startOffset <= 600 && c.endOffset > 600);
      expect(coversImage).toBe(true);
    });

    it('stress test - 100+ entries with mixed sizes', () => {
      const reader = new AdaptiveHttpReader('test.zip', {
        chunkSize: 5000,
        largeMediaThreshold: 1000,
      });

      const entries = [];
      let offset = 0;

      for (let i = 0; i < 120; i++) {
        // Every 20th file is large
        const isLarge = i % 20 === 10;
        const size = isLarge ? 2000 : 100;

        entries.push({
          filename: `file${i}.${isLarge ? 'mp4' : 'json'}`,
          offset,
          compressedSize: size,
          uncompressedSize: size,
          directory: false,
        });
        offset += size + 50; // gap between files
      }

      const chunks = reader._buildChunks(entries);

      // Should have created multiple chunks
      expect(chunks.length).toBeGreaterThan(0);

      // Verify chunks are properly ordered
      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i].startOffset).toBeGreaterThan(chunks[i - 1].endOffset - 1);
      }

      // Verify no chunk is empty
      for (const chunk of chunks) {
        expect(chunk.endOffset).toBeGreaterThan(chunk.startOffset);
      }
    });

    it('realistic content types - HTML with many CSS/JS/image references', () => {
      const reader = createReader('test.zip', { chunkSize: 3000, largeMediaThreshold: 1000 });

      // Simulate a typical web content package with small files and two large files
      const entries = createEntries(
        ['index.html', 0, 200],
        ['css/style.css', 250, 150],
        ['css/theme.css', 450, 100],
        ['js/app.js', 600, 300],
        ['js/vendor.js', 950, 400],
        ['images/logo.png', 1400, 50],
        ['images/icon.svg', 1500, 30],
        ['images/background.jpg', 1580, 5000], // Large
        ['data/config.json', 6630, 100],
        ['data/strings.json', 6780, 200],
        ['media/intro.mp4', 7030, 50000], // Large
        ['manifest.json', 57080, 50],
      );

      const chunks = reader._buildChunks(entries);

      expect(chunks.length).toBe(3);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[1].startOffset).toBe(6630);
      expect(chunks[2].startOffset).toBe(57080);
    });
  });

  describe('Chunked fetching - _findChunk()', () => {
    // Shared chunk layout for most tests
    const threeChunks = [
      { startOffset: 0, endOffset: 100 },
      { startOffset: 100, endOffset: 200 },
      { startOffset: 300, endOffset: 400 },
    ];
    const twoChunks = [
      { startOffset: 0, endOffset: 100 },
      { startOffset: 100, endOffset: 200 },
    ];

    it('returns first chunk for offset in first chunk', () => {
      const reader = createReader('test.zip');
      reader._chunks = threeChunks;
      expect(reader._findChunk(50)).toBe(reader._chunks[0]);
    });

    it('returns middle chunk for offset in middle chunk', () => {
      const reader = createReader('test.zip');
      reader._chunks = threeChunks;
      expect(reader._findChunk(150)).toBe(reader._chunks[1]);
    });

    it('returns last chunk for offset in last chunk', () => {
      const reader = createReader('test.zip');
      reader._chunks = threeChunks;
      expect(reader._findChunk(350)).toBe(reader._chunks[2]);
    });

    it('returns chunk when offset exactly at startOffset', () => {
      const reader = createReader('test.zip');
      reader._chunks = twoChunks;
      expect(reader._findChunk(100)).toBe(reader._chunks[1]);
    });

    it('returns previous chunk when offset one byte before boundary', () => {
      const reader = createReader('test.zip');
      reader._chunks = twoChunks;
      expect(reader._findChunk(99)).toBe(reader._chunks[0]);
    });

    it('returns null for offset in gap between chunks (large file region)', () => {
      const reader = createReader('test.zip');
      reader._chunks = [
        { startOffset: 0, endOffset: 100 },
        { startOffset: 300, endOffset: 400 },
      ];
      expect(reader._findChunk(200)).toBeNull();
    });

    it('returns null for offset beyond all chunks', () => {
      const reader = createReader('test.zip');
      reader._chunks = [
        { startOffset: 0, endOffset: 100 },
        { startOffset: 100, endOffset: 200 },
      ];
      expect(reader._findChunk(500)).toBeNull();
    });

    it('returns null for empty chunks array', () => {
      const reader = createReader('test.zip');
      reader._chunks = [];
      expect(reader._findChunk(50)).toBeNull();
    });

    it('returns null when chunks is null', () => {
      const reader = createReader('test.zip');
      reader._chunks = null;
      expect(reader._findChunk(50)).toBeNull();
    });

    it('binary search scales efficiently with >1000 chunks', () => {
      const reader = createReader('test.zip');

      // Create 1500 contiguous chunks, each 1000 bytes
      reader._chunks = [];
      for (let i = 0; i < 1500; i++) {
        reader._chunks.push({
          startOffset: i * 1000,
          endOffset: (i + 1) * 1000,
          data: null,
          fetching: null,
        });
      }

      // Binary search should find correct chunk at various positions
      expect(reader._findChunk(0)).toBe(reader._chunks[0]);
      expect(reader._findChunk(500)).toBe(reader._chunks[0]);
      expect(reader._findChunk(999)).toBe(reader._chunks[0]);
      expect(reader._findChunk(1000)).toBe(reader._chunks[1]);
      expect(reader._findChunk(750000)).toBe(reader._chunks[750]);
      expect(reader._findChunk(1499000)).toBe(reader._chunks[1499]);
      expect(reader._findChunk(1499999)).toBe(reader._chunks[1499]);

      // Beyond last chunk returns null
      expect(reader._findChunk(1500000)).toBeNull();
    });
  });

  describe('Chunked fetching - _readFromChunk() and caching', () => {
    it('first read from chunk fetches via range request', async () => {
      const { reader, stats } = await setupReader(
        { size: 100000, url: 'chunked.zip' },
        { maxFullLoadSize: 1000 },
      );
      reader._chunks = [{ startOffset: 0, endOffset: 500, data: null, fetching: null }];

      await reader._readFromChunk(reader._chunks[0], 100, 50);

      expectations.hasRangeRequests(stats);
    });

    it('second read from same chunk does NOT make additional request (cached)', async () => {
      const { reader, stats } = await setupReader(
        { size: 100000, url: 'chunked-cached.zip' },
        { maxFullLoadSize: 1000 },
      );
      reader._chunks = [{ startOffset: 0, endOffset: 500, data: null, fetching: null }];

      await reader._readFromChunk(reader._chunks[0], 100, 50);
      const requestsAfterFirst = stats.requests.filter(r => r.type === 'range').length;

      await reader._readFromChunk(reader._chunks[0], 200, 50);
      const requestsAfterSecond = stats.requests.filter(r => r.type === 'range').length;

      expect(requestsAfterSecond).toBe(requestsAfterFirst);
    });

    it('reads from different chunks make separate fetches', async () => {
      const { reader, stats } = await setupReader(
        { size: 100000, url: 'multi-chunk.zip' },
        { maxFullLoadSize: 1000 },
      );
      reader._chunks = [
        { startOffset: 0, endOffset: 500, data: null, fetching: null },
        { startOffset: 1000, endOffset: 1500, data: null, fetching: null },
      ];

      await reader._readFromChunk(reader._chunks[0], 100, 50);
      const requestsAfterFirst = stats.requests.filter(r => r.type === 'range').length;

      await reader._readFromChunk(reader._chunks[1], 1100, 50);
      const requestsAfterSecond = stats.requests.filter(r => r.type === 'range').length;

      expect(requestsAfterSecond).toBe(requestsAfterFirst + 1);
    });

    it('concurrent reads from same unfetched chunk only make one fetch', async () => {
      const { reader, stats } = await setupReader(
        { size: 100000, url: 'concurrent.zip' },
        { maxFullLoadSize: 1000 },
      );
      reader._chunks = [{ startOffset: 0, endOffset: 500, data: null, fetching: null }];

      const [result1, result2] = await Promise.all([
        reader._readFromChunk(reader._chunks[0], 100, 50),
        reader._readFromChunk(reader._chunks[0], 200, 50),
      ]);

      const chunkRangeRequests = stats.requests.filter(
        r => r.type === 'range' && r.rangeHeader.includes('bytes=0-499'),
      );
      expect(chunkRangeRequests.length).toBe(1);
      expect(result1.length).toBe(50);
      expect(result2.length).toBe(50);
    });

    it('returns correct data slice from cached chunk', async () => {
      const { reader } = await setupReader(
        { size: 100000, url: 'slice.zip' },
        { maxFullLoadSize: 1000 },
      );
      reader._chunks = [{ startOffset: 1000, endOffset: 2000, data: null, fetching: null }];

      const result = await reader._readFromChunk(reader._chunks[0], 1100, 50);

      expect(result.length).toBe(50);
      expectations.dataMatches(result, 1100);
    });
  });

  describe('Chunked fetching - configureChunks()', () => {
    it('in lazy mode with valid entries - builds chunks and enables chunked fetching', async () => {
      const { reader } = await setupReader(
        { size: 100000, url: 'configure-lazy.zip' },
        { maxFullLoadSize: 1000, chunkSize: 5000, largeMediaThreshold: 10000 },
      );
      expect(reader.useLazyMode).toBe(true);

      const entries = createEntries(['a.txt', 0, 100], ['b.txt', 200, 100]);
      reader.configureChunks(entries);

      expect(reader.chunksConfigured).toBe(true);
      expect(reader._chunks.length).toBeGreaterThan(0);
    });

    it('in lazy mode with only large files - empty chunks array', async () => {
      const { reader } = await setupReader(
        { size: 100000, url: 'configure-large.zip' },
        { maxFullLoadSize: 1000, largeMediaThreshold: 100 },
      );

      const entries = createEntries(['large1.mp4', 0, 500], ['large2.mp4', 600, 500]);
      reader.configureChunks(entries);

      expect(reader.chunksConfigured).toBe(true);
      expect(reader._chunks).toEqual([]);
    });

    it('in lazy mode with empty entries - empty chunks array', async () => {
      const { reader } = await setupReader(
        { size: 100000, url: 'configure-empty.zip' },
        { maxFullLoadSize: 1000 },
      );

      reader.configureChunks([]);

      expect(reader.chunksConfigured).toBe(true);
      expect(reader._chunks).toEqual([]);
    });

    it('in fast mode with valid entries - chunksConfigured is true due to _fullData', async () => {
      const { reader } = await setupReader(
        { size: 500, url: 'configure-fast.zip' },
        { maxFullLoadSize: 100000 },
      );
      expect(reader.useLazyMode).toBe(false);
      expect(reader._fullData).not.toBeNull();
      expect(reader.chunksConfigured).toBe(true);

      const entries = createEntries(['a.txt', 0, 100], ['b.txt', 200, 100]);
      reader.configureChunks(entries);

      expect(reader.chunksConfigured).toBe(true);
    });

    it('called multiple times - idempotent, does not rebuild', async () => {
      const { reader } = await setupReader(
        { size: 100000, url: 'configure-idem.zip' },
        { maxFullLoadSize: 1000, chunkSize: 5000 },
      );

      const entries = createEntries(['a.txt', 0, 100]);
      reader.configureChunks(entries);
      const firstChunks = reader._chunks;

      reader.configureChunks(entries);

      expect(reader._chunks).toBe(firstChunks);
    });

    it('handles entry with null uncompressedSize gracefully', async () => {
      const { reader } = await setupReader(
        { size: 100000, url: 'null-size.zip' },
        { maxFullLoadSize: 1000 },
      );

      // Use createEntry but override uncompressedSize to null
      const entry = createEntry('file.txt', 1000, 100);
      entry.uncompressedSize = null;

      expect(() => reader.configureChunks([entry])).not.toThrow();
      expect(reader.chunksConfigured).toBe(true);
    });

    it('handles entry with undefined offset gracefully', async () => {
      const { reader } = await setupReader(
        { size: 100000, url: 'undef-offset.zip' },
        { maxFullLoadSize: 1000 },
      );

      // Use createEntry but override offset to undefined
      const entry = createEntry('file.txt', 0, 100);
      entry.offset = undefined;

      expect(() => reader.configureChunks([entry])).not.toThrow();
      expect(reader.chunksConfigured).toBe(true);
    });

    it('handles entries with zero sizes correctly', async () => {
      const { reader } = await setupReader(
        { size: 100000, url: 'zero-sizes.zip' },
        { maxFullLoadSize: 1000, chunkSize: 5000 },
      );

      const entries = createEntries(['empty.txt', 1000, 0], ['normal.txt', 2000, 500]);
      reader.configureChunks(entries);

      expect(reader.chunksConfigured).toBe(true);
      const normalChunk = reader._findChunk(2000);
      expect(normalChunk).toBeDefined();
    });
  });

  describe('Chunked fetching - readUint8Array() integration', () => {
    it('in fast mode - always reads from _fullData, no chunk logic', async () => {
      const { reader, stats } = await setupReader(
        { size: 500, url: 'read-fast.zip' },
        { maxFullLoadSize: 100000 },
      );
      expect(reader.useLazyMode).toBe(false);

      const result = await reader.readUint8Array(100, 50);

      expect(result.length).toBe(50);
      expectations.dataMatches(result, 100);
      expectations.noRangeRequests(stats);
    });

    it('in lazy mode with offset in chunk - fetches whole chunk, caches for subsequent reads', async () => {
      const { reader, stats } = await setupReader(
        { size: 100000, url: 'read-chunk.zip' },
        { maxFullLoadSize: 1000, chunkSize: 5000, largeMediaThreshold: 50000 },
      );

      const entries = createEntries(['a.txt', 0, 1000], ['b.txt', 1200, 1000]);
      reader.configureChunks(entries);

      const rangesBefore = stats.requests.filter(r => r.type === 'range').length;

      const result1 = await reader.readUint8Array(100, 50);
      const rangesAfterFirst = stats.requests.filter(r => r.type === 'range').length;

      const result2 = await reader.readUint8Array(500, 50);
      const rangesAfterSecond = stats.requests.filter(r => r.type === 'range').length;

      expect(result1.length).toBe(50);
      expect(result2.length).toBe(50);
      expect(rangesAfterFirst).toBe(rangesBefore + 1);
      expect(rangesAfterSecond).toBe(rangesAfterFirst);
    });

    it('in lazy mode with offset in large file gap - throws error after chunks configured', async () => {
      const { reader } = await setupReader(
        { size: 100000, url: 'read-gap.zip' },
        { maxFullLoadSize: 1000, chunkSize: 5000, largeMediaThreshold: 500 },
      );

      const entries = createEntries(
        ['small.txt', 0, 100],
        ['large.mp4', 500, 5000],
        ['small2.txt', 10000, 100],
      );
      reader.configureChunks(entries);

      // Read from within the large file gap (offset 500-10000) should throw error
      await expect(reader.readUint8Array(1000, 50)).rejects.toThrow('No chunk covers range');
    });

    it('in lazy mode with read extending beyond chunk boundary - throws error after chunks configured', async () => {
      const { reader } = await setupReader(
        { size: 100000, url: 'read-beyond.zip' },
        { maxFullLoadSize: 1000, chunkSize: 200, largeMediaThreshold: 50000 },
      );

      const entries = createEntries(['a.txt', 0, 100], ['b.txt', 150, 100]);
      reader.configureChunks(entries);

      await expect(reader.readUint8Array(200, 200)).rejects.toThrow('No chunk covers range');
    });

    it('in lazy mode reading large file data throws error after chunks configured', async () => {
      const { reader } = await setupReader(
        { size: 100000, url: 'read-large-file.zip' },
        { maxFullLoadSize: 1000, chunkSize: 5000, largeMediaThreshold: 500 },
      );

      const entries = createEntries(
        ['small1.txt', 0, 100],
        ['large-video.mp4', 300, 5000],
        ['small2.txt', 6000, 100],
      );
      reader.configureChunks(entries);

      expect(reader._chunks.length).toBe(2);

      const small1 = await reader.readUint8Array(0, 50);
      expect(small1.length).toBe(50);

      const small2 = await reader.readUint8Array(6000, 50);
      expect(small2.length).toBe(50);

      await expect(reader.readUint8Array(300, 100)).rejects.toThrow('No chunk covers range');
      await expect(reader.readUint8Array(1000, 500)).rejects.toThrow('No chunk covers range');
      await expect(reader.readUint8Array(5000, 100)).rejects.toThrow('No chunk covers range');
    });

    it('error message indicates large file without largeFileUrlGenerator', async () => {
      const { reader } = await setupReader(
        { size: 100000, url: 'error-msg.zip' },
        { maxFullLoadSize: 1000, largeMediaThreshold: 500 },
      );

      const entries = createEntries(['large-video.mp4', 0, 5000]);
      reader.configureChunks(entries);

      expect(reader._chunks).toEqual([]);
      await expect(reader.readUint8Array(100, 50)).rejects.toThrow(/largeFileUrlGenerator/);
    });

    it('in lazy mode with chunks not configured - falls back to range request', async () => {
      const { reader, stats } = await setupReader(
        { size: 100000, url: 'read-noconfig.zip' },
        { maxFullLoadSize: 1000 },
      );

      const rangesBefore = stats.requests.filter(r => r.type === 'range').length;
      const result = await reader.readUint8Array(1000, 50);
      const rangesAfter = stats.requests.filter(r => r.type === 'range').length;

      expect(result.length).toBe(50);
      expect(rangesAfter).toBe(rangesBefore + 1);
    });

    it('tail chunk bounds fallback - read before tail start falls back to range request', async () => {
      // Use a large file so tail prefetch only covers a small portion at the end
      const fileSize = 100000;
      const { reader, stats } = await setupReader(
        { size: fileSize, url: 'tail-fallback.zip' },
        { maxFullLoadSize: 1000 },
      );

      // The tail chunk will cover roughly the last ~3% of the file (CD_SIZE_RATIO = 0.03)
      // For 100000 bytes, tailSize = max(1024, floor(100000 * 0.03)) = 3000
      // tailStart = 100000 - 3000 = 97000
      // So _tailChunk covers [97000, 100000)

      // Trigger tail prefetch by reading near the end of file
      await reader.readUint8Array(fileSize - 50, 50);

      // Now read from BEFORE the tail chunk's startOffset
      // This should fall back to a range request instead of returning corrupted data
      const rangesAfterTail = stats.requests.filter(r => r.type === 'range').length;
      const result = await reader.readUint8Array(0, 100);
      const rangesAfterFallback = stats.requests.filter(r => r.type === 'range').length;

      expect(result.length).toBe(100);
      // Should have made an additional range request for the out-of-bounds read
      expect(rangesAfterFallback).toBeGreaterThan(rangesAfterTail);
    });
  });

  describe('shouldLoadFromUrl() edge cases', () => {
    // Parameterized edge case tests
    const edgeCaseTests = [
      // [filename, expected, description]
      ['README', false, 'file with no extension'],
      ['media/VIDEO.MP4', true, 'uppercase extension (.MP4)'],
      ['media/video.Mp4', true, 'mixed case extension (.Mp4)'],
      ['somefile.', false, 'file ending with dot'],
    ];

    it.each(edgeCaseTests)('handles %s correctly (%s)', (filename, expected) => {
      const reader = createReader('test.zip');
      const entry = { filename, uncompressedSize: 600 * 1024 };
      expect(reader.shouldLoadFromUrl(entry)).toBe(expected);
    });
  });
});
