import DeviceNameForm from './views/onboarding-forms/DeviceNameForm';
import DefaultLanguageForm from './views/onboarding-forms/DefaultLanguageForm';
import GettingStartedForm from './views/onboarding-forms/GettingStartedForm';
import FullDeviceNewOrImportFacility from './views/onboarding-forms/FullDeviceNewOrImportFacility';
import UngroupedSetupSteps from './views/UngroupedSetupSteps';
import CreateFacilitySetup from './views/CreateFacilitySetup';
import ImportFacilitySetup from './views/ImportFacilitySetup';
import ImportLODUsersSetup from './views/ImportLODUsersSetup';
import Sandbox from './views/Sandbox';

export default [
  {
    path: '/',
    component: UngroupedSetupSteps,
    children: [
      {
        path: '',
        name: 'HOW_ARE_YOU_USING_KOLIBRI',
        component: GettingStartedForm,
      },
      {
        path: 'default-language',
        name: 'DEFAULT_LANGUAGE',
        component: DefaultLanguageForm,
      },
      {
        path: 'create-account',
        name: 'CREATE_INDIVIDUAL_ACCOUNT',
        component: null, // FIXME: To be created in #9305
      },
      {
        path: 'device-name',
        name: 'DEVICE_NAME',
        component: DeviceNameForm,
      },
      {
        path: 'device-type',
        name: 'FULL_OR_LOD',
        component: null, // FIXME: To be created in #9307
      },
      {
        path: 'facility-new-or-import',
        name: 'FULL_NEW_OR_IMPORT_FACILITY',
        component: FullDeviceNewOrImportFacility,
      },
    ],
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
  {
    name: 'IMPORT_LOD',
    path: '/import_lod/:step',
    component: ImportLODUsersSetup,
  },
  {
    name: 'SANDBOX',
    path: '/sandbox',
    component: Sandbox,
  },
];
