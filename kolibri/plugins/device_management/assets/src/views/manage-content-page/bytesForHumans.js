import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('bytesForHumansStrings', {
  fileSizeInBytes: '{n, number, integer} B',
  fileSizeInKilobytes: '{n, number, integer} KB',
  fileSizeInMegabytes: '{n, number, integer} MB',
  fileSizeInGigabytes: '{n, number, integer} GB',
});

const ONE_B = 1;
const ONE_KB = 1024;
const ONE_MB = 1048576;
const ONE_GB = 1073741824;

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
