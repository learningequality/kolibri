export const ComponentMap = {
  SIGN_IN: 'SignInPage',
  SIGN_UP: 'SignUpPage',
  AUTH_SELECT: 'AuthSelect',
  FACILITY_SELECT: 'FacilitySelect',
  NEW_PASSWORD: 'NewPasswordPage',
};

export const pageNameToModuleMap = {
  [ComponentMap.SIGN_IN]: 'signIn',
};

export const DeviceUnusableReason = {
  NO_SUPERUSERS: 'NO_SUPERUSERS',
  SUPERUSERS_SOFT_DELETED: 'SUPERUSERS_SOFT_DELETED',
};
