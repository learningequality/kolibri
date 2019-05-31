import { ClassroomResource } from 'kolibri.resources';

export function displayModal(store, modalName) {
  store.commit('SET_SUBSCRIPTION_MODAL', modalName);
}

export function saveSubscription(store, subData) {
  return ClassroomResource.saveModel({
    id: subData.id,
    data: { subscriptions: subData.choices },
    exists: true,
  })
    .then(store.dispatch('displayModal', false))
    .catch(error => store.dispatch('handleApiError', error, { root: true }));
}

export function getDbSubscribedChannels(store, id) {
  return ClassroomResource.fetchModel({ id: id }).then(
    channelsData => {
      return channelsData.subscriptions;
    },
    error => {
      store.dispatch('handleApiError', error);
      return error;
    }
  );
}
