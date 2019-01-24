import Vue from 'kolibri.lib.vue';
import ClassSummaryResource from '../../apiResources/classSummary';

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
        [id]: { id, active, title, node_ids: [id, ...], groups: [id, ...] }
      }
    */
    examMap: {},
    /*
      examLearnerStatusMap := {
        [exam_id]: {
          [learner_id]: { exam_id, learner_id, status, last_activity }
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
function itemMap(items, key) {
  const itemMap = {};
  items.forEach(item => {
    itemMap[item[key]] = item;
  });
  return itemMap;
}

// return a map of keys to maps of learner ids to statuses
function statusMap(statuses, key, itemIds) {
  const statusMap = {};
  itemIds.forEach(id => (statusMap[id] = {}));
  statuses.forEach(status => {
    statusMap[status[key]][status.learner_id] = status;
  });
  return statusMap;
}

export default {
  namespaced: true,
  state: defaultState(),
  getters: {
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
    examLearnerStatuses(state) {
      return Object.values(state.examLearnerStatusMap);
    },
    content(state) {
      return Object.values(state.contentMap);
    },
    contentLearnerStatuses(state) {
      return Object.values(state.contentLearnerStatusMap);
    },
    lessons(state) {
      return Object.values(state.lessonMap);
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
    SET_STATE(state, payload) {
      Object.assign(state, payload);
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
        // convert dates
        summary.exam_learner_status.forEach(status => {
          status.last_activity = new Date(status.last_activity);
        });
        summary.content_learner_status.forEach(status => {
          status.last_activity = new Date(status.last_activity);
        });
        store.commit('SET_STATE', {
          id: summary.id,
          name: summary.name,
          coachMap: itemMap(summary.coaches, 'id'),
          learnerMap: itemMap(summary.learners, 'id'),
          groupMap: itemMap(summary.groups, 'id'),
          examMap: itemMap(summary.exams, 'id'),
          examStatusMap: statusMap(
            summary.exam_learner_status,
            'exam_id',
            summary.exams.map(exam => exam.id)
          ),
          contentMap: itemMap(summary.content, 'content_id'),
          contentNodeMap: itemMap(summary.content, 'node_id'),
          lessonMap: itemMap(summary.lessons, 'id'),
        });
      });
    },
  },
  modules: {},
};
