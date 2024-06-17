const fs = require('fs');
const path = require('path');
const extractPerseusMessages = require('./extractPerseusMessages');

const target = path.resolve(__dirname, './assets/dist');
// A regex for detecting paths inside `url` in CSS, paths can either be quoted or unquoted.
const cssPathRegex = /(url\(['"]?)([^"')]+)?(['"]?\),? ?)/g;
const cssNonWoffRegex = /, (url\(['"]?)([^"')]+)?(['"]?\),? ?) format\((?!['"]woff['"])['"][a-z0-9]+['"]\)/g;
// These are the css files that we are modifying to remap static assets.
const cssFiles = [
  [
    path.join(path.dirname(require.resolve('@khanacademy/perseus')), 'index.css'),
    path.join(target, 'index.css'),
  ],
  [
    path.join(path.dirname(require.resolve('@khanacademy/math-input')), 'index.css'),
    path.join(target, 'math-input.css'),
  ],
];

for (const [indexCssFile, targetCssLocation] of cssFiles) {
  console.log('Copying file and editing references for: ', indexCssFile);
  const cssFileContents = fs.readFileSync(indexCssFile, { encoding: 'utf-8' });
  const modifiedCssContents = cssFileContents.replace(cssPathRegex, function(match, p1, p2, p3) {
    // Special case for MathJax font loaded from KA CDN
    if (p2 === 'https://cdn.kastatic.org/fonts/mathjax/MathJax_Main-Regular.woff') {
      return `${p1}fonts/MathJax_Main-Regular.woff${p3}`;
    }
    // Make absolute paths relative
    const absolute = p2.startsWith('/');
    const newUrl = absolute ? p2.slice(1) : p2;
    if (newUrl) {
      // If so, replace the instance with the new URL.
      return `${p1}${newUrl}${p3}`;
    }
    // Otherwise just return empty string so that we remove the unfound file from the CSS.
    return '';
  }).replace(cssNonWoffRegex, '').replace(/\s+src: url\(fonts\/Symbola\.eot\);/, '');
  fs.writeFileSync(targetCssLocation, modifiedCssContents, { encoding: 'utf-8' });
}

// Now that the file has been built, we can extract all the perseus messages.
extractPerseusMessages();
