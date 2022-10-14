import DeviceNameForm from './views/onboarding-forms/DeviceNameForm';
import DefaultLanguageForm from './views/onboarding-forms/DefaultLanguageForm';
import FullOrLearnOnlyDeviceForm from './views/onboarding-forms/FullOrLearnOnlyDeviceForm';
import SetUpLearningFacilityForm from './views/onboarding-forms/SetUpLearningFacilityForm';
import HowAreYouUsingKolibri from './views/onboarding-forms/HowAreYouUsingKolibri';
import SuperuserCredentialsForm from './views/onboarding-forms/SuperuserCredentialsForm';
import FacilityPermissionsForm from './views/onboarding-forms/FacilityPermissionsForm';
import GuestAccessForm from './views/onboarding-forms/GuestAccessForm';
import CreateLearnerAccountForm from './views/onboarding-forms/CreateLearnerAccountForm';
import RequirePasswordForLearnersForm from './views/onboarding-forms/RequirePasswordForLearnersForm';
import PersonalDataConsentForm from './views/onboarding-forms/PersonalDataConsentForm';
import SettingUpKolibri from './views/onboarding-forms/SettingUpKolibri';
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
    name: 'CREATE_SUPERUSER_AND_FACILITY',
    component: SuperuserCredentialsForm,
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
    path: '/create_facility/2',
    component: GuestAccessForm,
  },
  {
    name: 'CREATE_LEARNER_ACCOUNT',
    path: '/create_facility/3',
    component: CreateLearnerAccountForm,
  },
  {
    name: 'REQUIRE_PASSWORD',
    path: '/create_facility/4',
    component: RequirePasswordForLearnersForm,
  },
  {
    name: 'PERSONAL_DATA_CONSENT',
    path: '/create_facility/5',
    component: PersonalDataConsentForm,
  },
  // Import a facility
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
  {
    name: 'FINALIZE_SETUP',
    path: '/setting_up',
    component: SettingUpKolibri,
  },
];
