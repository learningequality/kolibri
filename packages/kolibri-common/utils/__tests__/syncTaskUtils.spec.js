import {
  syncFacilityTaskDisplayInfo,
  syncStatusToDescriptionMap,
  removeStatusToDescriptionMap,
  removeFacilityTaskDisplayInfo,
  getLastRunStatusMsg,
  taskDisplayStatus,
  taskIsFinished,
  SyncTaskStatuses,
  TaskStatuses,
  TaskTypes,
} from '../syncTaskUtils';
import { syncSchedule } from './syncSchedule';

const CLEARABLE_STATUSES = ['COMPLETED', 'CANCELED', 'FAILED'];

describe('syncTaskUtils.syncFacilityTaskDisplayInfo', () => {
  const CANCELLABLE_SYNC_STATES = [
    SyncTaskStatuses.SESSION_CREATION,
    SyncTaskStatuses.PULLING,
    SyncTaskStatuses.PUSHING,
    SyncTaskStatuses.REMOTE_QUEUING,
  ];

  function makeTask(sync_state) {
    let status;
    if (!TaskStatuses[sync_state]) {
      status = TaskStatuses.RUNNING;
    } else {
      status = sync_state;
      sync_state = undefined;
    }
    return {
      type: TaskTypes.SYNCPEERFULL,
      status,
      facility_id: 'fac123',
      extra_metadata: {
        sync_state,
        device_name: 'generic device',
        device_id: 'dev123',
        facility_name: 'generic facility',
        facility: 'fac123',
        started_by_username: 'generic user',
        bytes_sent: 1000000,
        bytes_received: 500000000,
      },
      cancellable: CANCELLABLE_SYNC_STATES.indexOf(sync_state) >= 0,
      clearable: CLEARABLE_STATUSES.indexOf(status) >= 0,
    };
  }

  const ALL_STATUSES = Object.keys(syncStatusToDescriptionMap);

  it('displays the correct header for facility-sync tasks', () => {
    const task = makeTask('RUNNING');
    const displayInfo = syncFacilityTaskDisplayInfo(task);
    expect(displayInfo.headingMsg).toEqual("Sync 'generic facility' (fac1)");
  });

  it('displays the correct header for facility-import tasks', () => {
    const task = makeTask('RUNNING');
    task.type = TaskTypes.SYNCPEERPULL;
    const displayInfo = syncFacilityTaskDisplayInfo(task);
    expect(displayInfo.headingMsg).toEqual("Import 'generic facility' (fac1)");
  });

  it('display title, started by username, and device name are invariant wrt status', () => {
    const task = {
      status: null,
      facility_id: 'fac123',
      extra_metadata: {
        device_name: 'invariant device',
        device_id: 'dev123',
        facility: 'fac123',
        facility_name: 'invariant facility',
        started_by_username: 'invariant user',
      },
    };

    ALL_STATUSES.forEach(status => {
      task.status = status;
      expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
        headingMsg: "Sync 'invariant facility' (fac1)",
        startedByMsg: "Started by 'invariant user'",
        deviceNameMsg: "'invariant device' (dev1)",
      });
    });
  });

  const simpleStatusesMsgTests = [
    ['PENDING', 'Waiting'],
    ['COMPLETED', 'Finished'],
    ['CANCELED', 'Canceled'],
    ['CANCELING', 'Canceling'],
    ['FAILED', 'Failed'],
  ];
  it.each(simpleStatusesMsgTests)('statusMsg is correct with %s status', (status, msg) => {
    const task = makeTask(status);
    expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
      statusMsg: msg,
    });
  });

  it('statusMsg is correct when a canceled task still carries its terminal sync_state', () => {
    // A cancelled sync writes sync_state=CANCELLED before the job is marked
    // CANCELED, so both are present on the row the user sees.
    const task = makeTask('CANCELED');
    task.extra_metadata.sync_state = SyncTaskStatuses.CANCELLED;
    expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
      statusMsg: 'Canceled',
    });
  });

  const orderedStatusesMsgTests = [
    ['SESSION_CREATION', '1 of 7: Establishing connection'],
    ['REMOTE_QUEUING', '2 of 7: Remotely preparing data'],
    ['PULLING', '3 of 7: Receiving data'],
    ['LOCAL_DEQUEUING', '4 of 7: Locally integrating received data'],
    ['LOCAL_QUEUING', '5 of 7: Locally preparing data to send'],
    ['PUSHING', '6 of 7: Sending data'],
    ['REMOTE_DEQUEUING', '7 of 7: Remotely integrating data'],
  ];

  it.each(orderedStatusesMsgTests)(
    'messages are correct with sync-specific status %s',
    (status, msg) => {
      const task = makeTask(status);
      expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
        statusMsg: msg,
      });
    },
  );

  it('if task is FINISHED, it has a bytesTransferredMsg', () => {
    ALL_STATUSES.forEach(status => {
      const task = makeTask(status);
      const { bytesTransferredMsg } = syncFacilityTaskDisplayInfo(task);
      if (status === 'COMPLETED') {
        expect(bytesTransferredMsg).toEqual('1 MB sent • 500 MB received');
      } else {
        expect(bytesTransferredMsg).toEqual('');
      }
    });
  });

  const controlAndStatusTests = [
    // [status, canClear/hideCancel, isRunning, canCancel]
    ['PENDING', false, false, false],
    ['CANCELED', true, false, false],
    ['CANCELING', false, false, false],
    ['FAILED', true, false, false],
    ['SESSION_CREATION', false, true, true],
    ['REMOTE_QUEUING', false, true, true],
    ['PULLING', false, true, true],
    ['LOCAL_DEQUEUING', false, true, false],
    ['LOCAL_QUEUING', false, true, false],
    ['PUSHING', false, true, true],
    ['REMOTE_DEQUEUING', false, true, false],
    ['COMPLETED', true, false, false],
  ];

  it.each(controlAndStatusTests)(
    'flags for showing clear/cancel/retry buttons are correct for status %s',
    (status, canClear, isRunning, canCancel) => {
      const task = makeTask(status);
      expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
        canClear,
        canCancel,
        canRetry: status === 'FAILED',
        isRunning,
      });
    },
  );
});

