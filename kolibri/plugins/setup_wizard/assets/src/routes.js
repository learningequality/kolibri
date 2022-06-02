import DeviceNameForm from './views/onboarding-forms/DeviceNameForm';
import DefaultLanguageForm from './views/onboarding-forms/DefaultLanguageForm';
import FullOrLearnOnlyDeviceForm from './views/onboarding-forms/FullOrLearnOnlyDeviceForm';
import HowAreYouUsingKolibri from './views/onboarding-forms/HowAreYouUsingKolibri';
import SuperuserCredentialsForm from './views/onboarding-forms/SuperuserCredentialsForm';
import CreateFacilitySetup from './views/CreateFacilitySetup';
import ImportFacilitySetup from './views/ImportFacilitySetup';
import ImportLODUsersSetup from './views/ImportLODUsersSetup';
import Sandbox from './views/Sandbox';

export default [
  {
    path: '/',
    name: 'HOW_ARE_YOU_USING_KOLIBRI',
    component: HowAreYouUsingKolibri,
  },
  {
    path: '/default-language',
    name: 'DEFAULT_LANGUAGE',
    component: DefaultLanguageForm,
  },
  {
    path: '/create-account',
    name: 'CREATE_INDIVIDUAL_ACCOUNT',
    component: SuperuserCredentialsForm,
  },
  {
    path: '/device-name',
    name: 'DEVICE_NAME',
    component: DeviceNameForm,
  },
  {
    path: '/device-type',
    name: 'FULL_OR_LOD',
    component: null, // FIXME: To be created in #9307
  },
  {
    path: '/facility-new-or-import',
    name: 'FULL_NEW_OR_IMPORT_FACILITY',
    component: FullOrLearnOnlyDeviceForm,
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
