import { css, StyleSheet, setStyleTagSuffix } from 'aphrodite';

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

export default function computedClass(style) {
  return generateClassName(style, this);
}
