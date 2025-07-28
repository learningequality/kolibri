import store from 'kolibri/store';
import { interpret } from 'xstate';
import findLast from 'lodash/findLast';
import { useRoute, useRouter } from 'vue-router/composables';
import { ref, watch, computed, provide, inject, onBeforeMount, onUnmounted } from 'vue';

import { UserKinds } from 'kolibri/constants';
import UserType from 'kolibri-common/utils/userType';
import useSnackbar from 'kolibri/composables/useSnackbar';
import TaskResource from 'kolibri/apiResources/TaskResource';
import useTaskPolling from 'kolibri-common/composables/useTaskPolling';
import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { getImportLodUsersMachine } from 'kolibri-common/machines/importLodUsersMachine';
import { lodUsersManagementStrings } from 'kolibri-common/strings/lodUsersManagementStrings';

import { PageNames } from '../../../constants';

const SOUD_QUEUE = 'soud_sync';

/**
 * This composable manages the state and logic for the LOD device users pages. Where
 * a parent component should initialize the composable calling `useLodDeviceUsers()` to
 * set up the context data and the XState machine for managing the import of users. And
 * all children pages can inject the state using `injectLodDeviceUsers()`.
 *
 * It provides the following functionalities:
 * - Fetching and managing users from the LOD device.
 * - Handling the import of users with different methods (as admin, with credentials).
 * - Managing the state and route redirection of the import process using an XState machine.
 *
 * @returns {void}
 */
export default function useLodDeviceUsers() {
  const route = useRoute();
  const router = useRouter();
  const { tasks } = useTaskPolling(SOUD_QUEUE);
  const { createSnackbar } = useSnackbar();

  const importLodMachineState = ref(null);
  const users = ref([]);
  const loading = ref(true);
  const showCannotRemoveUser = ref(false);

  const setupImportLodMachineService = () => {
    const service = interpret(getImportLodUsersMachine());

    const DeviceRouteNamesMap = {
      LOD_SETUP_TYPE: PageNames.USERS_PAGE,
      LOD_SELECT_FACILITY: PageNames.USERS_SELECT_FACILITY_FOR_IMPORT,
      LOD_IMPORT_USER_AUTH: PageNames.USERS_IMPORT_USER_WITH_CREDENTIALS,
      LOD_IMPORT_AS_ADMIN: PageNames.USERS_IMPORT_USER_AS_ADMIN,
    };

    const synchronizeRouteAndMachine = state => {
      if (!state) return;
      const { meta } = state;
      let newRoute = { name: PageNames.USERS_PAGE };

      const machineRoute = meta?.[Object.keys(meta)[0]]?.route;
      if (machineRoute && DeviceRouteNamesMap[machineRoute.name]) {
        newRoute = {
          name: DeviceRouteNamesMap[machineRoute.name],
        };
      }

      // Avoid redundant navigation
      if (route.name !== newRoute.name) {
        router.replace(newRoute);
      }
    };

    service.start();
    service.onTransition(state => {
      synchronizeRouteAndMachine(state);
      importLodMachineState.value = state;
    });

    return service;
  };

  const importLodMachineService = setupImportLodMachineService();

  const importMachineContext = computed(() => importLodMachineState.value?.context || {});

  const usersBeingImported = computed(() => importMachineContext.value.usersBeingImported || []);
  const importDeviceId = computed(() => importMachineContext.value.importDeviceId || null);
  const selectedFacility = computed(() => importMachineContext.value.selectedFacility || null);
  const remoteAdmin = computed(() => importMachineContext.value.remoteAdmin || null);
  const remoteUsers = computed(() => importMachineContext.value.remoteUsers || []);

  async function fetchUsers({ force } = {}) {
    loading.value = true;

    try {
      const response = await FacilityUserResource.fetchCollection({
        force,
      });
      loading.value = false;
      response.forEach(user => {
        user.kind = UserType(user);
      });
      users.value = response;
    } catch (error) {
      store.dispatch('handleApiError', { error });
    }

    loading.value = false;
  }

  async function removeUser(userId) {
    const user = users.value.find(user => user.id === userId);
    if (!user) return;
    if (
      user.kind === UserKinds.SUPERUSER &&
      users.value.filter(user => user.kind === UserKinds.SUPERUSER).length === 1
    ) {
      showCannotRemoveUser.value = true;
      return false;
    }

    const { removeUserError$, removeUserSuccess$ } = lodUsersManagementStrings;
    try {
      await FacilityUserResource.removeImportedUser(userId);
      createSnackbar(removeUserSuccess$());
      return true;
    } catch (error) {
      createSnackbar(removeUserError$());
      return false;
    }
  }

  function resetShowCannotRemoveUser() {
    showCannotRemoveUser.value = false;
  }

  /**
   * Filter running importLODUser tasks whose users are not already in the usersBeingImported
   * and add them to the usersBeingImported list.
   */
  function _addMissingUsersToImportList() {
    tasks.value
      .filter(
        task =>
          task.type === TaskTypes.IMPORTLODUSER &&
          task.status === TaskStatuses.RUNNING &&
          !usersBeingImported.value.some(user => user.id === task.extra_metadata?.user_id),
      )
      .forEach(task => {
        importLodMachineService.send({
          type: 'ADD_USER_BEING_IMPORTED',
          value: {
            id: task.extra_metadata.user_id,
            username: task.extra_metadata.username || '',
            full_name: task.extra_metadata.user_full_name || '',
          },
        });
      });
  }

  watch(tasks, async () => {
    if (!tasks.value?.length) {
      return;
    }

    _addMissingUsersToImportList();

    let needsRefetchUsers = false;

    for (const user of usersBeingImported.value) {
      // Find the last task in case there are stalled tasks for the same user
      const task = findLast(
        tasks.value,
        task => task.type === TaskTypes.IMPORTLODUSER && task.extra_metadata?.user_id === user.id,
      );

      if (!task) {
        continue;
      }

      if ([TaskStatuses.COMPLETED, TaskStatuses.FAILED].includes(task.status)) {
        const { importUserError$, importUserSuccess$ } = lodUsersManagementStrings;
        if (task.status === TaskStatuses.FAILED) {
          createSnackbar(importUserError$());
        }
        if (task.status === TaskStatuses.COMPLETED) {
          createSnackbar(importUserSuccess$());
        }
        importLodMachineService.send({
          type: 'REMOVE_USER_BEING_IMPORTED',
          value: user.id,
        });
        needsRefetchUsers = true;
        TaskResource.clear(task.id);
      }
    }

    if (needsRefetchUsers) {
      fetchUsers({ force: true });
    }
  });

  onBeforeMount(() => {
    if (route.name !== PageNames.USERS_PAGE) {
      router.replace({
        name: PageNames.USERS_PAGE,
      });
    }
    fetchUsers({ force: true });
  });

  onUnmounted(() => {
    importLodMachineService?.stop();
  });

  provide('users', users);
  provide('loading', loading);
  provide('remoteAdmin', remoteAdmin);
  provide('remoteUsers', remoteUsers);
  provide('importDeviceId', importDeviceId);
  provide('selectedFacility', selectedFacility);
  provide('usersBeingImported', usersBeingImported);
  provide('showCannotRemoveUser', showCannotRemoveUser);
  provide('importLodMachineService', importLodMachineService);
  provide('fetchUsers', fetchUsers);
  provide('removeUser', removeUser);
  provide('resetShowCannotRemoveUser', resetShowCannotRemoveUser);
}

