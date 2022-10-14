import { assign, createMachine, interpret } from 'xstate';
import reduce from 'lodash/reduce';

const isIndividualSetup = context => {
  return context.individualOrGroup === 'individual';
};

const isGroupSetup = context => {
  return context.individualOrGroup === 'group';
};

const canGetOsUser = context => {
  return context.canGetOsUser;
};

const isNewFacility = context => {
  return context.facilityNewOrImport === 'NEW';
};

const isImportFacility = context => {
  return context.facilityNewOrImport === 'IMPORT';
};

const isLodSetup = context => {
  return context.fullOrLOD === 'LOD';
};

const isFullSetup = context => {
  return context.fullOrLOD === 'FULL';
};

const setIndividualOrGroup = assign({
  individualOrGroup: (_, event) => event.value,
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
  facilityNewOrImport: (_, event) => event.value,
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
  individualOrGroup: null,
  canGetOsUser: false, // Must be set in the component where the machine is used
  facilityNewOrImport: null,
  fullOrLOD: null,
  deviceName: null,
  formalOrNonformal: null,
  guestAccess: null,
  createLearnerAccount: null,
  requirePassword: null,
};

/**
 * Assigns the machine to have the initial context again while maintaining the value of
 * canGetOsUser.
 *
 * This effectively resets the machine's state
 */
const resetContext = assign({
  ...reduce(
    initialContext,
    (result, value, key) => {
      if (key === 'canGetOsUser') {
        // This won't change because of starting over
        result[key] = context => context.canGetOsUser;
      } else {
        result[key] = () => value;
      }
      return result;
    },
    {}
  ),
});

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
    // Initial step where user selects between "On my own" (individual) or "Group learning" (group)
    howAreYouUsingKolibri: {
      meta: { route: { name: 'HOW_ARE_YOU_USING_KOLIBRI', path: '/' } },
      on: {
        CONTINUE: { target: 'individualOrGroupSetup', actions: setIndividualOrGroup },
      },
    },
    // A passthrough step depending on the value of context.individualOrGroup
    individualOrGroupSetup: {
      always: [
        {
          cond: isIndividualSetup,
          target: 'defaultLanguage',
        },
        {
          cond: isGroupSetup,
          target: 'deviceName',
        },
      ],
    },

    // The Individual path
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
          target: 'createIndividualAccount',
        },
      ],
    },

    createIndividualAccount: {
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
      meta: { route: { name: 'PERSONAL_DATA_CONSENT' } },
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

    importFacility: {
      meta: { route: { name: 'IMPORT_FACILITY' } },
      on: {
        BACK: 'fullDeviceNewOrImportFacility',
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

// Dump the machine to console in dev mode (for now anyway)
if (process.env.NODE_ENV === 'development') {
  console.log('=== wizardMachine ===');
  console.log(
    'Save the following function as an object, call it and pass an object with initial context ala',
    ' { canGetOsUser: Boolean } - the rest of the context should be set through events.\n',
    'Usage (assuming you saved to `temp1`):\n',
    'let machine = temp1({ canGetOsUser: true });\n',
    "machine.send({ type: 'CONTINUE', value: 'individual'});\n"
  );
  console.log((context = {}) => interpret(wizardMachine.withContext(context)).start());
}
