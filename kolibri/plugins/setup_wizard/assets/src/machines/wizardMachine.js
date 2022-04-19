import { createMachine, assign } from 'xstate';

const isQuick = context => {
  return context.quick;
};

const isNewFacility = context => {
  return context.setupType === 'new';
};

const isLODSetup = context => {
  return context.setupType === 'lod';
};

const setQuick = assign({
  quick: (_, event) => event.value,
});

const setSetupType = assign({
  setupType: (_, event) => event.value,
});

export const wizardMachine = createMachine({
  id: 'wizard',
  initial: 'defaultLanguage',
  context: {
    quick: true,
    setupType: false,
  },
  states: {
    defaultLanguage: {
      meta: { route: 'DEFAULT_LANGUAGE', path: '/' },
      on: {
        CONTINUE: 'gettingStarted',
      },
    },
    gettingStarted: {
      meta: { route: 'GETTING_STARTED', path: '/' },
      on: {
        CONTINUE: { target: 'quickOrAdvanced', actions: setQuick },
        BACK: 'defaultLanguage',
      },
    },
    quickOrAdvanced: {
      always: [
        {
          cond: isQuick,
          target: 'personalSetup',
        },
        {
          target: 'deviceName',
        },
      ],
    },
    personalSetup: {
      meta: { route: 'PERSONAL_SETUP' },
      on: {
        BACK: 'gettingStarted',
      },
    },
    deviceName: {
      meta: { route: 'DEVICE_NAME', path: '/' },
      on: {
        CONTINUE: 'publicSetup',
        BACK: 'gettingStarted',
      },
    },
    publicSetup: {
      meta: { route: 'PUBLIC_SETUP_METHOD', path: '/' },
      on: {
        CONTINUE: { target: 'importOrNew', actions: setSetupType },
        BACK: 'deviceName',
      },
    },
    importOrNew: {
      always: [
        {
          cond: isNewFacility,
          target: 'createFacility',
        },
        {
          cond: isLODSetup,
          target: 'importLODUsers',
        },
        {
          target: 'importFacility',
        },
      ],
    },
    createFacility: {
      meta: { route: 'CREATE_FACILITY/1' },
      CONTINUE: 'quickOrAdvanced',
      on: {
        BACK: 'publicSetup',
      },
    },
    importFacility: {
      meta: { route: 'IMPORT_FACILITY' },
      on: {
        BACK: 'publicSetup',
      },
    },
    importLODUsers: {
      meta: { route: 'IMPORT_LOD' },
      on: {
        BACK: 'publicSetup',
      },
    },
  },
});
