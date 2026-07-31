// Polyfills for Node.js and older browsers (must be before zip.js import)
import 'fastestsmallesttextencoderdecoder';
import 'web-streams-polyfill/polyfill';
import { Reader, getMimeType } from '@zip.js/zip.js';

const DEFAULT_MAX_FULL_LOAD_SIZE = 2.5 * 1024 * 1024; // 2.5MB
const DEFAULT_LARGE_MEDIA_THRESHOLD = 500 * 1024; // 500KB
const DEFAULT_CHUNK_SIZE = 500 * 1024; // 500KB

// ZIP format constants (per PKWare APPNOTE.TXT specification)
// Local file header is exactly 30 bytes before filename/extra fields
const ZIP_LOCAL_HEADER_SIZE = 30;
// Conservative estimate for extra field length (varies, typically 0-100 bytes).
// ZIP64 extensions alone add 28 bytes, and tools may write timestamps, Unicode paths, etc.
// Overestimating wastes negligible bandwidth; underestimating risks missing chunk
// coverage. Only the last entry relies on it; the rest are clamped to the next offset.
const ZIP_EXTRA_FIELD_ESTIMATE = 100;

// Tail prefetch heuristics for Central Directory estimation
const MIN_TAIL_SIZE = 1024; // 1KB minimum (covers EOCD + a few entries)
const MAX_TAIL_SIZE = 128 * 1024; // 128KB maximum (avoid over-fetching)
const CD_SIZE_RATIO = 0.03; // Estimate CD is ~3% of total file size

// EOCD (End of Central Directory) is typically within the last ~22-65KB of a ZIP file.
// We use 100 bytes as a proximity threshold to trigger tail prefetching when
// zip.js reads near the end of file looking for EOCD signature.
const EOCD_PROXIMITY_THRESHOLD = 100;

// Range requests in flight, keyed by URL, so an overlapping pair is never issued together
// (#15103). Shared across readers: one built on navigation can outlive the requests of the
// one it replaced.
const inFlightRanges = new Map();

/**
 * AdaptiveHttpReader extends zip.js's Reader to provide adaptive fast/lazy loading for zip files.
 *
 * - Fast path: For small files (< maxFullLoadSize), downloads entire file in one request
 * - Lazy path: For large files (> maxFullLoadSize), aborts download and uses range requests
 *
 * Uses XHR only for iOS Safari 9.3 compatibility (no fetch API).
 *
 * Usage:
 * const reader = new AdaptiveHttpReader(url, {
 * maxFullLoadSize: 2.5 * 1024 * 1024,    // Threshold for lazy loading
 * largeMediaThreshold: 500 * 1024,         // Threshold for large media
 * });
 * await reader.init();
 * const data = await reader.readUint8Array(offset, length);
 */
export default class AdaptiveHttpReader extends Reader {
  /**
   * Construct a reader for a remote ZIP, configuring its full-load and chunking thresholds.
   * @param {string} url - URL of the ZIP file to read.
   * @param {object} [options] - Reader configuration.
   * @param {number} [options.maxFullLoadSize=2.5MB] - Files larger than this trigger lazy
   * loading with range requests instead of downloading entirely.
   * @param {number} [options.largeMediaThreshold=500KB] - Audio/video files larger than this
   * are excluded from chunks and expected to be served via a largeFileUrlGenerator.
   * @param {number} [options.chunkSize=500KB] - Target size for grouping adjacent small files
   * into single range requests.
   */
  constructor(
    url,
    {
      maxFullLoadSize = DEFAULT_MAX_FULL_LOAD_SIZE,
      largeMediaThreshold = DEFAULT_LARGE_MEDIA_THRESHOLD,
      chunkSize = DEFAULT_CHUNK_SIZE,
    } = {},
  ) {
    super();
    this.url = url;
    this.maxFullLoadSize = maxFullLoadSize;
    this.largeMediaThreshold = largeMediaThreshold;
    this.chunkSize = chunkSize;
    this._useLazyMode = false;
    this._fullData = null;
    this._chunks = null;
    this._tailChunk = null;
    this._tailPromise = null;
    this.size = 0;
  }

