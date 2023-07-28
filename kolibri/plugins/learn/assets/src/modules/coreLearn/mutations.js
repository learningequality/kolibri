export default {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_ROOT_NODES(state, rootNodes) {
    state.rootNodes = rootNodes;
  },
  SET_SHOW_COMPLETE_CONTENT_MODAL(state, valToSet) {
    state.showCompleteContentModal = valToSet;
  },
  SET_ROOT_NODES_LOADING(state, valToSet) {
    state.rootNodesLoading = valToSet;
  },
  SET_WELCOME_MODAL_VISIBLE(state, visibility) {
    state.welcomeModalVisible = visibility;
  },
};
