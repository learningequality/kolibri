import { getAbsoluteFilePath } from 'kolibri-zip/src/fileUtils';
import { isInternal } from './refs';

/**
 * Scroll `doc` to the element `fragment` names.
 * @param {Document} doc - The article's document
 * @param {string} fragment - The fragment, without its leading '#'
 */
export function scrollToFragment(doc, fragment) {
  if (!fragment) {
    return;
  }
  let id;
  try {
    id = decodeURIComponent(fragment);
  } catch (e) {
    id = fragment;
  }
  const target = doc.getElementById(id) || doc.getElementsByName(id)[0];
  if (target) {
    target.scrollIntoView();
  }
}

function fragmentOf(href) {
  const index = href.indexOf('#');
  return index === -1 ? '' : href.slice(index + 1);
}

/**
 * Intercept clicks on internal links in `iframeDoc`.
 * @param {Document} iframeDoc - The article's document
 * @param {string} currentArticlePath - Canonical (post-redirect) path of the article
 * @param {Function} onNavigate - Called with the canonical path of an internal link
 * in another article, and its fragment
 * @returns {Function} Teardown that removes the listener
 */
export function attachNavigationInterceptor(iframeDoc, currentArticlePath, onNavigate) {
  function navigate(ev, canonical, fragment) {
    ev.preventDefault();
    if (canonical === currentArticlePath) {
      scrollToFragment(iframeDoc, fragment);
    } else {
      onNavigate(canonical, fragment);
    }
  }

  function handler(ev) {
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const anchor = ev.target.closest && ev.target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (anchor.dataset.zimPath) {
      navigate(ev, anchor.dataset.zimPath, anchor.dataset.zimFragment || '');
      return;
    }
    // A srcdoc document resolves '#fragment' links against the parent page's URL.
    if (href.startsWith('#')) {
      navigate(ev, currentArticlePath, href.slice(1));
      return;
    }
    if (!isInternal(href)) return;
    const canonical = getAbsoluteFilePath(currentArticlePath, href);
    if (!canonical) return;
    navigate(ev, canonical, fragmentOf(href));
  }
  iframeDoc.addEventListener('click', handler, true);
  return () => iframeDoc.removeEventListener('click', handler, true);
}
