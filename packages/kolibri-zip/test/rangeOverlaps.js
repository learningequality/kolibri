/**
 * Find every pair of range headers that asked for a shared byte (#15103).
 * @param {Array<string>} headers - `bytes=<start>-<end>` headers, in request order
 * @returns {Array<string>} One description per overlapping pair
 */
export function findRangeOverlaps(headers) {
  // Range headers are inclusive at both ends, so a shared byte means start <= end.
  const ranges = headers.map(header => header.replace('bytes=', '').split('-').map(Number));
  return ranges.flatMap(([s1, e1], i) =>
    ranges
      .slice(i + 1)
      .filter(([s2, e2]) => s1 <= e2 && s2 <= e1)
      .map(([s2, e2]) => `bytes=${s1}-${e1} overlaps bytes=${s2}-${e2}`),
  );
}
