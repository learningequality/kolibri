import map from 'lodash/map';
import get from 'lodash/get';
import sortBy from 'lodash/sortBy';
import flatten from 'lodash/flatten';
import store from './index';

const NOT_STARTED = 'not_started';
const STARTED = 'started';
const HELP_NEEDED = 'help_needed';
const COMPLETED = 'completed';

export default {
  groupNames(groupIds) {
    return groupIds.map(id => store.state.groupMap[id].name);
  },
  learnersForGroups(groupIds) {
    // an empty list is considered the whole class in the context of assignment
    if (!groupIds.length) {
      return map(store.state.learnerMap, 'id');
    }
    return flatten(map(groupIds, id => store.state.groupMap[id].member_ids));
  },
  examStatusForLearner(examId, learnerId) {
    return get(store.state.examLearnerStatusMap, [examId, learnerId, 'status'], NOT_STARTED);
  },
  sortBy,
};
