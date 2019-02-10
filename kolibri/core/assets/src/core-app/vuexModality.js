import store from 'kolibri.coreVue.vuex.store';
import logger from 'kolibri.lib.logging';
import { THEME_MODULE_NAMESPACE } from '../state/modules/theme';

const logging = logger.getLogger(__filename);

/**
 * Adapted from https://github.com/alice/modality
 * Version: 1.0.2
 *
 * For Kolibri, this mirrors in Vuex the DOM updates done by modality.js in Keen-UI,
 * which gives the code in theme.js easier access to the current modality.
 */

document.addEventListener('DOMContentLoaded', () => {
  let hadKeyboardEvent = false;
  const keyboardModalityWhitelist = [
    'input:not([type])',
    'input[type=text]',
    'input[type=number]',
    'input[type=date]',
    'input[type=time]',
    'input[type=datetime]',
    'textarea',
    '[role=textbox]',
    '[supports-modality=keyboard]',
  ].join(',');

  let isHandlingKeyboardThrottle;

  const matcher = (() => {
    const el = document.body;

    if (el.matchesSelector) {
      return el.matchesSelector;
    }

    if (el.webkitMatchesSelector) {
      return el.webkitMatchesSelector;
    }

    if (el.mozMatchesSelector) {
      return el.mozMatchesSelector;
    }

    if (el.msMatchesSelector) {
      return el.msMatchesSelector;
    }

    logging.error("Couldn't find any matchesSelector method on document.body.");
  })();

  const disableFocusRingByDefault = function() {
    const css = 'body:not([modality=keyboard]) :focus { outline: none; }';
    const head = document.head || document.getElementsByTagName('head')[0];
    const style = document.createElement('style');

    style.type = 'text/css';
    style.id = 'disable-focus-ring';

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }

    head.insertBefore(style, head.firstChild);
  };

  const focusTriggersKeyboardModality = function(el) {
    let triggers = false;

    if (matcher) {
      triggers =
        matcher.call(el, keyboardModalityWhitelist) && matcher.call(el, ':not([readonly])');
    }

    return triggers;
  };

  disableFocusRingByDefault();

  document.body.addEventListener(
    'keydown',
    () => {
      hadKeyboardEvent = true;

      if (isHandlingKeyboardThrottle) {
        clearTimeout(isHandlingKeyboardThrottle);
      }

      isHandlingKeyboardThrottle = setTimeout(() => {
        hadKeyboardEvent = false;
      }, 100);
    },
    true
  );

  document.body.addEventListener(
    'focus',
    e => {
      if (hadKeyboardEvent || focusTriggersKeyboardModality(e.target)) {
        store.commit(`${THEME_MODULE_NAMESPACE}/SET_MODALITY`, 'keyboard');
      }
    },
    true
  );

  document.body.addEventListener(
    'blur',
    () => {
      store.commit(`${THEME_MODULE_NAMESPACE}/SET_MODALITY`, null);
    },
    true
  );
});
