// Webpack loader that converts rem units to px in Perseus / Wonder Blocks CSS.
//
// Perseus v75 and its Wonder Blocks design tokens assume a 62.5% root
// font-size (1rem = 10px), which is the convention on khanacademy.org.
// Kolibri uses the browser default (1rem = 16px), so all rem-based sizing
// renders 1.6× too large.
//
// Rather than setting a global font-size on <html> (which would break
// everything else in Kolibri), this loader rewrites rem → px at build
// time using the 10px base that the CSS was authored against.
module.exports = function(source) {
  // Match numeric rem values like "1.8rem", ".4rem", "0.2rem"
  // but NOT inside CSS custom property names (e.g. --wb-sizing-size_160)
  return source.replace(
    /(?<=:\s*[^;]*?)(-?\d*\.?\d+)rem/g,
    (_match, value) => {
      const px = parseFloat(value) * 10;
      // Use integer px when possible for cleaner output
      return (px % 1 === 0 ? px : px.toFixed(1)) + 'px';
    },
  );
};
