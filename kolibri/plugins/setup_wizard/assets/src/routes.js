import DeviceNameForm from './views/onboarding-forms/DeviceNameForm';
import DefaultLanguageForm from './views/onboarding-forms/DefaultLanguageForm';
import FullOrLearnOnlyDeviceForm from './views/onboarding-forms/FullOrLearnOnlyDeviceForm';
import SetUpLearningFacilityForm from './views/onboarding-forms/SetUpLearningFacilityForm';
import HowAreYouUsingKolibri from './views/onboarding-forms/HowAreYouUsingKolibri';
import UserCredentialsForm from './views/onboarding-forms/UserCredentialsForm';
import FacilityPermissionsForm from './views/onboarding-forms/FacilityPermissionsForm';
import GuestAccessForm from './views/onboarding-forms/GuestAccessForm';
import CreateLearnerAccountForm from './views/onboarding-forms/CreateLearnerAccountForm';
import RequirePasswordForLearnersForm from './views/onboarding-forms/RequirePasswordForLearnersForm';
import PersonalDataConsentForm from './views/onboarding-forms/PersonalDataConsentForm';
import SettingUpKolibri from './views/onboarding-forms/SettingUpKolibri';
import ImportLODUsersSetup from './views/ImportLODUsersSetup';
import ImportAuthentication from './views/importFacility/ImportAuthentication';
import SelectFacilityForm from './views/importFacility/SelectFacilityForm';
import SelectSuperAdminAccountForm from './views/importFacility/SelectSuperAdminAccountForm';
import LoadingTaskPage from './views/importFacility/LoadingTaskPage';
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
    name: 'CREATE_SUPERUSER_AND_FACILITY',
    component: UserCredentialsForm,
  },
  {
    path: '/device-name',
    name: 'DEVICE_NAME',
    component: DeviceNameForm,
  },
  {
    path: '/full-or-lod',
    name: 'FULL_OR_LOD',
    component: FullOrLearnOnlyDeviceForm,
  },
  {
    path: '/facility-new-or-import',
    name: 'FULL_NEW_OR_IMPORT_FACILITY',
    component: SetUpLearningFacilityForm,
  },
  // create a facility
  {
    name: 'FACILITY_PERMISSIONS',
    path: '/create_facility/1',
    component: FacilityPermissionsForm,
  },
  {
    name: 'GUEST_ACCESS',
    path: '/create-facility/2',
    component: GuestAccessForm,
  },
  {
    name: 'CREATE_LEARNER_ACCOUNT',
    path: '/create-facility/3',
    component: CreateLearnerAccountForm,
  },
  {
    name: 'REQUIRE_PASSWORD',
    path: '/create-facility/4',
    component: RequirePasswordForLearnersForm,
  },
  {
    name: 'PERSONAL_DATA_CONSENT',
    path: '/create-facility/5',
    component: PersonalDataConsentForm,
  },
  // Import a facility
  {
    name: 'SELECT_FACILITY_FOR_IMPORT',
    path: '/import-facility/select',
    component: SelectFacilityForm,
  },
  {
    name: 'IMPORT_AUTHENTICATION',
    path: '/import-facility/auth',
    component: ImportAuthentication,
  },
  {
    name: 'IMPORT_LOADING',
    path: '/import-facility/loading',
    component: LoadingTaskPage,
  },
  {
    name: 'SELECT_ADMIN',
    path: '/import-facility/select-admin',
    component: SelectSuperAdminAccountForm,
  },
  {
    name: 'IMPORT_DATA_CONSENT',
    path: '/import-facility/consent',
    component: PersonalDataConsentForm,
  },

  // Learn only device
  {
    name: 'IMPORT_LOD',
    path: '/import-lod/select',
    component: ImportLODUsersSetup,
  },
  {
    name: 'IMPORT_LOD',
    path: '/import-lod/import-user',
    component: ImportLODUsersSetup,
  },
  {
    name: 'IMPORT_LOD',
    path: '/import-lod/loading',
    component: ImportLODUsersSetup,
  },
  {
    name: 'IMPORT_LOD',
    path: '/import-lod/select-users',
    component: ImportLODUsersSetup,
  },
  {
    name: 'IMPORT_LOD',
    path: '/import-lod/:step',
    component: ImportLODUsersSetup,
  },
  {
    name: 'IMPORT_LOD',
    path: '/import-lod/:step',
    component: ImportLODUsersSetup,
  },
  {
    name: 'SANDBOX',
    path: '/sandbox',
    component: Sandbox,
  },
  {
    name: 'FINALIZE_SETUP',
    path: '/setting-up',
    component: SettingUpKolibri,
  },
];
