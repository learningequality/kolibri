import { createMachine, assign, send } from 'xstate';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
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
    fullname: event.value.fullname,
    userId: event.value.userId,
    role: event.value.role,
    targetAccount: {
      username: event.value.username,
      password: '',
    },
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
    user => user,
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

const setCurrentUserAsSuperAdmin = assign({
  setAsSuperAdmin: () => true,
});

const setNewSuperAdminId = assign({
  newSuperAdminId: (_, event) => event.value,
});

const setTargetAccount = assign({
  targetAccount: (_, event) => event.value,
});

const setTargetAccountPassword = assign({
  targetAccount: (_, event) => event.value,
});

const setMerging = assign({
  isMerging: () => true,
});

const setSourceFacilityUsers = assign({
  sourceFacilityUsers: (_, event) => event.data,
});

const clearSourceFacilityUsers = assign({
  sourceFacilityUsers: [],
});

const setTaskId = assign({
  taskId: (_, event) => event.value.task_id,
});

const resetTaskId = assign({
  taskId: () => null,
});
const resetMachineContext = assign(() => {
  return generateMachineContext();
});

const pushHistoryItem = assign({
  history: (context, event) => [...context.history, event.value],
});

const removeLastHistoryItem = assign({
  history: context => {
    if (context.history.length) {
      return context.history.slice(0, -1);
    } else {
      return [];
    }
  },
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
    // id of the backend task executing the merging
    taskId: null,
    // whether the migrated user will become a super admin after facility change
    setAsSuperAdmin: false,
    // Contains machine states history, its items are states names.
    // Doesn't necessarily capture all transitions as it is used
    // for user-facing back navigation, therefore we don't want to
    // save  rather internal transitions here.
    //
    // Each state can save itself explicitly to history by calling
    // `send({ type: 'PUSH_HISTORY', value: <stateName> })` action,
    // typically this would happen when moving forward to another
    // state, e.g. in `CONTINUE` transition or similar. This explicitness
    // is intentional to give us more control; for example, we don’t want
    // to push each state name to history as some of them are not-user facing.
    //
    // XState's history node didn't seem to suitable after some
    // first experiments since it requires nested states that we currently
    // don't use and it seems that it's made for a bit different use case
    // (moving to/out nested states and remembering the last children state)
    // than our history.
    history: [],
  };
};

