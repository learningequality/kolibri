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
import UiAlert from 'keen-ui/src/UiAlert';
import tetherDrop from 'tether-drop';
import tetherTooltip from 'tether-tooltip';
import responsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';
import responsiveElementMixin from 'kolibri-components/src/KResponsiveElementMixin';
import scriptLoader from 'kolibri-components/src/utils/scriptLoader';
import logging from '../logging';
import conditionalPromise from '../conditionalPromise';
import * as apiResource from '../api-resource';
import * as constants from '../constants';
import * as getters from '../state/modules/core/getters';
import * as actions from '../state/modules/core/actions';
import store from '../state/store';
import * as mappers from '../state/mappers';
import DownloadButton from '../views/ContentRenderer/DownloadButton';
import ProgressBar from '../views/ProgressBar';
import ContentIcon from '../views/ContentIcon';
import ProgressIcon from '../views/ProgressIcon';
import PermissionsIcon from '../views/PermissionsIcon';
import CoreBase from '../views/CoreBase';
import SideNav from '../views/SideNav';
import Navbar from '../views/Navbar';
import NavbarLink from '../views/Navbar/NavbarLink';
import CoreLogo from '../views/CoreLogo';
import LanguageSwitcherList from '../views/language-switcher/LanguageSwitcherList';
import ElapsedTime from '../views/ElapsedTime';
import PointsIcon from '../views/PointsIcon';
import AuthMessage from '../views/AuthMessage';
import FilterTextbox from '../views/FilterTextbox';
import router from '../router';
import commonCoreStrings from '../mixins/commonCoreStrings';
import CoreFullscreen from '../views/CoreFullscreen';
import definitions from '../styles/definitions.scss';
import keenVars from '../keen-config/variables.scss';
import * as exams from '../exams/utils';
import * as validators from '../validators';
import * as serverClock from '../serverClock';
import * as resources from '../api-resources';
import * as i18n from '../utils/i18n';
import * as licenseTranslations from '../utils/licenseTranslations';
import * as browser from '../utils/browser';
import bytesForHumans from '../utils/bytesForHumans';
import UserType from '../utils/UserType';
import samePageCheckGenerator from '../utils/samePageCheckGenerator';
import AppBar from '../views/AppBar';
import CoreSnackbar from '../views/CoreSnackbar';
import CoreMenu from '../views/CoreMenu';
import CoreMenuOption from '../views/CoreMenu/CoreMenuOption';
import heartbeat from '../heartbeat';
import CoreTable from '../views/CoreTable';
import CoachContentLabel from '../views/CoachContentLabel';
import PrivacyInfoModal from '../views/PrivacyInfoModal';
import UserTypeDisplay from '../views/UserTypeDisplay';
import TechnicalTextBlock from '../views/AppError/TechnicalTextBlock';
import Draggable from '../views/sortable/Draggable';
import DragHandle from '../views/sortable/DragHandle';
import DragContainer from '../views/sortable/DragContainer';
import DragSortWidget from '../views/sortable/DragSortWidget';
import BottomAppBar from '../views/BottomAppBar';
import GenderSelect from '../views/userAccounts/GenderSelect';
import BirthYearSelect from '../views/userAccounts/BirthYearSelect';
import FullNameTextbox from '../views/userAccounts/FullNameTextbox';
import UsernameTextbox from '../views/userAccounts/UsernameTextbox';
import PasswordTextbox from '../views/userAccounts/PasswordTextbox';
import GenderDisplayText from '../views/userAccounts/GenderDisplayText';
import BirthYearDisplayText from '../views/userAccounts/BirthYearDisplayText';
import PrivacyLinkAndModal from '../views/userAccounts/PrivacyLinkAndModal.vue';
import PaginatedListContainer from '../views/PaginatedListContainer';
import PageStatus from '../views/ExamReport/PageStatus';
import branding from '../utils/branding';

// webpack optimization
import CoreInfoIcon from '../views/CoreInfoIcon';
import * as contentNode from '../utils/contentNodeUtils';
import AttemptLogList from '../views/AttemptLogList';
import InteractionList from '../views/InteractionList';
import ExamReport from '../views/ExamReport';
import TextTruncator from '../views/TextTruncator';

import MultiPaneLayout from '../views/MultiPaneLayout';
import navComponents from '../utils/navComponents';
import loginComponents from '../utils/loginComponents';
import coreBannerContent from '../utils/coreBannerContent';
import CatchErrors from '../utils/CatchErrors';
import UiIconButton from '../views/KeenUiIconButton.vue';
import UiToolbar from '../views/KeenUiToolbar.vue';
import shuffled from '../utils/shuffled';
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
      DownloadButton,
      ProgressBar,
      ContentIcon,
      ProgressIcon,
      PermissionsIcon,
      CoreBase,
      SideNav,
      Navbar,
      NavbarLink,
      LanguageSwitcherList,
      ElapsedTime,
      PointsIcon,
      AuthMessage,
      FilterTextbox,
      AppBar,
      CoreSnackbar,
      CoreMenu,
      CoreMenuOption,
      CoreTable,
      CoreInfoIcon,
      AttemptLogList,
      InteractionList,
      ExamReport,
      TextTruncator,
      MultiPaneLayout,
      CoreFullscreen,
      CoreLogo,
      UiAlert,
      UiIconButton,
      UiToolbar,
      PrivacyInfoModal,
      UserTypeDisplay,
      TechnicalTextBlock,
      Draggable,
      DragHandle,
      DragContainer,
      DragSortWidget,
      BottomAppBar,
      GenderSelect,
      GenderDisplayText,
      BirthYearSelect,
      FullNameTextbox,
      UsernameTextbox,
      PasswordTextbox,
      BirthYearDisplayText,
      PaginatedListContainer,
      PrivacyLinkAndModal,
      PageStatus,
    },
    router,
    mixins: {
      responsiveWindowMixin,
      responsiveElementMixin,
      commonCoreStrings,
    },
  },
  resources,
  styles: {
    definitions,
    keenVars,
  },
  urls,
  utils: {
    contentNode,
    browser,
    exams,
    validators,
    serverClock,
    i18n,
    licenseTranslations,
    loginComponents,
    navComponents,
    coreBannerContent,
    samePageCheckGenerator,
    CatchErrors,
    UserType,
    shuffled,
    bytesForHumans,
    branding,
    scriptLoader,
  },
};
