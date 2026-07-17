/**
 * Parse an inline `style=` declaration string into a plain style object.
 *
 * Parses via the CSSOM (a throwaway probe element) rather than string-splitting,
 * so the browser validates and normalises values the same way SafeHTML's
 * sanitization hook does. The sub-components need an object (not the raw string)
 * to merge the carried style with their own `:style` computed, because Vue 2.7's
 * array-`:style` normaliser only merges style objects — a string element is
 * iterated character-by-character and its declarations are lost.
 * @param {string} cssText - an inline style declaration string
 * @returns {{[key: string]: string}} a style object, or `{}` for empty input
 */
export default function parseStyleString(cssText) {
  if (!cssText) {
    return {};
  }
  const probe = document.createElement('span');
  probe.style.cssText = cssText;
  const styles = {};
  for (let i = 0; i < probe.style.length; i++) {
    const prop = probe.style[i];
    styles[prop] = probe.style.getPropertyValue(prop);
  }
  return styles;
}
