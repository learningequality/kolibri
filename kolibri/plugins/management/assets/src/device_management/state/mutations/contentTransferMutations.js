export function ADD_NODE_TO_INCLUDE_LIST(state, node) {
  state.pageState.selectedItems.nodes.include.push(node);
}

export function REMOVE_NODE_FROM_INCLUDE_LIST(state, node) {
  const newList = state.pageState.selectedItems.nodes.include.filter(n => n.id !== node.id);
  state.pageState.selectedItems.nodes.include = newList;
}

export function REPLACE_INCLUDE_LIST(state, newList) {
  state.pageState.selectedItems.nodes.include = newList;
}

export function ADD_NODE_TO_OMIT_LIST(state, node) {
  state.pageState.selectedItems.nodes.omit.push(node);
}

export function REMOVE_NODE_FROM_OMIT_LIST(state, node) {
  const newList = state.pageState.selectedItems.nodes.omit.filter(n => n.id !== node.id);
  state.pageState.selectedItems.nodes.omit = newList;
}

export function REPLACE_COUNTS(state, newCounts) {
  state.pageState.selectedItems.total_file_size = newCounts.fileSize;
  state.pageState.selectedItems.total_resource_count = newCounts.resources;
}
