import { createMachine, send, assign } from 'xstate';
import uniq from 'lodash/uniq';

import { LodTypePresets } from 'kolibri/constants';

// Will require a PREVIOUS_STEP event to go back to the previous step (if needed)

const getInitialContext = () => ({
  lodImportOrJoin: null,
  importDeviceId: null,
  selectedFacility: null,
  importDevice: null,
  facilitiesOnDeviceCount: null,
  remoteUsers: [],
  remoteAdmin: {},
  importedUsers: [],
  usersBeingImported: [],
  firstImportedLodUser: null,
});

/**
 * Machine to handle the import of users in a LOD device.
 * This machine could be used as a stand alone machine or as a sub-machine of another machine:
 * * If you want to use it as a stand alone machine, please use the
 *   `getImportLodUsersMachine` function.
 * * If you want to use it as a sub-machine, please use the `getImportLodUsersDefinition` object.
 *   And then map the `initial`, `state`, and `on` properties to the parent sub-state, the
 *   `actions` and `context` properties to the parent machine actions and context properties.
 *   As a sub-machine, this machine will send the following events to the parent machine:
 *   * PREVIOUS_STATE: When the user wants to go back to state previous to this machine.
 *   * IMPORT_USER: When an user is being imported.
 */
export const getImportLodUsersDefinition = () => ({
  id: 'importLodUsers',
  initial: 'selectLodSetupType',
  context: getInitialContext(),
  predictableActionArguments: true,
  states: {
    selectLodSetupType: {
      id: 'selectLodSetupType',
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
          actions: ['setRemoteUsers', 'setRemoteAdmin'],
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
        SIGN_IN_INSTEAD: {
          target: 'lodProceedJoinOrNew',
          actions: ['setLodType', 'setSelectedImportDeviceFacility'],
        },
      },
    },

    finish: {
      type: 'final',
    },
  },
  // Listener on the lod import state; typically this would be above `states` but
  // putting it here flows more with the above as this is the state after the final step
  on: {
    RESET_IMPORT: '#selectLodSetupType',
    ADD_IMPORTED_USER: { actions: 'addImportedUser' },
    SET_FIRST_LOD: { actions: 'setFirstLodUser' },
    REMOVE_USER_BEING_IMPORTED: { actions: 'removeUserBeingImported' },
    ADD_USER_BEING_IMPORTED: { actions: 'addUserBeingImported' },
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
      // TODO: this importDevice and importDeviceId could be managed in a single state
      importDevice: (_, event) => {
        return event.value.importDevice;
      },
      facilitiesOnDeviceCount: (_, event) => {
        return event.value.facilitiesCount;
      },
      importDeviceId: (_, event) => {
        return event.value.importDevice.id;
      },
    }),
    setRemoteUsers: assign({
      remoteUsers: (_, event) => event.value.users,
    }),
    setRemoteAdmin: assign({
      // Used when setting the Admin user for multiple import
      remoteAdmin: (_, event) => {
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
      importedUsers: (ctx, event) => uniq([...ctx.importedUsers, event.value]),
    }),
    // TODO: There are a lot of logic and several actions of the original wizard machine
    // that does pretty much the same thing. This could be refactored to abstract actions
    // managed just in terms of "users being imported" and "imported users".
    setFirstLodUser: assign({
      firstImportedLodUser: (_, event) => event.value,
    }),
    addUserBeingImported: assign({
      usersBeingImported: (ctx, event) => uniq([...ctx.usersBeingImported, event.value]),
    }),
    removeUserBeingImported: assign({
      usersBeingImported: (ctx, event) => {
        return ctx.usersBeingImported.filter(u => u.id !== event.value);
      },
    }),
  },
});

export const getImportLodUsersMachine = () => {
  const { actions, ...machine } = getImportLodUsersDefinition();
  return createMachine(machine, { actions });
};
