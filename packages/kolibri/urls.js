/*
 * This is a referenceable object that can be required by other modules,
 * which has urls written into it at runtime by the Kolibri server.
 */

import plugin_data from 'kolibri-plugin-data';

function generateUrl(baseUrl, { url, origin, port } = {}) {
  let urlObject = new URL(baseUrl, origin || window.location.origin);
  if (port) {
    urlObject.port = port;
  }
  if (url) {
    urlObject = new URL(url, urlObject);
  }
  return urlObject.href;
}

class UrlResolver {
  constructor() {
    this._urlCache = new Map();
    this._functionCache = new Map();

    this._validatePatternNames();

    // For browsers without Proxy support, create all functions upfront
    // Also for developer's convenience, create all functions upfront in development
    // so that they can be accessed directly from the object and inspected.
    if (typeof Proxy === 'undefined' || process.env.NODE_ENV !== 'production') {
      this._createFallbackInterface();
    }
  }

  get _patterns() {
    return plugin_data?.urls?.urls || {};
  }

  get _prefix() {
    return plugin_data?.urls?.prefix || '/';
  }

  _validatePatternNames() {
    for (const patternName of Object.keys(this._patterns)) {
      if (patternName.includes('-')) {
        throw new Error(
          `URL pattern names should use underscores instead of dashes. Found "${patternName}"`,
        );
      }
    }
  }

  _createFallbackInterface() {
    // Pre-generate all URL functions
    for (const patternName of Object.keys(this._patterns)) {
      this[patternName] = this._getUrlFunction(patternName);
    }
  }

  _getUrlFunction(name) {
    // Check function cache first
    let urlFunc = this._functionCache.get(name);
    if (urlFunc) {
      return urlFunc;
    }

    const patterns = this._patterns[name];
    if (!patterns) {
      urlFunc = () => {
        if (process.env.NODE_ENV !== 'production') {
          if (name.includes('-')) {
            throw new Error(
              `URL pattern names should use underscores instead of dashes. Try "${name.replace('-', '_')}"`,
            );
          }
        }
        throw new Error(`URL pattern "${name}" not found`);
      };
    } else {
      urlFunc = this._createUrlFunction(name, patterns);
    }

    // Cache the function
    this._functionCache.set(name, urlFunc);

    return urlFunc;
  }

  _createUrlFunction(name, patterns) {
    return (...args) => {
      let url;

      // Handle both named and positional arguments
      if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
        // Named parameters
        const kwargs = args[0];

        // Try each pattern variation until we find one we can use
        for (const [pattern, paramNames] of patterns) {
          // Check if we have all required parameters
          const hasAllParams = !paramNames.some(param => !(param in kwargs));
          if (hasAllParams) {
            url = pattern;
            // Replace all named parameters
            for (const param of paramNames) {
              const value = kwargs[param];
              url = url.replace(`%(${param})s`, encodeURIComponent(value));
            }
            break;
          }
        }
      } else {
        // Positional parameters
        // Use the first pattern that matches the number of arguments
        for (const [pattern, paramNames] of patterns) {
          if (paramNames.length === args.length) {
            url = pattern;
            for (const [index, param] of paramNames.entries()) {
              url = url.replace(`%(${param})s`, encodeURIComponent(args[index]));
            }
            break;
          }
        }
      }

      if (!url) {
        throw new Error(
          `Could not find matching URL pattern for "${name}" with the provided arguments`,
        );
      }

      return this._prefix + url;
    };
  }

  _getPluginData(dataKey) {
    return plugin_data?.urls?.[dataKey];
  }

  get __hashiUrl() {
    return this._getPluginData('__hashiUrl');
  }

  get __staticUrl() {
    return this._getPluginData('__staticUrl');
  }

  get __mediaUrl() {
    return this._getPluginData('__mediaUrl');
  }

  get __zipContentUrl() {
    return this._getPluginData('__zipContentUrl');
  }

  get __zipContentOrigin() {
    return this._getPluginData('__zipContentOrigin');
  }

  get __zipContentPort() {
    return this._getPluginData('__zipContentPort');
  }

  get __contentUrl() {
    return this._getPluginData('__contentUrl');
  }

  hashi() {
    if (!this.__hashiUrl) {
      throw new ReferenceError('Hashi Url is not defined');
    }
    return generateUrl(this.__hashiUrl, {
      origin: this.__zipContentOrigin,
      port: this.__zipContentPort,
    });
  }
  static(url) {
    if (!this.__staticUrl) {
      throw new ReferenceError('Static Url is not defined');
    }
    return generateUrl(this.__staticUrl, { url });
  }
  media(url) {
    if (!this.__mediaUrl) {
      throw new ReferenceError('Media Url is not defined');
    }
    return generateUrl(this.__mediaUrl, { url });
  }
  zipContentUrl(fileId, extension, embeddedFilePath = '', baseurl) {
    const filename = `${fileId}.${extension}`;
    if (!this.__zipContentUrl) {
      throw new ReferenceError('Zipcontent Url is not defined');
    }
    return generateUrl(this.__zipContentUrl, {
      url: `${baseurl ? baseurl + '/' : ''}${filename}/${embeddedFilePath}`,
      origin: this.__zipContentOrigin,
      port: this.__zipContentPort,
    });
  }
  storageUrl(fileId, extension) {
    const filename = `${fileId}.${extension}`;
    if (!this.__contentUrl) {
      throw new ReferenceError('Zipcontent Url is not defined');
    }
    return generateUrl(this.__contentUrl, { url: `${filename[0]}/${filename[1]}/${filename}` });
  }
}

// Create the proxy-wrapped instance
export const createUrlResolver = () => {
  const resolver = new UrlResolver();

  if (typeof Proxy !== 'undefined') {
    return new Proxy(resolver, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        return target._getUrlFunction(prop);
      },
    });
  }

  return resolver;
};

export default createUrlResolver();
