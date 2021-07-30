import { createMachine, assign } from 'xstate';

// import PersonalDataConsentForm from './onboarding-forms/PersonalDataConsentForm';
import SelectFacilityForm from '../views/importLODUsers/SelectFacilityForm.vue';
import SelectSuperAdminAccountForm from '../views/importFacility/SelectSuperAdminAccountForm';
// import LoadingTaskPage from './importFacility/LoadingTaskPage';

const assignDevice = assign((_, event) => {
  const data = event.value;
  const _device = {
    name: data.device_name,
    id: data.device_id,
    baseurl: data.device_address,
    facilities: [...data.facilities],
  };
  const _facility = { name: null, id: null, adminuser: null, adminpassword: null };
  if (_device.facilities.length === 1) {
    _facility.name = _device.facilities[0].name;
    _facility.id = _device.facilities[0].id;
  }
  const total_steps = _device.facilities.length === 1 ? 3 : 4;
  return {
    device: _device,
    facilities: _device.facilities,
    facility: _facility,
    steps: total_steps,
  };
});

const assignFacility = assign({
  facility: (_, event) => event.value,
});

export const lodImportMachine = createMachine({
  initial: 'selectFacility',
  context: {
    step: 1,
    steps: 4,
    device: { name: null, id: null, baseurl: null },
    facilities: [],
    facility: { name: null, id: null, adminuser: null, adminpassword: null },
    users: [],
  },
  states: {
    selectFacility: {
      meta: { step: '1', component: SelectFacilityForm },
      on: {
        CONTINUE: { target: 'userCredentials', actions: assignFacility },
        DEVICE_DATA: { actions: assignDevice },
      },
    },
    userCredentials: {
      meta: { step: '2' },
      on: {
        CONTINUE: { target: 'importingUser' },
        CONTINUEADMIN: { target: 'adminCredentials' },
        BACK: 'selectFacility',
      },
    },
    importingUser: {
      meta: { step: '3' },
      on: {
        CONTINUE: { target: 'importedUser' },
        BACK: 'userCredentials',
      },
    },
    importedUser: {
      meta: { step: '4' },
      on: {
        CONTINUE: { target: 'welcome' },
        CONTINUEADMIN: { target: 'selectUsers' },
        BACK: 'userCredentials',
      },
    },
    adminCredentials: {
      meta: { step: '2', component: SelectSuperAdminAccountForm },
      on: {
        CONTINUE: { target: 'selectUsers' },
        BACK: 'userCredentials',
      },
    },
    selectUsers: {
      meta: { step: '3' },
      on: {
        CONTINUE: { target: 'importingUser' },
        BACK: 'adminCredentials',
      },
    },
    modalCoachAdmins: {},
    welcome: {
      type: 'final',
      meta: { step: '5' },
    },
  },
});
