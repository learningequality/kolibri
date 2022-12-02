import { assign, createMachine } from 'xstate';
import { checkCapability } from 'kolibri.utils.appCapabilities';
import { DeviceTypePresets, FacilityTypePresets, UsePresets } from '../constants';

console.log(checkCapability('get_os_user'));

const isOnMyOwnOrGroup = context => {
  return context.onMyOwnOrGroup === UsePresets.ON_MY_OWN;
};

const isGroupSetup = context => {
  return context.onMyOwnOrGroup === UsePresets.GROUP;
};

const canGetOsUser = () => checkCapability('get_os_user');

const isNewFacility = context => {
  return context.facilityNewOrImport === FacilityTypePresets.NEW;
};

const isImportFacility = context => {
  return context.facilityNewOrImport === FacilityTypePresets.IMPORT;
};

const isLodSetup = context => {
  return context.fullOrLOD === DeviceTypePresets.LOD;
};

const isFullSetup = context => {
  return context.fullOrLOD === DeviceTypePresets.FULL;
};

const setOnMyOwnOrGroup = assign({
  onMyOwnOrGroup: (_, event) => event.value,
});

const setDeviceName = assign({
  deviceName: (_, event) => event.value,
});

const setFullOrLOD = assign({
  fullOrLOD: (_, event) => event.value,
});

const setCanGetOsUser = assign({
  canGetOsUser: (_, event) => event.value,
});

const setFacilityNewOrImport = assign({
  facilityNewOrImport: (_, event) => {
    return event.value.importOrNew;
  },
  importDeviceId: (_, event) => {
    return event.value.importDeviceId;
  },
});

const setSelectedImportDeviceFacility = assign({
  selectedFacility: (_, event) => {
    return event.value.selectedFacility;
  },
  importDevice: (_, event) => {
    return event.value.importDevice;
  },
});

const clearSelectedSetupType = assign({
  facilityNewOrImport: () => null,
});

const revertFullDeviceImport = assign({
  selectedFacility: () => null,
  importDeviceId: () => null,
});

const setFormalOrNonformal = assign({
  formalOrNonformal: (_, event) => event.value,
});

const setGuestAccess = assign({
  guestAccess: (_, event) => event.value,
});

const setCreateLearnerAccount = assign({
  createLearnerAccount: (_, event) => event.value,
});

const setRequirePassword = assign({
  requirePassword: (_, event) => event.value,
});

const initialContext = {
  onMyOwnOrGroup: null,
  facilityNewOrImport: null,
  fullOrLOD: null,
  deviceName: 'default-device-name',
  formalOrNonformal: null,
  guestAccess: null,
  createLearnerAccount: null,
  requirePassword: null,
  selectedFacility: null,
  importDeviceId: null,
  importDevice: null,
};

console.log(initialContext);

/**
 * Assigns the machine to have the initial context again while maintaining the value of
 * canGetOsUser.
 *
 * This effectively resets the machine's state
 */
const resetContext = assign(initialContext);

