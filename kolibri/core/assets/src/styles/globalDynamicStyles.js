import { StyleSheet as baseStyleSheet } from 'aphrodite/no-important';
import store from 'kolibri.coreVue.vuex.store';

const globalSelectorHandler = (selector, _, generateSubtreeStyles) => {
  if (selector[0] !== '*') {
    return null;
  }

  return generateSubtreeStyles(selector.slice(1));
};

const globalExtension = { selectorHandler: globalSelectorHandler };

const { StyleSheet, css } = baseStyleSheet.extend([globalExtension]);

function generateGlobalStyles() {
  const htmlBodyStyles = {
    color: store.getters.$coreTextDefault,
    backgroundColor: store.getters.$coreBgCanvas,
  };

  const globalStyles = StyleSheet.create({
    globals: {
      '*html': htmlBodyStyles,
      '*body': htmlBodyStyles,
      '*:focus': {
        outline: store.getters.$coreOutline,
      },
      '*hr': {
        borderTop: `1px solid ${store.getters.$coreTextDisabled}`,
      },
    },
  });

  // Have to do this to actually generate and inject the stylesheet
  // Return to have a value that will change when the dynamic styles change
  // This should be a cheap computation due to the caching that
  // Aphrodite is doing internally.
  return css(globalStyles.globals);
}

store.watch(generateGlobalStyles, generateGlobalStyles);
