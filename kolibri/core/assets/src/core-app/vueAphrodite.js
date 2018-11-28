import { css, StyleSheet } from 'aphrodite';
import logger from 'kolibri.lib.logging';

const logging = logger.getLogger(__filename);

function hashObj(obj) {
  /*
   * vendored copy of https://github.com/darkskyapp/string-hash/blob/master/index.js
   * Modified to hash any arbitrary object.
   * No updates in two years, and a tiny function, so no need to add a dependency.
   */
  const str = JSON.stringify(obj);
  let hash = 5381;
  let i = str.length;

  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */
  return (hash >>> 0).toString(36);
}

/**
 * Plugin install function.
 * @param {Function} Vue - the Vue constructor.
 */
export default function VueAphrodite(Vue) {
  // Keep a record of all generated class names to avoid recalculating
  // if needed.
  const __classNameCache = {};
  function generateClassName(value, component) {
    const componentName = component.$options.name;
    const cacheKey = `${componentName}:${hashObj(value)}`;
    if (!__classNameCache[cacheKey]) {
      if (!Array.isArray(value)) {
        value = [value];
      }
      if (process.env.NODE_ENV !== 'production') {
        // Add a warning if we are using Aphrodite for non-pseudo classes
        value.forEach(val => {
          if (typeof Object.keys(val).find(key => key.indexOf(':') === 0) === 'undefined') {
            logging.warn(
              `
              Used the $pseudoClass method for a class definition without any pseudo selectors:
              Found in component: ${componentName}
              Please use a v-bind:style directive instead.
            `
            );
          }
        });
      }
      const styleObj = {};
      const ids = [];
      const invalidCharRegex = /[^\w\-:.]/g;
      value.forEach((val, i) => {
        // Create a fixed identifier for this particular directive invocation, the expression
        // passed will be consistent across binds and updates.
        const compKeyFind = Object.entries(component).find(entry => entry[1] === val);
        const compKey = compKeyFind ? compKeyFind[0] : 'noKey';
        const identifier = `${componentName}-${compKey}-${i}`.replace(invalidCharRegex, '');
        styleObj[identifier] = val;
        ids.push(identifier);
      });
      const styleSheet = StyleSheet.create(styleObj);
      __classNameCache[cacheKey] = css(ids.map(id => styleSheet[id]));
    }
    return __classNameCache[cacheKey];
  }

  Vue.prototype.$pseudoClass = function(style) {
    return generateClassName(style, this);
  };
}
