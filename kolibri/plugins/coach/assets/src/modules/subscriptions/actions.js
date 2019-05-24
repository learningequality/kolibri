import { ClassroomResource } from 'kolibri.resources';

export function displayModal(store, modalName) {
  store.commit('SET_SUBSCRIPTION_MODAL', modalName);
}

export function saveSubscription(store, { id, subscriptions }) {
  return ClassroomResource.saveModel({
    id: id,
    data: { subscriptions: subscriptions },
    exists: true,
  })
    .then(store.dispatch('displayModal', false))
    .catch(error => store.dispatch('handleApiError', error, { root: true }));
}
