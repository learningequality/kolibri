import Vue from 'vue';

const themeConfig = Vue.observable({
  appBar: {
    background: null,
    textColor: null,
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
});

export default themeConfig;
