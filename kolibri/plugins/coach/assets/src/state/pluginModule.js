import mutations from './mutations';
import * as examActions from './actions/exam';
import * as groupActions from './actions/group';
import * as lessonReportActions from './actions/lessonReportsActions';
import * as lessonsActions from './actions/lessons';
import * as mainActions from './actions/main';
import * as reportsActions from './actions/reports';
import * as classesGetters from './getters/classes';
import * as mainGetters from './getters/main';

export default {
  state: {
    pageName: '',
    pageState: {},
    classId: null,
    className: null,
    classList: [],
    classCoaches: [],
    currentClassroom: {},
    busy: false,
  },
  actions: {
    ...examActions,
    ...groupActions,
    ...lessonReportActions,
    ...lessonsActions,
    ...mainActions,
    ...reportsActions,
  },
  getters: {
    // These are the only set of safe getters, since they don't pull from
    // pageState. Don't register the others.
    ...classesGetters,
    ...mainGetters,
  },
  mutations,
};
