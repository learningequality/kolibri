import flatten from 'lodash/flatten';

// Feature detection for lookbehind support
let supportsLookbehind;
try {
  new RegExp('(?<!a)b');
  supportsLookbehind = true;
} catch (e) {
  supportsLookbehind = false;
}

export function getAbsoluteFilePath(baseFilePath, relativeFilePath) {
  // Construct a URL with a dummy base so that we can concatenate the
  // dependency URL with the URL relative to the dependency
  // and then read the pathname to get the new path.
  // Take substring to remove the leading slash to match the reference file paths
  // in packageFiles.
  try {
    return decodeURIComponent(
      new URL(relativeFilePath, new URL(baseFilePath, 'http://b.b/')).pathname.substring(1),
    );
  } catch (e) {
    console.debug('Error during URL handling', e); // eslint-disable-line no-console
  }
  return null;
}

export class Mapper {
  constructor(file) {
    this.file = file;
  }

  getPaths() {
    throw new Error('Not implemented');
  }

  replacePaths() {
    throw new Error('Not implemented');
  }
}

// Matches both url() and @import: url('path'), url(path), @import 'path'
// Modern version with lookbehind (Safari 16.4+, Chrome 62+, Firefox 78+)
const cssPathRegexModern = /(?:url\((['"]?)(.*?)(?<!\\)\1\)|@import\s+(['"])(.*?)(?<!\\)\3)/g;

// Legacy version without lookbehind for older browsers
// Handles: url('...'), url("..."), url(...), @import '...', @import "..."
// Groups: 1=url quote, 2=url quoted path, 3=url unquoted path, 4=import quote, 5=import path
const cssPathRegexLegacy =
  /url\((['"])((?:\\.|[^\\])*?)\1\)|url\(([^'"\s)]*)\)|@import\s+(['"])((?:\\.|[^\\])*?)\4/g;

const unescapePathRegex = /\\(.)/g;

function unescapeCssString(str) {
  return str.replace(unescapePathRegex, '$1');
}

function getCSSPathsModern(fileContents) {
  return Array.from(fileContents.matchAll(cssPathRegexModern), match => {
    // match[2] is url() path, match[4] is @import path
    const path = match[2] || match[4];
    return path ? decodeURIComponent(unescapeCssString(path.split('?')[0])) : '';
  });
}

function getCSSPathsLegacy(fileContents) {
  return Array.from(fileContents.matchAll(cssPathRegexLegacy)).map(
    ([, urlQuote, urlQuotedPath, urlUnquotedPath, importQuote, importPath]) => {
      // Determine which capture group matched:
      // - urlQuote set: quoted url() → use urlQuotedPath
      // - importQuote set: @import → use importPath
      // - neither: unquoted url() → use urlUnquotedPath
      const path = urlQuote ? urlQuotedPath : importQuote ? importPath : urlUnquotedPath;
      return path ? decodeURIComponent(unescapeCssString(path.split('?')[0])) : '';
    },
  );
}

function replaceCSSPathsModern(fileContents, packageFiles) {
  return fileContents.replace(
    cssPathRegexModern,
    function (match, urlQuote, urlPath, importQuote, importPath) {
      try {
        const path = urlPath || importPath;
        const quote = urlQuote || importQuote || '';
        const cleanPath = unescapeCssString(path.split('?')[0]);
        const newUrl = packageFiles[decodeURIComponent(cleanPath)];
        if (newUrl) {
          return urlPath !== undefined
            ? `url(${quote}${newUrl}${quote})`
            : `@import ${quote}${newUrl}${quote}`;
        }
      } catch (e) {
        console.debug('Error during URL handling', e); // eslint-disable-line no-console
      }
      return match;
    },
  );
}

function replaceCSSPathsLegacy(fileContents, packageFiles) {
  return fileContents.replace(
    cssPathRegexLegacy,
    function (match, urlQuote, urlQuotedPath, urlUnquotedPath, importQuote, importPath) {
      try {
        let path, quoteChar, isImport;

        if (importQuote !== undefined) {
          // @import match
          path = importPath;
          quoteChar = importQuote;
          isImport = true;
        } else if (urlQuote !== undefined) {
          // url() with quotes
          path = urlQuotedPath;
          quoteChar = urlQuote;
          isImport = false;
        } else {
          // url() without quotes
          path = urlUnquotedPath;
          quoteChar = '';
          isImport = false;
        }

        const cleanPath = unescapeCssString(path.split('?')[0]);
        const newUrl = packageFiles[decodeURIComponent(cleanPath)];
        if (newUrl) {
          return isImport
            ? `@import ${quoteChar}${newUrl}${quoteChar}`
            : `url(${quoteChar}${newUrl}${quoteChar})`;
        }
      } catch (e) {
        console.debug('Error during URL handling', e); // eslint-disable-line no-console
      }
      return match;
    },
  );
}

// Conditional exports based on lookbehind support
export const getCSSPaths = supportsLookbehind ? getCSSPathsModern : getCSSPathsLegacy;
export const replaceCSSPaths = supportsLookbehind ? replaceCSSPathsModern : replaceCSSPathsLegacy;

class CSSMapper extends Mapper {
  getPaths() {
    return getCSSPaths(this.file.toString());
  }

  replacePaths(packageFiles) {
    return replaceCSSPaths(this.file.toString(), packageFiles);
  }
}

const domParser = new DOMParser();

const domSerializer = new XMLSerializer();

const urlAttributes = ['src', 'href'];

const queryParamRegex = /([^?)]+)?(\?.*)/g;

export function getDOMPaths(fileContents, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);
  // Get paths from URL attributes (src, href)
  const urlPaths = flatten(
    urlAttributes.map(attr => {
      const elementsWithUrl = Array.from(dom.querySelectorAll(`[${attr}]`));
      return elementsWithUrl.map(element =>
        decodeURIComponent(element.getAttribute(attr).replace(queryParamRegex, '$1')),
      );
    }),
  );

  // Get paths from style attributes
  const elementsWithStyle = Array.from(dom.querySelectorAll('[style]'));
  const stylePaths = flatten(
    elementsWithStyle.map(element => getCSSPaths(element.getAttribute('style'))),
  );

  // Get paths from srcset attributes
  const elementsWithSrcset = Array.from(dom.querySelectorAll('[srcset]'));
  const srcsetPaths = flatten(
    elementsWithSrcset.map(element => {
      const srcset = element.getAttribute('srcset');
      return srcset.split(/,(?![^(]*\))/g).map(entry => {
        const url = entry.trim().split(/\s+/)[0];
        return decodeURIComponent(url.replace(queryParamRegex, '$1'));
      });
    }),
  );

  // Get paths from style blocks
  const styleElements = Array.from(dom.getElementsByTagName('style'));
  const styleBlockPaths = flatten(styleElements.map(element => getCSSPaths(element.textContent)));

  return [...urlPaths, ...stylePaths, ...srcsetPaths, ...styleBlockPaths];
}

function replaceSrcsetUrls(srcset, packageFiles) {
  if (!srcset) {
    return srcset;
  }

  // Split on commas, but not inside parentheses
  // for future-proofing against more complex descriptors)
  const entries = srcset.split(/,(?![^(]*\))/g);

  return entries
    .map(entry => {
      const [url, ...descriptors] = entry.trim().split(/\s+/);
      // Remove any query parameters and decode the URL
      const baseUrl = decodeURIComponent(url.replace(queryParamRegex, '$1'));
      const newUrl = packageFiles[baseUrl];
      if (newUrl) {
        return [newUrl, ...descriptors].join(' ');
      }
      return entry.trim();
    })
    .join(', ');
}

export function replaceDOMPaths(fileContents, packageFiles, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);

  // Replace URL attributes
  for (const attr of urlAttributes) {
    const urlElements = Array.from(dom.querySelectorAll(`[${attr}]`));
    for (const element of urlElements) {
      const value = element.getAttribute(attr);
      const newUrl = packageFiles[decodeURIComponent(value.replace(queryParamRegex, '$1'))];
      if (newUrl) {
        element.setAttribute(attr, newUrl);
      }
    }
  }

  // Replace style attributes
  const elementsWithStyle = Array.from(dom.querySelectorAll('[style]'));
  for (const element of elementsWithStyle) {
    const styleValue = element.getAttribute('style');
    const newStyleValue = replaceCSSPaths(styleValue, packageFiles);
    element.setAttribute('style', newStyleValue);
  }

  // Replace srcset attributes
  const elementsWithSrcset = Array.from(dom.querySelectorAll('[srcset]'));
  for (const element of elementsWithSrcset) {
    const srcsetValue = element.getAttribute('srcset');
    const newSrcsetValue = replaceSrcsetUrls(srcsetValue, packageFiles);
    element.setAttribute('srcset', newSrcsetValue);
  }

  // Replace style blocks
  const styleElements = Array.from(dom.getElementsByTagName('style'));
  for (const style of styleElements) {
    const originalContent = style.textContent || '';
    const newContent = replaceCSSPaths(originalContent, packageFiles);
    style.textContent = newContent;
  }

  if (mimeType === 'text/html') {
    // Remove the namespace attribute from the root element
    // as serializeToString adds it by default and without this
    // it gets repeated.
    dom.documentElement.removeAttribute('xmlns');
  }
  return domSerializer.serializeToString(dom);
}

export class DOMMapper extends Mapper {
  getPaths() {
    return getDOMPaths(this.file.toString(), this.file.mimeType);
  }

  replacePaths(packageFiles) {
    return replaceDOMPaths(this.file.toString(), packageFiles, this.file.mimeType);
  }
}

export const defaultFilePathMappers = {
  css: CSSMapper,
  html: DOMMapper,
  htm: DOMMapper,
  xhtml: DOMMapper,
  xml: DOMMapper,
};

// Internal exports for testing both implementations
export const _internal = {
  getCSSPathsModern,
  getCSSPathsLegacy,
  replaceCSSPathsModern,
  replaceCSSPathsLegacy,
  supportsLookbehind,
};
