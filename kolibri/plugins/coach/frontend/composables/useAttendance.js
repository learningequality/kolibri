import { ref, getCurrentInstance } from 'vue';
import { createTranslator } from 'kolibri/utils/i18n';
import AttendanceSessionResource from 'kolibri-common/apiResources/AttendanceSessionResource';

const attendanceStrings = createTranslator('AttendanceDateStrings', {
  attendanceDateTime: {
    message: '{date}, {time}',
    context:
      'Format for displaying attendance session date and time. {date} is a localized date string (e.g. 13-Feb-2026) and {time} is a localized time string (e.g. 14:30).',
  },
});

export default function useAttendance() {
  const instance = getCurrentInstance();
  const proxy = instance && instance.proxy;

  const attendanceLoading = ref(false);
  const sessions = ref([]);
  const currentSession = ref(null);
  const recentSessions = ref([]);

  async function fetchSessions(classId, params = {}) {
    attendanceLoading.value = true;
    try {
      const data = await AttendanceSessionResource.fetchCollection({
        getParams: { collection: classId, ...params },
      });
      sessions.value = data;
    } finally {
      attendanceLoading.value = false;
    }
  }

  async function fetchSession(sessionId) {
    attendanceLoading.value = true;
    try {
      const data = await AttendanceSessionResource.fetchModel({ id: sessionId });
      currentSession.value = data;
    } finally {
      attendanceLoading.value = false;
    }
  }

  async function fetchRecentSessions(classId, limit = 5) {
    const data = await AttendanceSessionResource.fetchRecentSessions({
      collection: classId,
      limit,
    });
    recentSessions.value = data;
  }

  async function createSession(sessionData) {
    return AttendanceSessionResource.saveModel({ data: sessionData });
  }

  async function updateSession(sessionId, sessionData) {
    return AttendanceSessionResource.saveModel({
      id: sessionId,
      data: sessionData,
    });
  }

  function formatAttendanceDateTime(dateInput) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (proxy && proxy.$formatDate) {
      const dateStr = proxy.$formatDate(d, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = proxy.$formatTime(d, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return attendanceStrings.$tr('attendanceDateTime', { date: dateStr, time: timeStr });
    }
    // Fallback for contexts without a Vue instance (e.g. tests)
    // Uses Intl.DateTimeFormat for proper locale-aware formatting
    const dateStr = new Intl.DateTimeFormat(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
    const timeStr = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
    return attendanceStrings.$tr('attendanceDateTime', { date: dateStr, time: timeStr });
  }

  return {
    attendanceLoading,
    sessions,
    currentSession,
    recentSessions,
    fetchSessions,
    fetchSession,
    fetchRecentSessions,
    createSession,
    updateSession,
    formatAttendanceDateTime,
  };
}
