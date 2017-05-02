const { currentUserId } = require('kolibri.coreVue.vuex.getters');
const { MembershipResource } = require('kolibri').resources;

const LEARN_SET_MEMBERSHIPS = 'LEARN_SET_MEMBERSHIPS';

function prepareLearnApp(store) {
  const userId = currentUserId(store.state);
  if (userId === null) {
    return Promise.resolve()
    .then(() => {
      store.dispatch(LEARN_SET_MEMBERSHIPS, []);
    });
  }

  const promises = [
    MembershipResource.getCollection({ user_id: userId }).fetch(),
  ];

  return Promise.all(promises);
}

module.exports = prepareLearnApp;
