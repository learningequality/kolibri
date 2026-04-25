// Polyfills for Node.js/jsdom environment - must run BEFORE any module imports
// web-streams-polyfill/polyfill patches globals as a side effect
import 'web-streams-polyfill/polyfill';
// Use Node.js built-in TextEncoder/TextDecoder (available since Node 11)
import { TextEncoder, TextDecoder } from 'node:util';

import xhrMock from 'xhr-mock';
import { zipSync, strToU8 } from 'fflate';
import ZipFile from '../src/index';
import { Mapper } from '../src/fileUtils';

// Override global with Node's implementation (jsdom's version doesn't work correctly)
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Ensure URL APIs exist for jest.spyOn (jsdom doesn't provide them)
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = () => '';
}
if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = () => {};
}

/**
 * Helper to create a zip file with specified contents
 * @param {object} files - Object mapping filenames to content strings
 * @returns {Uint8Array} - The zip file data
 */
function createTestZip(files) {
  const zipContents = {};
  for (const [name, content] of Object.entries(files)) {
    zipContents[name] = strToU8(content);
  }
  return zipSync(zipContents);
}

/**
 * Setup xhr-mock to serve a zip file with range request support.
 * @param {Uint8Array} zipData - The zip bytes that should be served.
 * @param {string} [url] - URL the mock server should respond to.
 */
function setupMockServer(zipData, url = 'test.zip') {
  xhrMock.reset();
  xhrMock.get(url, (req, res) => {
    const rangeHeader = req.header('Range');

    if (!rangeHeader) {
      // Full file request
      return res
        .status(200)
        .header('Content-Type', 'application/zip')
        .header('Content-Length', zipData.length.toString())
        .header('Accept-Ranges', 'bytes')
        .body(zipData.buffer);
    }

    // Range request - parse "bytes=start-end"
    const [start, end] = rangeHeader.replace('bytes=', '').split('-').map(Number);
    const actualEnd = isNaN(end) ? zipData.length - 1 : Math.min(end, zipData.length - 1);
    const slicedData = zipData.slice(start, actualEnd + 1);

    return res
      .status(206)
      .header('Content-Type', 'application/zip')
      .header('Content-Range', `bytes ${start}-${actualEnd}/${zipData.length}`)
      .header('Content-Length', slicedData.length.toString())
      .header('Accept-Ranges', 'bytes')
      .body(slicedData.buffer);
  });
}

/**
 * Combined helper to create zip, setup mock server, and return ZipFile instance.
 * Reduces boilerplate in tests.
 * @param {object} files - Object mapping filenames to content strings
 * @param {string} url - URL for the mock server (default: 'test.zip')
 * @param {object} options - Options passed to ZipFile constructor
 * @returns {ZipFile} - Initialized ZipFile instance
 */
function setupZip(files, url = 'test.zip', options = {}) {
  const zipData = createTestZip(files);
  setupMockServer(zipData, url);
  return new ZipFile(url, options);
}

