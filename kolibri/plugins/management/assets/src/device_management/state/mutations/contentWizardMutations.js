export function SET_CONTENT_PAGE_WIZARD_STATE(state, wizardState) {
  state.pageState.wizardState = wizardState;
}

export function SET_CONTENT_PAGE_WIZARD_DRIVES(state, driveList) {
  state.pageState.wizardState.driveList = driveList;
}

export function SET_CONTENT_PAGE_WIZARD_ERROR(state, error) {
  state.pageState.wizardState.error = error;
}

export function SET_CONTENT_PAGE_WIZARD_BUSY(state, isBusy) {
  state.pageState.wizardState.busy = isBusy;
}

export function SET_CONTENT_PAGE_WIZARD_META(state, meta) {
  state.pageState.wizardState.meta = meta;
}

export function SET_CONTENT_PAGE_WIZARD_PAGENAME(state, meta) {
  state.pageState.wizardState.page = meta;
}

export function SET_AVAILABLE_CHANNELS(state, channels) {
  state.pageState.wizardState.availableChannels = channels;
}

export const MutationTypes = {
  [SET_CONTENT_PAGE_WIZARD_STATE.name]: SET_CONTENT_PAGE_WIZARD_STATE.name,
  [SET_CONTENT_PAGE_WIZARD_DRIVES.name]: SET_CONTENT_PAGE_WIZARD_DRIVES.name,
  [SET_CONTENT_PAGE_WIZARD_ERROR.name]: SET_CONTENT_PAGE_WIZARD_ERROR.name,
  [SET_CONTENT_PAGE_WIZARD_BUSY.name]: SET_CONTENT_PAGE_WIZARD_BUSY.name,
  [SET_CONTENT_PAGE_WIZARD_META.name]: SET_CONTENT_PAGE_WIZARD_META.name,
  [SET_CONTENT_PAGE_WIZARD_PAGENAME.name]: SET_CONTENT_PAGE_WIZARD_PAGENAME.name,
  [SET_AVAILABLE_CHANNELS.name]: SET_AVAILABLE_CHANNELS.name,
};
