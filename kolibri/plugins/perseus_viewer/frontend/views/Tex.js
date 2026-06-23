'use strict';
import '@khanacademy/mathjax-renderer/src/css/mathjax.css';
import '@khanacademy/mathjax-renderer/src/css/safari-hacks.css';
import '@khanacademy/mathjax-renderer/src/css/selectable.css';
import { MathJaxRenderer } from '@khanacademy/mathjax-renderer';

import logging from 'kolibri-logging';
import React from 'react';
import urls from 'kolibri/urls';

const logger = logging.getLogger(__filename);

const fontURL = urls.static('assets/mathjax/fonts');

/**
 * List of aria-roles that apply "presentation" to descendants, which strips
 * math markup of its semantic meaning, which makes it inaccessible to screen
 * readers and other assistive technology.
 *
 * Taken from this rule from WAI-ARIA 1.2:
 * https://www.w3.org/TR/wai-aria-1.2/#tree_exclusion
 */
const presentationalRoles = [
  'button',
  'checkbox',
  'img',
  'menuitemcheckbox',
  'menuitemradio',
  'meter',
  'option',
  'progressbar',
  'radio',
  'scrollbar',
  'separator',
  'slider',
  'switch',
  'tab',
  // "combobox" is NOT included in the WAI-ARIA 1.2 list of aria-roles that
  // apply "presentation" to descendants, but screenreaders seem to treat it
  // as presentational anyway. For context, see:
  // - https://github.com/Khan/mathjax-renderer/commit/d706d27eab482f32d0d1c93f23fb6af6d1add8cf
  // - https://khanacademy.atlassian.net/browse/LIT-1425
  'combobox',
];

function isPresentationalForSR(element) {
  if (element == null) {
    return false;
  }
  return (
    presentationalRoles.some(role => element.matches(`[role=${role}]`)) ||
    isPresentationalForSR(element.parentElement)
  );
}

const renderer = new MathJaxRenderer({
  fontURL,
  shouldFixUnicodeLayout: true,
  locale: 'en',
});

function TeX({ children: tex, onRender }) {
  const ref = React.useRef(null);
  const { domElement, addLabel } = React.useMemo(() => renderer.render(tex), [tex]);

  React.useLayoutEffect(() => {
    if (ref.current) {
      if (isPresentationalForSR(ref.current)) {
        addLabel().catch(logger.error);
      }
      ref.current.innerHTML = '';
      ref.current.appendChild(domElement);
    }
  }, [ref, addLabel, domElement]);

  React.useEffect(() => {
    renderer.updateStyles();
    onRender?.();
  }, [tex, onRender]);

  return React.createElement('span', { ref });
}

export default TeX;
