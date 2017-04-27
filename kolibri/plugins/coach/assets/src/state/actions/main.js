
const Constants = require('../../constants');
const coreActions = require('kolibri.coreVue.vuex.actions');
const coreApp = require('kolibri');

const ClassroomResource = coreApp.resources.ClassroomResource;

// ================================
// CLASS LIST ACTIONS


function _classState(classData) {
  return {
    id: classData.id,
    name: classData.name,
    memberCount: classData.learner_count,
  };
}
function showClassListPage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.CLASS_LIST);
  const classCollection = ClassroomResource.getCollection();
  classCollection.fetch().then(
    (classes) => {
      const pageState = {
        classes: classes.map(_classState),
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', 'Coach - Classes'); // Follow Naming Scheme
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


// - - - - - Action for Coach Exercise Render Page - - - - - -

function setSelectedAttemptLogIndex(store, index) {
  store.dispatch('SET_SELETED_ATTEMPTLOG_INDEX', index);
}


module.exports = {
  showClassListPage,
  setSelectedAttemptLogIndex,
};