  /**
   * Returns true if the reader is in lazy mode (file > maxFullLoadSize).
   * @returns {boolean} True when range-request mode is in effect.
   */
  get useLazyMode() {
    return this._useLazyMode;
  }

  /**
   * Returns true if chunks have been configured (or aren't needed).
   * After this point, all reads should be served from chunks.
   * @returns {boolean} True once the reader is ready to serve reads.
   */
  get chunksConfigured() {
    return this._initialized && (!this._useLazyMode || this._fullData || this._chunks !== null);
  }

  /**
   * Estimate the Central Directory size based on total file size.
   * This is used to prefetch the tail of the file (EOCD + CD) in one request.
   *
   * Heuristic: For typical content zips, the Central Directory is roughly 1-3% of total size.
   * Each CD entry is ~46 bytes + filename length. For H5P/content zips with many small files,
   * the CD percentage is higher; for zips with few large files, it's lower.
   *
   * We use 3% as a conservative estimate, with bounds:
   * - Minimum 1KB (covers EOCD + a few entries)
   * - Maximum 128KB (avoid over-fetching for huge zips)
   * @returns {number} Estimated tail size to prefetch
   */
  _estimateTailSize() {
    return Math.min(MAX_TAIL_SIZE, Math.max(MIN_TAIL_SIZE, Math.floor(this.size * CD_SIZE_RATIO)));
  }

  /**
   * Initialize the reader - tries fast path first, falls back to lazy mode if file is too large.
   * This method is idempotent - if already initialized, it does nothing.
   * (zip.js may call init() internally, so we need to handle being called multiple times)
   */
  async init() {
    // Guard against multiple initialization (zip.js calls init() internally)
    if (this._initialized) {
      return;
    }
    this._initialized = true;

    try {
      this._fullData = await this._tryFullDownload();
      this.size = this._fullData.byteLength;
      this._useLazyMode = false;
    } catch (err) {
      if (err.message === 'File too large') {
        // File is too large - switch to lazy mode
        this._useLazyMode = true;
        // size was set in _tryFullDownload before abort
      } else {
        throw err;
      }
    }
  }

