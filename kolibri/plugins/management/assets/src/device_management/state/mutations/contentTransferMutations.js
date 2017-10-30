export function ADD_NODE_TO_INCLUDE_LIST(state, node) {
  state.pageState.wizardState.selectedItems.nodes.include.push(node);
}

export function REMOVE_NODE_FROM_INCLUDE_LIST(state, node) {
  const newList = state.pageState.wizardState.selectedItems.nodes.include.filter(n => n.id !== node.id);
  state.pageState.wizardState.selectedItems.nodes.include = newList;
}

export function REPLACE_INCLUDE_LIST(state, newList) {
  state.pageState.wizardState.selectedItems.nodes.include = newList;
}

export function ADD_NODE_TO_OMIT_LIST(state, node) {
  state.pageState.wizardState.selectedItems.nodes.omit.push(node);
}

export function REMOVE_NODE_FROM_OMIT_LIST(state, node) {
  const newList = state.pageState.wizardState.selectedItems.nodes.omit.filter(n => n.id !== node.id);
  state.pageState.wizardState.selectedItems.nodes.omit = newList;
}

export function REPLACE_COUNTS(state, newCounts) {
  state.pageState.wizardState.selectedItems.total_file_size = newCounts.fileSize;
  state.pageState.wizardState.selectedItems.total_resource_count = newCounts.resources;
}

export function SELECT_CONTENT_PAGE_ERROR(state, errorType) {
  state.pageState.wizardState.status = errorType;
}

export function UPDATE_SELECT_CONTENT_PAGE_TASK(state, task) {
  state.pageState.wizardState.channelImportTask = task;
}

export function SET_TREEVIEW_CURRENTNODE(state, payload) {
  state.pageState.wizardState.treeView.currentNode = payload;
}

export function ADD_TREEVIEW_BREADCRUMB(state, payload) {
  state.pageState.wizardState.treeView.breadcrumbs.push(payload);
}

export function ADD_ID_TO_PATH(state, newId) {
  state.pageState.wizardState.path.push(newId);
}