/**
 * Injects the state and methods from the LOD device users composable.
 *
 * @typedef {Object} InjectLodDeviceUsersObject
 * @property {Array} users The list of users fetched from the LOD device.
 * @property {boolean} loading The loading state of the users.
 * @property {Object} remoteAdmin The remote admin user information
 *  that is set in the "import as admin" xstate machine flow.
 * @property {Array} remoteUsers The list of remote users fetched from the remote device.
 * @property {string|null} importDeviceId The ID of the device from which users are being imported.
 * @property {Object} selectedFacility The facility selected to import users from.
 * @property {Array} usersBeingImported The list of users currently being imported.
 * @property {boolean} showCannotRemoveUser Flag to indicate if the "cannot remove user"
 *  message should be shown.
 * @property {import('xstate').Interpreter} importLodMachineService The XState service managing the
 *  import process.
 * @property {Function} fetchUsers Function to fetch the users from the LOD device.
 * @property {Function} removeUser Function to remove a user from the LOD device.
 * @property {Function} resetShowCannotRemoveUser Function to reset the
 *  "cannot remove user" message.
 *
 * @returns {InjectLodDeviceUsersObject} An object containing the state and methods.
 */
export function injectLodDeviceUsers() {
  return {
    users: inject('users'),
    loading: inject('loading'),
    remoteAdmin: inject('remoteAdmin'),
    remoteUsers: inject('remoteUsers'),
    importDeviceId: inject('importDeviceId'),
    selectedFacility: inject('selectedFacility'),
    usersBeingImported: inject('usersBeingImported'),
    showCannotRemoveUser: inject('showCannotRemoveUser'),
    importLodMachineService: inject('importLodMachineService'),
    fetchUsers: inject('fetchUsers'),
    removeUser: inject('removeUser'),
    resetShowCannotRemoveUser: inject('resetShowCannotRemoveUser'),
  };
}
