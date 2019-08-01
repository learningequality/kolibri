import debounce from 'lodash/debounce';
import router from 'kolibri.coreVue.router';

/*
  Yuck - this is one big hack, and still doesn't work quite right!
  TODO: refactor and get hash links to work correctly with client-side routing.
*/

export function scrollBehavior(to, from, savedPosition) {
  if (savedPosition) {
    // savedPosition is only available for popstate navigations
    return savedPosition;
  }
  // scroll to anchor by returning the selector
  if (to.hash) {
    const position = {};
    position.selector = to.hash;
    position.offset = { y: 108 };
    return position;
  }

  // HACK: it seems we just cleared the hash due to scrolling, so don't scroll to the top
  if (clearingHash) {
    clearingHash = false;
    return;
  }

  // otherwise default to the top
  return { x: 0, y: 0 };
}

export function initializeScrollBehavior() {
  // Wait a couple seconds to run this until after the page has rendered.
  setTimeout(() => {
    // Clear the URL hash when you scroll away so you can click back to the section again!
    window.addEventListener(
      'scroll',
      debounce(
        () => {
          // no hash, no worries
          if (!window.location.hash) return;
          // if it's been a while since we scrolled, nothing to do
          const time = new Date().getTime();
          if (lastScrollTime === null || time - lastScrollTime > 1000) {
            lastScrollTime = time;
            return;
          }
          // if we're actively scrolling, get rid of the hash
          clearingHash = true;
          router.replace('');
        },
        100,
        { leading: true }
      )
    );
  }, 2000);
}

// HACK: two state variables to help with scrolling and anchor link positions
let lastScrollTime = null;
let clearingHash = false;
