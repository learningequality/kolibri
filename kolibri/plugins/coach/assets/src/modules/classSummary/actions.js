import { NotificationObjects } from '../../constants/notificationsConstants';

const { QUIZ, LESSON, RESOURCE } = NotificationObjects;

// Updates examLearnerStatusMap and contentLearnerStatusMap
// when new notifications appear in coachNotifications module.
export function updateWithNotifications(store, notifications) {
  const examLearnerStatusMapUpdates = [];
  const contentLearnerStatusMapUpdates = [];
  const { learnerMap, examMap, contentNodeMap, lessonMap } = store.state;

  for (let nIdx in notifications) {
    const notification = notifications[nIdx];
    const { object } = notification;

    // Short-circuit the update if there are missing learners, exams, lessons,
    // or content nodes in classSummary.
    let reloadSummary = false;

    reloadSummary = reloadSummary || !learnerMap[notification.user_id];

    if (object === QUIZ) {
      reloadSummary = reloadSummary || !examMap[notification.quiz_id];
    }
    if (object === LESSON || object === RESOURCE) {
      reloadSummary = reloadSummary || !lessonMap[notification.lesson_id];
    }
    if (object === RESOURCE) {
      reloadSummary = reloadSummary || !contentNodeMap[notification.contentnode_id];
    }

    if (reloadSummary) return store.dispatch('loadClassSummary', store.state.id);

    const update = {
      learner_id: notification.user_id,
      status: notification.event,
      last_activity: new Date(notification.timestamp),
    };

    if (object === RESOURCE) {
      contentLearnerStatusMapUpdates.push({
        ...update,
        content_id: contentNodeMap[notification.contentnode_id].content_id,
      });
    }

    if (object === QUIZ) {
      // May not be necessary to add the status in the backend.
      // If so - then remove this.
      if (update.status === 'Answered') {
        update.status = 'Started';
      }
      examLearnerStatusMapUpdates.push({
        ...update,
        num_correct: notification.quiz_num_correct,
        num_answered: notification.quiz_num_answered,
        exam_id: notification.quiz_id,
      });
    }
  }

  store.commit('APPLY_NOTIFICATION_UPDATES', {
    examLearnerStatusMapUpdates,
    contentLearnerStatusMapUpdates,
  });
}
