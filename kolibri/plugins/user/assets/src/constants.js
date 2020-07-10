export const PageNames = {
  ROOT: 'ROOT',
  SIGN_IN: 'SIGN_IN',
  SIGN_UP: 'SIGN_UP',
  PROFILE: 'PROFILE',
  PROFILE_EDIT: 'PROFILE_EDIT',
  AUTH_SELECT: 'AUTH_SELECT',
  FACILITY_SELECT: 'FACILITY_SELECT',
};

export const ComponentMap = {
  SIGN_IN: 'SignInPage',
  SIGN_UP: 'SignUpPage',
  PROFILE: 'ProfilePage',
  PROFILE_EDIT: 'ProfileEditPage',
  AUTH_SELECT: 'AuthSelect',
  FACILITY_SELECT: 'FacilitySelect',
};

export const pageNameToModuleMap = {
  [PageNames.SIGN_IN]: 'signIn',
};
