import { TextEncoder, TextDecoder } from 'node:util';
import { parseMultipartByteRanges } from '../multipart';

global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

describe('parseMultipartByteRanges', () => {
  const boundary = 'abc123boundaryXYZ';
  const contentType = 'multipart/byteranges; boundary=' + boundary;

  function buildBody(parts, size, theBoundary) {
    const enc = new TextEncoder();
    const chunks = [];
    for (const part of parts) {
      chunks.push(
        enc.encode(
          '--' +
            theBoundary +
            '\r\nContent-Type: application/octet-stream\r\n' +
            'Content-Range: bytes ' +
            part.start +
            '-' +
            part.end +
            '/' +
            size +
            '\r\n\r\n',
        ),
      );
      chunks.push(part.data);
      chunks.push(enc.encode('\r\n'));
    }
    chunks.push(enc.encode('--' + theBoundary + '--\r\n'));
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }

  it('parses each part with its range and exact bytes', () => {
    const body = buildBody(
      [
        { start: 0, end: 3, data: new Uint8Array([1, 2, 3, 4]) },
        { start: 100, end: 102, data: new Uint8Array([9, 8, 7]) },
      ],
      1000,
      boundary,
    );
    const parts = parseMultipartByteRanges(body.buffer, contentType);
    expect(parts.length).toBe(2);
    expect(parts[0]).toMatchObject({ start: 0, end: 3 });
    expect(Array.from(parts[0].data)).toEqual([1, 2, 3, 4]);
    expect(parts[1]).toMatchObject({ start: 100, end: 102 });
    expect(Array.from(parts[1].data)).toEqual([9, 8, 7]);
  });

  it('uses Content-Range length, so bytes containing CRLF/boundary-like data survive', () => {
    const data = new Uint8Array([0x0d, 0x0a, 0x00, 0xff, 0x2d, 0x2d, 0x0d, 0x0a]);
    const body = buildBody([{ start: 0, end: 7, data }], 8, boundary);
    const parts = parseMultipartByteRanges(body.buffer, contentType);
    expect(parts.length).toBe(1);
    expect(Array.from(parts[0].data)).toEqual([0x0d, 0x0a, 0x00, 0xff, 0x2d, 0x2d, 0x0d, 0x0a]);
  });

  it('handles a single part', () => {
    const body = buildBody([{ start: 5, end: 7, data: new Uint8Array([1, 2, 3]) }], 100, boundary);
    const parts = parseMultipartByteRanges(body.buffer, contentType);
    expect(parts.length).toBe(1);
    expect(parts[0].start).toBe(5);
  });

  it('accepts a quoted boundary and a Uint8Array body', () => {
    const body = buildBody([{ start: 0, end: 1, data: new Uint8Array([1, 2]) }], 10, boundary);
    const parts = parseMultipartByteRanges(
      body,
      'multipart/byteranges; boundary="' + boundary + '"',
    );
    expect(parts.length).toBe(1);
  });

  it('drops a final part cut short of its Content-Range', () => {
    const body = buildBody(
      [
        { start: 0, end: 3, data: new Uint8Array([1, 2, 3, 4]) },
        { start: 100, end: 102, data: new Uint8Array([9, 8, 7]) },
      ],
      1000,
      boundary,
    );
    const trailerLength = `\r\n--${boundary}--\r\n`.length;
    const truncated = body.slice(0, body.length - trailerLength - 1);
    const parts = parseMultipartByteRanges(truncated.buffer, contentType);
    expect(parts.length).toBe(1);
    expect(parts[0]).toMatchObject({ start: 0, end: 3 });
  });

  it('throws when the Content-Type has no boundary (caller falls back)', () => {
    expect(() =>
      parseMultipartByteRanges(new Uint8Array([1, 2, 3]).buffer, 'application/octet-stream'),
    ).toThrow();
  });
});
