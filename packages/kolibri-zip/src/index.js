// Polyfills for Node.js and older browsers
import 'fastestsmallesttextencoderdecoder';
import 'web-streams-polyfill/polyfill';
import { configure, ZipReader, Uint8ArrayWriter, getMimeType } from '@zip.js/zip.js';
import isPlainObject from 'lodash/isPlainObject';
import AdaptiveHttpReader from './AdaptiveHttpReader';
import { getAbsoluteFilePath, defaultFilePathMappers } from './fileUtils';

// Overrides for MIME types that zip.js doesn't handle correctly
const MIMETYPE_OVERRIDES = {
  vtt: 'text/vtt', // WebVTT subtitles - zip.js returns application/octet-stream
};

// Feature detection for graceful degradation
const supportsCompressionStream = typeof CompressionStream !== 'undefined';
const supportsWorkers = typeof Worker !== 'undefined';

configure({
  useCompressionStream: supportsCompressionStream,
  useWebWorkers: supportsWorkers,
});

/**
 * @typedef {import('./fileUtils').Mapper} Mapper
 */

/**
 * A map of file extensions to Mapper subclasses that handle path replacement
 * for that file type. Each key is an extension (without dot, e.g. 'css', 'html')
 * and each value is a class extending {@link Mapper} from fileUtils.
 * @typedef {{[key: string]: typeof Mapper}} FilePathMappers
 */

const DEFAULT_MAX_FULL_LOAD_SIZE = 2.5 * 1024 * 1024; // 2.5MB
const DEFAULT_LARGE_MEDIA_THRESHOLD = 500 * 1024; // 500KB

/**
 * Represents an extracted file from a ZIP archive.
 *
 * Files may either contain extracted data (obj is a Uint8Array) or be backed
 * by a URL generator for large media files (obj is null, _urlGenerator is set).
 */
class ExtractedFile {
  /**
   * Construct an ExtractedFile from a name and either extracted bytes or a URL generator.
   * @param {string} name - Full path of the file within the ZIP
   * @param {Uint8Array|null} obj - Extracted file data, or null for URL-generated files
   * @param {Function|null} [urlGenerator=null] - Function `(filename) => url` for large files
   */
  constructor(name, obj, urlGenerator = null) {
    this.name = name;
    this.obj = obj;
    this._url = null;
    this._urlGenerator = urlGenerator;
  }

  /**
   * Lowercased extension of the file, taken from the characters after the final dot.
   * @returns {string} File extension in lowercase (e.g. 'css', 'html')
   */
  get fileNameExt() {
    return (this.name.split('.').slice(-1)[0] || '').toLowerCase();
  }

  /**
   * MIME type derived from the file extension, with overrides applied for types
   * that zip.js mishandles.
   * @returns {string} MIME type based on file extension
   */
  get mimeType() {
    const ext = this.fileNameExt;
    // Note: getMimeType's typedef says "fileExtension" but it accepts full filenames
    // (it extracts the extension internally), as shown in zip.js's own examples.
    return MIMETYPE_OVERRIDES[ext] || getMimeType(this.name);
  }

  /**
   * Returns the file contents as a decoded UTF-8 string.
   * @returns {string} File contents
   * @throws {Error} If the file uses a URL generator (large media files have no extracted data)
   */
  toString() {
    if (this._urlGenerator) {
      throw new Error('Cannot convert large file to string: ' + this.name);
    }
    return new TextDecoder().decode(this.obj);
  }

  /**
   * Returns a URL for this file. For extracted files, creates and caches a blob URL.
   * For URL-generated files, returns the generated URL. Result is cached.
   * @returns {string} Blob URL or generated URL
   */
  toUrl() {
    if (this._url) {
      return this._url;
    }
    if (this._urlGenerator) {
      this._url = this._urlGenerator(this.name);
    } else {
      const blob = new Blob([this.obj.buffer], { type: this.mimeType });
      this._url = URL.createObjectURL(blob);
    }
    return this._url;
  }

  /**
   * Revokes the blob URL if one was created. No-op for URL-generated files
   * or if toUrl() was never called.
   */
  close() {
    if (this._url && !this._urlGenerator) {
      URL.revokeObjectURL(this._url);
    }
  }
}

/**
 * High-level interface for reading files from a remote ZIP archive over HTTP.
 *
 * Handles adaptive loading (full download vs range requests), chunked fetching,
 * large media file delegation, and automatic path replacement in CSS/HTML/XML.
 */
