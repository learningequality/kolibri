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
import JoinOrNewLOD from './views/JoinOrNewLOD';
import LodJoinFacility from './views/LodJoinFacility';
import ImportAuthentication from './views/ImportAuthentication';
import SelectFacilityForm from './views/SelectFacilityForm';
import SelectSuperAdminAccountForm from './views/SelectSuperAdminAccountForm';
import ImportIndividualUserForm from './views/ImportIndividualUserForm';
import ImportMultipleUsers from './views/ImportMultipleUsers';
import LoadingTaskPage from './views/LoadingTaskPage';
import { FooterMessageTypes } from './constants';

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
    props: { footerMessageType: FooterMessageTypes.NEW_FACILITY },
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
    props: { footerMessageType: FooterMessageTypes.IMPORT_FACILITY },
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
    props: { footerMessageType: FooterMessageTypes.IMPORT_FACILITY },
  },

  // Learn only device
  {
    name: 'LOD_SETUP_TYPE',
    path: '/learn-only/setup-type',
    component: JoinOrNewLOD,
  },
  {
    name: 'LOD_SELECT_FACILITY',
    path: '/learn-only/select-facility',
    component: SelectFacilityForm,
  },
  {
    name: 'LOD_IMPORT_USER_AUTH',
    path: '/learn-only/import/sign-in',
    component: ImportIndividualUserForm,
  },
  {
    name: 'LOD_LOADING_TASK_PAGE',
    path: '/learn-only/loading',
    component: LoadingTaskPage,
    props: { footerMessageType: FooterMessageTypes.IMPORT_INDIVIDUALS },
  },
  {
    name: 'LOD_JOIN_LOADING_TASK_PAGE',
    path: '/learn-only/loading',
    component: LoadingTaskPage,
    props: { footerMessageType: FooterMessageTypes.JOIN_FACILITY },
  },
  {
    name: 'LOD_IMPORT_AS_ADMIN',
    path: '/learn-only/import/multiple-users',
    component: ImportMultipleUsers,
  },
  {
    name: 'LOD_CREATE_USER_FORM',
    path: '/learn-only/join/create-user',
    component: LodJoinFacility,
  },
  {
    name: 'FINALIZE_SETUP',
    path: '/setting-up',
    component: SettingUpKolibri,
  },
];
