import globalThemeState from './globalThemeState';

export default function trackMediaType() {
  const listener = isPrint => {
    globalThemeState.mediaType = isPrint ? 'print' : null;
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
}
