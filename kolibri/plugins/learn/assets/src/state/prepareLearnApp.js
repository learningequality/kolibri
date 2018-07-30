import { MembershipResource } from 'kolibri.resources';

// prepares state that is used for all pages in 'learn' plugin/app
// currently, this is only the user's memberships
export default function prepareLearnApp(store) {
  const userId = store.getters.currentUserId;

  if (userId === null) return Promise.resolve();

  const membershipPromise = MembershipResource.fetchCollection({
    getParams: {
      user: userId,
    },
  });

  return membershipPromise
    .then(memberships => {
      store.commit('LEARN_SET_MEMBERSHIPS', memberships);
    })
    .catch(err => {
      store.commit('CORE_SET_ERROR', err);
    });
}
