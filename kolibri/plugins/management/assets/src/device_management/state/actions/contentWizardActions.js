import { TaskResource } from 'kolibri.resources';
import { ContentWizardPages } from '../../../constants';
import * as coreActions from 'kolibri.coreVue.vuex.actions';

export function updateWizardLocalDriveList(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  TaskResource.localDrives()
    .then(response => {
      store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
      store.dispatch('SET_CONTENT_PAGE_WIZARD_DRIVES', response.entity);
    })
    .catch(error => {
      store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
      coreActions.handleApiError(store, error);
    });
}

function showWizardPage(store, pageName, meta = {}) {
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
