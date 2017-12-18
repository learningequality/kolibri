import set from 'lodash/set';
import { ContentWizardPages } from '../../constants';
import { getDriveById } from '../getters';

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

export function RESET_WIZARD_STATE_FOR_AVAILABLE_CHANNELS(state) {
  const oldState = state.pageState.wizardState;
  state.pageState.wizardState = {
    ...oldState,
    currentTopicNode: {},
    nodesForTransfer: {
      included: [],
      omitted: [],
    },
    pageName: ContentWizardPages.AVAILABLE_CHANNELS,
    path: [],
    status: '',
    pathCache: {},
    transferredChannel: {},
  };
}
