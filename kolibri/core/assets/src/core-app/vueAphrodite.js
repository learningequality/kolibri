import { css, StyleSheet, setStyleTagSuffix } from 'aphrodite';
import logger from 'kolibri.lib.logging';

const logging = logger.getLogger(__filename);

/**
 * Plugin install function.
 * @param {Function} Vue - the Vue constructor.
 */
export default function VueAphrodite(Vue) {
  setStyleTagSuffix('kolibriVue');
  // Keep a record of all generated class names to avoid recalculating
  // if needed.
  const __classNameCache = {};
  function generateClassName(value, component) {
    const componentName = component.$options.name;
    const cacheKey = `${componentName}:${JSON.stringify(value)}`;
    if (!__classNameCache[cacheKey]) {
      if (!Array.isArray(value)) {
        value = [value || {}];
      }
      if (process.env.NODE_ENV !== 'production') {
        // Add a warning if we are using Aphrodite for non-pseudo classes
        value.forEach(val => {
          if (typeof Object.keys(val).find(key => key.indexOf(':') === 0) === 'undefined') {
            logging.warn(
              `
              Used the $computedClass method for a class definition without any pseudo selectors:
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

  Vue.prototype.$computedClass = function(style) {
    return generateClassName(style, this);
  };
}