export const wizardMachine = createMachine({
  id: 'wizard',
  initial: 'initializeContext',
  context: initialContext,
  on: {
    START_OVER: { target: 'howAreYouUsingKolibri', action: resetContext },
  },
  states: {
    // This state will be the start so the machine won't progress until the canGetOsUser is set
    initializeContext: {
      on: {
        CONTINUE: { target: 'howAreYouUsingKolibri', actions: setCanGetOsUser },
      },
    },
    // Initial step where user selects between "On my own" or "Group learning"
    howAreYouUsingKolibri: {
      meta: { route: { name: 'HOW_ARE_YOU_USING_KOLIBRI', path: '/' } },
      on: {
        CONTINUE: { target: 'onMyOwnOrGroupSetup', actions: setOnMyOwnOrGroup },
      },
    },
    // A passthrough step depending on the value of context.onMyOwnOrGroup
    onMyOwnOrGroupSetup: {
      always: [
        {
          cond: isOnMyOwnOrGroup,
          target: 'defaultLanguage',
        },
        {
          cond: isGroupSetup,
          target: 'deviceName',
        },
      ],
    },

    // The On My Own path
    defaultLanguage: {
      meta: { route: { name: 'DEFAULT_LANGUAGE', path: 'default-language' } },
      on: {
        CONTINUE: 'createAccountOrFinalizeSetup',
        BACK: 'howAreYouUsingKolibri',
      },
    },
    // A passthrough step depending on the value of context.canGetOsUser
    createAccountOrFinalizeSetup: {
      always: [
        {
          cond: canGetOsUser,
          target: 'finalizeSetup',
        },
        {
          target: 'createOnMyOwnAccount',
        },
      ],
    },

    createOnMyOwnAccount: {
      meta: { route: { name: 'CREATE_SUPERUSER_AND_FACILITY', path: 'create-account' } },
      on: {
        CONTINUE: 'finalizeSetup',
        BACK: 'defaultLanguage',
      },
    },

    // The Group path
    deviceName: {
      meta: { route: { name: 'DEVICE_NAME', path: 'device-name' } },
      on: {
        CONTINUE: { target: 'fullOrLearnOnlyDevice', actions: setDeviceName },
        BACK: 'howAreYouUsingKolibri',
      },
    },
    fullOrLearnOnlyDevice: {
      meta: { route: { name: 'FULL_OR_LOD', path: 'full-or-lod' } },
      on: {
        CONTINUE: { target: 'fullOrLodSetup', actions: setFullOrLOD },
        BACK: 'deviceName',
      },
    },

    // A passthrough step depending on the value of context.fullOrLOD
    // that either continues along with full device setup, or into the Lod setup
    fullOrLodSetup: {
      always: [
        {
          cond: isLodSetup,
          target: 'importLodUsers',
        },
        {
          cond: isFullSetup,
          target: 'fullDeviceNewOrImportFacility',
        },
      ],
    },

    // Full Device Path
    fullDeviceNewOrImportFacility: {
      meta: { route: { name: 'FULL_NEW_OR_IMPORT_FACILITY' } },
      on: {
        // FIXME: The component for this step needs to send a value to the machine when making
        // this transition that is 'new' or 'import'
        CONTINUE: { target: 'facilitySetupType', actions: setFacilityNewOrImport },
        BACK: 'fullOrLearnOnlyDevice',
      },
    },

    // A passthrough step depending on whether the user is creating a new facility or importing
    facilitySetupType: {
      always: [
        {
          cond: isNewFacility,
          target: 'setFacilityPermissions',
        },
        {
          cond: isImportFacility,
          target: 'importFacility',
        },
      ],
    },

    // Facility Creation Path
    setFacilityPermissions: {
      meta: { route: { name: 'FACILITY_PERMISSIONS' } },
      on: {
        CONTINUE: { target: 'guestAccess', actions: setFormalOrNonformal },
        BACK: 'fullDeviceNewOrImportFacility',
      },
    },
    guestAccess: {
      meta: { route: { name: 'GUEST_ACCESS' } },
      on: {
        CONTINUE: { target: 'createLearnerAccount', actions: setGuestAccess },
        BACK: 'setFacilityPermissions',
      },
    },
    createLearnerAccount: {
      meta: { route: { name: 'CREATE_LEARNER_ACCOUNT' } },
      on: {
        CONTINUE: { target: 'requirePassword', action: setCreateLearnerAccount },
        BACK: 'guestAccess',
      },
    },
    requirePassword: {
      meta: { route: { name: 'REQUIRE_PASSWORD' } },
      on: {
        CONTINUE: { target: 'personalDataConsent', action: setRequirePassword },
        BACK: 'createLearnerAccount',
      },
    },
    personalDataConsent: {
      /**
       * nextEvent here is used to provide the Vue component what command it is expected to send
       * in this particular case
       **/
      meta: { route: { name: 'PERSONAL_DATA_CONSENT' }, nextEvent: 'CONTINUE' },
      on: {
        CONTINUE: 'createSuperuserAndFacility',
        BACK: 'requirePassword',
      },
    },
    // A passthrough step depending on the value of context.canGetOsUser -- the finalizeSetup state
    // will provision the device with the OS user and create the default facility
    createSuperuserAndFacility: {
      always: [
        {
          cond: canGetOsUser,
          target: 'finalizeSetup',
        },
        {
          target: 'createSuperuserAndFacilityForm',
        },
      ],
    },

    // If we're not able to get an OS user, the user creates their account
    createSuperuserAndFacilityForm: {
      meta: { route: { name: 'CREATE_SUPERUSER_AND_FACILITY', path: 'create-account' } },
      on: {
        CONTINUE: 'finalizeSetup',
        BACK: 'personalDataConsent',
      },
    },

    // It's own little baby state machine
    importFacility: {
      initial: 'selectFacilityForm',
      states: {
        selectFacilityForm: {
          meta: { step: 1, route: { name: 'SELECT_FACILITY_FOR_IMPORT' } },
          on: {
            BACK: { target: '..fullDeviceNewOrImportFacility', actions: clearSelectedSetupType },
            CONTINUE: { target: 'importAuthentication', actions: setSelectedImportDeviceFacility },
          },
        },
        importAuthentication: {
          meta: { step: 2, route: { name: 'IMPORT_AUTHENTICATION' } },
          on: {
            BACK: { target: 'selectFacilityForm', actions: revertFullDeviceImport },
            // THE POINT OF NO RETURN
            CONTINUE: { target: 'loadingTaskPage' },
          },
        },
        loadingTaskPage: {
          meta: { step: 3, route: { name: 'IMPORT_LOADING' } },
          on: {
            CONTINUE: 'selectSuperAdminAccountForm',
          },
        },
        selectSuperAdminAccountForm: {
          meta: { step: 4, route: { name: 'SELECT_ADMIN' } },
          on: {
            CONTINUE: { target: 'personalDataConsentForm', nextEvent: 'FINISH' },
          },
        },
        personalDataConsentForm: {
          meta: { step: 5, route: { name: 'IMPORT_DATA_CONSENT' }, nextEvent: 'FINISH' },
        },
      },
      // Listener on the importFacility state; typically this would be above `states` but
      // putting it here flows more with the above as this is the state after the final step
      on: {
        FINISH: 'finalizeSetup',
      },
    },

    // Lod Path - the lodMachine is imported, interpreted and managed in the Lod Setup component
    // This means that
    importLodUsers: {
      meta: { route: { name: 'IMPORT_LOD' } },
      on: {
        BACK: 'fullOrLearnOnlyDevice',
      },
    },

    // This is a dead-end where the router will send the user where they need to go
    finalizeSetup: {
      meta: { route: { name: 'FINALIZE_SETUP' } },
    },
  },
});
