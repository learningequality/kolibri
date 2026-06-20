import { OptionsForSignIn } from 'kolibri-common/constants/Auth';

export const ComponentMap = {
  USERNAME_SIGN_IN: 'SignInPage',
  PICTURE_SIGN_IN: 'PictureSignInPage',
  QR_SIGN_IN: 'QRSignInPage',
  SIGN_UP: 'SignUpPage',
  AUTH_SELECT: 'AuthSelect',
  FACILITY_SELECT: 'FacilitySelect',
  NEW_PASSWORD: 'NewPasswordPage',
};

export const SignInOptionToComponentMap = {
  [OptionsForSignIn.USERNAME_ONLY]: ComponentMap.USERNAME_SIGN_IN,
  [OptionsForSignIn.USERNAME_PASSWORD]: ComponentMap.USERNAME_SIGN_IN,
  [OptionsForSignIn.PICTURE_PASSWORD]: ComponentMap.PICTURE_SIGN_IN,
  [OptionsForSignIn.QR_LOGIN]: ComponentMap.QR_SIGN_IN,
};

export const DeviceUnusableReason = {
  NO_SUPERUSERS: 'NO_SUPERUSERS',
  SUPERUSERS_SOFT_DELETED: 'SUPERUSERS_SOFT_DELETED',
};
