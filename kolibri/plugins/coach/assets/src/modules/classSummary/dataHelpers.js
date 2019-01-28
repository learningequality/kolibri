import map from 'lodash/map';
import get from 'lodash/get';
import sortBy from 'lodash/sortBy';
import some from 'lodash/some';
import every from 'lodash/every';
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
  lessonStatusForLearner(lessonId, learnerId) {
    const lesson = store.state.lessonMap[lessonId];
    const statuses = lesson.node_ids.map(node_id => {
      const content_id = store.state.contentNodeMap[node_id].content_id;
      return get(store.state.contentLearnerStatusMap, [content_id, learnerId], {
        status: NOT_STARTED,
      });
    });
    if (some(statuses, { status: HELP_NEEDED })) {
      return HELP_NEEDED;
    }
    if (every(statuses, { status: COMPLETED })) {
      return COMPLETED;
    }
    if (every(statuses, { status: NOT_STARTED })) {
      return NOT_STARTED;
    }
    return STARTED;
  },
  examStatusForLearner(examId, learnerId) {
    return get(store.state.examLearnerStatusMap, [examId, learnerId, 'status'], NOT_STARTED);
  },
  sortBy,
};
