const fs = require('fs');
const path = require('path');
const extractPerseusMessages = require('./extractPerseusMessages');

const target = path.resolve(__dirname, './assets/dist');
// A regex for detecting paths inside `url` in CSS, paths can either be quoted or unquoted.
const cssPathRegex = /(url\(['"]?)([^"')]+)?(['"]?\),? ?)/g;
const cssNonWoffRegex = /, (url\(['"]?)([^"')]+)?(['"]?\),? ?) format\((?!"woff")"[a-z0-9]+"\)/g;
// This is the css files that we are modifying to remap static assets.
const indexCssFile = path.resolve(__dirname, './node_modules/@khanacademy/perseus/dist/index.css');

console.log('Copying file and editing references for: ', indexCssFile);
const targetCssLocation = path.join(target, path.basename(indexCssFile));
const cssFileContents = fs.readFileSync(indexCssFile, { encoding: 'utf-8' });
const modifiedCssContents = cssFileContents.replace(cssPathRegex, function(match, p1, p2, p3) {
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

// Now that the file has been built, we can extract all the perseus messages.
extractPerseusMessages();
