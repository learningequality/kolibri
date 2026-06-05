import { nextTick, reactive, ref } from 'vue';
import useCourseNotificationPolling from '../useCourseNotificationPolling';

// makeStore builds a Vuex-shaped object. Pass `notifications: reactive([])`
// and mutate it to simulate notifications arriving after setup.
function makeStore({ timestamp = 0, notifications = [] } = {}) {
  const storeGetters = reactive({
    'coachNotifications/maxNotificationTimestamp': timestamp,
  });
  const storeState = reactive({
    coachNotifications: { notifications },
  });
  return { getters: storeGetters, state: storeState };
}

describe('useCourseNotificationPolling', () => {
  it('does not fire during setup, treating pre-existing notifications as the baseline', async () => {
    const store = makeStore({
      timestamp: '2024-01-01T09:00:00Z',
      notifications: [
        { id: 1, course_session_id: 'session-123', timestamp: '2024-01-01T09:00:00Z' },
      ],
    });
    const callback = jest.fn();

    useCourseNotificationPolling(store, ref('session-123'), callback);
    await nextTick();

    expect(callback).not.toHaveBeenCalled();
  });

  it('fires when a new notification arrives for the current course session', async () => {
    const notifications = reactive([]);
    const store = makeStore({ notifications });
    const callback = jest.fn();

    useCourseNotificationPolling(store, ref('session-123'), callback);

    notifications.push({
      id: 1,
      course_session_id: 'session-123',
      timestamp: '2024-01-01T10:00:00Z',
    });
    store.getters['coachNotifications/maxNotificationTimestamp'] = '2024-01-01T10:00:00Z';

    await nextTick();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('ignores new notifications for a different or absent course session', async () => {
    const notifications = reactive([]);
    const store = makeStore({ notifications });
    const callback = jest.fn();

    useCourseNotificationPolling(store, ref('session-123'), callback);

    notifications.push(
      { id: 1, course_session_id: 'other-session', timestamp: '2024-01-01T10:00:00Z' },
      { id: 2, course_session_id: null, timestamp: '2024-01-01T10:01:00Z' },
    );
    store.getters['coachNotifications/maxNotificationTimestamp'] = '2024-01-01T10:01:00Z';

    await nextTick();
    expect(callback).not.toHaveBeenCalled();
  });

  it('does not fire while the course session is unknown', async () => {
    const notifications = reactive([]);
    const store = makeStore({ notifications });
    const callback = jest.fn();

    useCourseNotificationPolling(store, ref(null), callback);

    notifications.push({ id: 1, course_session_id: null, timestamp: '2024-01-01T10:00:00Z' });
    store.getters['coachNotifications/maxNotificationTimestamp'] = '2024-01-01T10:00:00Z';

    await nextTick();
    expect(callback).not.toHaveBeenCalled();
  });

  it('fires once when several matching notifications arrive in one batch', async () => {
    const notifications = reactive([]);
    const store = makeStore({ notifications });
    const callback = jest.fn();

    useCourseNotificationPolling(store, ref('session-123'), callback);

    notifications.push(
      { id: 1, course_session_id: 'session-123', timestamp: '2024-01-01T10:00:00Z' },
      { id: 2, course_session_id: 'session-123', timestamp: '2024-01-01T10:01:00Z' },
    );
    store.getters['coachNotifications/maxNotificationTimestamp'] = '2024-01-01T10:01:00Z';

    await nextTick();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('advances the baseline so an earlier notification does not re-trigger on the next poll', async () => {
    const notifications = reactive([]);
    const store = makeStore({ notifications });
    const callback = jest.fn();

    useCourseNotificationPolling(store, ref('session-123'), callback);

    notifications.push({
      id: 1,
      course_session_id: 'session-123',
      timestamp: '2024-01-01T10:00:00Z',
    });
    store.getters['coachNotifications/maxNotificationTimestamp'] = '2024-01-01T10:00:00Z';
    await nextTick();
    expect(callback).toHaveBeenCalledTimes(1);

    // A later, non-matching notification bumps the timestamp; id 1 is now below the
    // advanced baseline, so it is not counted as new again.
    notifications.push({
      id: 2,
      course_session_id: 'other-session',
      timestamp: '2024-01-01T10:02:00Z',
    });
    store.getters['coachNotifications/maxNotificationTimestamp'] = '2024-01-01T10:02:00Z';
    await nextTick();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
