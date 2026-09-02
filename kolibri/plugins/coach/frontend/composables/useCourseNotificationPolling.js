import { watch } from 'vue';

// courseSessionId is a ref to the single course session to filter on, or
// `null` for classroom-wide mode (any new notification is relevant, since
// coachNotifications is already scoped to the current classroom).
export default function useCourseNotificationPolling(
  store,
  courseSessionId,
  onRelevantNotifications,
  classId,
) {
  const initial = store.getters['coachNotifications/maxNotificationTimestamp'];
  let baselineMs = initial ? new Date(initial).getTime() : 0;

  watch(
    () => store.getters['coachNotifications/maxNotificationTimestamp'],
    newTimestamp => {
      if (!newTimestamp) return;
      const newMs = new Date(newTimestamp).getTime();
      if (newMs <= baselineMs) return;

      if (!courseSessionId) {
        // Classroom-wide mode: coachNotifications is already scoped to the
        // current classroom, so any advance in the timestamp is relevant.
        const notifications = store.state.coachNotifications.notifications;
        const hasRelevant = notifications.some(
          n =>
            n.course_session_id &&
            (!classId || n.classroom_id === classId.value) &&
            new Date(n.timestamp).getTime() > baselineMs,
        );
        baselineMs = newMs;
        if (hasRelevant) {
          onRelevantNotifications();
        }
        return;
      }

      if (!courseSessionId.value) return;
      const notifications = store.state.coachNotifications.notifications;
      const hasRelevant = notifications.some(
        n =>
          n.course_session_id === courseSessionId.value &&
          new Date(n.timestamp).getTime() > baselineMs,
      );
      if (hasRelevant) {
        baselineMs = newMs;
        onRelevantNotifications();
      }
    },
  );
}
