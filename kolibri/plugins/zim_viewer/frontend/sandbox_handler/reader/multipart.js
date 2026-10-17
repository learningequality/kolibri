function indexOfBytes(haystack, needle, from = 0) {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        continue outer;
      }
    }
    return i;
  }
  return -1;
}

const BOUNDARY_RE = /boundary=("?)([^";,\s]+)\1/i;

/**
 * Parse a `multipart/byteranges` response body.
 * @param {ArrayBuffer|Uint8Array} body - the raw response body
 * @param {string} contentTypeHeader - the response Content-Type (carries the boundary)
 * @returns {Array<{start:number,end:number,data:Uint8Array}>} one entry per part
 * holding all the bytes its `Content-Range` start/end claims
 * @throws {Error} if the Content-Type has no boundary or the body has none
 */
export function parseMultipartByteRanges(body, contentTypeHeader) {
  const match = BOUNDARY_RE.exec(contentTypeHeader || '');
  if (!match) {
    throw new Error('No multipart boundary in Content-Type');
  }
  const bytes = body instanceof Uint8Array ? body : new Uint8Array(body);
  const dashBoundary = new TextEncoder().encode('--' + match[2]);
  const separator = new TextEncoder().encode('\r\n\r\n');

  const parts = [];
  let pos = indexOfBytes(bytes, dashBoundary, 0);
  if (pos < 0) {
    throw new Error('multipart boundary not found in body');
  }
  while (pos >= 0) {
    const afterBoundary = pos + dashBoundary.length;
    if (bytes[afterBoundary] === 0x2d && bytes[afterBoundary + 1] === 0x2d) {
      break;
    }
    const headerEnd = indexOfBytes(bytes, separator, afterBoundary);
    if (headerEnd < 0) {
      break;
    }
    const headerText = new TextDecoder('latin1').decode(bytes.subarray(afterBoundary, headerEnd));
    const rangeMatch = /content-range:\s*bytes\s+(\d+)-(\d+)\//i.exec(headerText);
    const bodyStart = headerEnd + separator.length;
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      const length = end - start + 1;
      const data = bytes.subarray(bodyStart, bodyStart + length);
      if (data.length === length) {
        parts.push({ start, end, data });
      }
      pos = indexOfBytes(bytes, dashBoundary, bodyStart + length);
    } else {
      pos = indexOfBytes(bytes, dashBoundary, bodyStart);
    }
  }
  return parts;
}
