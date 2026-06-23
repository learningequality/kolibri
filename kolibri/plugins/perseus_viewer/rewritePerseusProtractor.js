// Simple webpack loader that rewrites the KA CDN protractor image URL in
// Perseus JS to a locally bundled copy of the SVG, so the protractor in the
// interactive graph widget works offline. Perseus declares the URL as a plain
// string constant, so we swap the literal for a require() of our local file
// and let webpack's asset handling emit it and produce the runtime URL.
const path = require('node:path');

const protractorPath = JSON.stringify(path.join(__dirname, 'frontend', 'protractor.svg'));

module.exports = function (source) {
  return source.replace(
    '"https://cdn.kastatic.org/images/perseus/protractor.svg"',
    `require(${protractorPath})`,
  );
};