describe('ZipFile public API', () => {
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

  describe('file() - single file extraction', () => {
    it('extracts single file by exact name', async () => {
      const zip = setupZip({ 'hello.txt': 'Hello, World!', 'other.txt': 'Other content' });
      const file = await zip.file('hello.txt');

      expect(file.name).toBe('hello.txt');
      expect(file.toString()).toBe('Hello, World!');
    });

    it('extracts file from nested path', async () => {
      const zip = setupZip({ 'folder/subfolder/nested.txt': 'Nested content' });
      const file = await zip.file('folder/subfolder/nested.txt');

      expect(file.name).toBe('folder/subfolder/nested.txt');
      expect(file.toString()).toBe('Nested content');
    });

    it('returns undefined for non-existent file', async () => {
      const zip = setupZip({ 'exists.txt': 'I exist' });
      const file = await zip.file('does-not-exist.txt');
      expect(file).toBeUndefined();
    });

    it('returns cached file on second request', async () => {
      const zip = setupZip({ 'cached.txt': 'Cached content' });
      const file1 = await zip.file('cached.txt');
      const file2 = await zip.file('cached.txt');

      expect(file1).toBe(file2);
    });
  });

  describe('files() - path prefix extraction', () => {
    it('extracts files matching path prefix', async () => {
      const zip = setupZip({
        'assets/image1.png': 'image1 data',
        'assets/image2.png': 'image2 data',
        'other/file.txt': 'other content',
      });
      const files = await zip.files('assets/');

      expect(files).toHaveLength(2);
      expect(files.map(f => f.name).sort()).toEqual(['assets/image1.png', 'assets/image2.png']);
    });

    it('returns empty array for non-matching prefix', async () => {
      const zip = setupZip({ 'assets/file.txt': 'content' });
      const files = await zip.files('nonexistent/');
      expect(files).toEqual([]);
    });
  });

  describe('filesFromExtension() - extension-based extraction', () => {
    it('extracts files by extension', async () => {
      const zip = setupZip({
        'style1.css': '.a { color: red; }',
        'style2.css': '.b { color: blue; }',
        'script.js': 'console.log("hi");',
      });
      const cssFiles = await zip.filesFromExtension('.css');

      expect(cssFiles).toHaveLength(2);
      expect(cssFiles.map(f => f.name).sort()).toEqual(['style1.css', 'style2.css']);
    });

    it('returns empty array for non-matching extension', async () => {
      const zip = setupZip({ 'file.txt': 'content' });
      const files = await zip.filesFromExtension('.xyz');
      expect(files).toEqual([]);
    });
  });

  describe('ExtractedFile', () => {
    it('toString() returns file content as string', async () => {
      const content = 'Test content with unicode: \u00e9\u00e8\u00ea';
      const zip = setupZip({ 'unicode.txt': content });
      const file = await zip.file('unicode.txt');

      expect(file.toString()).toBe(content);
    });

    it('toUrl() returns blob URL', async () => {
      const zip = setupZip({ 'file.txt': 'content' });
      const file = await zip.file('file.txt');
      const url = file.toUrl();

      expect(url).toMatch(/^blob:mock-/);
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('toUrl() caches URL on repeated calls', async () => {
      const zip = setupZip({ 'file.txt': 'content' });
      const file = await zip.file('file.txt');

      global.URL.createObjectURL.mockClear();

      const url1 = file.toUrl();
      const url2 = file.toUrl();

      expect(url1).toBe(url2);
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    it('close() revokes blob URL', async () => {
      const zip = setupZip({ 'file.txt': 'content' });
      const file = await zip.file('file.txt');
      const url = file.toUrl();

      global.URL.revokeObjectURL.mockClear();
      file.close();

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(url);
    });

    it('mimeType returns correct type for known extensions', async () => {
      const zip = setupZip({
        'style.css': '.a {}',
        'script.js': '// js',
        'page.html': '<html></html>',
      });

      const cssFile = await zip.file('style.css');
      expect(cssFile.mimeType).toBe('text/css');

      const jsFile = await zip.file('script.js');
      expect(jsFile.mimeType).toBe('text/javascript');

      const htmlFile = await zip.file('page.html');
      expect(htmlFile.mimeType).toBe('text/html');
    });

    it('mimeType returns application/octet-stream for unknown extensions', async () => {
      const zip = setupZip({ 'file.notarealextension': 'content' });
      const file = await zip.file('file.notarealextension');
      expect(file.mimeType).toBe('application/octet-stream');
    });

    it('fileNameExt returns lowercase extension', async () => {
      const zip = setupZip({ 'image.PNG': 'data', 'style.CSS': 'data' });

      const pngFile = await zip.file('image.PNG');
      expect(pngFile.fileNameExt).toBe('png');

      const cssFile = await zip.file('style.CSS');
      expect(cssFile.fileNameExt).toBe('css');
    });

    it('close() is safe when toUrl() was never called', async () => {
      const zip = setupZip({ 'file.txt': 'content' });
      const file = await zip.file('file.txt');

      global.URL.revokeObjectURL.mockClear();
      file.close();
      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('close()', () => {
    it('revokes all blob URLs', async () => {
      const zip = setupZip({ 'file1.txt': 'content1', 'file2.txt': 'content2' });
      const file1 = await zip.file('file1.txt');
      const file2 = await zip.file('file2.txt');
      file1.toUrl();
      file2.toUrl();

      global.URL.revokeObjectURL.mockClear();
      zip.close();

      expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    });
  });

  describe('Path replacement', () => {
    it('CSS url() paths are replaced with blob URLs', async () => {
      const zip = setupZip({
        'style.css': '.icon { background: url("images/icon.png"); }',
        'images/icon.png': 'PNG DATA',
      });
      const cssFile = await zip.file('style.css');
      const content = cssFile.toString();

      expect(content).toMatch(/url\(["']?blob:mock-/);
      expect(content).not.toContain('images/icon.png');
    });

    it('HTML src attributes are replaced with blob URLs', async () => {
      const zip = setupZip({
        'page.html': '<img src="images/photo.jpg">',
        'images/photo.jpg': 'JPG DATA',
      });
      const htmlFile = await zip.file('page.html');
      const content = htmlFile.toString();

      expect(content).toMatch(/src=["']?blob:mock-/);
      expect(content).not.toContain('images/photo.jpg');
    });

    it('nested references are resolved correctly', async () => {
      const zip = setupZip({
        'page.html': '<link href="css/style.css">',
        'css/style.css': '.bg { background: url("../images/bg.png"); }',
        'images/bg.png': 'PNG DATA',
      });
      const htmlFile = await zip.file('page.html');
      const htmlContent = htmlFile.toString();

      expect(htmlContent).toMatch(/href=["']?blob:mock-/);
    });

    it('circular references are handled without infinite loop', async () => {
      const zip = setupZip({ 'style.css': '@import url("style.css"); .a { color: red; }' });
      const file = await zip.file('style.css');
      expect(file.toString()).toContain('.a { color: red; }');
    });

    it('missing referenced files are left unchanged', async () => {
      const zip = setupZip({ 'style.css': '.icon { background: url("missing.png"); }' });
      const cssFile = await zip.file('style.css');
      const content = cssFile.toString();

      expect(content).toContain('url("missing.png")');
    });

    it('XML href attributes are replaced with blob URLs', async () => {
      const zip = setupZip({
        'content.xml': '<?xml version="1.0"?><root><link href="data/file.dat"/></root>',
        'data/file.dat': 'DATA',
      });
      const xmlFile = await zip.file('content.xml');
      const content = xmlFile.toString();

      expect(content).toMatch(/href=["']?blob:mock-/);
      expect(content).not.toContain('data/file.dat');
    });
  });

  describe('Constructor options', () => {
    it('custom filePathMappers can be provided', async () => {
      class CustomMapper extends Mapper {
        getPaths() {
          const content = this.file.toString();
          const regex = /\[INCLUDE:([^\]]+)\]/g;
          return Array.from(content.matchAll(regex), m => m[1]);
        }
        replacePaths(packageFiles) {
          const content = this.file.toString();
          return content.replace(/\[INCLUDE:([^\]]+)\]/g, (match, path) => {
            return packageFiles[path] || match;
          });
        }
      }

      const zip = setupZip(
        { 'main.custom': 'Start [INCLUDE:other.txt] End', 'other.txt': 'INCLUDED' },
        'test.zip',
        { filePathMappers: { custom: CustomMapper } },
      );
      const file = await zip.file('main.custom');
      const content = file.toString();

      expect(content).toMatch(/Start blob:mock-.* End/);
    });

    it('empty filePathMappers disables path replacement', async () => {
      const zip = setupZip(
        { 'style.css': '.icon { background: url("image.png"); }', 'image.png': 'PNG' },
        'test.zip',
        { filePathMappers: {} },
      );
      const cssFile = await zip.file('style.css');
      const content = cssFile.toString();

      expect(content).toContain('url("image.png")');
    });
  });

  describe('Error handling', () => {
    it('network error is propagated', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      xhrMock.reset();
      xhrMock.get('error.zip', () => Promise.reject(new Error('Network error')));

      const zip = new ZipFile('error.zip');
      await expect(zip.file('any.txt')).rejects.toBeDefined();
      console.error.mockRestore(); // eslint-disable-line no-console
    });
  });
});

/**
 * Lazy loading tests
 *
 * Key behaviors that differentiate lazy loading:
 * 1. Large zips are NOT fully downloaded - download is aborted early
 * 2. Range requests are made to fetch file data
 * 3. largeFileUrlGenerator is called for large media files
 */
describe('ZipFile lazy loading', () => {
  let requestLog = [];

  beforeEach(() => {
    xhrMock.setup();
    requestLog = [];
    jest
      .spyOn(global.URL, 'createObjectURL')
      .mockImplementation(() => `blob:mock-${Math.random().toString(36).substring(2, 11)}`);
    jest.spyOn(global.URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    xhrMock.teardown();
    jest.restoreAllMocks();
  });

  /**
   * Helper to create a large zip file for testing lazy loading.
   * @param {object} [options] - Configuration for the synthesised zip.
   * @param {{[name: string]: string}} [options.smallFiles] - Small file entries to include
   * in the zip, keyed by filename.
   * @param {number} [options.largeVideoSize] - Size in bytes of the synthesised video file.
   * @param {boolean} [options.includeVideo] - Whether to include the synthesised video file.
   * @returns {Uint8Array} The synthesised zip bytes.
   */
  function createLargeTestZip(options = {}) {
    const {
      smallFiles = { 'small.txt': 'Small content' },
      largeVideoSize = 600 * 1024,
      includeVideo = true,
    } = options;

    const zipContents = {};
    for (const [name, content] of Object.entries(smallFiles)) {
      zipContents[name] = strToU8(content);
    }

    if (includeVideo) {
      const videoData = new Uint8Array(largeVideoSize);
      for (let i = 0; i < largeVideoSize; i++) {
        videoData[i] = i % 256;
      }
      zipContents['media/video.mp4'] = videoData;
    }

    return zipSync(zipContents);
  }

  /**
   * Setup mock server that tracks all requests and supports range requests.
   * @param {Uint8Array} zipData - The zip bytes that should be served.
   * @param {string} [url] - URL the mock server should respond to.
   */
  function setupTrackingMockServer(zipData, url = 'large.zip') {
    xhrMock.reset();
    xhrMock.get(url, (req, res) => {
      const rangeHeader = req.header('Range');
      requestLog.push({
        url,
        range: rangeHeader || null,
        fullRequest: !rangeHeader,
      });

      if (!rangeHeader) {
        return res
          .status(200)
          .header('Content-Type', 'application/zip')
          .header('Content-Length', zipData.length.toString())
          .header('Accept-Ranges', 'bytes')
          .body(zipData.buffer);
      }

      const [start, end] = rangeHeader.replace('bytes=', '').split('-').map(Number);
      const slicedData = zipData.slice(start, Math.min(end + 1, zipData.length));

      return res
        .status(206)
        .header('Content-Range', `bytes ${start}-${end}/${zipData.length}`)
        .header('Content-Length', slicedData.length.toString())
        .header('Accept-Ranges', 'bytes')
        .body(slicedData.buffer);
    });
  }

  describe('largeFileUrlGenerator option', () => {
    it('large video file uses largeFileUrlGenerator instead of extraction', async () => {
      const zipData = createLargeTestZip({
        smallFiles: { 'index.html': '<html></html>' },
        largeVideoSize: 600 * 1024,
      });
      setupTrackingMockServer(zipData, 'large.zip');

      const largeFileUrlGenerator = jest.fn(
        filename => `https://cdn.example.com/media/${filename}`,
      );
      const zip = new ZipFile('large.zip', {
        maxFullLoadSize: 100 * 1024,
        largeMediaThreshold: 500 * 1024,
        largeFileUrlGenerator,
      });

      const videoFile = await zip.file('media/video.mp4');
      const videoUrl = videoFile.toUrl();

      // KEY ASSERTION: largeFileUrlGenerator must be called
      expect(largeFileUrlGenerator).toHaveBeenCalledWith('media/video.mp4');
      expect(videoUrl).toBe('https://cdn.example.com/media/media/video.mp4');
    });

    it('large file with largeFileUrlGenerator throws on toString() with specific message', async () => {
      const zipData = createLargeTestZip({
        smallFiles: { 'index.html': '<html></html>' },
        largeVideoSize: 600 * 1024,
      });
      setupTrackingMockServer(zipData, 'large.zip');

      const zip = new ZipFile('large.zip', {
        maxFullLoadSize: 100 * 1024,
        largeMediaThreshold: 500 * 1024,
        largeFileUrlGenerator: filename => `https://cdn.example.com/${filename}`,
      });

      const videoFile = await zip.file('media/video.mp4');

      // KEY ASSERTION: toString() must throw with message about large file
      // This distinguishes from other errors - must mention "large" or "string"
      expect(() => videoFile.toString()).toThrow(/large|string/i);
    });

    it('large file close() does not revoke URL when using generator', async () => {
      const zipData = createLargeTestZip({
        smallFiles: {},
        largeVideoSize: 600 * 1024,
      });
      setupTrackingMockServer(zipData, 'large.zip');

      const zip = new ZipFile('large.zip', {
        maxFullLoadSize: 100 * 1024,
        largeMediaThreshold: 500 * 1024,
        largeFileUrlGenerator: filename => `https://cdn.example.com/${filename}`,
      });

      const videoFile = await zip.file('media/video.mp4');
      videoFile.toUrl();

      global.URL.revokeObjectURL.mockClear();
      videoFile.close();

      // KEY ASSERTION: Should NOT call revokeObjectURL for generated URLs
      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it('small text files are extracted normally, not using URL generator', async () => {
      const zipData = createLargeTestZip({
        smallFiles: { 'readme.txt': 'README content here' },
        largeVideoSize: 600 * 1024,
      });
      setupTrackingMockServer(zipData, 'large.zip');

      const largeFileUrlGenerator = jest.fn(filename => `https://cdn.example.com/${filename}`);
      const zip = new ZipFile('large.zip', {
        maxFullLoadSize: 100 * 1024,
        largeMediaThreshold: 500 * 1024,
        largeFileUrlGenerator,
      });

      const textFile = await zip.file('readme.txt');

      // KEY ASSERTION: Small files should be extracted, generator NOT called
      expect(largeFileUrlGenerator).not.toHaveBeenCalledWith('readme.txt');
      expect(textFile.toString()).toBe('README content here');
      expect(textFile.toUrl()).toMatch(/^blob:mock-/);
    });

    it('video file below largeMediaThreshold is extracted, not using URL generator', async () => {
      const zipData = createLargeTestZip({
        smallFiles: {},
        largeVideoSize: 400 * 1024, // 400KB - below 500KB threshold
      });
      setupTrackingMockServer(zipData, 'large.zip');

      const largeFileUrlGenerator = jest.fn(filename => `https://cdn.example.com/${filename}`);
      const zip = new ZipFile('large.zip', {
        maxFullLoadSize: 100 * 1024,
        largeMediaThreshold: 500 * 1024, // 500KB threshold
        largeFileUrlGenerator,
      });

      const videoFile = await zip.file('media/video.mp4');

      // KEY ASSERTION: Video below threshold should be extracted normally
      expect(largeFileUrlGenerator).not.toHaveBeenCalledWith('media/video.mp4');
      expect(videoFile.toUrl()).toMatch(/^blob:mock-/);
    });
  });

  describe('Large zip with only small files', () => {
    it('lazy mode zip with all small files extracts normally (no URL generator)', async () => {
      // Create a zip > maxFullLoadSize but with many small files (each < largeMediaThreshold)
      const zipContents = {};

      // Create 20 small "video" files, each 100KB (total 2MB uncompressed)
      // Each is below the 500KB largeMediaThreshold
      for (let i = 0; i < 20; i++) {
        const smallVideoData = new Uint8Array(100 * 1024);
        for (let j = 0; j < smallVideoData.length; j++) {
          smallVideoData[j] = (i + j) % 256;
        }
        zipContents[`videos/clip${i}.mp4`] = smallVideoData;
      }

      // Add some text files too
      zipContents['index.html'] = strToU8('<html><body>Video gallery</body></html>');
      zipContents['manifest.json'] = strToU8('{"videos": 20}');

      const zipData = zipSync(zipContents, { level: 0 }); // No compression

      setupTrackingMockServer(zipData, 'many-small.zip');

      const largeFileUrlGenerator = jest.fn(filename => `https://cdn.example.com/${filename}`);
      const zip = new ZipFile('many-small.zip', {
        maxFullLoadSize: 100 * 1024, // 100KB - zip is way larger, triggers lazy mode
        largeMediaThreshold: 500 * 1024, // 500KB - all files are smaller
        largeFileUrlGenerator,
      });

      // Access several video files
      const video0 = await zip.file('videos/clip0.mp4');
      const video5 = await zip.file('videos/clip5.mp4');
      const video19 = await zip.file('videos/clip19.mp4');
      const html = await zip.file('index.html');

      // KEY ASSERTIONS:
      // 1. Generator should NEVER be called (all files are small)
      expect(largeFileUrlGenerator).not.toHaveBeenCalled();

      // 2. All files should be extracted normally with blob URLs
      expect(video0.toUrl()).toMatch(/^blob:mock-/);
      expect(video5.toUrl()).toMatch(/^blob:mock-/);
      expect(video19.toUrl()).toMatch(/^blob:mock-/);
      expect(html.toUrl()).toMatch(/^blob:mock-/);

      // 3. toString() should work (files were extracted, not deferred)
      expect(html.toString()).toContain('Video gallery');

      // 4. Check request efficiency
      // Expected requests in lazy mode:
      // - 1 full request (initial, aborted when Content-Length > maxFullLoadSize)
      // - 1 range request for tail (EOCD + CD + index.html near end of zip)
      // - 3 range requests for files (clip0, clip5, clip19 - each in different chunks)
      // Total: 1 full + 4 range = 5 requests
      const rangeRequests = requestLog.filter(r => r.range !== null);
      const fullRequests = requestLog.filter(r => r.fullRequest);

      expect(fullRequests).toHaveLength(1); // Only the initial aborted request
      expect(rangeRequests).toHaveLength(4); // Tail prefetch (CD + index.html) + 3 file chunks
    });

    it('lazy mode is used even when all files are small', async () => {
      // Same setup - large zip with small files
      const zipContents = {};
      for (let i = 0; i < 20; i++) {
        const smallVideoData = new Uint8Array(100 * 1024);
        for (let j = 0; j < smallVideoData.length; j++) {
          smallVideoData[j] = (i + j) % 256;
        }
        zipContents[`videos/clip${i}.mp4`] = smallVideoData;
      }
      const zipData = zipSync(zipContents, { level: 0 });

      setupTrackingMockServer(zipData, 'lazy-small.zip');

      const zip = new ZipFile('lazy-small.zip', {
        maxFullLoadSize: 100 * 1024, // Triggers lazy mode
      });

      // Wait for init
      await zip._fileLoadingPromise;

      // Verify lazy mode was triggered (zip is large)
      expect(zip._reader.useLazyMode).toBe(true);

      // But files are still extracted normally
      const video = await zip.file('videos/clip0.mp4');
      expect(video.toUrl()).toMatch(/^blob:mock-/);
    });
  });

  describe('Fallback behavior', () => {
    it('works normally when server does not support range requests', async () => {
      const zipData = createLargeTestZip({
        smallFiles: { 'file.txt': 'File content' },
        largeVideoSize: 600 * 1024,
      });

      // Server WITHOUT range support
      xhrMock.reset();
      xhrMock.get('no-ranges.zip', (req, res) => {
        return (
          res
            .status(200)
            .header('Content-Type', 'application/zip')
            .header('Content-Length', zipData.length.toString())
            // No Accept-Ranges header - server doesn't support ranges
            .body(zipData.buffer)
        );
      });

      const zip = new ZipFile('no-ranges.zip', {
        maxFullLoadSize: 100 * 1024, // Would trigger lazy if ranges supported
        largeMediaThreshold: 500 * 1024,
        largeFileUrlGenerator: () => 'https://example.com/fallback',
      });

      // KEY ASSERTION: Should still work - falls back to full download
      const file = await zip.file('file.txt');
      expect(file.toString()).toBe('File content');
    });
  });

  describe('Large audio files', () => {
    it('large .mp3 file uses largeFileUrlGenerator', async () => {
      // Create zip with large audio file
      const zipContents = {
        'index.html': strToU8('<html></html>'),
      };
      const audioData = new Uint8Array(600 * 1024);
      zipContents['audio/music.mp3'] = audioData;
      const zipData = zipSync(zipContents);

      setupTrackingMockServer(zipData, 'audio.zip');

      const largeFileUrlGenerator = jest.fn(filename => `https://cdn.example.com/${filename}`);
      const zip = new ZipFile('audio.zip', {
        maxFullLoadSize: 100 * 1024,
        largeMediaThreshold: 500 * 1024,
        largeFileUrlGenerator,
      });

      const audioFile = await zip.file('audio/music.mp3');
      const audioUrl = audioFile.toUrl();

      expect(largeFileUrlGenerator).toHaveBeenCalledWith('audio/music.mp3');
      expect(audioUrl).toBe('https://cdn.example.com/audio/music.mp3');
    });

    it('large .ogg file uses largeFileUrlGenerator', async () => {
      const zipContents = {
        'index.html': strToU8('<html></html>'),
      };
      const audioData = new Uint8Array(600 * 1024);
      zipContents['audio/sound.ogg'] = audioData;
      const zipData = zipSync(zipContents);

      setupTrackingMockServer(zipData, 'ogg.zip');

      const largeFileUrlGenerator = jest.fn(filename => `https://cdn.example.com/${filename}`);
      const zip = new ZipFile('ogg.zip', {
        maxFullLoadSize: 100 * 1024,
        largeMediaThreshold: 500 * 1024,
        largeFileUrlGenerator,
      });

      const audioFile = await zip.file('audio/sound.ogg');
      audioFile.toUrl();

      expect(largeFileUrlGenerator).toHaveBeenCalledWith('audio/sound.ogg');
    });
  });

  describe('Large file with URL generator', () => {
    it('large media file cannot be converted to string when URL generator is used', async () => {
      const zipData = createLargeTestZip({
        smallFiles: { 'index.html': '<html></html>' },
        largeVideoSize: 600 * 1024,
      });
      setupTrackingMockServer(zipData, 'large-with-generator.zip');

      // WITH largeFileUrlGenerator provided - large files are deferred
      const zip = new ZipFile('large-with-generator.zip', {
        maxFullLoadSize: 100 * 1024,
        largeMediaThreshold: 500 * 1024,
        largeFileUrlGenerator: filename => `https://example.com/files/${filename}`,
      });

      // Get the large file - this should succeed (file is marked for URL generation)
      const video = await zip.file('media/video.mp4');
      expect(video).toBeDefined();
      expect(video.name).toBe('media/video.mp4');
      // The file has a URL generator, not extracted data
      expect(video._urlGenerator).not.toBeNull();
      expect(video.obj).toBeNull();

      // toUrl() should work - returns the generated URL
      expect(video.toUrl()).toBe('https://example.com/files/media/video.mp4');

      // toString() should throw - large files cannot be converted to string
      expect(() => video.toString()).toThrow('Cannot convert large file to string');
    });
  });

  describe('Behavior without largeFileUrlGenerator', () => {
    it('large media file is extracted normally when no generator provided', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const zipData = createLargeTestZip({
        smallFiles: { 'index.html': '<html></html>' },
        largeVideoSize: 600 * 1024,
      });
      setupTrackingMockServer(zipData, 'no-generator.zip');

      // NO largeFileUrlGenerator provided - large file optimizations are ignored
      const zip = new ZipFile('no-generator.zip', {
        maxFullLoadSize: 100 * 1024,
        largeMediaThreshold: 500 * 1024,
        // largeFileUrlGenerator is NOT set
      });

      // Without a generator, large files are extracted normally via zip.js
      // (the largeMediaThreshold is only used when largeFileUrlGenerator is provided)
      const video = await zip.file('media/video.mp4');
      expect(video).toBeDefined();
      expect(video.name).toBe('media/video.mp4');
      // The file has actual extracted data, not a URL generator
      expect(video._urlGenerator).toBeNull();
      expect(video.obj).toBeInstanceOf(Uint8Array);
      expect(video.obj.length).toBe(600 * 1024);
      // Without a URL generator, toString() works (returns binary data as string)
      expect(() => video.toString()).not.toThrow();
      expect(video.toUrl()).toMatch(/^blob:mock-/);
      console.warn.mockRestore(); // eslint-disable-line no-console
    });

    it('all files treated equally without largeFileUrlGenerator', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const zipContents = {
        'index.html': strToU8('<html></html>'),
        'small.txt': strToU8('Small file'),
      };
      // Large video
      const videoData = new Uint8Array(600 * 1024);
      for (let i = 0; i < videoData.length; i++) {
        videoData[i] = i % 256;
      }
      zipContents['media/video.mp4'] = videoData;
      // Large audio
      const audioData = new Uint8Array(700 * 1024);
      zipContents['media/audio.mp3'] = audioData;
      const zipData = zipSync(zipContents, { level: 0 });

      setupTrackingMockServer(zipData, 'all-equal.zip');

      const zip = new ZipFile('all-equal.zip', {
        maxFullLoadSize: 100 * 1024,
        largeMediaThreshold: 500 * 1024,
        // NO largeFileUrlGenerator
      });

      // Extract all files
      const html = await zip.file('index.html');
      const small = await zip.file('small.txt');
      const video = await zip.file('media/video.mp4');
      const audio = await zip.file('media/audio.mp3');

      // All files should be extracted normally with blob URLs
      expect(html.toUrl()).toMatch(/^blob:mock-/);
      expect(small.toUrl()).toMatch(/^blob:mock-/);
      expect(video.toUrl()).toMatch(/^blob:mock-/);
      expect(audio.toUrl()).toMatch(/^blob:mock-/);

      // All files should have actual data (check for TypedArray-like properties)
      expect(html.obj).toHaveProperty('byteLength');
      expect(small.obj).toHaveProperty('byteLength');
      expect(video.obj).toHaveProperty('byteLength');
      expect(audio.obj).toHaveProperty('byteLength');

      // No file should have a URL generator
      expect(html._urlGenerator).toBeNull();
      expect(small._urlGenerator).toBeNull();
      expect(video._urlGenerator).toBeNull();
      expect(audio._urlGenerator).toBeNull();
      console.warn.mockRestore(); // eslint-disable-line no-console
    });
  });

  describe('Multiple large files', () => {
    it('handles multiple large media files in same zip', async () => {
      const zipContents = {
        'index.html': strToU8('<html></html>'),
      };
      // Add multiple large media files
      const video1Data = new Uint8Array(600 * 1024);
      const video2Data = new Uint8Array(700 * 1024);
      const audioData = new Uint8Array(550 * 1024);
      zipContents['media/video1.mp4'] = video1Data;
      zipContents['media/video2.webm'] = video2Data;
      zipContents['media/audio.mp3'] = audioData;
      const zipData = zipSync(zipContents);

      setupTrackingMockServer(zipData, 'multi.zip');

      const largeFileUrlGenerator = jest.fn(filename => `https://cdn.example.com/${filename}`);
      const zip = new ZipFile('multi.zip', {
        maxFullLoadSize: 100 * 1024,
        largeMediaThreshold: 500 * 1024,
        largeFileUrlGenerator,
      });

      // Access all large files
      const video1 = await zip.file('media/video1.mp4');
      const video2 = await zip.file('media/video2.webm');
      const audio = await zip.file('media/audio.mp3');

      video1.toUrl();
      video2.toUrl();
      audio.toUrl();

      // All three should use the generator
      expect(largeFileUrlGenerator).toHaveBeenCalledWith('media/video1.mp4');
      expect(largeFileUrlGenerator).toHaveBeenCalledWith('media/video2.webm');
      expect(largeFileUrlGenerator).toHaveBeenCalledWith('media/audio.mp3');
    });

    it('mix of large media and small files handled correctly', async () => {
      const zipContents = {
        'index.html': strToU8('<html><video src="video.mp4"></video></html>'),
        'style.css': strToU8('.video { width: 100%; }'),
        'script.js': strToU8('console.log("hello");'),
      };
      // Create video data with non-compressible pattern
      const videoData = new Uint8Array(600 * 1024);
      for (let i = 0; i < videoData.length; i++) {
        videoData[i] = i % 256;
      }
      zipContents['media/video.mp4'] = videoData;
      const zipData = zipSync(zipContents, { level: 0 }); // No compression to ensure large zip

      setupTrackingMockServer(zipData, 'mixed.zip');

      const largeFileUrlGenerator = jest.fn(filename => `https://cdn.example.com/${filename}`);
      const zip = new ZipFile('mixed.zip', {
        maxFullLoadSize: 100 * 1024,
        largeMediaThreshold: 500 * 1024,
        largeFileUrlGenerator,
      });

      // Access all files
      const html = await zip.file('index.html');
      const css = await zip.file('style.css');
      const js = await zip.file('script.js');
      const video = await zip.file('media/video.mp4');

      // Small files should be extracted normally
      // Note: HTML gets processed by the mapper which may add xmlns attribute
      expect(html.toString()).toContain('<video');
      expect(css.toString()).toContain('.video');
      expect(js.toString()).toContain('console.log');
      expect(html.toUrl()).toMatch(/^blob:mock-/);

      // Large video should use generator (call toUrl() first to trigger generator)
      const videoUrl = video.toUrl();
      expect(largeFileUrlGenerator).toHaveBeenCalledWith('media/video.mp4');
      expect(largeFileUrlGenerator).not.toHaveBeenCalledWith('index.html');
      expect(largeFileUrlGenerator).not.toHaveBeenCalledWith('style.css');
      expect(videoUrl).toBe('https://cdn.example.com/media/video.mp4');
    });
  });

  describe('Chunked fetching integration', () => {
    it('extracting many small files sequentially uses chunked fetching - reduces request count', async () => {
      // Create a zip with many small files (simulating H5P)
      const zipContents = {};
      for (let i = 0; i < 50; i++) {
        zipContents[`content/file${i}.json`] = strToU8(`{"index": ${i}}`);
      }
      const zipData = zipSync(zipContents, { level: 0 });

      setupTrackingMockServer(zipData, 'h5p-like.zip');

      const zip = new ZipFile('h5p-like.zip', {
        maxFullLoadSize: 1000, // Force lazy mode (zip is much larger)
        chunkSize: 50000, // 50KB chunks
      });

      // Extract many files sequentially
      for (let i = 0; i < 50; i++) {
        await zip.file(`content/file${i}.json`);
      }

      // Count requests
      const rangeRequests = requestLog.filter(r => r.range !== null);
      const fullRequests = requestLog.filter(r => r.fullRequest);

      // Expected requests:
      // - 1 full request (aborted when Content-Length > maxFullLoadSize)
      // - 1 range request for tail (EOCD + CD, ~1KB from end)
      // - 2 range requests for file chunks (files span multiple chunks)
      // Note: The 50 files total ~4KB and are distributed across the zip.
      // With 50KB chunk size, they form 2 chunks (the tail prefetch doesn't
      // cover all files since it's based on CD size estimate, not file coverage)
      // Total: 1 full + 3 range = 4 requests
      expect(fullRequests).toHaveLength(1);
      expect(rangeRequests).toHaveLength(3);
    });

    it('extracting many small files concurrently uses chunked fetching efficiently', async () => {
      // Create a zip with many small files
      const zipContents = {};
      for (let i = 0; i < 50; i++) {
        zipContents[`content/file${i}.json`] = strToU8(`{"index": ${i}}`);
      }
      const zipData = zipSync(zipContents, { level: 0 });

      setupTrackingMockServer(zipData, 'concurrent.zip');

      const zip = new ZipFile('concurrent.zip', {
        maxFullLoadSize: 1000, // Force lazy mode
        chunkSize: 50000, // 50KB chunks
      });

      // Extract many files CONCURRENTLY using Promise.all
      const files = await Promise.all(
        Array.from({ length: 50 }, (_, i) => zip.file(`content/file${i}.json`)),
      );

      // All files should be extracted successfully
      expect(files).toHaveLength(50);
      files.forEach((file, i) => {
        expect(file).toBeDefined();
        expect(file.toString()).toBe(`{"index": ${i}}`);
      });

      // Count requests
      const rangeRequests = requestLog.filter(r => r.range !== null);
      const fullRequests = requestLog.filter(r => r.fullRequest);

      // Concurrent extraction uses EXACTLY the same number of requests as sequential:
      // - 1 full request (aborted when Content-Length > maxFullLoadSize)
      // - 1 range request for tail (EOCD + CD)
      // - 2 range requests for file chunks (all 50 files fit in 2 chunks with 50KB chunkSize)
      // The chunk.fetching promise deduplication ensures each chunk is fetched only once
      // even when 50 concurrent requests hit the same chunks simultaneously
      expect(fullRequests).toHaveLength(1);
      expect(rangeRequests).toHaveLength(3);
    });

    it('concurrent extraction from different chunks fetches each chunk once', async () => {
      // Create a zip with files spread across multiple chunks
      // Each file is ~507 bytes (7 bytes header + 500 bytes content)
      // With 2KB chunkSize and greedy inclusion, files will group into chunks
      const zipContents = {};
      for (let i = 0; i < 20; i++) {
        const content = `file${i}:` + 'x'.repeat(500);
        zipContents[`data/file${i}.txt`] = strToU8(content);
      }
      const zipData = zipSync(zipContents, { level: 0 });

      setupTrackingMockServer(zipData, 'multi-chunk-concurrent.zip');

      const zip = new ZipFile('multi-chunk-concurrent.zip', {
        maxFullLoadSize: 1000, // Force lazy mode
        chunkSize: 2000, // 2KB chunks
      });

      // Wait for init to complete
      await zip._fileLoadingPromise;

      // Verify how many chunks were created
      const numChunks = zip._reader._chunks.length;

      // Extract files from different parts of the zip concurrently
      const selectedFiles = [0, 5, 10, 15, 19];
      const files = await Promise.all(selectedFiles.map(i => zip.file(`data/file${i}.txt`)));

      // All files should be extracted successfully
      expect(files).toHaveLength(5);
      files.forEach((file, idx) => {
        expect(file).toBeDefined();
        expect(file.toString()).toContain(`file${selectedFiles[idx]}:`);
      });

      // Count requests
      const rangeRequests = requestLog.filter(r => r.range !== null);
      const fullRequests = requestLog.filter(r => r.fullRequest);

      // Exact request count:
      // - 1 full request (aborted)
      // - 1 range request for tail (last 1KB - EOCD + partial CD)
      // - 1 range request for remaining CD (our 3% tail estimate underestimates
      //   for small zips with many files where CD is ~10% of total size)
      // - numChunks range requests for file data (1 chunk in this case)
      //
      // The key point: concurrent file requests don't cause duplicate chunk fetches.
      // Each chunk is fetched exactly once regardless of concurrent access.
      expect(fullRequests).toHaveLength(1);
      expect(rangeRequests).toHaveLength(2 + numChunks); // tail + CD overflow + file chunks
    });

    it('concurrent extraction with large and small files handles both correctly', async () => {
      const zipContents = {
        'index.html': strToU8('<html><body>Main page</body></html>'),
        'style.css': strToU8('.content { color: blue; }'),
        'data.json': strToU8('{"key": "value"}'),
      };
      // Add large video file
      const videoData = new Uint8Array(600 * 1024);
      for (let i = 0; i < videoData.length; i++) {
        videoData[i] = i % 256;
      }
      zipContents['media/video.mp4'] = videoData;
      const zipData = zipSync(zipContents, { level: 0 });

      setupTrackingMockServer(zipData, 'mixed-concurrent.zip');

      const largeFileUrlGenerator = jest.fn(filename => `https://cdn.example.com/${filename}`);
      const zip = new ZipFile('mixed-concurrent.zip', {
        maxFullLoadSize: 100 * 1024, // Force lazy mode
        largeMediaThreshold: 500 * 1024,
        largeFileUrlGenerator,
      });

      // Extract all files concurrently - mix of small extracted files and large URL-generated
      const [html, css, json, video] = await Promise.all([
        zip.file('index.html'),
        zip.file('style.css'),
        zip.file('data.json'),
        zip.file('media/video.mp4'),
      ]);

      // Small files should be extracted with blob URLs
      expect(html.toUrl()).toMatch(/^blob:mock-/);
      expect(css.toUrl()).toMatch(/^blob:mock-/);
      expect(json.toUrl()).toMatch(/^blob:mock-/);

      // Large video should use URL generator
      expect(video.toUrl()).toBe('https://cdn.example.com/media/video.mp4');
      expect(largeFileUrlGenerator).toHaveBeenCalledWith('media/video.mp4');

      // Small files should have content
      expect(html.toString()).toContain('Main page');
      expect(css.toString()).toContain('.content');
      expect(json.toString()).toBe('{"key": "value"}');
    });
  });
});
