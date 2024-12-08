import mock from 'xhr-mock';
import { zipSync, strToU8 } from 'fflate';
import ZipMetadata from '../src/zipMetadata';

function setupMockZip(zipData) {
  mock.reset(); // Clear all previous handlers

  mock.use('HEAD', 'test.zip', {
    status: 200,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Length': zipData.length.toString(),
    },
  });

  mock.get('test.zip', (req, res) => {
    const rangeHeader = req.header('Range');

    if (!rangeHeader) {
      return res.status(200).body(zipData.buffer);
    }

    const [start, end] = rangeHeader.replace('bytes=', '').split('-').map(Number);

    if (start >= zipData.length) {
      return res.status(416).reason('Requested range not satisfiable');
    }

    const slicedData = zipData.slice(start, Math.min(end + 1, zipData.length));

    return res
      .status(206)
      .header('Content-Range', `bytes ${start}-${end}/${zipData.length}`)
      .header('Content-Length', slicedData.length.toString())
      .body(slicedData.buffer);
  });
}

describe('ZIP Metadata Reader', () => {
  const TEST_URL = 'test.zip';

  beforeEach(() => mock.setup());
  afterEach(() => mock.teardown());

  test('reads Central Directory entries correctly', () => {
    const html = '<h1>Test</h1>';
    const zipData = zipSync({
      'test.txt': strToU8('Hello World'),
      'test2.html': strToU8(html),
    });

    setupMockZip(zipData);

    const reader = new ZipMetadata(TEST_URL);
    return reader.readCentralDirectory().then(({ entries, segments, totalSize }) => {
      expect(Object.keys(entries)).toHaveLength(2);
      expect(entries['test.txt'].uncompressedSize).toBe(11);
      expect(entries['test2.html'].uncompressedSize).toBe(13); // '<h1>Test</h1>' is 13 chars
      expect(segments).toHaveLength(1);
      expect(totalSize).toBe(zipData.length);
    });
  });

  test('reads Central Directory entries and creates segments correctly', () => {
    const largeData = new Uint8Array(2000000).fill(0xff);
    const zipData = zipSync({
      'test.txt': strToU8('Small file 1'),
      'test2.html': strToU8('<h1>Small file 2</h1>'),
      'large.mp4': largeData,
      'test3.css': strToU8('.test { color: red; }'),
    });

    setupMockZip(zipData);

    const reader = new ZipMetadata(TEST_URL, ['css', 'html']);
    return reader.readCentralDirectory().then(({ entries, segments }) => {
      const largeFiles = Object.values(entries).filter(entry => entry.loadFromUrl);
      expect(Object.keys(entries)).toHaveLength(4);
      expect(segments.length).toBeGreaterThan(0);
      expect(largeFiles).toHaveLength(1);
      expect(largeFiles[0].fileName).toBe('large.mp4');
      expect(entries['large.mp4'].segment).toBeNull();
    });
  });

  test('handles small files correctly', () => {
    const content = 'Small file content';
    const zipData = zipSync({
      'small.txt': strToU8(content),
    });

    setupMockZip(zipData);

    const reader = new ZipMetadata(TEST_URL);
    return reader.readCentralDirectory().then(({ entries }) => {
      expect(Object.keys(entries)).toHaveLength(1);
      expect(entries['small.txt'].uncompressedSize).toBe(18); // 'Small file content' is 18 chars
    });
  });

  test('handles ZIP with comment correctly', () => {
    const content = 'Test content';
    const zipData = zipSync(
      {
        'test.txt': strToU8(content),
      },
      {
        comment: 'Test Comment',
      },
    );

    setupMockZip(zipData);

    const reader = new ZipMetadata(TEST_URL);
    return reader.readCentralDirectory().then(({ entries }) => {
      expect(Object.keys(entries)).toHaveLength(1);
      expect(entries['test.txt'].uncompressedSize).toBe(12); // 'Test content' is 12 chars
    });
  });

  test('handles maximum size ZIP comment', () => {
    const content = 'Test content';
    const maxComment = 'A'.repeat(65535);
    const zipData = zipSync(
      {
        'test.txt': strToU8(content),
      },
      {
        comment: maxComment,
      },
    );

    setupMockZip(zipData);

    const reader = new ZipMetadata(TEST_URL);
    return reader.readCentralDirectory().then(({ entries }) => {
      expect(Object.keys(entries)).toHaveLength(1);
      expect(entries['test.txt'].uncompressedSize).toBe(12); // 'Test content' is 12 chars
    });
  });

  test('handles empty ZIP file correctly', () => {
    const zipData = zipSync({});
    setupMockZip(zipData);

    const reader = new ZipMetadata(TEST_URL);
    return reader.readCentralDirectory().then(({ entries, segments }) => {
      expect(Object.keys(entries)).toHaveLength(0);
      expect(segments).toHaveLength(0);
    });
  });

  test('handles server not supporting ranges', () => {
    const zipData = zipSync({
      'test.txt': strToU8('Test'),
    });

    mock.use('HEAD', TEST_URL, {
      status: 200,
      headers: {
        'Content-Length': zipData.length.toString(),
      },
    });

    const reader = new ZipMetadata(TEST_URL);
    return expect(reader.readCentralDirectory()).rejects.toThrow(
      'Server does not support range requests',
    );
  });

  test('handles interrupted requests', () => {
    mock.get(TEST_URL, () => {
      throw new Error('Request aborted');
    });

    const reader = new ZipMetadata(TEST_URL);
    return expect(reader.readCentralDirectory()).rejects.toThrow(
      'Failed to locate End of Central Directory record: Error initiating request: Network error',
    );
  });

  test('handles invalid central directory signature', () => {
    const validZipData = zipSync({
      'test.txt': strToU8('Test'),
    });

    const corruptedZipData = new Uint8Array(validZipData);
    for (let i = 0; i < corruptedZipData.length - 4; i++) {
      const view = new DataView(corruptedZipData.buffer);
      if (view.getUint32(i, true) === 0x02014b50) {
        view.setUint32(i, 0x12345678, true);
        break;
      }
    }

    setupMockZip(corruptedZipData);

    const reader = new ZipMetadata(TEST_URL);
    return expect(reader.readCentralDirectory()).rejects.toThrow(
      'Invalid central directory header signature',
    );
  });
});
