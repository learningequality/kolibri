import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import find from 'lodash/find';
import { CollectionTypes } from '../../constants/lessonsConstants';

export function setUserData(store, params) {
  const { channelId, classId, contentNodeId } = params;
  const { learnerGroups, currentLesson } = store.state;
  const getLearnerGroup = userId => find(learnerGroups, g => g.user_ids.includes(userId)) || {};
  const isSamePage = params.isSamePage || samePageCheckGenerator(store);

  return UserReportResource.fetchCollection({
    getParams: {
      channel_id: channelId,
      collection_id: classId,
      collection_kind: CollectionTypes.CLASSROOM,
      content_node_id: contentNodeId,
    },
    force: true,
  }).then(userReports => {
    const getUserReport = userId => find(userReports, { id: userId }) || {};
    const userData = currentLesson.learner_ids.map(learnerId => {
      const { full_name, last_active, progress } = getUserReport(learnerId);
      return {
        id: learnerId,
        name: full_name,
        lastActive: last_active,
        groupName: getLearnerGroup(learnerId).name,
        progress: progress[0].total_progress,
      };
    });
    if (isSamePage()) {
      store.commit('SET_USER_DATA', userData);
    }
  });
}
