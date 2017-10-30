// a name for every URL pattern
const PageNames = {
  CLASS_MGMT_PAGE: 'CLASS_MGMT_PAGE',
  CLASS_EDIT_MGMT_PAGE: 'CLASS_EDIT_MGMT_PAGE',
  CLASS_ENROLL_MGMT_PAGE: 'CLASS_ENROLL_MGMT_PAGE',
  USER_MGMT_PAGE: 'USER_MGMT_PAGE',
  DATA_EXPORT_PAGE: 'DATA_EXPORT_PAGE',
  FACILITY_CONFIG_PAGE: 'FACILITY_CONFIG_PAGE',
};

// modal names
const Modals = {
  CREATE_CLASS: 'CREATE_CLASS',
  DELETE_CLASS: 'DELETE_CLASS',
  EDIT_CLASS_NAME: 'EDIT_CLASS_NAME',
  REMOVE_USER: 'REMOVE_USER',
  CONFIRM_ENROLLMENT: 'CONFIRM_ENROLLMENT',
  CREATE_USER: 'CREATE_USER',
  EDIT_USER: 'EDIT_USER',
  RESET_USER_PASSWORD: 'RESET_USER_PASSWORD',
  DELETE_USER: 'DELETE_USER',
};

const defaultFacilityConfig = {
  learnerCanEditUsername: true,
  learnerCanEditName: true,
  learnerCanEditPassword: true,
  learnerCanSignUp: true,
  learnerCanDeleteAccount: true,
};

const notificationTypes = {
  PAGELOAD_FAILURE: 'PAGELOAD_FAILURE',
  SAVE_FAILURE: 'SAVE_FAILURE',
  SAVE_SUCCESS: 'SAVE_SUCCESS',
};

export { PageNames, Modals, defaultFacilityConfig, notificationTypes };
