import { getAbsoluteFilePath } from 'kolibri-zip/src/fileUtils';
import { virtualNodeId } from 'kolibri/utils/virtualNodeId';
import { isInternal } from './refs';

/**
 * Rewrite internal links to content permalinks on hover, focus or context menu.
 * @param {Document} iframeDoc - The article's document
 * @param {string} currentArticlePath - Canonical path relative links resolve against
 * @param {object} options - Permalink options
 * @param {string} options.rootId - The ZIM root node's id
 * @param {string} options.permalinkBase - The absolute `viewcontent` endpoint URL
 * @param {Function} options.resolve - Resolves entry paths to descriptors keyed by path,
 * whose `path` is the post-redirect path
 * @returns {Function} Teardown that removes the listeners
 */
export function attachLinkRewriter(
  iframeDoc,
  currentArticlePath,
  { rootId, permalinkBase, resolve },
) {
  const targets = new WeakMap();
  const redirects = new Map();

  function targetOf(anchor) {
    if (!targets.has(anchor)) {
      const href = anchor.getAttribute('href');
      const path = isInternal(href) && getAbsoluteFilePath(currentArticlePath, href);
      const fragment = href.includes('#') ? href.slice(href.indexOf('#') + 1) : '';
      targets.set(anchor, path ? { path, fragment } : null);
    }
    return targets.get(anchor);
  }

  const paths = new Set();
  for (const anchor of iframeDoc.querySelectorAll('a[href]')) {
    const target = targetOf(anchor);
    if (target) {
      paths.add(target.path);
    }
  }
  if (paths.size) {
    resolve([...paths]).then(
      descriptors => {
        for (const [path, descriptor] of Object.entries(descriptors)) {
          if (descriptor.path !== path) {
            redirects.set(path, descriptor.path);
          }
        }
      },
      () => {},
    );
  }

  function rewrite(anchor) {
    const target = targetOf(anchor);
    if (!target) {
      return;
    }
    const canonical = redirects.get(target.path) || target.path;
    anchor.dataset.zimPath = canonical;
    anchor.dataset.zimFragment = target.fragment;
    anchor.setAttribute('href', `${permalinkBase}?node_id=${virtualNodeId(rootId, canonical)}`);
  }

  function onPointer(ev) {
    const anchor = ev.target.closest && ev.target.closest('a[href]');
    if (anchor) {
      rewrite(anchor);
    }
  }

  iframeDoc.addEventListener('mouseover', onPointer, true);
  iframeDoc.addEventListener('focusin', onPointer, true);
  iframeDoc.addEventListener('contextmenu', onPointer, true);
  return () => {
    iframeDoc.removeEventListener('mouseover', onPointer, true);
    iframeDoc.removeEventListener('focusin', onPointer, true);
    iframeDoc.removeEventListener('contextmenu', onPointer, true);
  };
}
