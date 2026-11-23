import { decompressCluster, sliceBlob } from '../cluster';
import { CorruptZimError, UnsupportedCompressionError } from '../errors';

// Cluster info byte: https://wiki.openzim.org/wiki/ZIM_file_format#Clusters
const COMPRESSION_NONE = 1;
const COMPRESSION_XZ = 4;
const COMPRESSION_ZSTD = 5;
const EXTENDED_OFFSETS = 0x10;

// `zstd -19 --no-check` of the offset table [8, 68] followed by 'Hello' x 12.
const ZSTD_FRAME = [
  0x28, 0xb5, 0x2f, 0xfd, 0x00, 0x68, 0xa5, 0x00, 0x00, 0x70, 0x08, 0x00, 0x00, 0x00, 0x44, 0x00,
  0x00, 0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x48, 0x01, 0x00, 0xc3, 0x59, 0x94,
];

function cluster(offsets, body = [], { extended = false } = {}) {
  const entrySize = extended ? 8 : 4;
  const bytes = new Uint8Array(offsets.length * entrySize + body.length);
  const view = new DataView(bytes.buffer);
  offsets.forEach((offset, i) => view.setUint32(i * entrySize, offset, true));
  bytes.set(body, offsets.length * entrySize);
  return { decompressed: bytes, extended };
}

function ascii(bytes) {
  return String.fromCharCode(...bytes);
}

describe('decompressCluster', () => {
  it('decompresses a zstd cluster', () => {
    const decompressed = decompressCluster(new Uint8Array([COMPRESSION_ZSTD, ...ZSTD_FRAME]));
    expect(decompressed.extended).toBe(false);
    expect(ascii(sliceBlob(decompressed, 0))).toBe('Hello'.repeat(12));
  });

  it('copies an uncompressed cluster body', () => {
    const raw = new Uint8Array([COMPRESSION_NONE, ...cluster([8, 11], [1, 2, 3]).decompressed]);
    const { decompressed } = decompressCluster(raw);
    expect([...sliceBlob({ decompressed, extended: false }, 0)]).toEqual([1, 2, 3]);
    expect(decompressed.buffer).not.toBe(raw.buffer);
  });

  it('reads the extended-offsets flag from the info byte', () => {
    const raw = new Uint8Array([COMPRESSION_NONE | EXTENDED_OFFSETS, 0]);
    expect(decompressCluster(raw).extended).toBe(true);
  });

  it('rejects xz clusters', () => {
    expect(() => decompressCluster(new Uint8Array([COMPRESSION_XZ, 0]))).toThrow(
      UnsupportedCompressionError,
    );
  });
});

describe('sliceBlob', () => {
  it('slices a blob out by its offsets', () => {
    const blob = sliceBlob(cluster([8, 11], [1, 2, 3]), 0);
    expect([...blob]).toEqual([1, 2, 3]);
  });

  it('slices a blob out by 8-byte extended offsets', () => {
    const blob = sliceBlob(cluster([24, 26, 29], [1, 2, 3, 4, 5], { extended: true }), 1);
    expect([...blob]).toEqual([3, 4, 5]);
  });

  it('rejects a blob past the end of the offset table', () => {
    expect(() => sliceBlob(cluster([8, 11], [12, 0, 0, 0]), 1)).toThrow(CorruptZimError);
  });

  it('rejects offsets that run backwards', () => {
    expect(() => sliceBlob(cluster([11, 8], [1, 2, 3]), 0)).toThrow(CorruptZimError);
  });

  it('rejects offsets past the end of the cluster', () => {
    expect(() => sliceBlob(cluster([8, 99], [1, 2, 3]), 0)).toThrow(CorruptZimError);
  });
});
