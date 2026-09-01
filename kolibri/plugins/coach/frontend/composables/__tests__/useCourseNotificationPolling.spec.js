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

  describe('classroom-wide mode (courseSessionId is null)', () => {
    // coachNotifications is already scoped to the current classroom (see
    // modules/coachNotifications/index.js), so callers with no single
    // course session to filter on (e.g. the Courses table) pass `null`
    // for courseSessionId and get notified of any new notification.

    it('does not fire during setup, treating the existing timestamp as the baseline', async () => {
      const store = makeStore({ timestamp: '2024-01-01T09:00:00Z' });
      const callback = jest.fn();

      useCourseNotificationPolling(store, null, callback);
      await nextTick();

      expect(callback).not.toHaveBeenCalled();
    });

    it('fires for a course-related notification, regardless of which session', async () => {
      const notifications = reactive([]);
      const store = makeStore({ notifications });
      const callback = jest.fn();

      useCourseNotificationPolling(store, null, callback);

      notifications.push({
        id: 1,
        course_session_id: 'some-other-session',
        timestamp: '2024-01-01T10:00:00Z',
      });
      store.getters['coachNotifications/maxNotificationTimestamp'] = '2024-01-01T10:00:00Z';

      await nextTick();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('ignores a notification with no course_session_id (e.g. a lesson or exercise event)', async () => {
      const notifications = reactive([]);
      const store = makeStore({ notifications });
      const callback = jest.fn();

      useCourseNotificationPolling(store, null, callback);

      notifications.push({
        id: 1,
        course_session_id: null,
        timestamp: '2024-01-01T10:00:00Z',
      });
      store.getters['coachNotifications/maxNotificationTimestamp'] = '2024-01-01T10:00:00Z';

      await nextTick();
      expect(callback).not.toHaveBeenCalled();
    });

    it('does not fire again if the timestamp is unchanged', async () => {
      const notifications = reactive([
        { id: 1, course_session_id: 'session-123', timestamp: '2024-01-01T10:00:00Z' },
      ]);
      const store = makeStore({ timestamp: '2024-01-01T10:00:00Z', notifications });
      const callback = jest.fn();

      useCourseNotificationPolling(store, null, callback);

      // Advance once - the callback should fire and the baseline should move.
      notifications.push({
        id: 2,
        course_session_id: 'session-123',
        timestamp: '2024-01-01T10:01:00Z',
      });
      store.getters['coachNotifications/maxNotificationTimestamp'] = '2024-01-01T10:01:00Z';
      await nextTick();
      expect(callback).toHaveBeenCalledTimes(1);

      // Reassigning an earlier timestamp is a genuine change (from Vue's
      // perspective) but should be rejected by the newMs <= baselineMs guard.
      store.getters['coachNotifications/maxNotificationTimestamp'] = '2024-01-01T10:00:30Z';
      await nextTick();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    describe('scoped to the current classroom', () => {
      it('ignores a notification for a different classroom', async () => {
        const notifications = reactive([]);
        const store = makeStore({ notifications });
        const callback = jest.fn();
        const classId = ref('classroom-123');

        useCourseNotificationPolling(store, null, callback, classId);

        notifications.push({
          id: 1,
          course_session_id: 'session-123',
          classroom_id: 'other-classroom',
          timestamp: '2024-01-01T10:00:00Z',
        });
        store.getters['coachNotifications/maxNotificationTimestamp'] = '2024-01-01T10:00:00Z';

        await nextTick();
        expect(callback).not.toHaveBeenCalled();
      });

      it('fires for a notification matching the current classroom', async () => {
        const notifications = reactive([]);
        const store = makeStore({ notifications });
        const callback = jest.fn();
        const classId = ref('classroom-123');

        useCourseNotificationPolling(store, null, callback, classId);

        notifications.push({
          id: 1,
          course_session_id: 'session-123',
          classroom_id: 'classroom-123',
          timestamp: '2024-01-01T10:00:00Z',
        });
        store.getters['coachNotifications/maxNotificationTimestamp'] = '2024-01-01T10:00:00Z';

        await nextTick();
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });
  });
});
