import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

export const THEMES = {
  WHITE: {
    name: 'WHITE',
    backgroundColor: themeMixin.computed.$themeTokens().surface,
    hoverColor: themeMixin.computed.$themePalette().grey.v_200,
    textColor: themeMixin.computed.$themeTokens().text,
  },
  BEIGE: {
    name: 'BEIGE',
    backgroundColor: themeMixin.computed.$themePalette().brown.v_50,
    hoverColor: themeMixin.computed.$themePalette().brown.v_100,
    textColor: themeMixin.computed.$themePalette().brown.v_800,
  },
  GREY: {
    name: 'GREY',
    backgroundColor: themeMixin.computed.$themePalette().grey.v_800,
    hoverColor: themeMixin.computed.$themePalette().grey.v_600,
    textColor: themeMixin.computed.$themePalette().white,
  },
  BLACK: {
    name: 'BLACK',
    backgroundColor: themeMixin.computed.$themePalette().grey.v_900,
    hoverColor: themeMixin.computed.$themePalette().grey.v_700,
    textColor: themeMixin.computed.$themePalette().grey.v_400,
  },
  YELLOW: {
    name: 'YELLOW',
    backgroundColor: themeMixin.computed.$themePalette().grey.v_900,
    hoverColor: themeMixin.computed.$themePalette().grey.v_700,
    textColor: themeMixin.computed.$themePalette().yellow.v_300,
  },
  BLUE: {
    name: 'BLUE',
    backgroundColor: themeMixin.computed.$themeTokens().surface,
    hoverColor: themeMixin.computed.$themePalette().grey.v_200,
    textColor: themeMixin.computed.$themePalette().blue.v_800,
  },
};

export const darkThemeNames = ['BLACK', 'GREY', 'YELLOW'];
