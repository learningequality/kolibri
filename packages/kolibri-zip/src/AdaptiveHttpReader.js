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
// Overestimating wastes negligible bandwidth; underestimating risks missing chunk coverage.
const ZIP_EXTRA_FIELD_ESTIMATE = 100;

// Tail prefetch heuristics for Central Directory estimation
const MIN_TAIL_SIZE = 1024; // 1KB minimum (covers EOCD + a few entries)
const MAX_TAIL_SIZE = 128 * 1024; // 128KB maximum (avoid over-fetching)
const CD_SIZE_RATIO = 0.03; // Estimate CD is ~3% of total file size

// EOCD (End of Central Directory) is typically within the last ~22-65KB of a ZIP file.
// We use 100 bytes as a proximity threshold to trigger tail prefetching when
// zip.js reads near the end of file looking for EOCD signature.
const EOCD_PROXIMITY_THRESHOLD = 100;

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

    // Prefetch tail on first read near end of file (EOCD triggers this)
    if (!this._tailChunk && index + length >= this.size - EOCD_PROXIMITY_THRESHOLD) {
      // Use promise deduplication to prevent concurrent tail fetches
      if (!this._tailFetching) {
        const tailSize = this._estimateTailSize();
        const tailStart = Math.max(0, this.size - tailSize);
        this._tailFetching = this._rangeRequest(tailStart, this.size - tailStart).then(tailData => {
          this._tailChunk = { startOffset: tailStart, endOffset: this.size, data: tailData };
          this._tailFetching = null;
          return this._tailChunk;
        });
      }
      const tailChunk = await this._tailFetching;
      // The tail chunk always extends to EOF (endOffset === this.size), so reads
      // can only miss if they start before the cached region. This happens when
      // our CD size estimate was too small and zip.js needs earlier bytes.
      if (index < tailChunk.startOffset) {
        return this._rangeRequest(index, length);
      }
      const relativeStart = index - tailChunk.startOffset;
      return tailChunk.data.slice(relativeStart, relativeStart + length);
    }

    // Before configureChunks() is called, allow range requests for zip parsing
    if (!this.chunksConfigured) {
      return this._rangeRequest(index, length);
    }

    // After chunks are configured, all reads should be covered by chunks
    throw new Error(
      `No chunk covers range ${index}-${index + length}. ` +
        `This may indicate a large file being extracted without a largeFileUrlGenerator.`,
    );
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
   * Make a range request for specific bytes.
   * @param {number} start - Start offset
   * @param {number} length - Number of bytes to read
   * @returns {Promise<Uint8Array>} The requested data
   */
  _rangeRequest(start, length) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', this.url);
      xhr.responseType = 'arraybuffer';
      xhr.setRequestHeader('Range', `bytes=${start}-${start + length - 1}`);

      xhr.addEventListener('load', () => {
        if (xhr.status === 206 || xhr.status === 200) {
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
   * Build chunk boundaries from entry metadata.
   * Groups adjacent small files into chunks of approximately chunkSize.
   * Large files (>= largeMediaThreshold) are excluded from chunks.
   * @param {Array} entries - Array of zip.js entry objects
   * @returns {Array} Array of chunk objects with startOffset, endOffset, data, fetching
   */
  _buildChunks(entries) {
    // Filter out directories and entries without offset, sort by offset
    const fileEntries = entries
      .filter(e => !e.directory && e.offset !== undefined)
      .sort((a, b) => a.offset - b.offset);

    if (fileEntries.length === 0) return [];

    const chunks = [];
    let currentChunk = null;

    for (const entry of fileEntries) {
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
      const entryEnd =
        entry.offset +
        ZIP_LOCAL_HEADER_SIZE +
        entry.filename.length +
        ZIP_EXTRA_FIELD_ESTIMATE +
        entry.compressedSize;

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
        const chunkLength = chunk.endOffset - chunk.startOffset;
        chunk.fetching = this._rangeRequest(chunk.startOffset, chunkLength).then(data => {
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
