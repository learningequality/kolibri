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
import * as getters from '../state/modules/core/getters';
import * as actions from '../state/modules/core/actions';
import store from '../state/store';
import * as mappers from '../state/mappers';
import ContentRenderer from '../views/content-renderer';
import DownloadButton from '../views/content-renderer/download-button';
import ProgressBar from '../views/progress-bar';
import ContentIcon from '../views/content-icon';
import ProgressIcon from '../views/progress-icon';
import PermissionsIcon from '../views/permissions-icon';
import CoreBase from '../views/core-base';
import KModal from '../views/k-modal';
import SideNav from '../views/side-nav';
import KButton from '../views/buttons-and-links/k-button';
import KExternalLink from '../views/buttons-and-links/k-external-link';
import KRouterLink from '../views/buttons-and-links/k-router-link';
import KTextbox from '../views/k-textbox';
import KNavbar from '../views/k-navbar';
import KNavbarLink from '../views/k-navbar/link';
import CoreLogo from '../views/logo';
import LanguageSwitcherList from '../views/language-switcher/list.vue';
import ImmersiveFullScreen from '../views/immersive-full-screen';
import ElapsedTime from '../views/elapsed-time';
import PointsIcon from '../views/points-icon';
import AuthMessage from '../views/auth-message';
import KBreadcrumbs from '../views/k-breadcrumbs';
import KCheckbox from '../views/k-checkbox';
import KRadioButton from '../views/k-radio-button';
import KFilterTextbox from '../views/k-filter-textbox';
import KGrid from '../views/k-grid';
import KGridItem from '../views/k-grid/item.vue';
import KSelect from '../views/k-select';
import router from '../router';
import responsiveWindow from '../mixins/responsive-window';
import responsiveElement from '../mixins/responsive-element';
import contentRendererMixin from '../mixins/contentRenderer';
import CoreFullscreen from '../views/fullscreen';
import theme from '../styles/core-theme.scss';
import definitions from '../styles/definitions.scss';
import keenVars from '../keen-config/variables.scss';
import * as exams from '../exams/utils';
import * as validators from '../validators';
import * as serverClock from '../serverClock';
import * as resources from '../api-resources';
import * as i18n from '../utils/i18n';
import * as browser from '../utils/browser';
import samePageCheckGenerator from '../utils/samePageCheckGenerator';
import AppBar from '../views/app-bar';
import CoreSnackbar from '../views/core-snackbar';
import CoreMenu from '../views/core-menu';
import CoreMenuOption from '../views/core-menu/option';
import heartbeat from '../heartbeat';
import CoreTable from '../views/core-table';
import KDropdownMenu from '../views/k-dropdown-menu';
import CoachContentLabel from '../views/coach-content-label';

// webpack optimization
import buttonAndLinkStyles from '../views/buttons-and-links/buttons.scss';
import CoreInfoIcon from '../views/CoreInfoIcon';
import * as contentNode from '../utils/contentNodeUtils';
import AttemptLogList from '../views/attempt-log-list';
import InteractionList from '../views/interaction-list';
import ExamReport from '../views/exam-report';
import TextTruncator from '../views/text-truncator';
import KLinearLoader from '../views/k-linear-loader';
import KCircularLoader from '../views/k-circular-loader';

import MultiPaneLayout from '../views/multi-pane-layout';
import navComponents from '../utils/navComponents';
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
      CoachContentLabel,
      ContentRenderer,
      DownloadButton,
      ProgressBar,
      ContentIcon,
      ProgressIcon,
      PermissionsIcon,
      CoreBase,
      KModal,
      SideNav,
      KButton,
      KExternalLink,
      KRouterLink,
      KTextbox,
      KNavbar,
      KNavbarLink,
      LanguageSwitcherList,
      ImmersiveFullScreen,
      ElapsedTime,
      PointsIcon,
      AuthMessage,
      KBreadcrumbs,
      KCheckbox,
      KRadioButton,
      KFilterTextbox,
      KGrid,
      KGridItem,
      KSelect,
      AppBar,
      CoreSnackbar,
      CoreMenu,
      CoreMenuOption,
      CoreTable,
      KDropdownMenu,
      CoreInfoIcon,
      AttemptLogList,
      InteractionList,
      ExamReport,
      TextTruncator,
      KLinearLoader,
      KCircularLoader,
      MultiPaneLayout,
      CoreFullscreen,
      CoreLogo,
      uiAlert,
    },
    router,
    mixins: {
      responsiveWindow,
      responsiveElement,
      contentRendererMixin,
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
    navComponents,
    samePageCheckGenerator,
  },
};