  /**
   * Attempt to download the full file. Aborts if Content-Length > maxFullLoadSize
   * or if loaded bytes > maxFullLoadSize.
   * @returns {Promise<Uint8Array>} The full file data
   * @throws {Error} 'File too large' if file exceeds maxFullLoadSize
   */
  _tryFullDownload() {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', this.url);
      xhr.responseType = 'arraybuffer';

      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
          const contentLength = parseInt(xhr.getResponseHeader('Content-Length'), 10);
          if (!isNaN(contentLength) && contentLength > this.maxFullLoadSize) {
            this.size = contentLength;
            xhr.abort();
            reject(new Error('File too large'));
          }
        }
      });

      xhr.addEventListener('progress', event => {
        if (event.loaded > this.maxFullLoadSize && event.lengthComputable) {
          this.size = event.total;
          xhr.abort();
          reject(new Error('File too large'));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(new Uint8Array(xhr.response));
        } else {
          reject(new Error(`HTTP error: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));

      xhr.send();
    });
  }

  /**
   * Read a range of bytes from the file.
   * - Fast path: returns data from cached _fullData
   * - Cached path: returns data from tail or entry chunks
   * - Lazy path: makes individual range request
   * @param {number} index - Start offset
   * @param {number} length - Number of bytes to read
   * @returns {Promise<Uint8Array>} The requested data
   */
  async readUint8Array(index, length) {
    if (this._fullData) {
      return this._fullData.slice(index, index + length);
    }

    // Try to serve from cached chunks (tail or entry-based)
    const chunk = this._findCachedChunk(index, length);
    if (chunk) {
      return this._readFromChunk(chunk, index, length);
    }

    // Before configureChunks() is called, allow range requests for zip parsing
    if (!this.chunksConfigured) {
      // Before a tail exists, EOF proximity seeds one; after, any read reaching it grows it down.
      const tailReach = this._tailChunk?.startOffset ?? this.size - EOCD_PROXIMITY_THRESHOLD;
      if (index + length >= tailReach) {
        await this._ensureTail(index);
      }
      return this._readRegion(index, index + length);
    }

    // After chunks are configured, all reads should be covered by chunks
    return this._readAcrossChunks(index, length);
  }

  /**
   * Read a span no single chunk covers from the chunks it crosses. Chunk ends are clamped
   * to the next entry's offset, so zip.js's fixed 16-byte data-descriptor read can cross a
   * boundary; requesting the span itself would overlap those chunks.
   * @param {number} index - Start offset
   * @param {number} length - Number of bytes to read
   * @returns {Promise<Uint8Array>} The requested data
   */
  async _readAcrossChunks(index, length) {
    const end = index + length;
    // Walk the span first, so an uncovered span throws before anything is fetched.
    const spanning = [];
    let offset = index;
    while (offset < end) {
      const chunk = this._findChunk(offset);
      if (!chunk) {
        throw new Error(
          `No chunk covers range ${index}-${end}. ` +
            `This may indicate a large file being extracted without a largeFileUrlGenerator.`,
        );
      }
      spanning.push(chunk);
      offset = chunk.endOffset;
    }

    const result = new Uint8Array(length);
    await Promise.all(
      spanning.map(chunk => {
        const partStart = Math.max(chunk.startOffset, index);
        const partLength = Math.min(chunk.endOffset, end) - partStart;
        return this._readFromChunk(chunk, partStart, partLength).then(part =>
          result.set(part, partStart - index),
        );
      }),
    );
    return result;
  }

  /**
   * Find a cached chunk that fully contains the requested range.
   * Checks both tail chunk and entry-based chunks.
   * @param {number} index - Start offset
   * @param {number} length - Number of bytes needed
   * @returns {object | null} Chunk object or null
   */
  _findCachedChunk(index, length) {
    // Check tail chunk first (covers end of file including CD)
    if (
      this._tailChunk &&
      index >= this._tailChunk.startOffset &&
      index + length <= this._tailChunk.endOffset
    ) {
      return this._tailChunk;
    }

    // Check entry-based chunks
    const chunk = this._findChunk(index);
    if (chunk && index + length <= chunk.endOffset) {
      return chunk;
    }

    return null;
  }

  /**
   * Make a range request for specific bytes, held back until no request for this URL has
   * an overlapping range in flight.
   * @param {number} start - Start offset
   * @param {number} length - Number of bytes to read
   * @returns {Promise<Uint8Array>} The requested data
   */
  async _rangeRequest(start, length) {
    const end = start + length;
    const inFlight = inFlightRanges.get(this.url) ?? new Set();
    inFlightRanges.set(this.url, inFlight);

    const overlapping = () => [...inFlight].filter(r => r.start < end && start < r.end);
    // Re-checked after each wait: another deferred request may have started meanwhile.
    for (let waiting = overlapping(); waiting.length; waiting = overlapping()) {
      await Promise.allSettled(waiting.map(r => r.response));
    }

    const request = { start, end, response: this._sendRangeRequest(start, length) };
    inFlight.add(request);
    try {
      return await request.response;
    } finally {
      inFlight.delete(request);
      if (!inFlight.size) {
        inFlightRanges.delete(this.url);
      }
    }
  }

  /**
   * Issue the range request itself, rejecting a body shorter than the range asked for.
   * @param {number} start - Start offset
   * @param {number} length - Number of bytes to read
   * @returns {Promise<Uint8Array>} The requested data
   */
  _sendRangeRequest(start, length) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', this.url);
      xhr.responseType = 'arraybuffer';
      xhr.setRequestHeader('Range', `bytes=${start}-${start + length - 1}`);

      xhr.addEventListener('load', () => {
        if (xhr.status === 206 || xhr.status === 200) {
          // No caller asks past EOF, so a short body is a fault, not a clip: slicing it
          // would hand zip.js a truncated deflate stream (#15103).
          const body = new Uint8Array(xhr.response);
          if (body.byteLength < length) {
            reject(
              new Error(
                `Truncated range response for bytes=${start}-${start + length - 1}: ` +
                  `expected ${length} bytes, received ${body.byteLength}`,
              ),
            );
            return;
          }
          resolve(body);
        } else {
          reject(new Error(`HTTP error: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.send();
    });
  }

  /**
   * Read [start, end), requesting only the bytes the prefetched tail does not already
   * hold so the request cannot overlap the tail's own.
   * @param {number} start - Start offset
   * @param {number} end - End offset, exclusive
   * @returns {Promise<Uint8Array>} The requested bytes
   */
  async _readRegion(start, end) {
    // Clamp to EOF: the last chunk's end is an estimate, and a short body must stay a fault.
    const stop = Math.min(end, this.size);
    const tail = this._tailChunk;
    if (!tail || stop <= tail.startOffset) {
      return this._rangeRequest(start, stop - start);
    }
    if (start >= tail.startOffset) {
      return tail.data.slice(start - tail.startOffset, stop - tail.startOffset);
    }
    const head = await this._rangeRequest(start, tail.startOffset - start);
    const cached = tail.data.subarray(0, stop - tail.startOffset);
    const region = new Uint8Array(head.length + cached.length);
    region.set(head);
    region.set(cached, head.length);
    return region;
  }

  /**
   * Seed or grow the tail chunk downwards to cover minStart, so a read below an
   * underestimated central directory never re-requests the tail's bytes.
   * @param {number} minStart - Lowest offset that must be covered
   * @returns {Promise} Resolves once _tailChunk covers [<= minStart, size)
   */
  _ensureTail(minStart) {
    const startOffset = Math.min(minStart, Math.max(0, this.size - this._estimateTailSize()));
    // Chained, so concurrent callers each fetch only the bytes the tail still lacks.
    this._tailPromise = Promise.resolve(this._tailPromise).then(async () => {
      if (this._tailChunk && startOffset >= this._tailChunk.startOffset) {
        return;
      }
      // _readRegion splices in whatever the current tail already holds.
      this._tailChunk = {
        startOffset,
        endOffset: this.size,
        data: await this._readRegion(startOffset, this.size),
      };
    });
    return this._tailPromise;
  }

  /**
   * Build chunk boundaries from entry metadata.
   * Groups adjacent small files into chunks of approximately chunkSize.
   * Large files (>= largeMediaThreshold) are excluded from chunks.
   * @param {Array} entries - Array of zip.js entry objects
   * @returns {Array} Array of chunk objects with startOffset, endOffset, data, fetching
   */
  _buildChunks(entries) {
    const sorted = entries.filter(e => e.offset !== undefined).sort((a, b) => a.offset - b.offset);

    const chunks = [];
    let currentChunk = null;

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      // Skipped rather than filtered out: a directory holds no data, but its local header
      // still bounds the entry before it.
      if (entry.directory) {
        continue;
      }

      // Only exclude files that will be served via URL generation (large audio/video).
      // Large non-media files (e.g. JS libraries, images) must remain in chunks
      // so they can be extracted in the frontend.
      if (this.shouldLoadFromUrl(entry)) {
        // Finalize current chunk before this file
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = null;
        }
        // Skip this entry - it will be served via URL generation
        continue;
      }

      const entryStart = entry.offset;
      // The next entry's offset is a hard upper bound on where this entry's data can end.
      const entryEnd = Math.min(
        entry.offset +
          ZIP_LOCAL_HEADER_SIZE +
          entry.filename.length +
          ZIP_EXTRA_FIELD_ESTIMATE +
          entry.compressedSize,
        sorted[i + 1]?.offset ?? Infinity,
      );

      if (!currentChunk) {
        // Start a new chunk with this entry
        currentChunk = { startOffset: entryStart, endOffset: entryEnd, data: null, fetching: null };
      } else {
        // Greedy inclusion: include next file if current chunk < chunkSize (before adding)
        // No cap on overshoot - always include if under threshold
        const currentChunkSize = currentChunk.endOffset - currentChunk.startOffset;
        if (currentChunkSize < this.chunkSize) {
          // Include this entry in current chunk (may overshoot)
          currentChunk.endOffset = entryEnd;
        } else {
          // Current chunk is at/over capacity, start a new one
          chunks.push(currentChunk);
          currentChunk = {
            startOffset: entryStart,
            endOffset: entryEnd,
            data: null,
            fetching: null,
          };
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Find the chunk containing the given byte offset using binary search.
   * Chunks are sorted by startOffset and do not overlap in valid ZIP files
   * (they may have gaps where large files were excluded).
   * @param {number} offset - Byte offset to find
   * @returns {object | null} Chunk object or null if not in any chunk
   */
  _findChunk(offset) {
    if (!this._chunks || this._chunks.length === 0) return null;

    // Binary search for the chunk with the highest startOffset <= offset
    let low = 0;
    let high = this._chunks.length - 1;
    let result = null;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const chunk = this._chunks[mid];

      if (chunk.startOffset <= offset) {
        // This chunk could contain the offset, but there might be a better one
        result = chunk;
        low = mid + 1; // Look for a chunk starting even later
      } else {
        high = mid - 1;
      }
    }

    // Verify the found chunk actually contains the offset
    if (result && offset < result.endOffset) {
      return result;
    }

    return null; // Offset not covered by any chunk (e.g., large file gap)
  }

  /**
   * Read data from a chunk, fetching it if necessary.
   * @param {object} chunk - Chunk object
   * @param {number} index - Absolute offset in ZIP file
   * @param {number} length - Number of bytes to read
   * @returns {Promise<Uint8Array>} The requested data
   */
  async _readFromChunk(chunk, index, length) {
    // Ensure chunk data is loaded (with promise deduplication for concurrent reads)
    if (!chunk.data) {
      if (!chunk.fetching) {
        chunk.fetching = this._readRegion(chunk.startOffset, chunk.endOffset).then(data => {
          chunk.data = data;
          chunk.fetching = null;
        });
      }
      await chunk.fetching;
    }

    // Calculate relative offset within chunk
    const relativeStart = index - chunk.startOffset;
    return chunk.data.slice(relativeStart, relativeStart + length);
  }

  /**
   * Configure chunked fetching based on entry metadata.
   * Must be called after init() and after ZIP entries are parsed.
   * @param {Array} entries - Array of zip.js entry objects with offset and compressedSize
   */
  configureChunks(entries) {
    // Only configure chunks once, and only in lazy mode
    if (this.chunksConfigured) {
      return;
    }

    this._chunks = this._buildChunks(entries);
  }

  /**
   * Check if a zip entry should use URL generation instead of extraction.
   * Returns true for large streamable media files (audio/video).
   * @param {object} entry - zip.js entry object with filename and uncompressedSize
   * @returns {boolean} true if file should use URL generator
   */
  shouldLoadFromUrl(entry) {
    // Only defer streamable media (audio/video) that benefits from range requests.
    // Note: getMimeType's typedef says "fileExtension" but it accepts full filenames
    // (it extracts the extension internally), as shown in zip.js's own examples.
    const mimeType = getMimeType(entry.filename);
    const isStreamableMedia = mimeType.startsWith('audio/') || mimeType.startsWith('video/');
    if (!isStreamableMedia) {
      return false;
    }
    return entry.uncompressedSize >= this.largeMediaThreshold;
  }
}
