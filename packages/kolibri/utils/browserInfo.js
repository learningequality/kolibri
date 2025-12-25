import UAParser from 'ua-parser-js';
import { ref } from 'vue';

export function passesRequirements(browser, requirements) {
  if (browser.major && browser.name) {
    const entry = requirements[browser.name];
    if (entry) {
      if (browser.major < entry.major) {
        return false;
      } else if (browser.major === entry.major) {
        if (entry.minor && (browser.minor < entry.minor || !browser.minor)) {
          return false;
        } else if (entry.minor && browser.minor === entry.minor) {
          if (entry.patch && (browser.patch < entry.patch || !browser.patch)) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

export const userAgent =
  window && window.navigator && window.navigator.userAgent ? window.navigator.userAgent : '';

const parser = new UAParser(userAgent);
const info = parser.getResult();

const browserVersion = (info.browser.version || '').split('.');
export const browser = {
  name: info.browser.name,
  major: browserVersion[0],
  minor: browserVersion[1],
  patch: browserVersion[2],
};

const osVersion = (info.os.version || '').split('.');
export const os = {
  name: info.os.name,
  major: osVersion[0],
  minor: osVersion[1],
  patch: osVersion[2],
};

export const isTouchDevice =
  'ontouchstart' in window ||
  window.navigator?.maxTouchPoints > 0 ||
  window.navigator?.msMaxTouchPoints > 0;

function handlePointerDown(event) {
  if (event.pointerType === 'mouse') {
    localStorage.setItem('mouseUsed', 'true');
    isMouseUsed = true;
    window.removeEventListener('pointerdown', handlePointerDown);
  }
}
window.addEventListener('pointerdown', handlePointerDown);

export let isMouseUsed = localStorage.getItem('mouseUsed') === 'true';

export const pageVisibilityRef = ref(true);

function updateVisibility() {
  pageVisibilityRef.value = typeof document !== 'undefined' ? !document.hidden : true;
}

if (typeof document !== 'undefined') {
  updateVisibility();
  document.addEventListener('visibilitychange', updateVisibility, { passive: true });
}

export function usePageVisibility() {
  return pageVisibilityRef;
}
