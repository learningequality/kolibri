import { ClassroomResource, LearnerGroupResource } from 'kolibri.resources';

export function displaySubscriptionModal(store, modalName) {
  store.commit('SET_SUBSCRIPTION_MODAL', modalName);
}

export function testMethod(store) {
  store.commit('SET_SUBSCRIPTIONS', '');
}

export function saveSubscription(store, subData) {
  return ClassroomResource.saveModel({
    id: subData.id,
    data: { subscriptions: subData.choices },
    exists: true,
  })
    .then()
    .catch(error => store.dispatch('handleApiError', error, { root: true }));
}

export function updateGroupSubscriptions(store, classSelectedSubs) {
  LearnerGroupResource.fetchCollection().then(
    groupCollection => {
      let resultArray = undefined;
      groupCollection.forEach(function(group) {
        let jsonSubs = JSON.parse(group.subscriptions);
        resultArray = jsonSubs;
        jsonSubs.forEach(function(sub) {
          let check = classSelectedSubs.includes(sub);
          if (!check) {
            resultArray.splice(resultArray.indexOf(sub), 1);
          }
        });
        saveGroupSubscription(store, {
          id: group.id,
          choices: JSON.stringify(resultArray),
        });
      });
    },
    error => {
      store.dispatch('handleApiError', error);
      return error;
    }
  );
}

export function saveGroupSubscription(store, subData) {
  return LearnerGroupResource.saveModel({
    id: subData.id,
    data: { subscriptions: subData.choices },
    exists: true,
  })
    .then()
    .catch(error => store.dispatch('handleApiError', error, { root: true }));
}

export function getChannelsFromDatabase(store, id) {
  ClassroomResource.fetchModel({ id: id }).then(
    channelsData => {
      store.commit('SET_SUBSCRIPTIONS', channelsData.subscriptions);
    },
    error => {
      store.dispatch('handleApiError', error);
      return error;
    }
  );
}

export function getGroupChannelsFromDatabase(store, id) {
  LearnerGroupResource.fetchModel({ id: id }).then(
    channelsData => {
      store.commit('SET_GROUP_SUBSCRIPTIONS', channelsData.subscriptions);
    },
    error => {
      store.dispatch('handleApiError', error);
      return error;
    }
  );
}
