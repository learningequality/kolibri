import { SyncTaskStatuses, TaskStatuses, TaskTypes } from '../syncTaskUtils';

export const FACILITY_ID = 'fac1234567890';
export const FACILITY_NAME = 'Test Facility';

// Times are offset from the real clock rather than a frozen one, since
// IntlRelativeFormat binds Date.now at module load and so cannot be reached by
// fake timers.
export function syncSchedule({
  status = TaskStatuses.QUEUED,
  lastFinishedStatus = null,
  minutesAgo = 2,
  hoursUntilNext = 24,
  syncState = SyncTaskStatuses.COMPLETED,
  retryInterval = null,
} = {}) {
  const now = Date.now();
  return {
    id: 'task1',
    type: TaskTypes.SYNCDATAPORTAL,
    status,
    facility_id: FACILITY_ID,
    repeat: null,
    repeat_interval: 86400,
    retry_interval: retryInterval,
    percentage: 0,
    clearable: false,
    cancellable: true,
    last_finished_status: lastFinishedStatus,
    last_finished_datetime: lastFinishedStatus
      ? new Date(now - minutesAgo * 60000).toISOString()
      : null,
    scheduled_datetime: new Date(now + hoursUntilNext * 3600000).toISOString(),
    extra_metadata: {
      facility_name: FACILITY_NAME,
      started_by_username: 'devowner',
      sync_state: syncState,
      bytes_sent: 1000000,
      bytes_received: 500000000,
    },
  };
}
