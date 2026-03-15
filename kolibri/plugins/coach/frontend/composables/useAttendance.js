import { ref } from 'vue';
import AttendanceRecordResource from 'kolibri-common/apiResources/AttendanceRecordResource';
import AttendanceSessionResource from 'kolibri-common/apiResources/AttendanceSessionResource';
import { attendanceStrings } from 'kolibri-common/strings/attendanceStrings';

const attendanceLoading = ref(false);
const sessions = ref([]);
const currentSession = ref(null);
const recentSessions = ref([]);
const totalPages = ref(1);
const sessionCount = ref(0);

export function useAttendance() {
  function fetchSessions(classId, params = {}) {
    attendanceLoading.value = true;
    return AttendanceSessionResource.fetchCollection({
      getParams: { collection: classId, ...params },
      force: true,
    })
      .then(data => {
        sessions.value = data.results;
        totalPages.value = data.total_pages || 1;
        sessionCount.value = data.count || 0;
        return sessions.value;
      })
      .finally(() => {
        attendanceLoading.value = false;
      });
  }

  function fetchSession(sessionId) {
    return AttendanceSessionResource.fetchModel({
      id: sessionId,
      force: true,
    }).then(data => {
      currentSession.value = data;
      return data;
    });
  }

  function fetchRecentSessions(classId, limit = 5) {
    return AttendanceSessionResource.fetchRecentSessions({
      collection: classId,
      limit,
    }).then(data => {
      recentSessions.value = data;
      return data;
    });
  }

  function createSession(data) {
    return AttendanceSessionResource.saveModel({
      data,
    });
  }

  function updateSession(sessionId, data) {
    return AttendanceSessionResource.saveModel({
      id: sessionId,
      data,
    });
  }

  function fetchRecords(sessionId) {
    return AttendanceRecordResource.fetchCollection({
      getParams: { attendance_session: sessionId },
      force: true,
    });
  }

  function bulkUpdateRecords(sessionId, records) {
    return AttendanceRecordResource.bulkUpdate({
      attendance_session: sessionId,
      records,
    });
  }

  function formatAttendanceDateTime(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    return {
      date: attendanceStrings.$formatDate(dateObj, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      time: attendanceStrings.$formatTime(dateObj, {
        hour: 'numeric',
        minute: 'numeric',
      }),
    };
  }

  return {
    attendanceLoading,
    sessions,
    currentSession,
    recentSessions,
    totalPages,
    sessionCount,
    fetchSessions,
    fetchSession,
    fetchRecentSessions,
    createSession,
    updateSession,
    fetchRecords,
    bulkUpdateRecords,
    formatAttendanceDateTime,
  };
}
