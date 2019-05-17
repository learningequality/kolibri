import { ClassroomResource } from 'kolibri.resources';

export function displayModal(store, modalName) {
  store.commit('SET_SUBSCRIPTION_MODAL', modalName);
}

export function saveSubscription(store, subscriptionData) {
  return ClassroomResource.saveModel({
    data: {
      id: subscriptionData.id,
      subscriptions: subscriptionData.subscriptions,
    },
  })
    .then(store.dispatch('displayModal', false))
    .catch(error => store.dispatch('handleApiError', error, { root: true }));
}
