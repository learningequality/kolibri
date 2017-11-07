import { TaskResource } from 'kolibri.resources';
import { ContentWizardPages, TransferTypes } from '../../constants';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import { showSelectContentPage } from './contentTransferActions';
import { MutationTypes as Mutations } from '../mutations/contentWizardMutations';
import { wizardState } from '../getters';
import { showAvailableChannelsPage } from './availableChannelsActions';
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
    transferType: TransferTypes.LOCALEXPORT,
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
  const LOCAL = 'local';
  const NETWORK = 'network';

  const showPage = showWizardPage.bind(null, store);

  if (transition === CANCEL) {
    return showPage(false);
  }

  // At Choose Import Source modal
  // params : { source : 'local' | 'network' }
  if (wizardPage === ContentWizardPages.CHOOSE_IMPORT_SOURCE) {
    if (transition === FORWARD) {
      if (params.source === LOCAL) {
        updateWizardLocalDriveList(store);
        return showPage(ContentWizardPages.SELECT_DRIVE, {
          transferType: TransferTypes.LOCALIMPORT,
        });
      }

      if (params.source === NETWORK) {
        return showAvailableChannelsPage(store, {
          transferType: TransferTypes.REMOTEIMPORT,
        });
      }
    }
  }

  // At Choose Local Drive For Import modal
  // params : { driveId }
  if (wizardPage === ContentWizardPages.SELECT_DRIVE) {
    if (transition === FORWARD) {
      const { transferType } = wizardState(store.state).meta;
      const matchingDrive = find(wizardState(store.state).driveList, { id: params.driveId });
      return showAvailableChannelsPage(store, {
        transferType,
        drive: {
          type: 'LOCAL_DRIVE',
          driveId: matchingDrive.id,
          driveName: matchingDrive.name,
        },
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
