import mock from 'xhr-mock';
import loadBinary from '../src/loadBinary';

describe('loadBinary utility', () => {
  const TEST_URL = 'test.file';
  const TEST_FILE_SIZE = 1024;

  beforeEach(() => {
    mock.setup();
  });

  afterEach(() => {
    mock.teardown();
  });

  test('makes HEAD request correctly', async () => {
    mock.use('HEAD', TEST_URL, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': TEST_FILE_SIZE.toString(),
      },
    });

    const result = await loadBinary(TEST_URL, { method: 'HEAD' });

    expect(result).toEqual({
      contentLength: TEST_FILE_SIZE,
      acceptRanges: 'bytes',
    });
  });

  test('handles range requests correctly', async () => {
    const mockData = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    let rangeHeader;
    mock.get(TEST_URL, (req, res) => {
      rangeHeader = req.header('Range');

      return res.status(206).header('Content-Range', 'bytes 0-4/1024').body(mockData);
    });

    const result = await loadBinary(TEST_URL, { start: 0, end: 4 });
    expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    expect(rangeHeader).toBe('bytes=0-4');
  });

  test('handles full file GET request correctly', async () => {
    const mockData = new Uint8Array([1, 2, 3, 4, 5]).buffer;

    let rangeHeader;

    mock.get(TEST_URL, (req, res) => {
      rangeHeader = req.header('Range');
      return res.status(200).header('Content-Length', '5').body(mockData);
    });

    const result = await loadBinary(TEST_URL);
    expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    expect(rangeHeader).toBe(null);
  });

  test('handles network errors properly', async () => {
    mock.get(TEST_URL, {
      status: 404,
      reason: 'Not Found',
    });

    await expect(loadBinary(TEST_URL)).rejects.toThrow('HTTP error for test.file: 404 Not Found');
  });

  test('handles server errors properly', async () => {
    mock.get(TEST_URL, {
      status: 500,
      reason: 'Internal Server Error',
    });

    await expect(loadBinary(TEST_URL)).rejects.toThrow(
      'HTTP error for test.file: 500 Internal Server Error',
    );
  });

  test('handles non-206 response for range request', async () => {
    mock.get(TEST_URL, {
      status: 200,
      body: new ArrayBuffer(10),
    });

    const result = await loadBinary(TEST_URL, { start: 0, end: 4 });
    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  test('handles HEAD request with no Content-Length header', async () => {
    mock.use('HEAD', TEST_URL, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
      },
    });

    const result = await loadBinary(TEST_URL, { method: 'HEAD' });
    expect(result.contentLength).toBeNaN();
    expect(result.acceptRanges).toBe('bytes');
  });

  test('handles request error events', async () => {
    mock.get(TEST_URL, () => {
      throw new Error('Network error');
    });

    await expect(loadBinary(TEST_URL)).rejects.toThrow('Error initiating request: Network error');
  });
});
