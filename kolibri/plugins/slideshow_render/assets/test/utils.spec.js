import { checksumFromFile } from '../src/utils.js';

const validFile = {
  storage_url: '/content/storage/e/9/e95b91063fa3d12b72e83a4141639deb.json',
  id: '850bf0dc340643aa9bb9333e7410d2ff',
  priority: 1,
  available: true,
  file_size: 3529,
  extension: 'json',
  preset: 'Slideshow Manifest',
  lang: null,
  supplementary: false,
  thumbnail: false,
  download_url:
    '/downloadcontent/e95b91063fa3d12b72e83a4141639deb.json/Learning_Equality_Slideshow_Slideshow_Manifest.json',
};
const expectedChecksum = 'e95b91063fa3d12b72e83a4141639deb';

describe('utils.checksumFromFile', () => {
  it('return the checksum given a valid file', () => {
    expect(checksumFromFile(validFile)).toEqual(expectedChecksum);
  });

  it('returns null when given a file with no storage url', () => {
    expect(checksumFromFile({ key: 'value' })).toBeNull();
  });
});
