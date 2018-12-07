import { RecentReports, TopicReports, LearnerReports } from '../../constants';
import { filterAndSortUsers } from '../../../../../facility_management/assets/src/userSearchUtils';

export default {
  getCurrentClassroom(state) {
    return state.classList.find(({ id }) => id === state.classId);
  },
  classMemberCount(state, getters) {
    const cls = getters.getCurrentClassroom;
    if (cls) {
      return cls.learner_count;
    }
    return 0;
  },
  classCoaches(state) {
    return filterAndSortUsers(state.classCoaches, () => true, 'full_name');
  },
  isRecentPage(state) {
    return RecentReports.includes(state.pageName);
  },
  isTopicPage(state) {
    return TopicReports.includes(state.pageName);
  },
  isLearnerPage(state) {
    return LearnerReports.includes(state.pageName);
  },
  numberOfAssignedClassrooms(state) {
    return state.classList.length;
  },
};
