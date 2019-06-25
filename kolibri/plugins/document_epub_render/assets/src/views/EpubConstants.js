import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

export const THEMES = {
  WHITE: {
    backgroundColor: themeMixin.computed.$themeTokens().surface,
    hoverColor: themeMixin.computed.$themeColors().palette.grey.v_200,
    textColor: themeMixin.computed.$themeTokens().text,
  },
  BEIGE: {
    backgroundColor: themeMixin.computed.$themeColors().palette.brown.v_50,
    hoverColor: themeMixin.computed.$themeColors().palette.brown.v_100,
    textColor: themeMixin.computed.$themeColors().palette.brown.v_800,
  },
  GREY: {
    backgroundColor: themeMixin.computed.$themeColors().palette.grey.v_800,
    hoverColor: themeMixin.computed.$themeColors().palette.grey.v_600,
    textColor: themeMixin.computed.$themeColors().palette.white,
  },
  BLACK: {
    backgroundColor: themeMixin.computed.$themeColors().palette.grey.v_900,
    hoverColor: themeMixin.computed.$themeColors().palette.grey.v_700,
    textColor: themeMixin.computed.$themeColors().palette.grey.v_400,
  },
  YELLOW: {
    backgroundColor: themeMixin.computed.$themeColors().palette.grey.v_900,
    hoverColor: themeMixin.computed.$themeColors().palette.grey.v_700,
    textColor: themeMixin.computed.$themeColors().palette.yellow.v_300,
  },
  BLUE: {
    backgroundColor: themeMixin.computed.$themeTokens().surface,
    hoverColor: themeMixin.computed.$themeColors().palette.grey.v_200,
    textColor: themeMixin.computed.$themeColors().palette.blue.v_800,
  },
};
