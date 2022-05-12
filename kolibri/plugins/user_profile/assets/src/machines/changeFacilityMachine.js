import { createMachine, assign } from 'xstate';
// This machine can be visualized and tested at https://stately.ai/viz/c1316a38-033d-4c57-8d9f-e282310e341d
/* SETCONTEXT event example:
{
	"type": "SETCONTEXT",
	"value": {
		"facility": "fac1",
		"username": "username1",
		"role": "learner"
	}
}
SELECTFACILITY event example:
  {
      "type": "SELECTFACILITY",
      "value": {
          "name": "fac2",
          "url": "http...",
          "id": "ca88.."
      }
  }
*/
const setInitialContext = assign((_, event) => {
  return {
    sourceFacility: event.value.facility,
    username: event.value.username,
    role: event.value.role,
  };
});

const connectToTargetKolibri = event => {
  const facility = event.value;
  return new Promise(function(resolve) {
    setTimeout(
      () => {
        return resolve({
          facility: facility,
          users: [
            { id: 1, username: 'username1' },
            { id: 2, username: 'username2' },
          ],
        });
      },
      1000,
      facility
    );
  });
};

const checkExists = assign((context, event) => {
  const filtered = event.data.users.filter(user => user.username === context.username);
  const exists = filtered.length > 0;
  return {
    accountExists: exists,
    targetFacility: event.data.facility,
    targetAccount: filtered[0],
  };
});

const setNewSuperAdmin = assign({
  newSuperAdmin: (_, event) => event.value,
});

const setTargetAccount = assign({
  targetAccount: (_, event) => event.value,
});

const setMerging = assign({
  isMerging: () => true,
});

const saveAccountDetails = () => {
  // to be done
};

export const changeFacilityMachine = createMachine({
  id: 'machine',
  initial: 'selectFacility',
  context: {
    role: 'learner',
    username: '',
    targetAccount: { username: '', id: '' },
    sourceFacility: '',
    targetFacility: {}, //should be an object with the facility name, id & url
    newSuperAdmin: '',
    taskPolling: false,
    accountExists: false,
    isMerging: false,
  },
  states: {
    profile: {
      meta: { route: 'PROFILE', path: '/' },
      on: {
        CONTINUE: {
          target: 'selectFacility',
          cond: context => !!context.sourceFacility && !!context.username,
        },
        SETCONTEXT: { actions: setInitialContext },
      },
    },
    selectFacility: {
      meta: { route: 'SELECT_FACILITY', path: '/change_facility' },
      on: {
        CONTINUE: {
          target: 'changeFacility',
          cond: context => Object.keys(context.targetFacility).length > 0,
        },
        BACK: 'profile',
        SETCONTEXT: { actions: setInitialContext },
        SELECTFACILITY: {
          actions: assign({
            targetFacility: () => {
              return {};
            },
          }),
          target: 'getFacilityUsernames',
        },
      },
    },
    getFacilityUsernames: {
      invoke: {
        id: 'getUserNames',
        src: (context, event) => connectToTargetKolibri(event),
        onDone: {
          target: 'selectFacility',
          actions: checkExists,
        },
        onError: {
          target: 'selectFacility',
        },
      },
    },
    changeFacility: {
      meta: { route: 'CHANGE_FACILITY', path: '/change_facility' },
      on: {
        MERGE: {
          target: 'mergeAccounts',
          actions: setMerging,
        },
        CONTINUE: 'checkUsernameExists',
        BACK: 'selectFacility',
      },
    },
    checkUsernameExists: {
      always: [
        {
          cond: context => !!context.accountExists,
          target: 'usernameExists',
          actions: setMerging,
        },
        {
          target: 'confirmAccount',
        },
      ],
    },
    confirmAccount: {
      meta: { route: 'CONFIRM_ACCOUNT', path: '/change_facility' },
      on: {
        NEW: 'createAccount',
        CONTINUE: 'isAdmin',
        BACK: 'changeFacility',
      },
    },
    isAdmin: {
      always: [
        {
          cond: context => context.role === 'superadmin',
          target: 'chooseAdmin',
        },
        {
          target: 'checkIsMerging',
        },
      ],
    },
    chooseAdmin: {
      meta: { route: 'CHOOSE_ADMIN', path: '/change_facility' },
      on: {
        CONTINUE: {
          target: 'checkIsMerging',
          cond: context => !!context.newSuperAdmin,
        },
        SELECTNEWSUPERADMIN: { actions: setNewSuperAdmin },
        BACK: 'confirmAccount',
      },
    },
    checkIsMerging: {
      always: [
        {
          cond: context => context.isMerging,
          target: 'confirmMerge',
        },
        {
          target: 'syncChangeFacility',
        },
      ],
    },
    confirmMerge: {
      meta: { route: 'CONFIRM_MERGE', path: '/change_facility' },
      on: {
        CONTINUE: 'syncChangeFacility',
        BACK: 'changeFacility',
      },
    },
    syncChangeFacility: {
      meta: { route: 'SYNCING_CHANGE_FACILITY', path: '/change_facility' },
      type: 'final',
    },
    createAccount: {
      on: {
        meta: { route: 'CREATE_ACCOUNT', path: '/change_facility' },
        CONTINUE: {
          // event.value must be an object {id:, usename:}
          target: 'isAdmin',
          actions: setTargetAccount,
        },
        BACK: 'changeFacility',
        BACKMERGING: 'confirmMerge',
      },
    },
    usernameExists: {
      meta: { route: 'USERNAME_EXISTS', path: '/change_facility' },
      on: {
        MERGE: 'requireAccountCreds',
        NEW: 'createAccount',
        BACK: 'selectFacility',
      },
    },
    requireAccountCreds: {
      meta: { route: 'REQUIRE_ACCOUNT_CREDENTIALS', path: '/change_facility' },
      on: {
        CONTINUE: 'showAccounts',
        USEADMIN: 'useAdminPassword',
        BACK: 'confirmMerge',
      },
    },
    useAdminPassword: {
      meta: { route: 'ADMIN_PASSWORD', path: '/change_facility' },
      on: {
        CONTINUE: 'showAccounts',
        BACK: 'requireAccountCreds',
      },
    },
    showAccounts: {
      meta: { route: 'SHOW_ACCOUNTS', path: '/change_facility' },
      on: {
        CONTINUE: 'confirmAccountDetails',
        BACK: 'requireAccountCreds',
      },
    },
    confirmAccountDetails: {
      meta: { route: 'CONFIRM_DETAILS', path: '/change_facility' },
      on: {
        CONTINUE: 'isAdmin',
        EDITDETAILS: 'editAccountDetails',
        BACK: 'showAccounts',
      },
    },
    editAccountDetails: {
      meta: { route: 'EDIT_DETAILS', path: '/change_facility' },
      on: {
        SAVE: { actions: saveAccountDetails },
        BACK: 'confirmAccountDetails',
      },
    },
    mergeAccounts: {
      meta: { route: 'MERGE_ACCOUNTS', path: '/change_facility' },
      on: {
        CONTINUE: 'requireAccountCreds',
        BACK: 'selectFacility',
      },
    },
  },
});
