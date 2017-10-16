import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('bytesForHumansStrings', {
  kbString: '{n, number, integer}KB',
  mbString: '{n, number, integer}MB',
  gbString: '{n, number, integer}GB',
  bString: '{n, number, integer}B',
});

const ONE_B = 1;
const ONE_KB = 1024;
const ONE_MB = 1048576;
const ONE_GB = 1073741824;

const stringMap = {
  [ONE_B]: 'bString',
  [ONE_KB]: 'kbString',
  [ONE_MB]: 'mbString',
  [ONE_GB]: 'gbString',
};

export default function bytesForHumans(bytes) {
  const unit = [ONE_GB, ONE_MB, ONE_KB].find(x => bytes >= x) || ONE_B;
  return translator.$tr(stringMap[unit], { n: Math.floor(bytes / unit) });
}
