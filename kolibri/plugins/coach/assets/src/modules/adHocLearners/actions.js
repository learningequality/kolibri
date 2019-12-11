import { AdHocGroupResource } from 'kolibri.resources';
import { addUsersToGroup, removeUsersFromGroup } from '../groups/actions';

/*
function _adHocLearnersState(group) {
  return {
    id: group.id,
    users: [],
  };
}
*/

export function createAdHocLearnersGroup(store, { classId }) {
  return AdHocGroupResource.saveModel({
    data: {
      parent: classId,
      name: 'Individual learners',
    },
  }).then(payload => {
    store.commit('SET_INDIVIDUAL_LEARNERS', payload);
  });
}

export function updateLearnersInAdHocLearnersGroup(store, user_ids) {
  return AdHocGroupResource.saveModel({
    id: store.state.id,
    data: {
      user_ids,
    },
    exists: true,
  }).then(payload => {
    store.commit('SET_INDIVIDUAL_LEARNERS', payload);
  });
}

export function initializeAdHocLearnersGroup(store, id) {
  return AdHocGroupResource.fetchModel({ id }).then(payload =>
    store.commit('SET_INDIVIDUAL_LEARNERS', payload)
  );
}

export { addUsersToGroup, removeUsersFromGroup };
