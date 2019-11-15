import globalThemeState from './globalThemeState';

export default function trackMediaType() {
  // Listen for print
  window.matchMedia('print').addListener(e => {
    globalThemeState.mediaType = e.matches ? 'print' : null;
  });
}
