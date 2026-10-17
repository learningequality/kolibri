import { NotZimError } from './errors';

// Header layout: https://wiki.openzim.org/wiki/ZIM_file_format#Header
export const ZIM_MAGIC = 0x044d495a;
export const HEADER_SIZE = 80;

function readU64LE(view, offset) {
  const lo = view.getUint32(offset, true);
  const hi = view.getUint32(offset + 4, true);
  // Exact up to 2^53, ample for ZIM file positions.
  return hi * 0x100000000 + lo;
}

export function parseHeader(bytes) {
  if (bytes.byteLength < HEADER_SIZE) {
    throw new NotZimError('Buffer too small to contain a ZIM header');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint32(0, true);
  if (magic !== ZIM_MAGIC) {
    throw new NotZimError(`ZIM magic mismatch (got 0x${magic.toString(16).padStart(8, '0')})`);
  }
  return {
    magic,
    majorVersion: view.getUint16(4, true),
    minorVersion: view.getUint16(6, true),
    articleCount: view.getUint32(24, true),
    clusterCount: view.getUint32(28, true),
    urlPtrPos: readU64LE(view, 32),
    titlePtrPos: readU64LE(view, 40),
    clusterPtrPos: readU64LE(view, 48),
    mimeListPos: readU64LE(view, 56),
    mainPage: view.getUint32(64, true),
    layoutPage: view.getUint32(68, true),
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
