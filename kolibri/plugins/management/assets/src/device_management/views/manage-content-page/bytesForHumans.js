import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('bytesForHumansStrings', {
  kbString: '{n, number, integer}KB',
  mbString: '{n, number, integer}MB',
  gbString: '{n, number, integer}GB',
  bString: '{n, number, integer}B',
});

export default function bytesForHumans(bytes) {
  // breaking down byte counts in terms of larger sizes
  const kilobyte = 1024;
  const megabyte = kilobyte ** 2;
  const gigabyte = kilobyte ** 3;

  function kilobyteCalc(byteCount) {
    const kilos = Math.floor(byteCount / kilobyte);
    return translator.$tr('kbString', { n: kilos });
  }
  function megabyteCalc(byteCount) {
    const megs = Math.floor(byteCount / megabyte);
    return translator.$tr('mbString', { n: megs });
  }
  function gigabyteCalc(byteCount) {
    const gigs = Math.floor(byteCount / gigabyte);
    return translator.$tr('gbString', { n: gigs });
  }
  function chooseSize(byteCount) {
    if (byteCount > gigabyte) {
      return gigabyteCalc(byteCount);
    } else if (byteCount > megabyte) {
      return megabyteCalc(byteCount);
    } else if (byteCount > kilobyte) {
      return kilobyteCalc(byteCount);
    }
    return translator.$tr('mbString', { n: bytes });
  }

  return chooseSize(bytes);
}
