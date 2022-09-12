import { createMachine, assign } from 'xstate';
import { FacilityUserResource } from 'kolibri.resources';
import {
  default as remoteFacilityUserData,
  remoteFacilityUsers,
} from '../composables/useRemoteFacility';

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
    userId: event.value.userId,
    role: event.value.role,
  };
});

const connectToTargetKolibri = (context, event) => {
  const facility = event.value;
  return remoteFacilityUsers(facility.url, facility.id, context.username).then(users => {
    return { facility: facility, ...users };
  });
};

const getUserWPasswordInfo = context => {
  const facility = context.targetFacility;
  return remoteFacilityUserData(facility.url, facility.id, context.username, null).then(
    user => user
  );
};

const checkExists = assign((context, event) => {
  const filtered = event.data.users.filter(user => user.username === context.username);
  const exists = filtered.length > 0;
  if (!exists) {
    return { accountExists: false };
  }
  return {
    accountExists: true,
    targetFacility: event.data.facility,
    targetAccount: filtered[0],
  };
});

const setNewSuperAdminId = assign({
  newSuperAdminId: (_, event) => event.value,
});

const setTargetAccount = assign({
  targetAccount: (_, event) => event.value,
});

const setMerging = assign({
  isMerging: () => true,
});

const setSourceFacilityUsers = assign({
  sourceFacilityUsers: (_, event) => event.data,
});

const resetMachineContext = assign(() => {
  return generateMachineContext();
});

const generateMachineContext = () => {
  return {
    role: 'learner',
    username: '',
    userId: '',
    targetAccount: {
      username: '',
      password: '',
    },
    sourceFacility: '',
    sourceFacilityUsers: [],
    // should be an object with the target facility
    // `name`, `id`, `url`, `learner_can_sign_up` &
    // `learner_can_login_with_no_password` fields
    targetFacility: {},
    newSuperAdminId: '',
    taskPolling: false,
    accountExists: false,
    isMerging: false,
  };
};

export const changeFacilityMachine = createMachine({
  id: 'machine',
  initial: 'selectFacility',
  predictableActionArguments: true,
  context: generateMachineContext(),
  states: {
    error: {
      on: {
        RESET: {
          target: 'selectFacility',
          actions: [resetMachineContext],
        },
      },
    },
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
            targetFacility: (_, event) => {
              return event.value;
            },
          }),
          target: 'getFacilityUsernames',
        },
      },
    },
    getFacilityUsernames: {
      invoke: {
        id: 'getUserNames',
        src: (context, event) => connectToTargetKolibri(context, event),
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
      meta: { route: 'CONFIRM_CHANGE_FACILITY', path: '/change_facility' },
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
          target: 'confirmAccountUsername',
        },
      ],
    },
    confirmAccountUsername: {
      meta: { route: 'CONFIRM_ACCOUNT_USERNAME', path: '/change_facility' },
      on: {
        NEW: {
          cond: context => context.targetFacility && context.targetFacility.learner_can_sign_up,
          target: 'createAccount',
        },
        CONTINUE: 'isAdmin',
        BACK: 'changeFacility',
      },
    },
    isAdmin: {
      always: [
        {
          cond: context => context.role === 'superuser',
          target: 'fetchSourceFacilityUsers',
        },
        {
          target: 'checkIsMerging',
        },
      ],
    },
    fetchSourceFacilityUsers: {
      invoke: {
        src: () => {
          return FacilityUserResource.fetchCollection().then(users => {
            return users;
          });
        },
        onDone: {
          target: 'checkNeedsNewSuperAdmin',
          actions: [setSourceFacilityUsers],
        },
        onError: {
          target: 'error',
        },
      },
    },
    checkNeedsNewSuperAdmin: {
      always: [
        {
          cond: context => {
            const facilityHasAnotherSuperUser =
              context.sourceFacilityUsers.length > 0 &&
              context.sourceFacilityUsers.find(u => u.id !== context.userId && u.is_superuser);
            return context.role === 'superuser' && !facilityHasAnotherSuperUser;
          },
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
          cond: context => !!context.newSuperAdminId,
        },
        SELECTNEWSUPERADMIN: { actions: setNewSuperAdminId },
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
        BACK: [
          {
            cond: context => context.role === 'superuser',
            target: 'chooseAdmin',
          },
          {
            target: 'confirmAccountDetails',
          },
        ],
      },
    },
    syncChangeFacility: {
      meta: { route: 'SYNCING_CHANGE_FACILITY', path: '/change_facility' },
      type: 'final',
    },
    createAccount: {
      meta: { route: 'CREATE_ACCOUNT', path: '/change_facility' },
      on: {
        CONTINUE: {
          target: 'isAdmin',
          actions: setTargetAccount,
        },
        BACK: [
          {
            cond: context => context.accountExists,
            target: 'changeFacility',
          },
          {
            target: 'confirmAccountUsername',
          },
        ],
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
        CONTINUE: { actions: setTargetAccount, target: 'confirmAccountDetails' },
        USEADMIN: 'useAdminPassword',
        BACK: 'confirmMerge',
      },
    },
    useAdminPassword: {
      meta: { route: 'ADMIN_PASSWORD', path: '/change_facility' },
      on: {
        CONTINUE: { actions: setTargetAccount, target: 'confirmAccountDetails' },
        BACK: 'requireAccountCreds',
      },
    },
    confirmAccountDetails: {
      meta: { route: 'CONFIRM_DETAILS', path: '/change_facility' },
      on: {
        CONTINUE: 'isAdmin',
        BACK: 'mergeAccounts',
      },
    },
    mergeAccounts: {
      meta: { route: 'MERGE_ACCOUNTS', path: '/change_facility' },
      on: {
        CONTINUE: [
          {
            cond: context =>
              context.accountExists && !context.targetFacility.learner_can_login_with_no_password,
            target: 'requireAccountCreds',
          },
          {
            cond: context =>
              context.accountExists && context.targetFacility.learner_can_login_with_no_password,
            target: 'getUserWithoutPasswordInfo',
          },
        ],
        BACK: 'selectFacility',
      },
    },
    getUserWithoutPasswordInfo: {
      invoke: {
        id: 'getPasswordlessUserInfo',
        src: (context, event) => getUserWPasswordInfo(context, event),
        onDone: {
          target: 'confirmAccountDetails',
          actions: assign({
            targetAccount: (_, event) => {
              return event.data;
            },
          }),
        },
        onError: {
          target: 'mergeAccounts',
        },
      },
    },
  },
});
