import globalThemeState from './globalThemeState';

export default function trackMediaType() {
  const mediaQueryList = window.matchMedia('print');
  const listener = e => {
    globalThemeState.mediaType = e.matches ? 'print' : null;
  };

  // Listen for print
  mediaQueryList.addListener(listener);
  listener(mediaQueryList);
}
