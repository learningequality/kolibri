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
  return fileContents.replace(cssPathRegex, function (match, p1, p2, p3, p4) {
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

const urlStyleAttributeSelector = '[style*="url("]';

const audioClassAttributeSelector = '[class*="audio-sentence"], [data-backgroundaudio]';

const queryParamRegex = /([^?)]+)?(\?.*)/g;

export function getDOMPaths(fileContents, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);
  const elements = dom.querySelectorAll(attributesSelector);
  return flatten(
    Array.from(elements).map(element =>
      attributes
        .map(a => element.getAttribute(a))
        .filter(Boolean)
        .map(url => url.replace(queryParamRegex, '$1')),
    ),
  );
}

export function getStyleUrlPaths(fileContents, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);
  const elements = dom.querySelectorAll(urlStyleAttributeSelector);
  return flatten(
    Array.from(elements).map(element => {
      const styleAttr = element.getAttribute('style');
      const styleUrl = styleAttr.split('url(').at(-1);
      return styleUrl.substring(1, styleUrl.length - 2);
    }),
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

export function replaceStyleUrlPaths(fileContents, packageFiles, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);
  const elements = Array.from(dom.querySelectorAll(urlStyleAttributeSelector));
  for (const element of elements) {
    let styleAttr = element.getAttribute('style');
    if (!styleAttr) {
      continue;
    }
    styleAttr = styleAttr.split('url(');
    const oldUrl = styleAttr[1];
    const newUrl = packageFiles[oldUrl.substring(1, oldUrl.length - 2)];
    styleAttr = styleAttr[0] + "url('" + newUrl + "')";

    element.setAttribute('style', styleAttr);
  }
  if (mimeType === 'text/html') {
    // Remove the namespace attribute from the root element
    // as serializeToString adds it by default and without this
    // it gets repeated.
    dom.documentElement.removeAttribute('xmlns');
  }
  return domSerializer.serializeToString(dom);
}

export function getAudioId(fileContents, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);
  const elements = dom.querySelectorAll(audioClassAttributeSelector);
  return Array.from(elements).map(element => {
    let value = element.getAttribute('id');
    const backgroundAudio = element.getAttribute('data-backgroundAudio');
    if (backgroundAudio) {
      value = backgroundAudio;
    }
    return value;
  });
}

export function replaceAudioId(fileContents, packageFiles, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);
  const elements = Array.from(dom.querySelectorAll(audioClassAttributeSelector));
  for (const element of elements) {
    const backgroundAudio = element.getAttribute('data-backgroundAudio');
    let id = element.getAttribute('id');
    id = packageFiles[id];
    if (backgroundAudio) {
      id = packageFiles[backgroundAudio];
      element.setAttribute('data-backgroundAudio', id);
    } else {
      element.setAttribute('id', id);
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