export default class ZipFile {
  /**
   * Construct a ZipFile. The ZIP is fetched and parsed asynchronously; call any
   * extraction method and await the returned promise.
   * @param {string} url - URL from which the ZIP archive will be fetched
   * @param {object} [options] - Configuration for loading, chunking and path replacement
   * @param {FilePathMappers} [options.filePathMappers] - Map of file extension to Mapper
   * subclass for path replacement. Pass `{}` to disable replacement entirely.
   * @param {number} [options.maxFullLoadSize=2.5MB] - ZIP files larger than this are loaded
   * lazily via range requests instead of downloading entirely
   * @param {Function} [options.largeFileUrlGenerator] - Function `(filename) => url` for serving
   * large audio/video files directly. Required for largeMediaThreshold to have effect.
   * @param {number} [options.largeMediaThreshold] - Audio/video files larger than this use
   * largeFileUrlGenerator instead of being extracted. Defaults to 500KB.
   * @param {number} [options.chunkSize] - Target size for grouped range requests
   */
  constructor(
    url,
    {
      filePathMappers,
      maxFullLoadSize = DEFAULT_MAX_FULL_LOAD_SIZE,
      largeFileUrlGenerator,
      largeMediaThreshold,
      chunkSize,
    } = {},
  ) {
    if (largeMediaThreshold !== undefined && !largeFileUrlGenerator) {
      // eslint-disable-next-line no-console
      console.warn(
        'largeMediaThreshold has no effect without largeFileUrlGenerator. ' +
          'Large media files will be extracted normally.',
      );
    }
    this._loadingError = null;
    this._extractedFileCache = {};
    this._url = url;
    this.filePathMappers = isPlainObject(filePathMappers)
      ? filePathMappers
      : defaultFilePathMappers;
    this.largeFileUrlGenerator = largeFileUrlGenerator;
    this.largeMediaThreshold = largeMediaThreshold ?? DEFAULT_LARGE_MEDIA_THRESHOLD;
    this.maxFullLoadSize = maxFullLoadSize;
    this.chunkSize = chunkSize;

    this._reader = null;
    this._zipReader = null;
    this._entryMap = {};

    this._fileLoadingPromise = this._init();
  }

  /**
   * Initialize the ZIP reader, parse entries, and configure chunked fetching.
   * Called automatically from the constructor.
   * @private
   */
  async _init() {
    try {
      // Only use largeMediaThreshold if we have a generator to serve large files
      // Otherwise, treat all files the same (include them all in chunks)
      const effectiveThreshold = this.largeFileUrlGenerator ? this.largeMediaThreshold : Infinity;

      this._reader = new AdaptiveHttpReader(this._url, {
        maxFullLoadSize: this.maxFullLoadSize,
        largeMediaThreshold: effectiveThreshold,
        chunkSize: this.chunkSize,
      });

      await this._reader.init();

      this._zipReader = new ZipReader(this._reader);
      const entries = await this._zipReader.getEntries();

      // Configure chunked fetching for lazy mode (must be before extracting files)
      this._reader.configureChunks(entries);

      // Build entry map and identify large files
      for (const entry of entries) {
        this._entryMap[entry.filename] = entry;
        // Mark large media files for URL generation instead of extraction
        if (this.largeFileUrlGenerator && this._reader.shouldLoadFromUrl(entry)) {
          entry._useUrlGenerator = true;
        }
      }
    } catch (err) {
      this._loadingError = err;
    }
  }

  /**
   * Extract a file from the zip by path
   * @param {object} entry - zip.js entry object
   * @param {object} visitedPaths - Paths already visited (for cycle detection)
   * @returns {Promise<ExtractedFile>} The cached or freshly extracted file
   */
  async _extractFile(entry, visitedPaths = {}) {
    // Check cache first
    if (this._extractedFileCache[entry.filename]) {
      return this._extractedFileCache[entry.filename];
    }

    let extractedFile;

    if (entry._useUrlGenerator) {
      // Large media file - use URL generator instead of extraction
      extractedFile = new ExtractedFile(entry.filename, null, this.largeFileUrlGenerator);
    } else {
      // Normal extraction
      const data = await entry.getData(new Uint8ArrayWriter());
      extractedFile = new ExtractedFile(entry.filename, data);

      // Replace file references (CSS url(), HTML src/href, etc.)
      await this._replaceFiles(extractedFile, visitedPaths);
    }

    this._extractedFileCache[entry.filename] = extractedFile;
    return extractedFile;
  }

