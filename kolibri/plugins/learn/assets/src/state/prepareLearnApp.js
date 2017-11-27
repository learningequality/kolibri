import { currentUserId } from 'kolibri.coreVue.vuex.getters';
import { MembershipResource } from 'kolibri.resources';

// prepares state that is used for all pages in 'learn' plugin/app
// currently, this is only the user's memberships
function prepareLearnApp(store) {
  const userId = currentUserId(store.state);

  if (userId === null) return Promise.resolve();

  const membershipPromise = MembershipResource.getCollection({
    user: userId,
  }).fetch();

  return membershipPromise
    .then(memberships => {
      store.dispatch('LEARN_SET_MEMBERSHIPS', memberships);
    })
    .catch(err => {
      store.dispatch('CORE_SET_ERROR', err);
    });
}

export { prepareLearnApp as default };
