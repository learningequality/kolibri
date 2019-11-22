import globalThemeState from './globalThemeState';

export default function trackMediaType() {
  const listener = isPrint => {
    const mediaType = isPrint ? 'print' : null;

    if (globalThemeState.mediaType !== mediaType) {
      globalThemeState.mediaType = mediaType;
    }
  };

  if (window.matchMedia) {
    // All supported browsers should have `matchMedia`
    const mediaQueryList = window.matchMedia('print');

    // Listen for print
    mediaQueryList.addListener(e => listener(e.matches));
    listener(mediaQueryList.matches);
  }

  // Fallback
  window.addEventListener('beforeprint', () => listener(true));
  window.addEventListener('afterprint', () => listener(false));

  // Get a headstart on Ctrl+P to print mainly for Firefox
  document.addEventListener('keydown', e => {
    // IE and Edge don't support `code`, this won't help IE anyway
    if (!('code' in e)) {
      return;
    }

    if (e.ctrlKey && !e.altKey && e.code === 'KeyP') {
      listener(true);
    }
  });
}
