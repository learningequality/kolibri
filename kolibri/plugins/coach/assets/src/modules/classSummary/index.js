import get from 'lodash/get';
import set from 'lodash/set';
import flatten from 'lodash/flatten';
import find from 'lodash/find';

import Vue from 'kolibri.lib.vue';
import ClassSummaryResource from '../../apiResources/classSummary';
import dataHelpers from './dataHelpers';
import { STATUSES } from './constants';
import { updateWithNotifications } from './actions';

function defaultState() {
  return {
    id: null,
    name: '',
    /*
     * coachMap := {
     *   [id]: { id, name, username }
     * }
     */
    coachMap: {},
    /*
     * learnerMap := {
     *   [id]: { id, name, username }
     * }
     */
    learnerMap: {},
    /*
     * groupMap := {
     *   [id]: { id, name, member_ids: [id, ...] }
     * }
     */
    groupMap: {},
    /*
     * examMap := {
     *   [id]: {
     *     id,
     *     active,
     *     title,
     *     question_sources: [{exercise_id, question_id}, ...],
     *     groups: [id, ...],
     *     data_model_version,
     *     question_count,
     *   }
     * }
     */
    adHocGroupsMap: {},
    /*
     * adHocLearners := {
     *  [collection_id]: {
     *    id,
     *    member_ids: [user_id, ...]
     *  },
     * }
     */
    examMap: {},
    /*
     * examLearnerStatusMap := {
     *   [exam_id]: {
     *     [learner_id]: { exam_id, learner_id, status, last_activity, num_correct, score }
     *   }
     * }
     */
    examLearnerStatusMap: {},
    /*
     * contentMap := {
     *   [content_id]: { content_id, node_id, kind, title }
     * }
     */
    contentMap: {},
    /*
     * contentNodeMap := {
     *   [node_id]: { content_id, node_id, kind, title }
     * }
     */
    contentNodeMap: {},
    /*
     * contentLearnerStatusMap := {
     *   [content_id]: {
     *     [learner_id]: { content_id, learner_id, status, last_activity }
     *   }
     * }
     */
    contentLearnerStatusMap: {},
    /*
     * lessonMap := {
     *   [id]: { id, active, title, node_ids: [id, ...], groups: [id, ...] }
     * }
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
  // Add trap door for lesson status, if a lesson has no resources
  // make it impossible for a learner to be registered as anything
  // but not started.
  if (lesson.node_ids.length === 0) {
    return STATUSES.notStarted;
  }
  const statuses = lesson.node_ids.map(node_id => {
    if (!state.contentNodeMap[node_id]) {
      return { status: STATUSES.notStarted };
    }
    const content_id = state.contentNodeMap[node_id].content_id;
    return {
      status: get(
        state.contentLearnerStatusMap,
        [content_id, learnerId, 'status'],
        STATUSES.notStarted
      ),
    };
  });

  const tally = {
    [STATUSES.started]: 0,
    [STATUSES.notStarted]: 0,
    [STATUSES.completed]: 0,
    [STATUSES.helpNeeded]: 0,
  };
  statuses.forEach(status => {
    tally[status.status] += 1;
  });
  if (tally[STATUSES.helpNeeded]) {
    return STATUSES.helpNeeded;
  }
  if (tally[STATUSES.completed] === statuses.length) {
    return STATUSES.completed;
  }
  if (tally[STATUSES.notStarted] === statuses.length) {
    return STATUSES.notStarted;
  }
  return STATUSES.started;
}

// convert quiz scores to percentages from integer counts of correct answers
function _score(numCorrect, numQuestions) {
  if (numCorrect === null || numCorrect === undefined) {
    return null;
  }
  return (1.0 * numCorrect) / numQuestions;
}

export default {
  namespaced: true,
  state: defaultState(),
  getters: {
    ...dataHelpers,
    /*
     * coaches := [
     *   { id, name, username }, ...
     * ]
     */
    coaches(state) {
      return Object.values(state.coachMap);
    },
    /*
     * learners := [
     *   { id, name, username }, ...
     * ]
     */
    learners(state) {
      return Object.values(state.learnerMap);
    },
    /*
     * adHocGroups := [
     *   { id, member_ids: [id, ...] }, ...
     * ]
     ]
     */
    adHocGroups(state) {
      return Object.values(state.adHocGroupsMap);
    },
    /*
     * groups := [
     *   { id, name, member_ids: [id, ...] }, ...
     * ]
     */
    groups(state) {
      return Object.values(state.groupMap);
    },
    /*
     * exams := [
     *   {
     *     id,
     *     active,
     *     title,
     *     question_sources: [{exercise_id, question_id}, ...],
     *     groups: [id, ...],
     *   },
     *   ...
     * ]
     */
    exams(state) {
      return Object.values(state.examMap);
    },
    /*
     * examStatuses := [
     *   { exam_id, learner_id, status, last_activity }, ...
     * ]
     */
    examStatuses(state) {
      return flatten(
        Object.values(state.examLearnerStatusMap).map(learnerMap => Object.values(learnerMap))
      );
    },
    /*
     * content := [
     *   { content_id, node_id, kind, title }, ...
     * ]
     */
    content(state) {
      return Object.values(state.contentMap);
    },
    /*
     * contentStatuses := [
     *   { content_id, learner_id, status, last_activity }, ...
     * ]
     */
    contentStatuses(state) {
      return flatten(
        Object.values(state.contentLearnerStatusMap).map(learnerMap => Object.values(learnerMap))
      );
    },
    /*
     * lessons := [
     *   { id, active, title, node_ids: [id, ...], groups: [id, ...] }, ...
     * ]
     */
    lessons(state) {
      return Object.values(state.lessonMap);
    },
    /*
     * lessonStatuses := [
     *   { lesson_id, learner_id, status, last_activity }, ...
     * ]
     */
    lessonStatuses(state, getters) {
      return flatten(
        Object.values(getters.lessonLearnerStatusMap).map(learnerMap => Object.values(learnerMap))
      );
    },
    /*
     * lessonLearnerStatusMap := {
     *   [lesson_id]: {
     *     [learner_id]: { lesson_id, learner_id, status, last_activity }
     *   }
     * }
     */
    lessonLearnerStatusMap(state) {
      const map = {};
      Object.values(state.lessonMap).forEach(lesson => {
        map[lesson.id] = {};
        Object.values(state.learnerMap).forEach(learner => {
          let last = null;
          // for all content items this learner has interacted with
          // determine the latest interaction activity
          Object.values(lesson.node_ids).forEach(node_id => {
            const content_id = get(state.contentNodeMap, [node_id, 'content_id'], null);
            const last_activity = get(
              state.contentLearnerStatusMap,
              [content_id, learner.id, 'last_activity'],
              null
            );
            if (last_activity > last) {
              last = last_activity;
            }
          });
          map[lesson.id][learner.id] = {
            lesson_id: lesson.id,
            learner_id: learner.id,
            status: _lessonStatusForLearner(state, lesson.id, learner.id),
            last_activity: last,
          };
        });
      });
      return map;
    },
    quizTitleUnavailable(state, getters) {
      const normalize = title => title.trim().toUpperCase();
      return function finder({ title, excludeId }) {
        return find(
          getters.exams,
          exam => exam.id !== excludeId && normalize(exam.title) === normalize(title)
        );
      };
    },
    lessonTitleUnavailable(state, getters) {
      const normalize = title => title.trim().toUpperCase();
      return function finder({ title, excludeId }) {
        return find(
          getters.lessons,
          lesson => lesson.id !== excludeId && normalize(lesson.title) === normalize(title)
        );
      };
    },
    // Adapter used in 'coachNotifications' module. Make sure this getter is updated
    // whenever this module's state changes.
    notificationModuleData(state) {
      return {
        adHocGroupsMap: state.adHocGroupsMap,
        learners: state.learnerMap,
        learnerGroups: state.groupMap,
        lessons: state.lessonMap,
        exams: state.examMap,
        classId: state.id,
        className: state.name,
        contentNodes: state.contentNodeMap,
      };
    },
  },
  mutations: {
    SET_STATE(state, summary) {
      const examMap = _itemMap(summary.exams, 'id');
      const lessonMap = _itemMap(summary.lessons, 'id');
      Object.values(examMap).forEach(exam => {
        // convert dates
        exam.date_created = new Date(exam.date_created);
      });
      Object.values(lessonMap).forEach(lesson => {
        // convert dates
        lesson.date_created = new Date(lesson.date_created);
      });
      summary.exam_learner_status.forEach(status => {
        // convert dates
        status.last_activity = status.last_activity ? new Date(status.last_activity) : null;
        status.score = _score(status.num_correct, examMap[status.exam_id].question_count);
      });
      summary.content_learner_status.forEach(status => {
        // convert dates
        status.last_activity = status.last_activity ? new Date(status.last_activity) : null;
      });
      Object.assign(state, {
        id: summary.id,
        name: summary.name,
        coachMap: _itemMap(summary.coaches, 'id'),
        learnerMap: _itemMap(summary.learners, 'id'),
        groupMap: _itemMap(summary.groups, 'id'),
        adHocGroupsMap: _itemMap(summary.adhoclearners, 'id'),
        examMap,
        examLearnerStatusMap: _statusMap(summary.exam_learner_status, 'exam_id'),
        contentMap: _itemMap(summary.content, 'content_id'),
        contentNodeMap: _itemMap(summary.content, 'node_id'),
        contentLearnerStatusMap: _statusMap(summary.content_learner_status, 'content_id'),
        lessonMap,
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
    APPLY_NOTIFICATION_UPDATES(state, updates) {
      const { contentLearnerStatusMap, examLearnerStatusMap } = state;
      const { contentLearnerStatusMapUpdates, examLearnerStatusMapUpdates } = updates;

      contentLearnerStatusMapUpdates.forEach(update => {
        const path = [update.content_id, update.learner_id];
        const currentStatus = get(contentLearnerStatusMap, path);
        if (currentStatus) {
          Object.assign(currentStatus, update);
        } else {
          set(state.contentLearnerStatusMap, path, {
            ...update,
            time_spent: 0,
          });
        }
      });

      examLearnerStatusMapUpdates.forEach(update => {
        const path = [update.exam_id, update.learner_id];
        const scoredUpdate = {
          ...update,
          score: _score(update.num_correct, state.examMap[update.exam_id].question_count),
        };
        const currentStatus = get(examLearnerStatusMap, path);
        if (currentStatus) {
          Object.assign(currentStatus, scoredUpdate);
        } else {
          set(state.examLearnerStatusMap, path, scoredUpdate);
        }
      });

      state.examLearnerStatusMap = { ...state.examLearnerStatusMap };
      state.contentLearnerStatusMap = { ...state.contentLearnerStatusMap };
    },
  },
  actions: {
    updateWithNotifications,
    loadClassSummary(store, classId) {
      return ClassSummaryResource.fetchModel({ id: classId, force: true }).then(summary => {
        store.commit('SET_STATE', summary);
      });
    },
    refreshClassSummary(store) {
      return store.dispatch('loadClassSummary', store.state.id);
    },
  },
};
