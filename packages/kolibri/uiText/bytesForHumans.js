import { createTranslator } from 'kolibri/utils/i18n';

const translator = createTranslator('BytesForHumansStrings', {
  fileSizeInBytes: {
    message: '{n, number, integer} B',
    context:
      'Indicates the byte unit of digital information when referring to a file size.\n\nSee: https://en.wikipedia.org/wiki/Byte',
  },
  fileSizeInKilobytes: {
    message: '{n, number, integer} KB',
    context:
      'Indicates the kilobyte unit of digital information when referring to a file size.\n\nSee https://en.wikipedia.org/wiki/Kilobyte',
  },
  fileSizeInMegabytes: {
    message: '{n, number, integer} MB',
    context:
      'Indicates the megabyte unit of digital information when referring to a file size.\n\nSee https://en.wikipedia.org/wiki/Megabyte',
  },
  fileSizeInGigabytes: {
    message: '{n, number, integer} GB',
    context:
      'Indicates the gigabyte unit of digital information when referring to a file size.\n\nSee https://en.wikipedia.org/wiki/Gigabyte',
  },
});

const ONE_B = 1;
const ONE_KB = 10 ** 3;
const ONE_MB = 10 ** 6;
const ONE_GB = 10 ** 9;

const stringMap = {
  [ONE_B]: 'fileSizeInBytes',
  [ONE_KB]: 'fileSizeInKilobytes',
  [ONE_MB]: 'fileSizeInMegabytes',
  [ONE_GB]: 'fileSizeInGigabytes',
};

export default function bytesForHumans(bytes) {
  const unit = [ONE_GB, ONE_MB, ONE_KB].find(x => bytes >= x) || ONE_B;
  return translator.$tr(stringMap[unit], { n: Math.floor(bytes / unit) });
}
