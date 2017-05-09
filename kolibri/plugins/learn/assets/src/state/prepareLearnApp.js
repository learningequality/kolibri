const { currentUserId } = require('kolibri.coreVue.vuex.getters');
const { MembershipResource } = require('kolibri').resources;

// prepares state that is used for all pages in 'learn' plugin/app
// currently, this is only the user's memberships
function prepareLearnApp(store) {
  const userId = currentUserId(store.state);

  if (userId === null) return Promise.resolve();

  const membershipPromise = MembershipResource.getCollection({ user_id: userId }).fetch();

  return membershipPromise
  .then((memberships) => {
    store.dispatch('LEARN_SET_MEMBERSHIPS', memberships);
  })
  .catch((err) => {
    store.dispatch('CORE_SET_ERROR', err);
  });
}

module.exports = prepareLearnApp;
