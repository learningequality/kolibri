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
  }).then(group => {
    store.commit('SET_INDIVIDUAL_LEARNERS', group);
  });
}

export { addUsersToGroup, removeUsersFromGroup };
