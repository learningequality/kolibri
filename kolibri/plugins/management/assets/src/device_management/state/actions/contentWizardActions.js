import { TaskResource, RemoteChannelResource } from 'kolibri.resources';
import { ContentWizardPages, TransferTypes } from '../../constants';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import { showSelectContentPage } from './contentTransferActions';
import { MutationTypes as Mutations } from '../mutations/contentWizardMutations';
import { driveChannelList, installedChannelList, wizardState } from '../getters';
import find from 'lodash/find';

export function updateWizardLocalDriveList(store) {
  store.dispatch(Mutations.SET_CONTENT_PAGE_WIZARD_BUSY, true);
  TaskResource.localDrives()
    .then(response => {
      store.dispatch(Mutations.SET_CONTENT_PAGE_WIZARD_BUSY, false);
      store.dispatch(Mutations.SET_CONTENT_PAGE_WIZARD_DRIVES, response.entity);
    })
    .catch(error => {
      store.dispatch(Mutations.SET_CONTENT_PAGE_WIZARD_BUSY, false);
      handleApiError(store, error);
    });
}

export function showWizardPage(store, pageName, meta = {}) {
  store.dispatch(Mutations.SET_CONTENT_PAGE_WIZARD_STATE, {
    shown: Boolean(pageName),
    page: pageName || null,
    error: null,
    busy: false,
    drivesLoading: false,
    driveList: wizardState(store.state).driveList || [],
    channelList: wizardState(store.state).channelList || [],
    channelsOnDevice: [],
    availableChannels: [],
    path: [],
    treeView: {
      breadcrumbs: [],
      currentNode: {},
    },
    remainingSpace: 0,
    selectedItems: {
      total_resource_count: 0,
      total_file_size: 0,
      nodes: {
        include: [],
        omit:[],
      },
    },
    meta,
  });
}

export function startImportWizard(store) {
  showWizardPage(store, ContentWizardPages.CHOOSE_IMPORT_SOURCE);
}

export function startExportWizard(store) {
  showWizardPage(store, ContentWizardPages.SELECT_DRIVE, {
    transferType: 'localexport',
  });
  updateWizardLocalDriveList(store);
}

export function closeImportExportWizard(store) {
  showWizardPage(store, false);
}

/**
 * State machine for the Import/Export wizards.
 * Only handles forward, back, and cancel transitions.
 *
 * @param store - vuex store object
 * @param {string} transition - 'forward', 'backward', or 'cancel'
 * @param {Object} params - data needed to execute transition
 * @returns {Promise}
 *
 */
export function transitionWizardPage(store, transition, params) {
  const wizardPage = store.state.pageState.wizardState.page;
  const FORWARD = 'forward';
  const CANCEL = 'cancel';

  const showPage = showWizardPage.bind(null, store);

  if (transition === CANCEL) {
    return showPage(false);
  }

  // At Choose Import Source modal
  // params : { source : 'local' | 'network' }
  if (wizardPage === ContentWizardPages.CHOOSE_IMPORT_SOURCE) {
    if (transition === FORWARD) {
      if (params.source === 'local') {
        updateWizardLocalDriveList(store);
        return showPage(ContentWizardPages.SELECT_DRIVE, {
          transferType: 'localimport',
        });
      }

      if (params.source === 'network') {
        return showAvailableChannelsPage(store, {
          transferType: TransferTypes.REMOTEIMPORT,
          source: {
            type: 'NETWORK_SOURCE',
            baseUrl: '',
          },
          destination: {},
        });
      }
    }
  }

  // At Choose Local Drive For Import modal
  // params : { driveId }
  if (wizardPage === ContentWizardPages.SELECT_DRIVE) {
    const { transferType } = wizardState(store.state).meta;
    const matchingDrive = find(wizardState(store.state).driveList, { id: params.driveId });
    const drive = {
      type: 'LOCAL_DRIVE',
      driveId: matchingDrive.id,
      driveName: matchingDrive.name,
    };
    if (transition === FORWARD && transferType === 'localimport') {
      return showAvailableChannelsPage(store, {
        transferType: TransferTypes.LOCALIMPORT,
        source: drive,
        destination: {},
      });
    }
    if (transition === FORWARD && transferType === 'localexport') {
      return showAvailableChannelsPage(store, {
        transferType: TransferTypes.LOCALEXPORT,
        source: {},
        destination: drive,
      });
    }
  }

  // At Available Channels Page
  // params: { channel }
  if (wizardPage === ContentWizardPages.AVAILABLE_CHANNELS) {
    if (transition === FORWARD) {
      const { source, destination, transferType } = wizardState(store.state).meta;
      store.dispatch(Mutations.SET_CONTENT_PAGE_WIZARD_META, {
        ...wizardState(store.state).meta,
        channel: params.channel,
      })
      return showSelectContentPage(store, {
        source,
        destination,
        transferType,
        channel: {
          ...params.channel,
          isOnDevice: true,
        },
      });
    }
  }

  return Promise.resolve();
}

/**
 * Prepares the Available Channels Page for import/export flows
 *
 * @param {Object} store -
 * @param {Object} options -
 * @param {string} options.transferType - localimport | remoteimport | localexport
 * @param {Object} options.source - LocalDrive | RemoteSource
 *
 */
export function showAvailableChannelsPage(store, options) {
  const { transferType, source, destination } = options;
  store.dispatch(Mutations.SET_CONTENT_PAGE_WIZARD_PAGENAME, ContentWizardPages.AVAILABLE_CHANNELS);
  store.dispatch(Mutations.SET_CONTENT_PAGE_WIZARD_META, { transferType, source, destination });

  // for remoteimport, get Available Channels from Kolibri Studio
  if (transferType === TransferTypes.REMOTEIMPORT) {
    return RemoteChannelResource.getCollection()
      .fetch()
      .then(publicChannels => {
        store.dispatch(Mutations.SET_AVAILABLE_CHANNELS, publicChannels);
      });
  }

  // for localimport, get Available Channels from selected drive's metadata
  if (transferType === TransferTypes.LOCALIMPORT) {
    store.dispatch(Mutations.SET_AVAILABLE_CHANNELS, driveChannelList(store.state)(source.driveId));
  }

  // for localexport, get Available Channels from store
  if (transferType === TransferTypes.LOCALEXPORT) {
    store.dispatch(Mutations.SET_AVAILABLE_CHANNELS, [...installedChannelList(store.state)]);
  }
  return Promise.resolve();
}
