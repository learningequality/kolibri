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

const globalBrandingState = Vue.observable(defaults);

globalBrandingState.setBranding = state => {
  Object.keys(defaults).forEach(key => {
    Vue.set(globalBrandingState, key, state[key]);
  });
};

export default globalBrandingState;
