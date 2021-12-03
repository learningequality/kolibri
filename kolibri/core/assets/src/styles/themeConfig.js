import Vue from 'vue';

const defaults = {
  appBar: {
    topLogo: {
      src: null,
      alt: null,
      style: null,
    },
  },
  signIn: {
    topLogo: {
      src: null,
      alt: null,
      style: null,
    },
    title: null,
    showTitle: null,
    titleStyle: null,
    showPoweredBy: null,
    poweredByStyle: null,
    showKolibriFooterLogo: null,
    background: null,
  },
  sideNav: {
    topLogo: {
      src: null,
      alt: null,
      style: null,
    },
    brandedFooter: {},
    showKFooterLogo: true,
  },
};

export const themeConfig = Vue.observable(defaults);

export function setThemeConfig(theme) {
  Object.keys(defaults).forEach(key => {
    Vue.set(themeConfig, key, theme[key]);
  });
}
