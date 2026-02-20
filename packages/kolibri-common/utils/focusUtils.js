/*
 * Checks if the element is focusable.
 * @param {HTMLElement} el - The element to check.
 * @returns {boolean} - True if the element is focusable, false otherwise.
 */
export const isFocusable = el => {
  if (el.tabIndex < 0) {
    return false;
  }
  if (el.offsetParent === null && window.getComputedStyle(el).position !== 'fixed') {
    // If the element or any of its ancestors is set display none,
    // it will have offsetParent set to null. If the element is fixed, it will also
    // have offsetParent set to null, but this doesnt means it has display none.
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
    return false;
  }
  switch (el.tagName) {
    case 'A':
      return !!el.href;
    case 'INPUT':
      return el.type !== 'hidden' && !el.disabled;
    case 'SELECT':
    case 'TEXTAREA':
    case 'BUTTON':
      return !el.disabled;
    default:
      return false;
  }
};

const focusableSelectors = ['button', 'a', 'input', 'select', 'textarea'];

export const getFirstFocusableElement = el => {
  if (!el) return null;

  return Array.from(el.querySelectorAll(focusableSelectors.join(','))).find(isFocusable);
};

export const getLastFocusableElement = el => {
  if (!el) return null;

  return Array.from(el.querySelectorAll(focusableSelectors.join(',')))
    .reverse()
    .find(isFocusable);
};
