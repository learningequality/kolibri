import { StyleSheet as baseStyleSheet } from 'aphrodite/no-important';
import store from 'kolibri.coreVue.vuex.store';
import theme from './kTheme';

const globalSelectorHandler = (selector, _, generateSubtreeStyles) => {
  if (selector[0] !== '*') {
    return null;
  }

  return generateSubtreeStyles(selector.slice(1));
};

const globalExtension = { selectorHandler: globalSelectorHandler };

const { StyleSheet, css } = baseStyleSheet.extend([globalExtension]);

// generate a minimal set of global, unscoped styles using theme variables
function generateGlobalStyles() {
  const htmlBodyStyles = {
    color: theme.$themeTokens().text,
    backgroundColor: theme.$themePalette().grey.v_100,
  };
  const globalStyles = StyleSheet.create({
    globals: {
      '*html': htmlBodyStyles,
      '*body': htmlBodyStyles,
      '*:focus': theme.$coreOutline(),
      '*::selection': {
        background: theme.$themeBrand().secondary.v_100,
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