const states = {
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
        actions: [send({ type: 'PUSH_HISTORY', value: 'profile' })],
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
        actions: [send({ type: 'PUSH_HISTORY', value: 'selectFacility' })],
      },
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
        target: 'checkUsernameExists',
        actions: [setMerging, send({ type: 'PUSH_HISTORY', value: 'changeFacility' })],
      },
      CONTINUE: {
        target: 'checkUsernameExists',
        actions: [send({ type: 'PUSH_HISTORY', value: 'changeFacility' })],
      },
    },
  },
  checkUsernameExists: {
    always: [
      {
        cond: context => !!context.accountExists,
        target: 'usernameExists',
      },
      {
        cond: context => context.isMerging,
        target: 'mergeAccounts',
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
        actions: [send({ type: 'PUSH_HISTORY', value: 'confirmAccountUsername' })],
      },
      CONTINUE: {
        target: 'doesTargetRequirePassword',
        actions: [send({ type: 'PUSH_HISTORY', value: 'confirmAccountUsername' })],
      },
    },
  },
  doesTargetRequirePassword: {
    always: [
      {
        cond: context => context.targetFacility.learner_can_login_with_no_password === false,
        target: 'provideTargetAccountPassword',
      },
      {
        target: 'isAdmin',
      },
    ],
  },
  provideTargetAccountPassword: {
    meta: { route: 'TARGET_PASSWORD', path: '/change_facility' },
    on: {
      CONTINUE: {
        target: 'isAdmin',
        actions: [
          setTargetAccountPassword,
          send({ type: 'PUSH_HISTORY', value: 'provideTargetAccountPassword' }),
        ],
      },
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
      src: context => {
        return FacilityUserResource.fetchCollection({
          getParams: { member_of: context.sourceFacility },
          force: true,
        }).then(users => {
          return users;
        });
      },
      onDone: {
        target: 'checkFacilityHasNoMoreUsers',
        actions: [setSourceFacilityUsers],
      },
      onError: {
        target: 'error',
      },
    },
  },
  checkFacilityHasNoMoreUsers: {
    always: [
      {
        cond: context => context.sourceFacilityUsers.length == 1,
        target: 'setCurrentUserToSuperAdmin',
      },
      {
        target: 'checkNeedsNewSuperAdmin',
      },
    ],
  },
  setCurrentUserToSuperAdmin: {
    always: [
      {
        target: 'checkIsMerging',
        actions: [setCurrentUserAsSuperAdmin, clearSourceFacilityUsers],
      },
    ],
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
        // clear source facility users data as soon as it's not needed
        // anymore to prevent high memory consumption as there could
        // be many users
        actions: [clearSourceFacilityUsers, send({ type: 'PUSH_HISTORY', value: 'chooseAdmin' })],
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
      CONTINUE: {
        target: 'syncChangeFacility',
        actions: [send({ type: 'PUSH_HISTORY', value: 'confirmMerge' })],
      },
    },
  },
  syncChangeFacility: {
    meta: { route: 'SYNCING_CHANGE_FACILITY', path: '/change_facility' },
    on: {
      SETTASKID: { actions: setTaskId },
      FINISH: 'syncFinished',
      TASKERROR: { target: 'changeFacility', actions: [resetTaskId] },
    },
  },
  syncFinished: {
    type: 'final',
  },
  createAccount: {
    meta: { route: 'CREATE_ACCOUNT', path: '/change_facility' },
    on: {
      CONTINUE: {
        target: 'isAdmin',
        actions: [setTargetAccount, send({ type: 'PUSH_HISTORY', value: 'createAccount' })],
      },
    },
  },
  usernameExists: {
    meta: { route: 'USERNAME_EXISTS', path: '/change_facility' },
    on: {
      MERGE: [
        {
          cond: context =>
            context.accountExists && !context.targetFacility.learner_can_login_with_no_password,
          target: 'requireAccountCreds',
          actions: [send({ type: 'PUSH_HISTORY', value: 'usernameExists' })],
        },
        {
          cond: context =>
            context.accountExists && context.targetFacility.learner_can_login_with_no_password,
          target: 'getUserWithoutPasswordInfo',
          actions: [send({ type: 'PUSH_HISTORY', value: 'usernameExists' })],
        },
      ],
      NEW: {
        target: 'createAccount',
        actions: [send({ type: 'PUSH_HISTORY', value: 'usernameExists' })],
      },
    },
  },
  requireAccountCreds: {
    meta: { route: 'REQUIRE_ACCOUNT_CREDENTIALS', path: '/change_facility' },
    on: {
      CONTINUE: {
        target: 'confirmAccountDetails',
        actions: [setTargetAccount, send({ type: 'PUSH_HISTORY', value: 'requireAccountCreds' })],
      },
      USEADMIN: {
        target: 'useAdminPassword',
        actions: [send({ type: 'PUSH_HISTORY', value: 'requireAccountCreds' })],
      },
    },
  },
  useAdminPassword: {
    meta: { route: 'ADMIN_PASSWORD', path: '/change_facility' },
    on: {
      CONTINUE: {
        target: 'confirmAccountDetails',
        actions: [setTargetAccount, send({ type: 'PUSH_HISTORY', value: 'useAdminPassword' })],
      },
    },
  },
  confirmAccountDetails: {
    meta: { route: 'CONFIRM_DETAILS', path: '/change_facility' },
    on: {
      CONTINUE: {
        target: 'isAdmin',
        actions: [send({ type: 'PUSH_HISTORY', value: 'confirmAccountDetails' })],
      },
    },
  },
  mergeAccounts: {
    meta: { route: 'MERGE_ACCOUNTS', path: '/change_facility' },
    on: {
      CONTINUE: {
        target: 'requireAccountCreds',
        actions: [setTargetAccount, send({ type: 'PUSH_HISTORY', value: 'mergeAccounts' })],
      },
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
};

export const changeFacilityMachine = createMachine({
  id: 'machine',
  initial: 'selectFacility',
  predictableActionArguments: true,
  context: generateMachineContext(),
  on: {
    PUSH_HISTORY: {
      actions: [pushHistoryItem],
    },
    // Inspired by https://github.com/statelyai/xstate/discussions/1939
    // Generates
    // BACK: [
    //  { target: 'state-1',
    //    cond: context.history[context.history.length - 1] === 'state-1',
    //    actions: [removeLastHistoryItem]
    //  },
    //  { target: 'state-2',
    //    cond: context.history[context.history.length - 1] === 'state-2',
    //    actions: [removeLastHistoryItem]
    //  },
    //  ...
    // ]
    // to keep things DRY, however when compared to defining transitions explicitly,
    // has some disadvantages, e.g. worse state visualization.
    BACK: Object.keys(states).map(state => {
      return {
        target: state,
        cond: context =>
          context.history.length && context.history[context.history.length - 1] === state,
        actions: [removeLastHistoryItem],
      };
    }),
  },
  states,
});
