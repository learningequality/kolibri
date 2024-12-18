import { strFromU8 } from 'fflate';
import loadBinary from './loadBinary';
import {
  LARGE_FILE_THRESHOLD,
  LOCAL_FILE_HEADER_FIXED_SIZE,
  EOCD_SIZE,
  EOCD_SIGNATURE,
  MAX_COMMENT_SIZE,
} from './constants';
import { readUInt32LE, readUInt16LE } from './zipUtils';

class ZipMetadata {
  constructor(url, mapperExtensions = [], largeFileThreshold = LARGE_FILE_THRESHOLD) {
    this.url = url;
    this._supportsRanges = false;
    this._fileSize = null;
    this.mapperExtensions = mapperExtensions;
    this.largeFileThreshold = largeFileThreshold;
  }

  async readRange(start, length) {
    if (!this._supportsRanges) {
      throw new Error('Range requests are not supported.');
    }

    const buffer = await loadBinary(this.url, {
      start,
      end: start + length - 1,
    });
    return new Uint8Array(buffer);
  }

  shouldLoadFromUrl(entry) {
    // Files that need mapping are never considered large
    if (this.mapperExtensions.includes(entry.fileName.split('.').pop()?.toLowerCase())) {
      return false;
    }
    return entry.uncompressedSize >= this.largeFileThreshold;
  }

  createSegments(entries) {
    // Sort files by offset
    const sortedFiles = [...entries].sort((a, b) => a.localHeaderOffset - b.localHeaderOffset);

    const segments = [];
    let currentSegment = null;

    for (const file of sortedFiles) {
      const start = file.localHeaderOffset;
      const headerSize =
        LOCAL_FILE_HEADER_FIXED_SIZE + file.fileNameLength + (file.extraFieldLength || 0);
      const end = start + file.compressedSize + headerSize;

      if (!currentSegment && !file.loadFromUrl) {
        currentSegment = { start, end, id: segments.length };
        segments.push(currentSegment);
      } else if (file.loadFromUrl) {
        currentSegment = null;
      } else {
        currentSegment.end = end;
      }

      file.segment = file.loadFromUrl ? null : currentSegment.id;
    }

    return segments;
  }

  async findEndOfCentralDirectory() {
    // Start with 64KB instead of EOCD_SIZE
    // To try to grab whole central directory in a single request
    let readSize = 65536; // 64KB
    let startPos = -readSize;

    try {
      const { contentLength, acceptRanges } = await loadBinary(this.url, { method: 'HEAD' });
      this._fileSize = contentLength;
      this._supportsRanges = acceptRanges === 'bytes';
      if (!this._supportsRanges) {
        throw new Error('Server does not support range requests.');
      }

      // If file is smaller than our read size, adjust
      if (contentLength < readSize) {
        readSize = contentLength;
        startPos = -readSize;
      }

      // Search progressively larger chunks until we find EOCD
      while (-startPos <= MAX_COMMENT_SIZE + EOCD_SIZE) {
        const chunk = await this.readRange(contentLength + startPos, readSize);

        // Search for EOCD signature in chunk
        for (let i = chunk.length - EOCD_SIZE; i >= 0; i--) {
          const signature = readUInt32LE(chunk, i);
          if (signature === EOCD_SIGNATURE) {
            // Found EOCD
            const eocd = chunk.slice(i);
            const centralDirSize = readUInt32LE(eocd, 12);
            const centralDirOffset = readUInt32LE(eocd, 16);
            const totalEntries = readUInt16LE(eocd, 8);

            // Check if we already have the central directory in our chunk
            if (
              centralDirOffset >= contentLength + startPos &&
              centralDirOffset + centralDirSize <= contentLength
            ) {
              // We already have the central directory data!
              const centralDirData = chunk.slice(
                centralDirOffset - (contentLength + startPos),
                centralDirOffset - (contentLength + startPos) + centralDirSize,
              );

              // Cache the central directory data for later use
              this._cachedCentralDir = centralDirData;
            }

            return {
              centralDirOffset,
              centralDirSize,
              totalEntries,
            };
          }
        }

        // Double readSize but don't exceed file size
        readSize = Math.min(readSize * 2, this._fileSize);
        startPos = -readSize;
      }

      throw new Error('Could not find ZIP central directory');
    } catch (error) {
      throw new Error(`Failed to locate End of Central Directory record: ${error.message}`);
    }
  }

  async readCentralDirectory() {
    const eocd = await this.findEndOfCentralDirectory();

    // If we have cached central directory data, use it
    let centralDir;
    if (this._cachedCentralDir) {
      centralDir = this._cachedCentralDir;
      this._cachedCentralDir = null; // Free the memory
    } else {
      // Otherwise fetch it
      centralDir = await this.readRange(eocd.centralDirOffset, eocd.centralDirSize);
    }

    const entries = [];
    let offset = 0;

    const CENTRAL_HEADER_SIGNATURE = 0x02014b50;

    while (offset < centralDir.length) {
      const signature = readUInt32LE(centralDir, offset);
      if (signature !== CENTRAL_HEADER_SIGNATURE) {
        throw new Error(`Invalid central directory header signature: ${signature.toString(16)}`);
      }

      const entry = {
        compressedSize: readUInt32LE(centralDir, offset + 20),
        uncompressedSize: readUInt32LE(centralDir, offset + 24),
        fileNameLength: readUInt16LE(centralDir, offset + 28),
        extraFieldLength: readUInt16LE(centralDir, offset + 30),
        fileCommentLength: readUInt16LE(centralDir, offset + 32),
        localHeaderOffset: readUInt32LE(centralDir, offset + 42),
        compressionMethod: readUInt16LE(centralDir, offset + 10),
      };

      offset += 46; // Fixed-size portion of header

      // Read filename
      entry.fileName = strFromU8(centralDir.slice(offset, offset + entry.fileNameLength));
      entry.loadFromUrl = this.shouldLoadFromUrl(entry);
      offset += entry.fileNameLength + entry.extraFieldLength + entry.fileCommentLength;

      entries.push(entry);
    }

    const segments = this.createSegments(entries);

    const entriesByName = entries.reduce((acc, entry) => {
      acc[entry.fileName] = entry;
      return acc;
    }, {});

    return {
      entries: entriesByName,
      segments,
      totalSize: this._fileSize,
    };
  }
}

export default ZipMetadata;
