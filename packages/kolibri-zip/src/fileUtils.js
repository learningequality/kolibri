import flatten from 'lodash/flatten';

export function getAbsoluteFilePath(baseFilePath, relativeFilePath) {
  // Construct a URL with a dummy base so that we can concatenate the
  // dependency URL with the URL relative to the dependency
  // and then read the pathname to get the new path.
  // Take substring to remove the leading slash to match the reference file paths
  // in packageFiles.
  try {
    return new URL(relativeFilePath, new URL(baseFilePath, 'http://b.b/')).pathname.substring(1);
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

// Looks for any URLs referenced inside url()
// Handle any query parameters separately.
const cssPathRegex = /(url\(['"]?)([^?"')]+)?(\?[^'"]+)?(['"]?\))/g;

export function getCSSPaths(fileContents) {
  return Array.from(fileContents.matchAll(cssPathRegex), ([, , p2]) => p2);
}

export function replaceCSSPaths(fileContents, packageFiles) {
  return fileContents.replace(cssPathRegex, function(match, p1, p2, p3, p4) {
    try {
      // Look to see if there is a URL in our packageFiles mapping that
      // that has this as the source path.
      const newUrl = packageFiles[p2];
      if (newUrl) {
        // If so, replace the instance with the new URL.
        return `${p1}${newUrl}${p4}`;
      }
    } catch (e) {
      console.debug('Error during URL handling', e); // eslint-disable-line no-console
    }
    // Otherwise just return the match so that it is unchanged.
    return match;
  });
}

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

const attributes = ['src', 'href'];

const attributesSelector = attributes.map(attr => `[${attr}]`).join(', ');

const queryParamRegex = /([^?)]+)?(\?.*)/g;

export function getDOMPaths(fileContents, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);
  const elements = dom.querySelectorAll(attributesSelector);
  return flatten(
    Array.from(elements).map(element =>
      attributes
        .map(a => element.getAttribute(a))
        .filter(Boolean)
        .map(url => url.replace(queryParamRegex, '$1'))
    )
  );
}

export function replaceDOMPaths(fileContents, packageFiles, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);
  const elements = Array.from(dom.querySelectorAll(attributesSelector));
  for (const element of elements) {
    for (const attr of attributes) {
      const value = element.getAttribute(attr);
      if (!value) {
        continue;
      }
      const newUrl = packageFiles[value.replace(queryParamRegex, '$1')];
      if (newUrl) {
        element.setAttribute(attr, newUrl);
      }
    }
  }
  if (mimeType === 'text/html') {
    // Remove the namespace attribute from the root element
    // as serializeToString adds it by default and without this
    // it gets repeated.
    dom.documentElement.removeAttribute('xmlns');
  }
  return domSerializer.serializeToString(dom);
}

class DOMMapper extends Mapper {
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
