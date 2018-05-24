import set from 'lodash/set';
import { getDriveById } from '../getters';
import { importExportWizardState } from '../wizardState';
import { SET_AVAILABLE_SPACE } from './contentTransferMutations';

function setWizardState(state, path, value) {
  set(state.pageState.wizardState, path, value);
}

export function SET_WIZARD_PAGENAME(state, pageName) {
  setWizardState(state, 'pageName', pageName);
}

export function SET_DRIVE_LIST(state, driveList) {
  setWizardState(state, 'driveList', driveList);
}

export function SET_AVAILABLE_CHANNELS(state, availableChannels) {
  setWizardState(state, 'availableChannels', availableChannels);
}

export function SET_SELECTED_DRIVE(state, driveId) {
  setWizardState(state, 'selectedDrive', getDriveById(state)(driveId));
}

export function SET_TRANSFERRED_CHANNEL(state, transferredChannel) {
  setWizardState(state, 'transferredChannel', transferredChannel);
}

export function SET_TRANSFER_TYPE(state, transferType) {
  setWizardState(state, 'transferType', transferType);
}

export function SET_WIZARD_STATUS(state, status) {
  setWizardState(state, 'status', status);
}

export function RESET_CONTENT_WIZARD_STATE(state) {
  state.pageState.wizardState = importExportWizardState();
}

export function HYDRATE_SHOW_AVAILABLE_CHANNELS_PAGE(state, pageData) {
  SET_AVAILABLE_CHANNELS(state, pageData.availableChannels);
  SET_SELECTED_DRIVE(state, pageData.selectedDrive.id);
  SET_TRANSFER_TYPE(state, pageData.transferType);
}

export function HYDRATE_SELECT_CONTENT_PAGE(state, pageData) {
  SET_AVAILABLE_SPACE(state, pageData.availableSpace);
  SET_SELECTED_DRIVE(state, pageData.selectedDrive.id);
  SET_TRANSFERRED_CHANNEL(state, pageData.transferredChannel);
  SET_TRANSFER_TYPE(state, pageData.transferType);
}
