import { IndividualLearnersGroupResource } from 'kolibri.resources';
import { addUsersToGroup, removeUsersFromGroup } from '../groups/actions';

/*
function _individualLearnersState(group) {
  return {
    id: group.id,
    users: [],
  };
}
*/

export function createIndividualLearnersGroup(store, { classId }) {
  return IndividualLearnersGroupResource.saveModel({
    data: {
      parent: classId,
      name: 'Individual learners',
    },
  }).then(payload => {
    store.commit('SET_INDIVIDUAL_LEARNERS', payload);
  });
}

export function updateIndividualLearnersGroup(store, user_ids) {
  return IndividualLearnersGroupResource.saveModel({
    id: store.state.id,
    data: {
      user_ids,
    },
    exists: true,
  }).then(payload => {
    store.commit('SET_INDIVIDUAL_LEARNERS', payload);
  });
}

export function initializeIndividualLearnersGroup(store, id) {
  return IndividualLearnersGroupResource.fetchModel({ id }).then(payload =>
    store.commit('SET_INDIVIDUAL_LEARNERS', payload)
  );
}

export { addUsersToGroup, removeUsersFromGroup };
