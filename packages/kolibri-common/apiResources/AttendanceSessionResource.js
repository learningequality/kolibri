import { Resource } from 'kolibri/apiResource';

/**
 * @example Get a Collection of AttendanceSessions for a given class
 * AttendanceSessionResource.fetchCollection({ getParams: { collection: classId } })
 */
export default new Resource({
  name: 'attendancesession',
  idKey: 'id',
  fetchRecentSessions(getParams = {}) {
    return this.fetchListCollection('recent', getParams);
  },
});
