import computedClass from './computedClass';
import trackInputModality from './trackInputModality';

/**
 * Plugin install function.
 * @param {Function} Vue - the Vue constructor.
 */
export default function KThemePlugin(Vue) {
  trackInputModality();
  Vue.prototype.$computedClass = computedClass;
}
