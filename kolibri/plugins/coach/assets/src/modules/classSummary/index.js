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

export default {
  namespaced: true,
  state: defaultState(),
  getters: {},
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
