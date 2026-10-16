import { NotZimError } from './errors';

// Header layout: https://wiki.openzim.org/wiki/ZIM_file_format#Header
const ZIM_MAGIC = 0x044d495a;
export const HEADER_SIZE = 80;

export function readU64LE(view, offset) {
  const lo = view.getUint32(offset, true);
  const hi = view.getUint32(offset + 4, true);
  return hi * 0x100000000 + lo;
}

export function parseHeader(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint32(0, true);
  if (magic !== ZIM_MAGIC) {
    throw new NotZimError(`ZIM magic mismatch (got 0x${magic.toString(16).padStart(8, '0')})`);
  }
  return {
    articleCount: view.getUint32(24, true),
    clusterCount: view.getUint32(28, true),
    urlPtrPos: readU64LE(view, 32),
    titlePtrPos: readU64LE(view, 40),
    clusterPtrPos: readU64LE(view, 48),
    mimeListPos: readU64LE(view, 56),
    checksumPos: readU64LE(view, 72),
  };
}

export function parsePointerList(bytes, count) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = readU64LE(view, i * 8);
  }
  return out;
}
