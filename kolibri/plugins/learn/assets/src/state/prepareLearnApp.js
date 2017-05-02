const { currentUserId } = require('kolibri.coreVue.vuex.getters');

const LEARN_SET_MEMBERSHIPS = 'LEARN_SET_MEMBERSHIPS';

function prepareLearnApp(store) {
  const userId = currentUserId(store.state);
  if (userId === null) {
    return Promise.resolve()
    .then(() => {
      store.dispatch(LEARN_SET_MEMBERSHIPS, []);
    });
  }
  return Promise.resolve();
}

module.exports = prepareLearnApp;
