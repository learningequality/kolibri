export default {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_SHOW_COMPLETE_CONTENT_MODAL(state, valToSet) {
    state.showCompleteContentModal = valToSet;
  },
  SET_WELCOME_MODAL_VISIBLE(state, visibility) {
    state.welcomeModalVisible = visibility;
  },
};
