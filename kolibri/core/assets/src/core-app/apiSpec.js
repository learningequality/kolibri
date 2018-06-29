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

import vue from 'vue';
import vuex from 'vuex';
import seededshuffle from 'seededshuffle';
import uiAlert from 'keen-ui/src/UiAlert';
import tetherDrop from 'tether-drop';
import tetherTooltip from 'tether-tooltip';
import logging from '../logging';
import conditionalPromise from '../conditionalPromise';
import * as apiResource from '../api-resource';
import * as constants from '../constants';
import * as getters from '../state/getters';
import * as actions from '../state/actions';
import * as store from '../state/store';
import * as mappers from '../state/mappers';
import contentRenderer from '../views/content-renderer';
import downloadButton from '../views/content-renderer/download-button';
import progressBar from '../views/progress-bar';
import contentIcon from '../views/content-icon';
import progressIcon from '../views/progress-icon';
import permissionsIcon from '../views/permissions-icon';
import coreBase from '../views/core-base';
import coreModal from '../views/core-modal';
import sideNav from '../views/side-nav';
import kButton from '../views/buttons-and-links/k-button';
import kExternalLink from '../views/buttons-and-links/k-external-link';
import kRouterLink from '../views/buttons-and-links/k-router-link';
import kTextbox from '../views/k-textbox';
import kNavbar from '../views/k-navbar';
import kNavbarLink from '../views/k-navbar/link';
import logo from '../views/logo';
import languageSwitcherList from '../views/language-switcher/list.vue';
import immersiveFullScreen from '../views/immersive-full-screen';
import elapsedTime from '../views/elapsed-time';
import pointsIcon from '../views/points-icon';
import authMessage from '../views/auth-message';
import kBreadcrumbs from '../views/k-breadcrumbs';
import kCheckbox from '../views/k-checkbox';
import kRadioButton from '../views/k-radio-button';
import kFilterTextbox from '../views/k-filter-textbox';
import kGrid from '../views/k-grid';
import kGridItem from '../views/k-grid/item.vue';
import kSelect from '../views/k-select';
import router from '../router';
import responsiveWindow from '../mixins/responsive-window';
import responsiveElement from '../mixins/responsive-element';
import contentRendererMixin from '../mixins/contentRenderer';
import fullscreen from '../views/fullscreen';
import theme from '../styles/core-theme.styl';
import definitions from '../styles/definitions.styl';
import keenVars from '../keen-config/variables.scss';
import * as exams from '../exams/utils';
import * as validators from '../validators';
import * as serverClock from '../serverClock';
import * as resources from '../api-resources';
import * as i18n from '../utils/i18n';
import * as browser from '../utils/browser';
import appBar from '../views/app-bar';
import coreSnackbar from '../views/core-snackbar';
import coreMenu from '../views/core-menu';
import coreMenuOption from '../views/core-menu/option';
import heartbeat from '../heartbeat';
import coreTable from '../views/core-table';
import kDropdownMenu from '../views/k-dropdown-menu';
import coachContentLabel from '../views/coach-content-label';

// webpack optimization
import buttonAndLinkStyles from '../views/buttons-and-links/buttons.styl';
import CoreInfoIcon from '../views/CoreInfoIcon';
import * as contentNode from '../utils/contentNodeUtils';
import attemptLogList from '../views/attempt-log-list';
import interactionList from '../views/interaction-list';
import examReport from '../views/exam-report';
import textTruncator from '../views/text-truncator';
import kLinearLoader from '../views/k-linear-loader';
import kCircularLoader from '../views/k-circular-loader';

import multiPaneLayout from '../views/multi-pane-layout';
import * as client from './client';
import urls from './urls';

export default {
  client,
  heartbeat,
  lib: {
    logging,
    vue,
    vuex,
    conditionalPromise,
    apiResource,
    seededshuffle,
    tetherDrop,
    tetherTooltip,
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
      coachContentLabel,
      contentRenderer,
      downloadButton,
      progressBar,
      contentIcon,
      progressIcon,
      permissionsIcon,
      coreBase,
      coreModal,
      sideNav,
      kButton,
      kExternalLink,
      kRouterLink,
      kTextbox,
      kNavbar,
      kNavbarLink,
      languageSwitcherList,
      logo,
      immersiveFullScreen,
      elapsedTime,
      pointsIcon,
      authMessage,
      kBreadcrumbs,
      kCheckbox,
      kRadioButton,
      kFilterTextbox,
      kGrid,
      kGridItem,
      kSelect,
      uiAlert,
      appBar,
      coreSnackbar,
      coreMenu,
      coreMenuOption,
      coreTable,
      kDropdownMenu,
      CoreInfoIcon,
      attemptLogList,
      interactionList,
      examReport,
      textTruncator,
      kLinearLoader,
      kCircularLoader,
      multiPaneLayout,
      fullscreen,
    },
    router,
    mixins: {
      responsiveWindow,
      responsiveElement,
      contentRenderer: contentRendererMixin,
    },
  },
  resources,
  styles: {
    theme,
    definitions,
    keenVars,
    buttonAndLinkStyles,
  },
  urls,
  utils: {
    contentNode,
    browser,
    exams,
    validators,
    serverClock,
    i18n,
  },
};
