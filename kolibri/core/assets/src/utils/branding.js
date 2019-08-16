import Vue from 'vue';

const schema = {
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
    showKolibriFooterLogo: null,
  },
};

const globalBrandingState = Vue.observable(schema);

globalBrandingState.setBranding = state => {
  Object.keys(schema).forEach(key => {
    Vue.set(globalBrandingState, key, state[key]);
  });
}

export default globalBrandingState;
