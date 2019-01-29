import map from 'lodash/map';
import get from 'lodash/get';
import flatten from 'lodash/flatten';
import { STATUSES } from './constants';

// getters that return lookup functions
export default {
  getGroupNames(state) {
    return function(groupIds) {
      return groupIds.map(id => state.groupMap[id].name);
    };
  },
  getLearnersForGroups(state) {
    return function(groupIds) {
      // an empty list is considered the whole class in the context of assignment
      if (!groupIds.length) {
        return map(state.learnerMap, 'id');
      }
      return flatten(map(groupIds, id => state.groupMap[id].member_ids));
    };
  },
  getContentStatusForLearner(state) {
    return function(contentId, learnerId) {
      return get(
        state.contentLearnerStatusMap,
        [contentId, learnerId, 'status'],
        STATUSES.notStarted
      );
    };
  },
  getExamStatusForLearner(state) {
    return function(examId, learnerId) {
      return get(state.examLearnerStatusMap, [examId, learnerId, 'status'], STATUSES.notStarted);
    };
  },
};
