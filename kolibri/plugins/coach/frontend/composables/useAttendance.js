import { ref } from 'vue';
import AttendanceSessionResource from 'kolibri-common/apiResources/AttendanceSessionResource';
import { attendanceStrings } from 'kolibri-common/strings/attendanceStrings';

const attendanceLoading = ref(false);
const sessions = ref([]);
const currentSession = ref(null);
const recentSessions = ref([]);

export function useAttendance() {
  function fetchSessions(classId, params = {}) {
    attendanceLoading.value = true;
    return AttendanceSessionResource.fetchCollection({
      getParams: { collection: classId, ...params },
      force: true,
    })
      .then(data => {
        sessions.value = data;
        return data;
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

  function formatAttendanceDateTime(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    return {
      date: attendanceStrings.$formatDate(dateObj),
      time: attendanceStrings.$formatTime(dateObj),
    };
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
