module.exports = {
  kolibri_module: 'kolibri-module',
  kolibri_app: 'kolibri-app',
  content_renderer_module: 'kolibri-viewer',
  plugin_data: 'kolibri-plugin-data',
  'kolibri.client': 'kolibri/client',
  'kolibri.heartbeat': 'kolibri/heartbeat',
  'kolibri.lib.logging': 'kolibri-logging',
  'kolibri.lib.vue': 'vue',
  'kolibri.lib.vuex': 'vuex',
  'kolibri.lib.vueCompositionApi': 'vue',
  'kolibri.lib.apiResource': 'kolibri/apiResource',
  'kolibri.coreVue.vuex.constants': 'kolibri/constants',
  'kolibri.coreVue.vuex.getters': null,
  'kolibri.coreVue.vuex.actions': null,
  'kolibri.coreVue.vuex.store': 'kolibri/store',
  'kolibri.coreVue.vuex.mappers': null, // Remove use of remaining mapper
  'kolibri.coreVue.components.ScrollingHeader': null,
  'kolibri.coreVue.components.Backdrop': 'kolibri-common/components/Backdrop',
  'kolibri.coreVue.components.CoachContentLabel':
    'kolibri-common/components/labels/CoachContentLabel',
  'kolibri.coreVue.components.DownloadButton': 'kolibri/components/DownloadButton',
  'kolibri.coreVue.components.ProgressBar': null, // Not used
  'kolibri.coreVue.components.ContentIcon': 'kolibri-common/components/labels/ContentIcon',
  'kolibri.coreVue.components.ProgressIcon': 'kolibri-common/components/labels/ProgressIcon',
  'kolibri.coreVue.components.PermissionsIcon': 'kolibri-common/components/labels/PermissionsIcon',
  'kolibri.coreVue.components.AppBar': null, // Only used in AppBarPage
  'kolibri.coreVue.components.AppBarPage': 'kolibri/components/pages/AppBarPage',
  'kolibri.coreVue.components.ImmersivePage': 'kolibri/components/pages/ImmersivePage',
  'kolibri.coreVue.components.SideNav': null, // Only used in AppBarPage
  'kolibri.coreVue.components.Navbar': null, // Only used in HorizontalNavBarWithOverflowMenu
  'kolibri.coreVue.components.NavbarLink': null, // Only used in HorizontalNavBarWithOverflowMenu
  'kolibri.coreVue.components.HorizontalNavBarWithOverflowMenu': null, // Should be migrated to AppBarPage, and populated by registered nav items
  'kolibri.coreVue.components.LanguageSwitcherModal':
    'kolibri/components/language-switcher/LanguageSwitcherModal',
  'kolibri.coreVue.components.LanguageSwitcherList':
    'kolibri/components/language-switcher/LanguageSwitcherList',
  'kolibri.coreVue.components.ElapsedTime': 'kolibri-common/components/ElapsedTime',
  'kolibri.coreVue.components.PointsIcon': 'kolibri-common/components/labels/PointsIcon',
  'kolibri.coreVue.components.TotalPoints': null, // Only used in SideNav
  'kolibri.coreVue.components.AuthMessage': 'kolibri/components/AuthMessage',
  'kolibri.coreVue.components.FilterTextbox': 'kolibri/components/FilterTextbox',
  'kolibri.coreVue.components.CoreSnackbar': null, // Only used in GlobalSnackbar
  'kolibri.coreVue.components.CoreMenu': 'kolibri/components/CoreMenu',
  'kolibri.coreVue.components.CoreMenuDivider': null,
  'kolibri.coreVue.components.CoreMenuOption': 'kolibri/components/CoreMenu/CoreMenuOption',
  'kolibri.coreVue.components.CoreTable': 'kolibri/components/CoreTable',
  'kolibri.coreVue.components.UserTable': 'kolibri-common/components/UserTable',
  'kolibri.coreVue.components.CoreInfoIcon': 'kolibri-common/components/labels/CoreInfoIcon',
  'kolibri.coreVue.components.InteractionList': 'kolibri-common/components/quizzes/InteractionList',
  'kolibri.coreVue.components.ExamReport': 'kolibri-common/components/quizzes/QuizReport',
  'kolibri.coreVue.components.SlotTruncator': 'kolibri-common/components/SlotTruncator',
  'kolibri.coreVue.components.TimeDuration': 'kolibri-common/components/TimeDuration',
  'kolibri.coreVue.components.MultiPaneLayout': 'kolibri-common/components/MultiPaneLayout',
  'kolibri.coreVue.components.CoreFullscreen': 'kolibri-common/components/CoreFullscreen',
  'kolibri.coreVue.components.CoreLogo': 'kolibri/components/CoreLogo',
  'kolibri.coreVue.components.UiAlert': 'kolibri-design-system/lib/keen/UiAlert',
  'kolibri.coreVue.components.UiIconButton': 'kolibri-design-system/lib/keen/UiIconButton',
  'kolibri.coreVue.components.UiToolbar': 'kolibri-design-system/lib/KToolbar',
  'kolibri.coreVue.components.PrivacyInfoModal': 'kolibri/components/PrivacyInfoModal',
  'kolibri.coreVue.components.UserTypeDisplay': 'kolibri-common/components/UserTypeDisplay',
  'kolibri.coreVue.components.Draggable': 'kolibri-common/components/sortable/Draggable',
  'kolibri.coreVue.components.DragHandle': 'kolibri-common/components/sortable/DragHandle',
  'kolibri.coreVue.components.DragContainer': 'kolibri-common/components/sortable/DragContainer',
  'kolibri.coreVue.components.DragSortWidget': 'kolibri-common/components/sortable/DragSortWidget',
  'kolibri.coreVue.components.FocusTrap': null, // Use KFocusTrap from KDS
  'kolibri.coreVue.components.BottomAppBar': 'kolibri/components/BottomAppBar',
  'kolibri.coreVue.components.BaseToolbar': 'kolibri-common/components/BaseToolbar',
  'kolibri.coreVue.components.GenderSelect': 'kolibri-common/components/userAccounts/GenderSelect',
  'kolibri.coreVue.components.GenderDisplayText':
    'kolibri-common/components/userAccounts/GenderDisplayText',
  'kolibri.coreVue.components.BirthYearSelect':
    'kolibri-common/components/userAccounts/BirthYearSelect',
  'kolibri.coreVue.components.FullNameTextbox':
    'kolibri-common/components/userAccounts/FullNameTextbox',
  'kolibri.coreVue.components.UsernameTextbox':
    'kolibri-common/components/userAccounts/UsernameTextbox',
  'kolibri.coreVue.components.PasswordTextbox':
    'kolibri-common/components/userAccounts/PasswordTextbox',
  'kolibri.coreVue.components.BirthYearDisplayText':
    'kolibri-common/components/userAccounts/BirthYearDisplayText',
  'kolibri.coreVue.components.PaginatedListContainer':
    'kolibri-common/components/PaginatedListContainer',
  'kolibri.coreVue.components.PrivacyLinkAndModal':
    'kolibri-common/components/userAccounts/PrivacyLinkAndModal',
  'kolibri.coreVue.components.LearnOnlyDeviceNotice': null, // Only used in sidenav
  'kolibri.coreVue.components.SuggestedTime': 'kolibri-common/components/SuggestedTime',
  'kolibri.coreVue.components.PageRoot': null, // Is an incredibly simple boiler plate that should be copied into the places it is used.
  'kolibri.coreVue.components.MasteryModel': 'kolibri-common/components/labels/MasteryModel',
  'kolibri.coreVue.components.NotificationsRoot': 'kolibri/components/pages/NotificationsRoot',
  'kolibri.coreVue.components.KolibriLoadingSnippet':
    'kolibri-common/components/KolibriLoadingSnippet',
  'kolibri.coreVue.componentSets.sync': {
    _type: 'complex',
    _defaultPath: 'kolibri-common/components/syncComponentSet', // Default path for automatic mapping
    SelectDeviceForm:
      'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/SelectDeviceForm',
    AddDeviceForm:
      'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/AddDeviceForm',
    useDeviceDeletion:
      'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDeviceDeletion',
    useConnectionChecker:
      'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useConnectionChecker',
    useDevices: 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices',
    useDevicesWithFilter: {
      path: 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices',
    },
    useDeviceChannelFilter: {
      path: 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices',
    },
    useDeviceFacilityFilter: {
      path: 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices',
    },
    useDeviceMinimumVersionFilter: {
      path: 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices',
    },
  },
  'kolibri.coreVue.router': 'kolibri/router',
  'kolibri.coreVue.mixins.responsiveWindowMixin': null,
  'kolibri.coreVue.mixins.responsiveElementMixin': null,
  'kolibri.coreVue.mixins.commonCoreStrings': 'kolibri/uiText/commonCoreStrings', // Break up into use case specific translator objects
  'kolibri.coreVue.mixins.commonTaskStrings': 'kolibri-common/uiText/tasks',
  'kolibri.coreVue.mixins.commonSyncElements': 'kolibri-common/mixins/commonSyncElements',
  'kolibri.coreVue.mixins.translatedUserKinds': 'kolibri-common/uiText/userKinds',
  'kolibri.coreVue.composables.useKResponsiveWindow':
    'kolibri-design-system/lib/useKResponsiveWindow',
  'kolibri.coreVue.composables.useKShow': 'kolibri-design-system/lib/composables/useKShow',
  'kolibri.coreVue.composables.useMinimumKolibriVersion':
    'kolibri/composables/useMinimumKolibriVersion',
  'kolibri.coreVue.composables.useSnackbar': 'kolibri/composables/useSnackbar',
  'kolibri.coreVue.composables.useUser': 'kolibri/composables/useUser',
  'kolibri.coreVue.composables.useUserSyncStatus': 'kolibri/composables/useUserSyncStatus',
  'kolibri.coreVue.composables.useNow': 'kolibri/composables/useNow',
  'kolibri.coreVue.composables.useTotalProgress': 'kolibri/composables/useTotalProgress',
  'kolibri.resources': {
    _type: 'complex',
    _defaultPath: 'kolibri-common/apiResources', // Default path for automatic mapping
    // Explicit mapping
    TaskResource: 'kolibri/apiResources/TaskResource',
    NetworkLocationResource: {
      path: 'kolibri-common/apiResources/NetworkLocationResource',
    },
    StaticNetworkLocationResource: {
      path: 'kolibri-common/apiResources/NetworkLocationResource',
    },
    DynamicNetworkLocationResource: {
      path: 'kolibri-common/apiResources/NetworkLocationResource',
    },
  },
  'kolibri.themeConfig': 'kolibri/styles/themeConfig',
  'kolibri.urls': 'kolibri/urls',
  'kolibri.utils.appCapabilities': 'kolibri/utils/appCapabilities',
  'kolibri.utils.browserInfo': 'kolibri/utils/browserInfo',
  'kolibri.utils.bytesForHumans': 'kolibri/uiText/bytesForHumans',
  'kolibri.utils.CatchErrors': 'kolibri/utils/CatchErrors',
  'kolibri.utils.clientFactory': 'kolibri/utils/baseClient',
  'kolibri.utils.contentNode': null, // Get rid of the use of this completely
  'kolibri.utils.coreBannerContent': 'kolibri-common/utils/coreBannerContent',
  'kolibri.utils.exams': 'kolibri-common/quizzes/utils',
  'kolibri.utils.filterUsersByNames': 'kolibri-common/utils/filterUsersByNames',
  'kolibri.utils.i18n': 'kolibri/utils/i18n',
  'kolibri.utils.licenseTranslations': 'kolibri/uiText/licenses',
  'kolibri.utils.loginComponents': 'kolibri-common/utils/loginComponents',
  'kolibri.utils.redirectBrowser': 'kolibri/utils/redirectBrowser',
  'kolibri.utils.registerNavItem': 'kolibri/composables/useNav',
  'kolibri.utils.samePageCheckGenerator': 'kolibri-common/utils/samePageCheckGenerator',
  'kolibri.utils.serverClock': 'kolibri/utils/serverClock',
  'kolibri.utils.shuffled': 'kolibri-common/utils/shuffled',
  'kolibri.utils.sortLanguages': null, // Move into i18n module
  'kolibri.utils.syncTaskUtils': 'kolibri-common/utils/syncTaskUtils', // Break this up, migrate constants to constants
  'kolibri.utils.UserType': 'kolibri-common/utils/userType',
  'kolibri.utils.validators': 'kolibri/utils/validators',
  'kolibri.utils.coreStrings': 'kolibri/uiText/commonCoreStrings', // See above about breaking this up into more discrete uiText translators
  'kolibri.utils.objectSpecs': 'kolibri/utils/objectSpecs',
};
