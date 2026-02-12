import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'attendancesession',
  submitAttendance(sessionId, records) {
    return this.postDetailEndpoint('submit-attendance', sessionId, { records });
  },
});
