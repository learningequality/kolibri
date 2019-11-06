import pick from 'lodash/pick';
import { createTranslator } from 'kolibri.utils.i18n';
import router from 'kolibri.coreVue.router';
import { pageNameToModuleMap, PageNames, ContentWizardPages } from '../constants';
import deviceInfo from './deviceInfo';
import manageContent from './manageContent';
import managePermissions from './managePermissions';
import userPermissions from './userPermissions';
import coreBase from './coreBase';

const TaskSnackbarStrings = createTranslator('TaskSnackbarStrings', {
  taskStarted: 'Task started…',
  viewTasksAction: 'View tasks',
  taskFailed: 'Task could not be started',
});

export default {
  state: {
    pageName: '',
    welcomeModalVisible: false,
  },
  mutations: {
    SET_PAGE_NAME(state, name) {
      state.pageName = name;
    },
    SET_WELCOME_MODAL_VISIBLE(state, visibility) {
      state.welcomeModalVisible = visibility;
    },
  },
  actions: {
    preparePage(store, { name, isAsync = true }) {
      store.commit('CORE_SET_PAGE_LOADING', isAsync);
      store.commit('SET_PAGE_NAME', name);
      store.commit('CORE_SET_ERROR', null);
    },
    resetModuleState(store, { toRoute, fromRoute }) {
      // Don't reset when going to available channels page
      if (
        fromRoute.name === PageNames.MANAGE_CONTENT_PAGE &&
        toRoute.name === ContentWizardPages.AVAILABLE_CHANNELS
      ) {
        return;
      }
      const moduleName = pageNameToModuleMap[fromRoute.name];
      if (moduleName) {
        store.commit(`${moduleName}/RESET_STATE`);
      }
    },
    createTaskFailedSnackbar(store) {
      store.dispatch('createSnackbar', TaskSnackbarStrings.$tr('taskFailed'));
    },
    createTaskStartedSnackbar(store) {
      store.commit('CORE_CREATE_SNACKBAR', {
        text: TaskSnackbarStrings.$tr('taskStarted'),
        autoDismiss: true,
        duration: 10000,
        actionText: TaskSnackbarStrings.$tr('viewTasksAction'),
        actionCallback() {
          return router.push(
            {
              name: 'MANAGE_TASKS',
              params: {
                lastRoute: pick(router.currentRoute, ['name', 'params', 'query']),
              },
            },
            () => {
              store.commit('CORE_CLEAR_SNACKBAR');
            }
          );
        },
      });
    },
  },
  modules: {
    // DEVICE_INFO_PAGE
    deviceInfo,
    // MANAGE_PERMISSIONS_PAGE
    managePermissions,
    // USER_PERMISSIONS_PAGE
    userPermissions,
    // MANAGE_CONTENT_PAGE + wizards
    manageContent,
    // CoreBase properties
    coreBase,
  },
};