describe('syncTaskUtils re-scheduled recurring rows', () => {
  const completedTask = () =>
    syncSchedule({
      lastFinishedStatus: TaskStatuses.COMPLETED,
      minutesAgo: 2,
    });

  // A run that fails leaves sync_state on whichever step it got to, since
  // nothing writes a terminal state on the failure path.
  const failedTask = () =>
    syncSchedule({
      lastFinishedStatus: TaskStatuses.FAILED,
      minutesAgo: 5,
      hoursUntilNext: 1,
      syncState: SyncTaskStatuses.PUSHING,
      retryInterval: 3600,
    });

  const runningAgainTask = () =>
    syncSchedule({
      status: TaskStatuses.RUNNING,
      lastFinishedStatus: TaskStatuses.COMPLETED,
      syncState: SyncTaskStatuses.PUSHING,
    });

  const neverRunTask = () => syncSchedule({ syncState: SyncTaskStatuses.PENDING });

  it('shows the finished run and when the next one is due', () => {
    expect(syncFacilityTaskDisplayInfo(completedTask())).toMatchObject({
      statusMsg: 'Finished 2 minutes ago, next sync in 1 day',
      bytesTransferredMsg: '1 MB sent • 500 MB received',
      deviceNameMsg: 'Kolibri Data Portal',
      isRunning: false,
      canClear: false,
      canCancel: false,
    });
  });

  it('shows a failed run and when it will be retried', () => {
    expect(syncFacilityTaskDisplayInfo(failedTask())).toMatchObject({
      statusMsg: 'Failed 5 minutes ago, retrying in 1 hour',
      bytesTransferredMsg: '',
      canClear: false,
      canCancel: false,
      canRetry: false,
    });
  });

  it('calls the next run a sync, not a retry, when the schedule has no retry interval', () => {
    // A schedule created with the retry checkbox off re-schedules a failed run
    // onto its ordinary interval, so there is no retry to announce.
    const task = failedTask();
    task.retry_interval = null;
    task.scheduled_datetime = new Date(Date.now() + 24 * 3600000).toISOString();
    expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
      statusMsg: 'Failed 5 minutes ago, next sync in 1 day',
    });
  });

  it.each([
    [TaskStatuses.RUNNING, true],
    [TaskStatuses.CANCELING, false],
  ])('shows the live run, not the snapshot, when %s', (status, isRunning) => {
    const task = { ...runningAgainTask(), status };
    expect(taskDisplayStatus(task)).toEqual(status);
    expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
      statusMsg: '6 of 7: Sending data',
      bytesTransferredMsg: '',
      isRunning,
    });
  });

  it('treats a carried-over terminal sync_state as not-yet-started', () => {
    const task = runningAgainTask();
    task.extra_metadata.sync_state = SyncTaskStatuses.COMPLETED;
    expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
      statusMsg: 'Waiting',
      bytesTransferredMsg: '',
    });
  });

  it('shows the run that just ended, not the snapshot, before the re-schedule lands', () => {
    // Between a run finishing and the re-schedule that requeues the row, the
    // row's own state describes the newer run and the snapshot the one before.
    const task = syncSchedule({
      status: TaskStatuses.COMPLETED,
      lastFinishedStatus: TaskStatuses.FAILED,
      minutesAgo: 60,
    });
    expect(taskDisplayStatus(task)).toEqual(TaskStatuses.COMPLETED);
    expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
      statusMsg: 'Finished',
      bytesTransferredMsg: '1 MB sent • 500 MB received',
    });
  });

  it('announces the run a manual sync asked for, not the one before it', () => {
    // Pressing Sync re-queues the schedule to run now, so its scheduled time is
    // already past while it waits for the runner to pick it up.
    const task = syncSchedule({
      lastFinishedStatus: TaskStatuses.COMPLETED,
      minutesAgo: 4,
      hoursUntilNext: -1 / 60,
    });
    expect(taskDisplayStatus(task)).toEqual(TaskStatuses.QUEUED);
    expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
      statusMsg: 'Waiting',
      bytesTransferredMsg: '',
      isRunning: false,
      canClear: false,
      canCancel: false,
      canRetry: false,
    });
  });

  it('taskDisplayStatus is the last run only when the row is not running', () => {
    expect(taskDisplayStatus(completedTask())).toEqual(TaskStatuses.COMPLETED);
    expect(taskDisplayStatus(runningAgainTask())).toEqual(TaskStatuses.RUNNING);
    expect(taskDisplayStatus(neverRunTask())).toEqual(TaskStatuses.QUEUED);
  });

  it('taskIsFinished follows the displayed status', () => {
    expect(taskIsFinished(completedTask())).toBe(true);
    expect(taskIsFinished(failedTask())).toBe(true);
    expect(taskIsFinished(runningAgainTask())).toBe(false);
    expect(taskIsFinished(neverRunTask())).toBe(false);
  });

  it('getLastRunStatusMsg describes the last run, and is null when there has been none', () => {
    expect(getLastRunStatusMsg(completedTask())).toEqual('Finished 2 minutes ago');
    expect(getLastRunStatusMsg(neverRunTask())).toBeNull();
  });
});

