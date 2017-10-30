import { TaskResource } from 'kolibri.resources';
import { ContentWizardPages } from '../../constants';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import {
  triggerLocalContentExportTask,
  triggerLocalContentImportTask,
  triggerRemoteContentImportTask,
} from './taskActions';
import { showSelectContentPage } from './contentTransferActions';
import find from 'lodash/find';

export function updateWizardLocalDriveList(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  TaskResource.localDrives()
    .then(response => {
      store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
      store.dispatch('SET_CONTENT_PAGE_WIZARD_DRIVES', response.entity);
    })
    .catch(error => {
      store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
      handleApiError(store, error);
    });
}

export function showWizardPage(store, pageName, meta = {}) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', {
    shown: Boolean(pageName),
    page: pageName || null,
    error: null,
    busy: false,
    drivesLoading: false,
    driveList: null,
    meta,
  });
}

export function startImportWizard(store) {
  showWizardPage(store, ContentWizardPages.CHOOSE_IMPORT_SOURCE);
}

export function startExportWizard(store) {
  showWizardPage(store, ContentWizardPages.EXPORT);
  updateWizardLocalDriveList(store);
}

export function closeImportExportWizard(store) {
  showWizardPage(store, false);
}

function prepareAvailableChannelsPage(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_PAGENAME', ContentWizardPages.NETWORK_AVAILABLE_CHANNELS);
  return Promise.resolve();
}

/**
 * State machine for the Import/Export wizards.
 * Only handles forward, back, and cancel transitions.
 *
 * @param store - vuex store object
 * @param {string} transition - 'forward', 'backward', or 'cancel'
 * @param {Object} params - data needed to execute transition
 * @returns {undefined}
 */
export function transitionWizardPage(store, transition, params) {
  const wizardPage = store.state.pageState.wizardState.page;
  const FORWARD = 'forward';
  const BACKWARD = 'backward';
  const CANCEL = 'cancel';

  const showPage = showWizardPage.bind(null, store);

  if (transition === CANCEL) {
    return showPage(false);
  }

  // At Choose Source Wizard
  if (wizardPage === ContentWizardPages.CHOOSE_IMPORT_SOURCE) {
    if (transition === FORWARD && params.source === 'local') {
      return showPage(ContentWizardPages.IMPORT_LOCAL);
    }
    if (transition === FORWARD && params.source === 'network') {
      store.dispatch('SET_CONTENT_PAGE_WIZARD_META', {
        source: {
          type: 'NETWORK_SOURCE',
          baseUrl: '',
        },
        transferType: 'remoteimport',
      });
      return prepareAvailableChannelsPage(store);
    }
  }

  // At Available Channels Page
  // params: { channel }
  if (wizardPage === ContentWizardPages.NETWORK_AVAILABLE_CHANNELS) {
    if (transition === FORWARD) {
      return showSelectContentPage(store, {
        ...store.state.pageState.wizardState.meta, // { source, transferType }
        ...params,
      });
    }
  }

  // At Local Import Wizard
  // params : { driveId }
  if (wizardPage === ContentWizardPages.IMPORT_LOCAL) {
    if (transition === BACKWARD) {
      return showPage(ContentWizardPages.CHOOSE_IMPORT_SOURCE);
    }
    if (transition === FORWARD) {
      const driveInfo = find(store.state.pageState.wizardState.driveList, { id: params.driveId });
      store.dispatch('SET_CONTENT_PAGE_WIZARD_META', {
        source: {
          type: 'LOCAL_DRIVE',
          driveId: driveInfo.id,
          driveName: driveInfo.name,
        },
        transferType: 'localimport',
      });
      return prepareAvailableChannelsPage(store);
    }
  }

  // At Network Import Wizard
  if (wizardPage === ContentWizardPages.IMPORT_NETWORK) {
    if (transition === BACKWARD) {
      return showPage(ContentWizardPages.CHOOSE_IMPORT_SOURCE);
    }
    if (transition === FORWARD) {
      return showPage(ContentWizardPages.REMOTE_IMPORT_PREVIEW, {
        channelId: params.channelId,
      });
    }
  }

  // At Export Wizard
  // params : { driveId }
  if (wizardPage === ContentWizardPages.EXPORT) {
    if (transition === FORWARD) {
      // return triggerLocalContentExportTask(store, params.driveId);
      store.dispatch('SET_CONTENT_PAGE_WIZARD_META', {
        source: {},
        transferType: 'localexport',
      });
      return prepareAvailableChannelsPage(store);
    }
  }

  // At Local Import Preview
  if (wizardPage === ContentWizardPages.LOCAL_IMPORT_PREVIEW) {
    if (transition === BACKWARD) {
      return showPage(ContentWizardPages.IMPORT_LOCAL);
    }
    if (transition === FORWARD) {
      return triggerLocalContentImportTask(store, params.sourceId);
    }
  }

  // At Network Import Preview
  if (wizardPage === ContentWizardPages.REMOTE_IMPORT_PREVIEW) {
    if (transition === BACKWARD) {
      return showPage(ContentWizardPages.IMPORT_NETWORK);
    }
    if (transition === FORWARD) {
      return triggerRemoteContentImportTask(store, params.sourceId);
    }
  }

  return undefined;
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
export function showAvailableChannelsPage() {
  return Promise.resolve();
}
