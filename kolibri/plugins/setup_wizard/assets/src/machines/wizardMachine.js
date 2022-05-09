import { assign, createMachine, interpret } from 'xstate';

const isIndividualSetup = context => {
  return context.individualOrGroup === 'individual';
};

const isGroupSetup = context => {
  return context.individualOrGroup === 'group';
};

const isAppContext = context => {
  return context.appContext;
};

const isNewFacility = context => {
  return context.facilityNewOrImport === 'new';
};

const isImportFacility = context => {
  return context.facilityNewOrImport === 'import';
};

const isLodSetup = context => {
  return context.setupType === 'lod';
};

const isFullSetup = context => {
  return context.setupType === 'full';
};

const setIndividualOrGroup = assign({
  individualOrGroup: (_, event) => event.value,
});

const setSetupType = assign({
  setupType: (_, event) => event.value,
});

const setAppContext = assign({
  isAppContext: (_, event) => event.value,
});

const setFacilityNewOrImport = assign({
  facilityNewOrImport: (_, event) => event.value,
});

export const wizardMachine = createMachine({
  id: 'wizard',
  initial: 'initializeContext',
  context: {
    individualOrGroup: null,
    isAppContext: false, // Must be set in the component where the machine is used
    facilityNewOrImport: null,
    setupType: null,
  },
  states: {
    // This state will be the start so the machine won't progress until the isAppContext is set
    initializeContext: {
      on: {
        CONTINUE: { target: 'howAreYouUsingKolibri', actions: setAppContext },
      },
    },
    // Initial step where user selects between "On my own" (individual) or "Group learning" (group)
    howAreYouUsingKolibri: {
      meta: { route: 'HOW_ARE_YOU_USING_KOLIBRI', path: '/' },
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
      meta: { route: 'DEFAULT_LANGUAGE' },
      on: {
        CONTINUE: 'createAccountOrFinalizeSetup',
        BACK: 'howAreYouUsingKolibri',
      },
    },
    // A passthrough step depending on the value of context.isAppContext
    createAccountOrFinalizeSetup: {
      always: [
        {
          // FIXME: The app needs to create a user account from the OS user in this case - to be
          // handled on the backend most likely, but just bear this in mind for now to be sure
          cond: isAppContext,
          target: 'finalizeSetup',
        },
        {
          target: 'createIndividualAccount',
        },
      ],
    },
    createIndividualAccount: {
      meta: { route: 'CREATE_INDIVIDUAL_ACCOUNT' },
      on: {
        CONTINUE: 'finalizeSetup',
        BACK: 'defaultLanguage',
      },
    },

    // The Group path
    deviceName: {
      meta: { route: 'DEVICE_NAME', path: '/' },
      on: {
        CONTINUE: { target: 'fullOrLearnOnlyDevice', actions: setIndividualOrGroup },
        BACK: 'howAreYouUsingKolibri',
      },
    },
    fullOrLearnOnlyDevice: {
      meta: { route: 'FULL_OR_LOD' },
      on: {
        CONTINUE: { target: 'fullOrLodSetup', actions: setSetupType },
        BACK: 'deviceName',
      },
    },

    // A passthrough step depending on the value of context.setupType
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
      meta: { route: 'FULL_NEW_OR_IMPORT_FACILITY' },
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
          target: 'createFacility',
        },
        {
          cond: isImportFacility,
          target: 'importFacility',
        },
      ],
    },
    createFacility: {
      meta: { route: 'CREATE_FACILITY/1' },
      CONTINUE: 'quickOrAdvanced',
      on: {
        BACK: 'fullDeviceNewOrImportFacility',
      },
    },
    importFacility: {
      meta: { route: 'IMPORT_FACILITY' },
      on: {
        BACK: 'fullDeviceNewOrImportFacility',
      },
    },

    // Lod Path - the lodMachine is imported, interpreted and managed in the Lod Setup component
    // This means that
    importLodUsers: {
      meta: { route: 'IMPORT_LOD' },
      on: {
        BACK: 'fullOrLearnOnlyDevice',
      },
    },

    // This is a dead-end where the router will send the user where they need to go
    finalizeSetup: {
      meta: { route: 'FINALIZE_SETUP' },
    },
  },
});

// Dump the machine to console in dev mode (for now anyway)
if (process.env.NODE_ENV === 'development') {
  console.log('=== wizardMachine ===');
  console.log(
    'Save the following function as an object, call it and pass an object with initial context ala',
    ' { isAppContext: Boolean } - the rest of the context should be set through events.\n',
    'Usage (assuming you saved to `temp1`):\n',
    'let machine = temp1({ isAppContext: true });\n',
    "machine.send({ type: 'CONTINUE', value: 'individual'});\n"
  );
  console.log((context = {}) => interpret(wizardMachine.withContext(context)).start());
}