describe('syncTaskUtils.removeFacilityTaskDisplayInfo', () => {
  function makeTask(status) {
    return {
      type: TaskTypes.DELETEFACILITY,
      status,
      clearable: CLEARABLE_STATUSES.indexOf(status) >= 0,
      facility_id: 'fac123',
      extra_metadata: {
        facility: 'fac123',
        facility_name: 'removed facility',
        started_by_username: 'removing user',
      },
    };
  }

  const ALL_STATUSES = Object.keys(removeStatusToDescriptionMap);

  it('title and started by username is invariant wrt status', () => {
    ALL_STATUSES.forEach(status => {
      const task = makeTask(status);
      expect(removeFacilityTaskDisplayInfo(task)).toMatchObject({
        headingMsg: "Remove 'removed facility' (fac1)",
        startedByMsg: "Started by 'removing user'",
      });
    });
  });

  const simpleStatusesMsgTests = [
    ['PENDING', 'Waiting'],
    ['COMPLETED', 'Finished'],
    ['CANCELED', 'Canceled'],
    ['CANCELING', 'Canceling'],
    ['FAILED', 'Failed'],
    ['RUNNING', 'Removing facility'],
  ];

  it.each(simpleStatusesMsgTests)('statusMsg is correct with %s status', (status, msg) => {
    const task = makeTask(status);
    expect(removeFacilityTaskDisplayInfo(task)).toMatchObject({
      statusMsg: msg,
    });
  });

  const controlAndStatusTests = [
    // [status, canCancel, canClear, canRetry]
    ['PENDING', true, false, false],
    ['CANCELED', false, true, false],
    ['CANCELING', true, false, false],
    ['FAILED', false, true, true],
    ['RUNNING', false, false, false],
    ['COMPLETED', false, true, false],
  ];

  it.each(controlAndStatusTests)(
    'flags for showing clear/cancel/retry buttons are correct for status %s',
    (status, canCancel, canClear, canRetry) => {
      const task = makeTask(status);
      expect(removeFacilityTaskDisplayInfo(task)).toMatchObject({
        canClear,
        canCancel,
        canRetry,
      });
    },
  );
});
