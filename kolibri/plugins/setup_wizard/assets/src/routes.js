import DeviceNameForm from './views/onboarding-forms/DeviceNameForm';
import DefaultLanguageForm from './views/onboarding-forms/DefaultLanguageForm';
import GettingStartedForm from './views/onboarding-forms/GettingStartedForm';
import SetupMethod from './views/onboarding-forms/SetupMethod';
import UngroupedSetupSteps from './views/UngroupedSetupSteps';
import PersonalSetup from './views/PersonalSetup';
import CreateFacilitySetup from './views/CreateFacilitySetup';
import ImportFacilitySetup from './views/ImportFacilitySetup';

export default [
  {
    path: '/',
    component: UngroupedSetupSteps,
    children: [
      {
        path: '',
        name: 'DEFAULT_LANGUAGE',
        component: DefaultLanguageForm,
      },
      {
        path: 'planned_use',
        name: 'PLANNED_USE',
        component: GettingStartedForm,
      },
      {
        path: 'public_setup_method',
        name: 'PUBLIC_SETUP_METHOD',
        component: SetupMethod,
      },
      {
        path: 'device_name',
        name: 'DEVICE_NAME',
        component: DeviceNameForm,
      },
    ],
  },
  {
    name: 'PERSONAL_SETUP',
    path: '/personal_setup',
    component: PersonalSetup,
  },
  {
    name: 'CREATE_FACILITY',
    path: '/create_facility/:step',
    component: CreateFacilitySetup,
  },
  {
    name: 'IMPORT_FACILITY',
    path: '/import_facility/:step',
    component: ImportFacilitySetup,
  },
];
