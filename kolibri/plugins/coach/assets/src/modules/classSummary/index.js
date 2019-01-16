import ClassSummaryResource from '../../apiResources/new/classSummary';

function defaultState() {
  return {
    id: null,
    name: '',
    // [{ id, name, username }, ...]
    coaches: [],
    // [{ id, name, username }, ...]
    learners: [],
    // [{ id, name, member_ids: [id, ...] }, ...]
    groups: [],
    // [{ id, active, title, node_ids: [id, ...], groups: [id, ...] }, ...]
    exams: [],
    // [{ exam_id, learner_id, status, last_activity }, ...]
    exam_learner_status: [],
    // [{ content_id, node_id, kind, title }, ...]
    content: [],
    // [{ content_id, learner_id, status, last_activity }, ...]
    content_learner_status: [],
    // [{ id, active, title, node_ids: [id, ...], groups: [id, ...] }, ...]
    lessons: [],
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
    coachMap(state) {
      return itemMap(state.coaches, 'id');
    },
    learnerMap(state) {
      return itemMap(state.learners, 'id');
    },
    groupMap(state) {
      return itemMap(state.groups, 'id');
    },
    examMap(state) {
      return itemMap(state.exams, 'id');
    },
    examStatusMap(state) {
      return statusMap(state.exam_learner_status, 'exam_id', state.exams.map(exam => exam.id));
    },
    contentMap(state) {
      return itemMap(state.content, 'content_id');
    },
    contentNodeMap(state) {
      return itemMap(state.content, 'node_id');
    },
    lessonMap(state) {
      return itemMap(state.lessons, 'id');
    },
    // Adapter used in 'coachNotifications' module. Make sure this getter is updated
    // whenever this module's state changes.
    notificationModuleData(state) {
      return {
        learners: state.learners,
        learnerGroups: state.groups,
        lessons: state.lessons,
        exams: state.exams,
        classId: state.id,
        className: state.name,
      };
    },
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
  },
  actions: {
    loadClassSummary(store, classId) {
      return ClassSummaryResource.fetchModel({ id: classId }).then(summary => {
        // convert dates
        summary.exam_learner_status.forEach(status => {
          status.last_activity = new Date(status.last_activity);
        });
        summary.content_learner_status.forEach(status => {
          status.last_activity = new Date(status.last_activity);
        });
        store.commit('SET_STATE', summary);
      });
    },
  },
  modules: {},
};
