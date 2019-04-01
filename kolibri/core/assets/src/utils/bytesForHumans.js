import { createTranslator } from './i18n';

const translator = createTranslator('BytesForHumansStrings', {
  fileSizeInBytes: '{n, number, integer} B',
  fileSizeInKilobytes: '{n, number, integer} KB',
  fileSizeInMegabytes: '{n, number, integer} MB',
  fileSizeInGigabytes: '{n, number, integer} GB',
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
