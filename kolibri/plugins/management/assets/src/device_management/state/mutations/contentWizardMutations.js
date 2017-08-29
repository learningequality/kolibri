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
