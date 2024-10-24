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
import * as vueCompositionApi from '@vue/composition-api';
import logging from '../logging';
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
import AppBarPage from '../views/CorePage/AppBarPage';
import ImmersivePage from '../views/CorePage/ImmersivePage';
import CoreLogo from '../views/CoreLogo';
import LanguageSwitcherList from '../views/language-switcher/LanguageSwitcherList';
import LanguageSwitcherModal from '../views/language-switcher/LanguageSwitcherModal';
import ElapsedTime from '../views/ElapsedTime';
import AuthMessage from '../views/AuthMessage';
import FilterTextbox from '../views/FilterTextbox';
import KolibriLoadingSnippet from '../views/KolibriLoadingSnippet';
import router from '../router';
import commonCoreStrings from '../mixins/commonCoreStrings'; // eslint-disable-line import/no-duplicates
import { coreStrings } from '../mixins/commonCoreStrings'; // eslint-disable-line import/no-duplicates
import commonTaskStrings from '../mixins/taskStrings';
import commonSyncElements from '../mixins/commonSyncElements';
import translatedUserKinds from '../mixins/userKinds';
import CoreFullscreen from '../views/CoreFullscreen';
import * as exams from '../exams/utils';
import * as validators from '../validators';
import * as objectSpecs from '../objectSpecs';
import * as serverClock from '../serverClock';
import * as resources from '../api-resources';
import * as i18n from '../utils/i18n';
import * as browserInfo from '../utils/browserInfo';
import redirectBrowser from '../utils/redirectBrowser';
import * as licenseTranslations from '../utils/licenseTranslations';
import bytesForHumans from '../utils/bytesForHumans';
import UserType from '../utils/UserType';
import * as syncTaskUtils from '../utils/syncTaskUtils';
import samePageCheckGenerator from '../utils/samePageCheckGenerator';
import Backdrop from '../views/Backdrop';
import CoreMenu from '../views/CoreMenu';
import CoreMenuDivider from '../views/CoreMenu/CoreMenuDivider';
import CoreMenuOption from '../views/CoreMenu/CoreMenuOption';
import heartbeat from '../heartbeat';
import CoreTable from '../views/CoreTable';
import UserTable from '../views/UserTable';
import CoachContentLabel from '../views/CoachContentLabel';
import PrivacyInfoModal from '../views/PrivacyInfoModal';
import UserTypeDisplay from '../views/UserTypeDisplay';
import Draggable from '../views/sortable/Draggable';
import DragHandle from '../views/sortable/DragHandle';
import DragContainer from '../views/sortable/DragContainer';
import DragSortWidget from '../views/sortable/DragSortWidget';
import BottomAppBar from '../views/BottomAppBar';
import BaseToolbar from '../views/BaseToolbar';
import GenderSelect from '../views/userAccounts/GenderSelect';
import BirthYearSelect from '../views/userAccounts/BirthYearSelect';
import FullNameTextbox from '../views/userAccounts/FullNameTextbox';
import UsernameTextbox from '../views/userAccounts/UsernameTextbox';
import PasswordTextbox from '../views/userAccounts/PasswordTextbox';
import GenderDisplayText from '../views/userAccounts/GenderDisplayText';
import BirthYearDisplayText from '../views/userAccounts/BirthYearDisplayText';
import PrivacyLinkAndModal from '../views/userAccounts/PrivacyLinkAndModal.vue';
import PaginatedListContainer from '../views/PaginatedListContainer';
import MasteryModel from '../views/MasteryModel';
import LearnOnlyDeviceNotice from '../views/LearnOnlyDeviceNotice';
import themeConfig from '../styles/themeConfig';
import * as sync from '../views/sync/syncComponentSet';
import NotificationsRoot from '../views/NotificationsRoot';
import useMinimumKolibriVersion from '../composables/useMinimumKolibriVersion';
import useUserSyncStatus from '../composables/useUserSyncStatus';
import useUser from '../composables/useUser';
import useSnackbar from '../composables/useSnackbar';
import useTotalProgress from '../composables/useTotalProgress';
import { registerNavItem } from '../composables/useNav';
import useNow from '../composables/useNow';

// webpack optimization
import CoreInfoIcon from '../views/CoreInfoIcon';
import InteractionList from '../views/InteractionList';
import ExamReport from '../views/ExamReport';
import SlotTruncator from '../views/SlotTruncator';
import TimeDuration from '../views/TimeDuration';
import SuggestedTime from '../views/SuggestedTime';

import MultiPaneLayout from '../views/MultiPaneLayout';
import filterUsersByNames from '../utils/filterUsersByNames';
import loginComponents from '../utils/loginComponents';
import coreBannerContent from '../utils/coreBannerContent';
import CatchErrors from '../utils/CatchErrors';
import UiToolbar from '../views/KeenUiToolbar.vue';
import shuffled from '../utils/shuffled';
import * as appCapabilities from '../utils/appCapabilities';
import * as client from './client';
import clientFactory from './baseClient';

import urls from './urls';

export default {
  client,
  heartbeat,
  lib: {
    logging,
    vue,
    vuex,
    vueCompositionApi,
    apiResource,
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
      Backdrop,
      CoachContentLabel,
      DownloadButton,
      ProgressBar,
      ContentIcon,
      ProgressIcon,
      PermissionsIcon,
      AppBarPage,
      ImmersivePage,
      LanguageSwitcherModal,
      LanguageSwitcherList,
      ElapsedTime,
      AuthMessage,
      FilterTextbox,
      CoreMenu,
      CoreMenuDivider,
      CoreMenuOption,
      CoreTable,
      UserTable,
      CoreInfoIcon,
      InteractionList,
      ExamReport,
      SlotTruncator,
      TimeDuration,
      MultiPaneLayout,
      CoreFullscreen,
      CoreLogo,
      UiToolbar,
      PrivacyInfoModal,
      UserTypeDisplay,
      Draggable,
      DragHandle,
      DragContainer,
      DragSortWidget,
      FocusTrap,
      BottomAppBar,
      BaseToolbar,
      GenderSelect,
      GenderDisplayText,
      BirthYearSelect,
      FullNameTextbox,
      UsernameTextbox,
      PasswordTextbox,
      BirthYearDisplayText,
      PaginatedListContainer,
      PrivacyLinkAndModal,
      LearnOnlyDeviceNotice,
      SuggestedTime,
      MasteryModel,
      NotificationsRoot,
      KolibriLoadingSnippet,
    },
    componentSets: {
      sync,
    },
    router,
    mixins: {
      commonCoreStrings,
      commonTaskStrings,
      commonSyncElements,
      translatedUserKinds,
    },
    composables: {
      useMinimumKolibriVersion,
      useNow,
      useUser,
      useUserSyncStatus,
      useSnackbar,
      useTotalProgress,
    },
  },
  resources,
  themeConfig,
  urls,
  utils: {
    appCapabilities,
    browserInfo,
    bytesForHumans,
    CatchErrors,
    clientFactory,
    coreBannerContent,
    exams,
    filterUsersByNames,
    i18n,
    licenseTranslations,
    loginComponents,
    registerNavItem,
    redirectBrowser,
    samePageCheckGenerator,
    serverClock,
    shuffled,
    syncTaskUtils,
    UserType,
    validators,
    coreStrings,
    objectSpecs,
  },
};
