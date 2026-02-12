import { ref } from 'vue';
import AttendanceRecordResource from 'kolibri-common/apiResources/AttendanceRecordResource';
import AttendanceSessionResource from 'kolibri-common/apiResources/AttendanceSessionResource';

export default function useAttendance() {
  const currentSession = ref(null);
  const sessions = ref([]);
  const records = ref([]);
  const isLoading = ref(false);
  async function fetchSessions(classId, { startDate, endDate } = {}) {
    isLoading.value = true;
    try {
      const params = { collection: classId };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const data = await AttendanceSessionResource.fetchCollection({
        getParams: params,
        force: true,
      });
      sessions.value = data;
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  async function createSession(classId, date) {
    const data = await AttendanceSessionResource.createModel({
      collection: classId,
      date,
    });
    currentSession.value = data;
    return data;
  }

  async function fetchRecords(sessionId) {
    const data = await AttendanceRecordResource.fetchCollection({
      getParams: { session: sessionId },
      force: true,
    });
    records.value = data;
    return data;
  }

  async function submitAttendance(sessionId, attendanceRecords) {
    const response = await AttendanceSessionResource.submitAttendance(sessionId, attendanceRecords);
    records.value = response.data || response;
    return records.value;
  }

  function resetState() {
    currentSession.value = null;
    records.value = [];
  }

  return {
    currentSession,
    sessions,
    records,
    isLoading,
    fetchSessions,
    createSession,
    fetchRecords,
    submitAttendance,
    resetState,
  };
}
