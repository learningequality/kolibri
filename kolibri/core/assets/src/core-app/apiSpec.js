/*
 * This file defines the API for the core Kolibri app.
 */

// module must be specified.
// module maps a module into the API, at the specified path.
// By default any module specified will be aliased to allow for require statements
// namespaced in a way analogous to the API spec below.
//
// These modules will now be referenceable as e.g.: import logger from 'kolibri.lib.logging';
//
// N.B. You cannot use keys that require quotation marks in this object.
// e.g. 'content-icon' (although this can be used as a value in module).

import logging from '../logging';
import vue from 'vue';
import vuex from 'vuex';
import conditionalPromise from '../conditionalPromise';
import * as apiResource from '../api-resource';
import seededshuffle from 'seededshuffle';
import * as constants from '../constants';
import * as getters from '../state/getters';
import * as actions from '../state/actions';
import * as store from '../state/store';
import * as mappers from '../state/mappers';
import contentRenderer from '../views/content-renderer';
import exerciseAttempts from '../views/exercise-attempts';
import downloadButton from '../views/content-renderer/download-button';
import loadingSpinner from '../views/loading-spinner';
import progressBar from '../views/progress-bar';
import contentIcon from '../views/content-icon';
import progressIcon from '../views/progress-icon';
import coreBase from '../views/core-base';
import coreModal from '../views/core-modal';
import navBar from '../views/nav-bar';
import iconButton from '../views/icon-button';
import textbox from '../views/textbox';
import dropdownMenu from '../views/dropdown-menu';
import tabs from '../views/tabs';
import tabLink from '../views/tab-link';
import tabButton from '../views/tab-button';
import logo from '../views/logo';
import immersiveFullScreen from '../views/immersive-full-screen';
import elapsedTime from '../views/elapsed-time';
import pointsIcon from '../views/points-icon';
import authMessage from '../views/auth-message';
import breadcrumbs from '../views/breadcrumbs';
import router from '../router';
import responsiveWindow from '../mixins/responsive-window';
import responsiveElement from '../mixins/responsive-element';
import theme from '../styles/core-theme.styl';
import definitions from '../styles/definitions.styl';
import keenVars from '../keen-config/variables.scss';
import * as exams from '../exams/utils';
import validateLinkObject from '../validateLinkObject';
import * as serverClock from '../serverClock';

export default {
  lib: {
    logging,
    vue,
    vuex,
    conditionalPromise,
    apiResource,
    seededshuffle,
  },
  coreVue: {
    vuex: {
      constants,
      getters,
      actions,
      store,
      mappers,
    },
    components: {
      contentRenderer,
      exerciseAttempts,
      downloadButton,
      loadingSpinner,
      progressBar,
      contentIcon,
      progressIcon,
      coreBase,
      coreModal,
      navBar,
      iconButton,
      textbox,
      dropdownMenu,
      tabs,
      tabLink,
      tabButton,
      logo,
      immersiveFullScreen,
      elapsedTime,
      pointsIcon,
      authMessage,
      breadcrumbs,
    },
    router,
    mixins: {
      responsiveWindow,
      responsiveElement,
    },
  },
  styles: {
    theme,
    definitions,
    keenVars,
  },
  utils: {
    exams,
    validateLinkObject,
    serverClock,
  },
};
