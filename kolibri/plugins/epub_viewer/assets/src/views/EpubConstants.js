import { themeTokens, themePalette } from 'kolibri-components/src/styles/theme';

export const THEMES = {
  WHITE: {
    name: 'WHITE',
    backgroundColor: themeTokens().surface,
    hoverColor: themePalette().grey.v_200,
    textColor: themeTokens().text,
  },
  BEIGE: {
    name: 'BEIGE',
    backgroundColor: themePalette().brown.v_50,
    hoverColor: themePalette().brown.v_100,
    textColor: themePalette().brown.v_800,
  },
  GREY: {
    name: 'GREY',
    backgroundColor: themePalette().grey.v_800,
    hoverColor: themePalette().grey.v_600,
    textColor: themePalette().white,
  },
  BLACK: {
    name: 'BLACK',
    backgroundColor: themePalette().grey.v_900,
    hoverColor: themePalette().grey.v_700,
    textColor: themePalette().grey.v_400,
  },
  YELLOW: {
    name: 'YELLOW',
    backgroundColor: themePalette().grey.v_900,
    hoverColor: themePalette().grey.v_700,
    textColor: themePalette().yellow.v_300,
  },
  BLUE: {
    name: 'BLUE',
    backgroundColor: themeTokens().surface,
    hoverColor: themePalette().grey.v_200,
    textColor: themePalette().blue.v_800,
  },
};

export const darkThemeNames = ['BLACK', 'GREY', 'YELLOW'];
