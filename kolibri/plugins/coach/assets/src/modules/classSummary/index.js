import get from 'lodash/get';
import some from 'lodash/some';
import every from 'lodash/every';
import flatten from 'lodash/flatten';

import Vue from 'kolibri.lib.vue';
import ClassSummaryResource from '../../apiResources/classSummary';
import dataHelpers from './dataHelpers';
import { STATUSES } from './constants';

function defaultState() {
  return {
    id: null,
    name: '',
    /*
      coachMap := {
        [id]: { id, name, username }
      }
    */
    coachMap: {},
    /*
      learnerMap := {
        [id]: { id, name, username }
      }
    */
    learnerMap: {},
    /*
      groupMap := {
        [id]: { id, name, member_ids: [id, ...] }
      }
    */
    groupMap: {},
    /*
      examMap := {
        [id]: {
          id,
          active,
          title,
          question_sources: [{exercise_id, question_id}, ...],
          groups: [id, ...],
        }
      }
    */
    examMap: {},
    /*
      examLearnerStatusMap := {
        [exam_id]: {
          [learner_id]: { exam_id, learner_id, status, last_activity, num_correct, score }
        }
      }
    */
    examLearnerStatusMap: {},
    /*
      contentMap := {
        [id]: { content_id, node_id, kind, title }
      }
    */
    contentMap: {},
    /*
      contentMap := {
        [node_id]: { content_id, node_id, kind, title }
      }
    */
    contentNodeMap: {},
    /*
      contentLearnerStatusMap := {
        [content_id]: {
          [learner_id]: { content_id, learner_id, status, last_activity }
        }
      }
    */
    contentLearnerStatusMap: {},
    /*
      lessonMap := {
        [id]: { id, active, title, node_ids: [id, ...], groups: [id, ...] }
      }
    */
    lessonMap: {},
  };
}

// return a map of keys to items
export function _itemMap(items, key) {
  const itemMap = {};
  items.forEach(item => {
    itemMap[item[key]] = item;
  });
  return itemMap;
}

// return a map of keys to maps of learner ids to statuses
export function _statusMap(statuses, key) {
  const statusMap = {};
  statuses.forEach(status => {
    if (!statusMap[status[key]]) {
      statusMap[status[key]] = {};
    }
    statusMap[status[key]][status.learner_id] = status;
  });
  return statusMap;
}

function _lessonStatusForLearner(state, lessonId, learnerId) {
  const lesson = state.lessonMap[lessonId];
  const statuses = lesson.node_ids.map(node_id => {
    if (!state.contentNodeMap[node_id]) {
      return { status: STATUSES.notStarted };
    }
    const content_id = state.contentNodeMap[node_id].content_id;
    return get(state.contentLearnerStatusMap, [content_id, learnerId], {
      status: STATUSES.notStarted,
    });
  });
  if (some(statuses, { status: STATUSES.helpNeeded })) {
    return STATUSES.helpNeeded;
  }
  if (every(statuses, { status: STATUSES.completed })) {
    return STATUSES.completed;
  }
  if (every(statuses, { status: STATUSES.notStarted })) {
    return STATUSES.notStarted;
  }
  return STATUSES.started;
}

export default {
  namespaced: true,
  state: defaultState(),
  getters: {
    ...dataHelpers,
    coaches(state) {
      return Object.values(state.coachMap);
    },
    learners(state) {
      return Object.values(state.learnerMap);
    },
    groups(state) {
      return Object.values(state.groupMap);
    },
    exams(state) {
      return Object.values(state.examMap);
    },
    examStatuses(state) {
      return flatten(
        Object.values(state.examLearnerStatusMap).map(learnerMap => Object.values(learnerMap))
      );
    },
    content(state) {
      return Object.values(state.contentMap);
    },
    contentStatuses(state) {
      return flatten(
        Object.values(state.contentLearnerStatusMap).map(learnerMap => Object.values(learnerMap))
      );
    },
    lessons(state) {
      return Object.values(state.lessonMap);
    },
    lessonStatuses(state, getters) {
      return flatten(
        Object.values(getters.lessonLearnerStatusMap).map(learnerMap => Object.values(learnerMap))
      );
    },
    lessonLearnerStatusMap(state) {
      const map = {};
      Object.values(state.lessonMap).forEach(lesson => {
        map[lesson.id] = {};
        Object.values(state.learnerMap).forEach(learner => {
          map[lesson.id][learner.id] = _lessonStatusForLearner(state, lesson.id, learner.id);
        });
      });
      return map;
    },
    // Adapter used in 'coachNotifications' module. Make sure this getter is updated
    // whenever this module's state changes.
    notificationModuleData(state) {
      return {
        learners: state.learnerMap,
        learnerGroups: state.groupMap,
        lessons: state.lessonMap,
        exams: state.examMap,
        classId: state.id,
        className: state.name,
      };
    },
  },
  mutations: {
    SET_STATE(state, summary) {
      const examMap = _itemMap(summary.exams, 'id');
      summary.exam_learner_status.forEach(status => {
        // convert dates
        status.last_activity = new Date(status.last_activity);
        // convert quiz scores to percentages from integer counts of correct answers
        if (status.num_correct === null) {
          status.score = null;
        } else {
          status.score =
            (1.0 * status.num_correct) / examMap[status.exam_id].question_sources.length;
        }
      });
      summary.content_learner_status.forEach(status => {
        // convert dates
        status.last_activity = new Date(status.last_activity);
      });
      summary.exam_learner_status;
      Object.assign(state, {
        id: summary.id,
        name: summary.name,
        coachMap: _itemMap(summary.coaches, 'id'),
        learnerMap: _itemMap(summary.learners, 'id'),
        groupMap: _itemMap(summary.groups, 'id'),
        examMap,
        examLearnerStatusMap: _statusMap(summary.exam_learner_status, 'exam_id'),
        contentMap: _itemMap(summary.content, 'content_id'),
        contentNodeMap: _itemMap(summary.content, 'node_id'),
        contentLearnerStatusMap: _statusMap(summary.content_learner_status, 'content_id'),
        lessonMap: _itemMap(summary.lessons, 'id'),
      });
    },
    CREATE_ITEM(state, { map, id, object }) {
      state[map] = {
        ...state[map],
        [id]: object,
      };
    },
    UPDATE_ITEM(state, { map, id, object }) {
      Object.assign(state[map][id], object);
    },
    DELETE_ITEM(state, { map, id }) {
      Vue.delete(state[map], id);
    },
  },
  actions: {
    loadClassSummary(store, classId) {
      return ClassSummaryResource.fetchModel({ id: classId, force: true }).then(summary => {
        store.commit('SET_STATE', summary);
      });
    },
  },
  modules: {},
};
