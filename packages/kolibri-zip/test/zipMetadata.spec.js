import mock from 'xhr-mock';
import loadBinary from '../src/loadBinary';
import ZipMetadata from '../src/zipMetadata';
import { LOCAL_FILE_HEADER_FIXED_SIZE } from '../src/constants';

function stringToBytes(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function createMockZipResponse(options = {}) {
  const { centralDirOffset = 512, centralDirSize = 128, totalEntries = 2 } = options;

  // Create EOCD record
  const eocd = new Uint8Array(22);
  const dataView = new DataView(eocd.buffer);
  dataView.setUint32(0, 0x06054b50, true); // EOCD signature
  dataView.setUint16(8, totalEntries, true); // Total entries
  dataView.setUint32(12, centralDirSize, true); // Central directory size
  dataView.setUint32(16, centralDirOffset, true); // Central directory offset

  return eocd;
}

function createMockCentralDirectory(files) {
  // Calculate total size needed
  const totalSize = files.reduce((sum, file) => {
    return sum + 46 + file.name.length; // 46 is the fixed header size
  }, 0);

  const centralDir = new Uint8Array(totalSize);
  const dataView = new DataView(centralDir.buffer);
  let offset = 0;

  files.forEach(file => {
    // Write central directory header
    dataView.setUint32(offset, 0x02014b50, true); // Central directory signature
    dataView.setUint32(offset + 20, file.compressedSize, true); // Compressed size
    dataView.setUint32(offset + 24, file.size, true); // Uncompressed size
    dataView.setUint16(offset + 28, file.name.length, true); // File name length
    dataView.setUint32(offset + 42, file.localHeaderOffset || 0, true); // Local header offset

    // Write filename using simple string to bytes conversion
    const nameBytes = stringToBytes(file.name);
    centralDir.set(nameBytes, offset + 46);

    offset += 46 + file.name.length;
  });

  return centralDir;
}

describe('ZIP Metadata Reader', () => {
  const TEST_URL = 'test.zip';
  const TEST_FILE_SIZE = 1024;

  beforeEach(() => {
    mock.setup();
  });

  afterEach(() => {
    mock.teardown();
  });

  function setupHeadRequest(fileSize = TEST_FILE_SIZE) {
    mock.use('HEAD', TEST_URL, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize.toString(),
      },
    });
  }

  describe('loadBinary utility', () => {
    test('makes HEAD request correctly', async () => {
      setupHeadRequest();

      const result = await loadBinary(TEST_URL, { method: 'HEAD' });

      expect(result).toEqual({
        contentLength: TEST_FILE_SIZE,
        acceptRanges: 'bytes',
      });
    });

    test('handles range requests correctly', async () => {
      const mockData = new Uint8Array([1, 2, 3, 4, 5]).buffer;

      mock.get(TEST_URL, (req, res) => {
        expect(req.header('Range')).toBe('bytes=0-4');
        return res.status(206).header('Content-Range', 'bytes 0-4/1024').body(mockData);
      });

      const result = await loadBinary(TEST_URL, { start: 0, end: 4 });
      expect(result).toEqual(mockData);
    });
  });

  describe('ZipMetadata', () => {
    let reader;

    beforeEach(() => {
      reader = new ZipMetadata(TEST_URL);
      setupHeadRequest();
    });

    test('finds End of Central Directory correctly', async () => {
      const mockEocd = createMockZipResponse({ fileSize: TEST_FILE_SIZE });

      // Mock the range request for EOCD
      mock.get(TEST_URL, (req, res) => {
        return res
          .status(206)
          .header(
            'Content-Range',
            `bytes ${TEST_FILE_SIZE - 22}-${TEST_FILE_SIZE - 1}/${TEST_FILE_SIZE}`,
          )
          .body(mockEocd.buffer);
      });

      const result = await reader.findEndOfCentralDirectory();

      expect(result).toEqual({
        centralDirOffset: 512,
        centralDirSize: 128,
        totalEntries: 2,
      });
    });

    test('reads Central Directory entries correctly', async () => {
      const files = [
        { name: 'test.txt', size: 100, compressedSize: 80, localHeaderOffset: 0 },
        { name: 'test2.html', size: 200, compressedSize: 150, localHeaderOffset: 100 },
      ];

      // Mock EOCD request
      const mockEocd = createMockZipResponse({ files, fileSize: TEST_FILE_SIZE });
      // Mock Central Directory request
      const mockCentralDir = createMockCentralDirectory(files);
      mock.get(TEST_URL, (req, res) => {
        const rangeHeader = req.header('Range');
        if (rangeHeader === `bytes=${TEST_FILE_SIZE - 22}-${TEST_FILE_SIZE - 1}`) {
          return res
            .status(206)
            .header(
              'Content-Range',
              `bytes ${TEST_FILE_SIZE - 22}-${TEST_FILE_SIZE - 1}/${TEST_FILE_SIZE}`,
            )
            .body(mockEocd.buffer);
        }
        if (rangeHeader === 'bytes=512-639') {
          return res
            .status(206)
            .header('Content-Range', 'bytes 512-639/1024')
            .body(mockCentralDir.buffer);
        }
        return res.status(404);
      });

      await reader.findEndOfCentralDirectory();
      const { entries, segments, totalSize } = await reader.readCentralDirectory();

      const largeFiles = Object.values(entries).filter(entry => entry.loadFromUrl);

      expect(Object.keys(entries)).toHaveLength(2);
      expect(entries['test.txt'].uncompressedSize).toBe(100);
      expect(entries['test2.html'].uncompressedSize).toBe(200);
      expect(segments).toHaveLength(1); // Since no large files, should be single segment
      expect(segments[0].start).toBe(0);
      const file2HeaderSize = LOCAL_FILE_HEADER_FIXED_SIZE + files[1].name.length;
      expect(segments[0].end).toBe(
        files[1].localHeaderOffset + file2HeaderSize + files[1].compressedSize,
      );
      expect(segments[0].id).toBe(0);
      expect(largeFiles).toHaveLength(0);
      expect(totalSize).toBe(TEST_FILE_SIZE);
    });
    test('handles ZIP with comment correctly', async () => {
      const comment = 'Test Comment';
      const commentBytes = stringToBytes(comment);

      // Create EOCD with comment
      const eocdWithComment = new Uint8Array(22 + commentBytes.length);
      eocdWithComment.set(createMockZipResponse(), 0);
      eocdWithComment.set(commentBytes, 22);

      // We need to check progressively larger ranges until we find the EOCD
      mock.get(TEST_URL, (req, res) => {
        return res
          .status(206)
          .header(
            'Content-Range',
            `bytes ${TEST_FILE_SIZE - (22 + comment.length)}-${TEST_FILE_SIZE - 1}/${TEST_FILE_SIZE}`,
          )
          .body(eocdWithComment.buffer);
      });

      const result = await reader.findEndOfCentralDirectory();

      expect(result).toEqual({
        centralDirOffset: 512,
        centralDirSize: 128,
        totalEntries: 2,
      });
    });

    test('handles network errors appropriately', async () => {
      mock.get(TEST_URL, {
        status: 404,
        reason: 'Not Found',
      });

      await expect(reader.findEndOfCentralDirectory()).rejects.toThrow('HTTP error');
    });
  });
  test('reads Central Directory entries and creates segments correctly', async () => {
    const files = [
      {
        name: 'test.txt',
        size: 100,
        compressedSize: 80,
        localHeaderOffset: 0,
      },
      {
        name: 'test2.html',
        size: 200,
        compressedSize: 150,
        localHeaderOffset: 80, // Just after first file's compressed data
      },
      {
        name: 'large.mp4',
        size: 2000000,
        compressedSize: 1900000,
        localHeaderOffset: 230, // After second file's compressed data
      },
      {
        name: 'test3.css',
        size: 50,
        compressedSize: 40,
        localHeaderOffset: 1900230, // After large file's compressed data
      },
    ];

    // Set up HEAD request mock
    setupHeadRequest(TEST_FILE_SIZE);

    const reader = new ZipMetadata(TEST_URL, ['css', 'html']); // Treat css and html files as mapped files

    // Mock EOCD request
    const mockEocd = createMockZipResponse({ files });
    // Mock Central Directory request
    const mockCentralDir = createMockCentralDirectory(files);

    mock.get(TEST_URL, (req, res) => {
      const rangeHeader = req.header('Range');
      if (rangeHeader === `bytes=${TEST_FILE_SIZE - 22}-${TEST_FILE_SIZE - 1}`) {
        return res
          .status(206)
          .header(
            'Content-Range',
            `bytes ${TEST_FILE_SIZE - 22}-${TEST_FILE_SIZE - 1}/${TEST_FILE_SIZE}`,
          )
          .body(mockEocd.buffer);
      }
      if (rangeHeader === 'bytes=512-639') {
        return res
          .status(206)
          .header('Content-Range', 'bytes 512-639/1024')
          .body(mockCentralDir.buffer);
      }
      return res.status(404);
    });

    await reader.findEndOfCentralDirectory();
    const { entries, segments } = await reader.readCentralDirectory();

    const largeFiles = Object.values(entries).filter(entry => entry.loadFromUrl);

    // Test entries structure
    expect(Object.keys(entries)).toHaveLength(4);

    // Test segments
    expect(segments).toHaveLength(2);

    // First segment should contain test.txt and test2.html
    // Account for local file headers in end position
    const file2HeaderSize = LOCAL_FILE_HEADER_FIXED_SIZE + files[1].name.length;
    expect(segments[0]).toMatchObject({
      start: 0,
      end: 230 + file2HeaderSize, // Up to the start of the large file plus header size
      id: 0,
    });

    // Second segment should contain test3.css
    const file4HeaderSize = LOCAL_FILE_HEADER_FIXED_SIZE + files[3].name.length;
    expect(segments[1]).toMatchObject({
      start: 1900230,
      end: 1900230 + file4HeaderSize + files[3].compressedSize,
      id: 1,
    });

    // Test large file
    expect(largeFiles).toHaveLength(1);
    expect(largeFiles[0].fileName).toBe('large.mp4');
    expect(entries['large.mp4'].segment).toBeNull();

    // Test segment references
    expect(entries['test.txt'].segment).toBe(0);
    expect(entries['test2.html'].segment).toBe(0);
    expect(entries['test3.css'].segment).toBe(1);
  });
});
