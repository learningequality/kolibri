import 'intl';
import 'intl/locale-data/jsonp/en.js';
import * as Aphrodite from 'aphrodite';
import * as AphroditeNoImportant from 'aphrodite/no-important';

import Vue from 'kolibri.lib.vue';
import { i18nSetup } from 'kolibri.utils.i18n';

Aphrodite.StyleSheetTestUtils.suppressStyleInjection();
AphroditeNoImportant.StyleSheetTestUtils.suppressStyleInjection();

Vue.prototype.Kolibri = {};
Vue.config.silent = true;
i18nSetup(true);
Vue.config.productionTip = false;

const csrf = global.document.createElement('input');
csrf.name = 'csrfmiddlewaretoken';
csrf.value = 'csrfmiddlewaretoken';
global.document.body.append(csrf);

global.kolibriTheme = {
  themeName: 'Test theme',
  themeVersion: 0,
  brandColors: {
    primary: {
      v_50: '#f0e7ed',
      v_100: '#dbc3d4',
      v_200: '#c59db9',
      v_300: '#ac799d',
      v_400: '#996189',
      v_500: '#874e77',
      v_600: '#7c4870',
      v_700: '#6e4167',
      v_800: '#5f3b5c',
      v_900: '#4b2e4d',
    },
    secondary: {
      v_50: '#e3f0ed',
      v_100: '#badbd2',
      v_200: '#8dc5b6',
      v_300: '#62af9a',
      v_400: '#479e86',
      v_500: '#368d74',
      v_600: '#328168',
      v_700: '#2c715a',
      v_800: '#26614d',
      v_900: '#1b4634',
    },
  },
  signIn: {
    background: 'background.jpg',
    title: null,
    topLogo: {
      imgSrc: null,
      imgStyle: 'padding-left: 64px; padding-right: 64px; margin-bottom: 8px; margin-top: 8px',
      imgAlt: null,
    },
    showKFooterLogo: false,
  },
  sideNav: { brandedFooter: {}, showKFooterLogo: true },
  appBar: { topLogo: null },
};
