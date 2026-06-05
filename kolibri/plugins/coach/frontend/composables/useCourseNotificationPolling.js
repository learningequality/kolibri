import { watch } from 'vue';

export default function useCourseNotificationPolling(
  store,
  courseSessionId,
  onRelevantNotifications,
) {
  const initial = store.getters['coachNotifications/maxNotificationTimestamp'];
  let baselineMs = initial ? new Date(initial).getTime() : 0;

  watch(
    () => store.getters['coachNotifications/maxNotificationTimestamp'],
    newTimestamp => {
      if (!newTimestamp || !courseSessionId.value) return;
      const newMs = new Date(newTimestamp).getTime();
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
