
// a name for every URL pattern
const PageNames = {
  USER_MGMT_PAGE: 'USER_MGMT_PAGE',
  CONTENT_MGMT_PAGE: 'CONTENT_MGMT_PAGE',
  DATA_EXPORT_PAGE: 'DATA_EXPORT_PAGE',
  SCRATCHPAD: 'SCRATCHPAD',
};


// content import/export wizard pages
const ContentWizardPages = {
  CHOOSE_IMPORT_SOURCE: 'CHOOSE_IMPORT_SOURCE',
  IMPORT_NETWORK: 'IMPORT_NETWORK',
  IMPORT_LOCAL: 'IMPORT_LOCAL',
  EXPORT: 'EXPORT',
};

const TaskTypes = {
  REMOTE_IMPORT: 'remoteimport',
  LOCAL_IMPORT: 'localimport',
  LOCAL_EXPORT: 'localexport',
};

const TaskStatuses = {
  IN_PROGRESS: 'in_progress',
  SUCCESS: 'success',
  ERROR: 'error',
  PENDING: 'pending',
};

module.exports = {
  PageNames,
  ContentWizardPages,
  TaskTypes,
  TaskStatuses,
};
