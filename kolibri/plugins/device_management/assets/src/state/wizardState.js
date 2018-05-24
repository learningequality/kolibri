// Minimal state needed to render the manage content page
export function manageContentPageState() {
  return {
    toolbarTitle: '',
    channelList: [],
    channelListLoading: false,
    taskList: [],
    wizardState: importExportWizardState(),
  };
}

// Monolithic object that stores state needed for all import/export flows
export function importExportWizardState() {
  return {
    // 0. can be set at any time
    status: '',
    // 1. set after clicking "import" or "export", and changes throughout flow
    pageName: '',
    // 2. set after choosing REMOTEEXPORT or LOCALIMPORT
    driveList: [],
    // 3. set after choosing a USB drive or Kolibri Studio
    transferType: '',
    availableChannels: [],
    selectedDrive: {},
    availableSpace: null,
    // 4. set after choosing channel
    transferredChannel: {},
    currentTopicNode: {},
    path: [],
    pathCache: {},
    nodesForTransfer: {
      included: [],
      omitted: [],
      // totalFileSize and totalResources are defined as getters
    },
  };
}
