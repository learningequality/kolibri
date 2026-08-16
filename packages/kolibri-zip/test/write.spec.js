import { TextEncoder, TextDecoder } from 'node:util';

import { unzipSync, strFromU8 } from 'fflate';
import { createZipBytes } from '../src/index';

// Override global with Node's implementation (jsdom's version doesn't work correctly)
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

describe('createZipBytes', () => {
  it('writes text and binary entries at their given paths', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

    const entries = unzipSync(
      await createZipBytes({
        'index.html': '<html>hi</html>',
        'assets/logo.png': bytes,
      }),
    );

    expect(strFromU8(entries['index.html'])).toBe('<html>hi</html>');
    expect(Array.from(entries['assets/logo.png'])).toEqual(Array.from(bytes));
  });
});
