import { StyleSheet as baseStyleSheet } from 'aphrodite/no-important';
import { themeTokens, themePalette, themeBrand, themeOutlineStyle } from './theme';

// include global styles
import 'purecss/build/base-min.css';

const globalSelectorHandler = (selector, _, generateSubtreeStyles) => {
  if (selector[0] !== '*') {
    return null;
  }
  return generateSubtreeStyles(selector.slice(1));
};

const globalExtension = { selectorHandler: globalSelectorHandler };

const { StyleSheet, css } = baseStyleSheet.extend([globalExtension]);

// generate a minimal set of global, unscoped styles using theme variables
export default function generateGlobalStyles() {
  const htmlBodyStyles = {
    color: themeTokens().text,
    backgroundColor: themePalette().grey.v_100,
  };
  const globalStyles = StyleSheet.create({
    globals: {
      '*html': htmlBodyStyles,
      '*body': htmlBodyStyles,
      '*:focus': themeOutlineStyle(),
      '*::selection': {
        background: themeBrand().secondary.v_100,
      },
    },
  });

  // Have to do this to actually generate and inject the stylesheet
  // Return to have a value that will change when the dynamic styles change
  // This should be a cheap computation due to the caching that
  // Aphrodite is doing internally.
  return css(globalStyles.globals);
}
