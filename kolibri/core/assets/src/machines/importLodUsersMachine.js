import { createMachine, send, assign } from 'xstate';
import uniq from 'lodash/uniq';

import { LodTypePresets } from 'kolibri.coreVue.vuex.constants';

// Will require a PREVIOUS_STEP event to go back to the previous step (if needed)

const initialContext = {
  lodImportOrJoin: null,
  importDeviceId: null,
  selectedFacility: null,
  importDevice: null,
  facilitiesOnDeviceCount: null,
  remoteUsers: [],
  lodAdmin: {},
  importedUsers: [],
  firstImportedLodUser: null,
};

export const importLodUsersDefinition = {
  id: 'importLodUsers',
  initial: 'selectLodSetupType',
  context: initialContext,
  predictableActionArguments: true,
  states: {
    selectLodSetupType: {
      meta: { route: { name: 'LOD_SETUP_TYPE' } },
      on: {
        BACK: {
          actions: send('PREVIOUS_STATE'),
        },
        CONTINUE: {
          target: 'selectLodFacility',
          actions: 'setLodType',
        },
      },
    },

    selectLodFacility: {
      meta: { route: { name: 'LOD_SELECT_FACILITY' } },
      on: {
        BACK: 'selectLodSetupType',
        CONTINUE: {
          target: 'lodProceedJoinOrNew',
          actions: 'setSelectedImportDeviceFacility',
        },
      },
    },

    lodProceedJoinOrNew: {
      always: [
        {
          cond: ctx => ctx.lodImportOrJoin === LodTypePresets.JOIN,
          target: 'lodJoinFacility',
        },
        {
          target: 'lodImportUserAuth',
        },
      ],
    },

    // IMPORT
    lodImportUserAuth: {
      meta: { route: { name: 'LOD_IMPORT_USER_AUTH' } },
      on: {
        BACK: 'selectLodSetupType',
        CONTINUE: { target: 'lodLoading', actions: 'importUser' },
        CONTINUEADMIN: {
          target: 'lodImportAsAdmin',
          actions: ['setRemoteUsers', 'setLodAdmin'],
        },
      },
    },

    lodLoading: {
      meta: { route: { name: 'LOD_LOADING_TASK_PAGE' } },
      on: {
        IMPORT_ANOTHER: 'lodImportUserAuth',
        // Otherwise send FINISH, which is handled at the root of this sub-machine
      },
    },

    lodImportAsAdmin: {
      meta: { route: { name: 'LOD_IMPORT_AS_ADMIN' } },
      on: {
        BACK: 'lodImportUserAuth',
        LOADING: 'lodLoading',
      },
    },

    // JOIN
    lodJoinLoading: {
      meta: { route: { name: 'LOD_JOIN_LOADING_TASK_PAGE' } },
      on: {
        IMPORT_ANOTHER: 'lodImportUserAuth',
      },
    },

    lodJoinFacility: {
      meta: { route: { name: 'LOD_CREATE_USER_FORM' } },
      on: {
        BACK: 'selectLodSetupType',
        CONTINUE: 'lodJoinLoading',
      },
    },

    finish: {
      type: 'final',
    },
  },
  // Listener on the lod import state; typically this would be above `states` but
  // putting it here flows more with the above as this is the state after the final step
  on: {
    ADD_IMPORTED_USER: { actions: 'addImportedUser' },
    SET_FIRST_LOD: { actions: 'setFirstLodUser' },
    FINISH: 'finish',
  },
  actions: {
    setLodType: assign({
      lodImportOrJoin: (_, event) => event.value.importOrJoin,
      importDeviceId: (_, event) => event.value.importDeviceId,
    }),
    setSelectedImportDeviceFacility: assign({
      selectedFacility: (_, event) => {
        return event.value.selectedFacility;
      },
      importDevice: (_, event) => {
        return event.value.importDevice;
      },
      facilitiesOnDeviceCount: (_, event) => {
        return event.value.facilitiesCount;
      },
    }),
    setRemoteUsers: assign({
      remoteUsers: (_, event) => event.value.users,
    }),
    setLodAdmin: assign({
      // Used when setting the Admin user for multiple import
      lodAdmin: (_, event) => {
        return {
          username: event.value.adminUsername,
          password: event.value.adminPassword,
          id: event.value.id,
        };
      },
    }),
    importUser: send((_, event) => ({
      type: 'IMPORT_USER',
      value: event.value,
    })),
    addImportedUser: assign({
      importedUsers: (ctx, event) => {
        const users = ctx.importedUsers;
        users.push(event.value);
        return uniq(users);
      },
    }),
    setFirstLodUser: assign({
      firstImportedLodUser: (_, event) => event.value,
    }),
  },
};

export const getImportLodUsersMachine = () => {
  const { actions, ...machine } = importLodUsersDefinition;
  return createMachine(machine, { actions });
};
