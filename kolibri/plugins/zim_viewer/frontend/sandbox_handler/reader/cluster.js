import { decompress as zstdDecompress } from 'fzstd';
import { CorruptZimError, UnsupportedCompressionError } from './errors';
import { readU64LE } from './header';

// Cluster info byte: https://wiki.openzim.org/wiki/ZIM_file_format#Clusters
const COMPRESSION_NONE = 1;
const COMPRESSION_ZSTD = 5;
const EXTENDED_OFFSET_BIT = 0x10;

/**
 * Decompress a raw ZIM cluster (compression info byte + body).
 * @param {Uint8Array} clusterBytes - The raw cluster
 * @returns {{decompressed: Uint8Array, extended: boolean}} The decompressed body, plus
 * the flag that drives offset-table decoding when slicing blobs
 * @throws {UnsupportedCompressionError} For a compression type other than none or zstd
 */
export function decompressCluster(clusterBytes) {
  const infoByte = clusterBytes[0];
  const compression = infoByte & 0x0f;
  const extended = (infoByte & EXTENDED_OFFSET_BIT) !== 0;
  const body = clusterBytes.subarray(1);

  switch (compression) {
    case COMPRESSION_NONE:
      return { decompressed: body.slice(), extended };
    case COMPRESSION_ZSTD:
      return { decompressed: zstdDecompress(body), extended };
    default:
      throw new UnsupportedCompressionError(compression);
  }
}

/**
 * Slice one blob out of a decompressed cluster.
 * @param {object} cluster - A cluster from decompressCluster
 * @param {Uint8Array} cluster.decompressed - The decompressed cluster body
 * @param {boolean} cluster.extended - Selects between 4- and 8-byte entries in the
 * cluster's leading offset table
 * @param {number} blobNumber - Index of the blob within the cluster
 * @returns {Uint8Array} A view of the blob's bytes
 * @throws {CorruptZimError} If the offset table doesn't hold a valid range for the blob
 */
export function sliceBlob({ decompressed, extended }, blobNumber) {
  const entrySize = extended ? 8 : 4;
  const view = new DataView(decompressed.buffer, decompressed.byteOffset, decompressed.byteLength);

  function readOffset(i) {
    return extended ? readU64LE(view, i * entrySize) : view.getUint32(i * entrySize, true);
  }

  if (
    (blobNumber + 2) * entrySize > decompressed.byteLength ||
    (blobNumber + 1) * entrySize >= readOffset(0)
  ) {
    throw new CorruptZimError(`Blob ${blobNumber} is outside the cluster's offset table`);
  }
  const start = readOffset(blobNumber);
  const end = readOffset(blobNumber + 1);
  if (start > end || end > decompressed.byteLength) {
    throw new CorruptZimError(`Blob ${blobNumber} has invalid offsets ${start}-${end}`);
  }
  return decompressed.subarray(start, end);
}
