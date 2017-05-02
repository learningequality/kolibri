const { currentUserId } = require('kolibri.coreVue.vuex.getters');
const { MembershipResource } = require('kolibri').resources;

const LEARN_SET_MEMBERSHIPS = 'LEARN_SET_MEMBERSHIPS';

// prepares state that is used for all pages in 'learn' plugin/app
// currently, this is only the user's memberships
function prepareLearnApp(store) {
  let membershipPromise;
  const userId = currentUserId(store.state);
  if (userId === null) {
    membershipPromise = Promise.resolve([]);
  } else {
    membershipPromise = MembershipResource.getCollection({ user_id: userId }).fetch();
  }

  return membershipPromise
  .then((memberships) => {
    store.dispatch(LEARN_SET_MEMBERSHIPS, memberships);
  });
}

module.exports = prepareLearnApp;
