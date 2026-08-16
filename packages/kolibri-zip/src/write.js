import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from '@zip.js/zip.js';

/**
 * Write a zip archive in memory.
 * @param {{[path: string]: string|Uint8Array}} files - Contents keyed by archive
 * path. String values are encoded as UTF-8.
 * @returns {Promise<Uint8Array>} The archive's bytes.
 */
export async function createZipBytes(files) {
  const encoder = new TextEncoder();
  const zipWriter = new ZipWriter(new Uint8ArrayWriter());
  for (const [path, contents] of Object.entries(files)) {
    const bytes = typeof contents === 'string' ? encoder.encode(contents) : contents;
    await zipWriter.add(path, new Uint8ArrayReader(bytes));
  }
  return zipWriter.close();
}
