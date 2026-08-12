import Vue from 'vue';

// themeSpec.js is the field list; restating it here only lets the two drift.
// `{}` not `null`: tests mount components that dereference these without initializeTheme().
const themeConfig = Vue.observable({
  appBar: {},
  signIn: {},
  sideNav: {},
});

export default themeConfig;