  /**
   * Replace internal file references (CSS url(), HTML src/href, etc.) with URLs.
   * Tracks visited paths to prevent infinite loops from circular references.
   * @param {ExtractedFile} file - The file to carry out replacement of references in
   * @param {object} visitedPaths - A map of paths that have already been visited to prevent a loop
   * @returns {Promise<ExtractedFile>} The file with references replaced
   * @private
   */
  async _replaceFiles(file, visitedPaths) {
    const mapperClass = this.filePathMappers[file.fileNameExt];
    if (!mapperClass) {
      return file;
    }

    visitedPaths = { ...visitedPaths };
    visitedPaths[file.name] = true;

    const mapper = new mapperClass(file);
    // Filter out any paths that are in our already visited paths, as that means we are in a
    // referential loop where one file has pointed us to another, which is now pointing us back
    // to the source.
    const paths = mapper
      .getPaths()
      .filter(path => !visitedPaths[getAbsoluteFilePath(file.name, path)]);

    const absolutePathsMap = paths.reduce((acc, path) => {
      acc[getAbsoluteFilePath(file.name, path)] = path;
      return acc;
    }, {});

    // Get referenced files
    const replacementFiles = await this._getFiles(
      entry => absolutePathsMap[entry.filename],
      visitedPaths,
    );

    const replacementFileMap = replacementFiles.reduce((acc, replacementFile) => {
      acc[absolutePathsMap[replacementFile.name]] = replacementFile.toUrl();
      return acc;
    }, {});

    const newFileContents = mapper.replacePaths(replacementFileMap);
    file.obj = new TextEncoder().encode(newFileContents);

    return file;
  }

  /**
   * Find and extract all files matching a predicate.
   * @param {Function} filterPredicate - Called with `{name, filename}` for each entry;
   * return truthy to include
   * @param {object} [visitedPaths={}] - Paths already visited (for cycle detection)
   * @returns {Promise<ExtractedFile[]>} Matching extracted files
   * @private
   */
  async _getFiles(filterPredicate, visitedPaths = {}) {
    await this._fileLoadingPromise;

    if (this._loadingError) {
      throw this._loadingError;
    }

    // Find matching entries
    const matchingEntries = Object.values(this._entryMap).filter(entry =>
      filterPredicate({ name: entry.filename, filename: entry.filename }),
    );

    if (matchingEntries.length === 0) {
      return [];
    }

    // Extract all matching files
    const files = await Promise.all(
      matchingEntries.map(entry => this._extractFile(entry, visitedPaths)),
    );

    return files;
  }

  /**
   * Extract a single file by exact path.
   * @param {string} filename - Full path within the ZIP (e.g. 'assets/style.css')
   * @returns {Promise<ExtractedFile|undefined>} The extracted file, or undefined if not found
   */
  async file(filename) {
    await this._fileLoadingPromise;

    if (this._loadingError) {
      throw this._loadingError;
    }

    // Check cache first
    if (this._extractedFileCache[filename]) {
      return this._extractedFileCache[filename];
    }

    const entry = this._entryMap[filename];
    if (!entry) {
      return undefined;
    }

    return this._extractFile(entry);
  }

  /**
   * Extract all files whose paths start with the given prefix.
   * @param {string} path - Path prefix to match (e.g. 'assets/')
   * @returns {Promise<ExtractedFile[]>} Matching extracted files
   */
  async files(path) {
    if (this._loadingError) {
      throw this._loadingError;
    }
    return this._getFiles(entry => entry.filename.startsWith(path));
  }

  /**
   * Extract all files with the given extension.
   * @param {string} extension - Extension to match, including dot (e.g. '.css')
   * @returns {Promise<ExtractedFile[]>} Matching extracted files
   */
  async filesFromExtension(extension) {
    if (this._loadingError) {
      throw this._loadingError;
    }
    return this._getFiles(entry => entry.filename.endsWith(extension));
  }

  /**
   * Revoke all blob URLs and release resources.
   */
  async close() {
    for (const file of Object.values(this._extractedFileCache)) {
      file.close();
    }
    if (this._zipReader) {
      await this._zipReader.close();
    }
    this._entryMap = {};
  }
}
