import kTheme from 'kolibri-components/src/styles/kTheme';

export const THEMES = {
  WHITE: {
    name: 'WHITE',
    backgroundColor: kTheme.$themeTokens().surface,
    hoverColor: kTheme.$themePalette().grey.v_200,
    textColor: kTheme.$themeTokens().text,
  },
  BEIGE: {
    name: 'BEIGE',
    backgroundColor: kTheme.$themePalette().brown.v_50,
    hoverColor: kTheme.$themePalette().brown.v_100,
    textColor: kTheme.$themePalette().brown.v_800,
  },
  GREY: {
    name: 'GREY',
    backgroundColor: kTheme.$themePalette().grey.v_800,
    hoverColor: kTheme.$themePalette().grey.v_600,
    textColor: kTheme.$themePalette().white,
  },
  BLACK: {
    name: 'BLACK',
    backgroundColor: kTheme.$themePalette().grey.v_900,
    hoverColor: kTheme.$themePalette().grey.v_700,
    textColor: kTheme.$themePalette().grey.v_400,
  },
  YELLOW: {
    name: 'YELLOW',
    backgroundColor: kTheme.$themePalette().grey.v_900,
    hoverColor: kTheme.$themePalette().grey.v_700,
    textColor: kTheme.$themePalette().yellow.v_300,
  },
  BLUE: {
    name: 'BLUE',
    backgroundColor: kTheme.$themeTokens().surface,
    hoverColor: kTheme.$themePalette().grey.v_200,
    textColor: kTheme.$themePalette().blue.v_800,
  },
};

export const darkThemeNames = ['BLACK', 'GREY', 'YELLOW'];
