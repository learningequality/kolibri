function bytesForHumans(bytes) {
  // breaking down byte counts in terms of larger sizes
  const kilobyte = 1024;
  const megabyte = kilobyte ** 2;
  const gigabyte = kilobyte ** 3;

  function kilobyteCalc(byteCount) {
    const kilos = Math.floor(byteCount / kilobyte);
    return `${kilos} KB`;
  }
  function megabyteCalc(byteCount) {
    const megs = Math.floor(byteCount / megabyte);
    return `${megs} MB`;
  }
  function gigabyteCalc(byteCount) {
    const gigs = Math.floor(byteCount / gigabyte);
    return `${gigs} GB`;
  }
  function chooseSize(byteCount) {
    if (byteCount > gigabyte) {
      return gigabyteCalc(byteCount);
    } else if (byteCount > megabyte) {
      return megabyteCalc(byteCount);
    } else if (byteCount > kilobyte) {
      return kilobyteCalc(byteCount);
    }
    return `${bytes} B`;
  }

  return chooseSize(bytes);
}

module.exports = bytesForHumans;
