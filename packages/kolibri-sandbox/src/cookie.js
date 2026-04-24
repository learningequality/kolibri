/**
 * This class offers an API-compatible replacement document.cookie
 * to be used when apps are run in sandbox mode.
 *
 * For more information, see: https://developer.mozilla.org/en-US/docs/Web/API/document/cookie
 */
import BaseShim from './baseShim';

// Value to set on expires that will prevent this data from being persisted
const sessionOnly = 'session';

export default class Cookie extends BaseShim {
  constructor(mediator) {
    super(mediator);
    this.nameSpace = 'cookie';
    this.__clearData();
    this.__setData = this.__setData.bind(this);
    this.__getCookies = this.__getCookies.bind(this);
    this.__setItem = this.__setItem.bind(this);
    this.on(this.events.STATEUPDATE, this.__setData);
  }

  __clearData() {
    const defaultData = {
      rootCookies: {},
      byPath: {},
    };
    this.__data = Object.assign({}, defaultData);
  }

  __removeExpiredCookies(data) {
    const output = {
      rootCookies: {},
      byPath: {},
    };

    const filterCookies = sourceObj => {
      const out = {};
      Object.keys(sourceObj).forEach(key => {
        if (new Date(sourceObj[key].expires) > this.__now()) {
          out[key] = sourceObj[key];
        }
      });
      return out;
    };
    output.rootCookies = filterCookies(data.rootCookies);
    Object.keys(data.byPath).forEach(path => {
      const filtered = filterCookies(data.byPath[path]);
      if (Object.keys(filtered).length) {
        // Only bother assigning if any cookies actually remain
        output.byPath[path] = filtered;
      }
    });
    return output;
  }

  __setData(data) {
    if (data && data.rootCookies && data.byPath) {
      this.__data = this.__removeExpiredCookies(data);
    } else {
      this.__clearData();
    }
  }

  iframeInitialize(contentWindow) {
    Object.defineProperty(contentWindow.document, this.nameSpace, {
      get: this.__getCookies,
      set: this.__setItem,
      // By definition, the interfaces we are overwriting are configurable
      // Because otherwise we couldn't configure them.
      // Make sure ours is also in case someone else is monkey patching,
      // to avoid causing errors for their code.
      configurable: true,
    });
  }

  get data() {
    // Return data that should be persisted across sessions
    const data = {
      rootCookies: {},
      byPath: {},
    };

    function filterCookies(sourceObj) {
      const output = {};
      Object.keys(sourceObj).forEach(key => {
        if (sourceObj[key].expires !== sessionOnly) {
          output[key] = sourceObj[key];
        }
      });
      return output;
    }
    data.rootCookies = filterCookies(this.__data.rootCookies);
    Object.keys(this.__data.byPath).forEach(path => {
      const filtered = filterCookies(this.__data.byPath[path]);
      if (Object.keys(filtered).length) {
        data.byPath[path] = filtered;
      }
    });
    return this.__removeExpiredCookies(data);
  }

  __getCookies() {
    const data = Object.assign({}, this.__data.rootCookies);
    const pathname = window.location.pathname;
    // Add additional cookies by specific path if defined.
    // Overwrite root set cookies.
    if (this.__data.byPath[pathname]) {
      Object.assign(data, this.__data.byPath[pathname]);
    }
    return Object.keys(data)
      .map(key => `${key}=${data[key].value}`)
      .join('; ');
  }

  __setItem(valueString = '') {
    const parts = valueString.split(';');
    if (parts[0]) {
      const [key, value] = parts[0].split('=');
      const store = {
        value,
        expires: sessionOnly,
      };
      let path;
      let deleteCookie = false;
      const pathRegex = /path=(.+)/;
      const maxAgeRegex = /max-age=(.+)/;
      const expiresRegex = /expires=(.+)/;
      parts.slice(1).forEach(part => {
        try {
          const pathResult = pathRegex.exec(part);
          const maxAgeResult = maxAgeRegex.exec(part);
          const expiresResult = expiresRegex.exec(part);
          if (pathResult) {
            path = pathResult[1];
          } else if (maxAgeResult) {
            // Let the function level catch handle any errors from parsing as a Number
            const maxAge = Number(maxAgeResult[1]);
            if (isNaN(maxAge)) {
              // Not a number, so just ignore this flag.
              return;
            } else if (maxAge > 0) {
              store.expires = new Date(this.__now().getTime() + maxAge);
            } else {
              // If the max age is 0 or less, then expire the cookie
              deleteCookie = true;
            }
          } else if (expiresResult) {
            const expirationDate = new Date(expiresResult[1]);
            if (isNaN(expirationDate)) {
              // Parsed date is invalid
              return;
            } else if (expirationDate <= Date.now()) {
              // The cookie is set to expire in the past, so delete it
              deleteCookie = true;
            } else {
              // Expiration is set for some time in the future, so normalize it to
              // our corrected now.
              // Don't worry about how far in the future, as, at a minimum, this
              // cookie should persist across this session.
              store.expires = new Date(
                this.__now().getTime() + (expirationDate.getTime() - Date.now()),
              );
            }
          }
        } catch (e) {
          // document.cookie setting is very forgiving and doesn't seem to throw errors
          // even when completely nonsense values are passed to its optional arguments,
          // so catch any errors here.
        }
      });
      if (deleteCookie) {
        this.__removeItem(key, path);
      } else {
        if (path) {
          if (!this.__data.byPath[path]) {
            this.__data.byPath[path] = {};
          }
          this.__data.byPath[path][key] = store;
        } else {
          this.__data.rootCookies[key] = store;
        }
      }
      this.stateUpdated();
    }
  }

  __removeItem(key, path) {
    if (path) {
      if (this.__data.byPath[path]) {
        delete this.__data.byPath[path][key];
        if (!Object.keys(this.__data.byPath[path]).length) {
          // If this is the last remaining entry, delete the parent object
          // To keep everything shipshape, and Bristol fashion!
          delete this.__data.byPath[path];
        }
      }
    } else {
      delete this.__data.rootCookies[key];
    }
    this.stateUpdated();
  }
}
