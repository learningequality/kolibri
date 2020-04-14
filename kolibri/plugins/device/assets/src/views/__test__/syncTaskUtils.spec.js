import {
  syncFacilityTaskDisplayInfo,
  syncStatusToDescriptionMap,
  removeStatusToDescriptionMap,
  removeFacilityTaskDisplayInfo,
} from '../syncTaskUtils';

describe('syncTaskUtils.syncFacilityTaskDisplayInfo', () => {
  function makeTask(status) {
    return {
      type: 'SYNC_FACILITY',
      status,
      device_name: 'generic device',
      device_id: 'dev123',
      facility_name: 'generic facility',
      facility_id: 'fac123',
      started_by_username: 'generic user',
      bytes_sent: 1000000,
      bytes_received: 500000000,
    };
  }

  const ALL_STATUSES = Object.keys(syncStatusToDescriptionMap);

  it('display title, started by username, and device name are invariant wrt status', () => {
    const task = {
      status: null,
      device_name: 'invariant device',
      device_id: 'dev123',
      facility_name: 'invariant facility',
      facility_id: 'fac123',
      started_by_username: 'invariant user',
    };

    ALL_STATUSES.forEach(status => {
      task.status = status;
      expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
        headingMsg: "Sync 'invariant facility (fac1)'",
        startedByMsg: "Started by 'invariant user'",
        deviceNameMsg: 'invariant device (dev1)',
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
  test.each(simpleStatusesMsgTests)('statusMsg is correct with %s status', (status, msg) => {
    const task = makeTask(status);
    expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
      statusMsg: msg,
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

  test.each(orderedStatusesMsgTests)(
    'messages are correct with sync-specific status %s',
    (status, msg) => {
      const task = makeTask(status);
      expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
        statusMsg: msg,
      });
    }
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
    // [status, canClear/hideCancel, isRunning]
    ['PENDING', false, false],
    ['CANCELED', true, false],
    ['CANCELING', false, false],
    ['FAILED', true, false],
    ['SESSION_CREATION', false, true],
    ['REMOTE_QUEUING', false, true],
    ['PULLING', false, true],
    ['LOCAL_DEQUEUING', false, true],
    ['LOCAL_QUEUING', false, true],
    ['PUSHING', false, true],
    ['REMOTE_DEQUEUING', false, true],
    ['COMPLETED', true, false],
  ];

  test.each(controlAndStatusTests)(
    'flags for showing clear/cancel/retry buttons are correct for status %s',
    (status, canClear, isRunning) => {
      const task = makeTask(status);
      expect(syncFacilityTaskDisplayInfo(task)).toMatchObject({
        canClear,
        canCancel: !canClear,
        canRetry: status === 'FAILED',
        isRunning,
      });
    }
  );
});

describe('syncTaskUtils.removeFacilityTaskDisplayInfo', () => {
  function makeTask(status) {
    return {
      type: 'REMOVE_FACILITY',
      status,
      facility_name: 'removed facility',
      facility_id: 'fac123',
      started_by_username: 'removing user',
    };
  }

  const ALL_STATUSES = Object.keys(removeStatusToDescriptionMap);

  it('title and started by username is invariant wrt status', () => {
    ALL_STATUSES.forEach(status => {
      const task = makeTask(status);
      expect(removeFacilityTaskDisplayInfo(task)).toMatchObject({
        headingMsg: "Remove 'removed facility (fac1)'",
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
    ['REMOVING_FACILITY', 'Removing facility'],
  ];

  test.each(simpleStatusesMsgTests)('statusMsg is correct with %s status', (status, msg) => {
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
    ['REMOVING_FACILITY', false, false, false],
    ['COMPLETED', false, true, false],
  ];

  test.each(controlAndStatusTests)(
    'flags for showing clear/cancel/retry buttons are correct for status %s',
    (status, canCancel, canClear, canRetry) => {
      const task = makeTask(status);
      expect(removeFacilityTaskDisplayInfo(task)).toMatchObject({
        canClear,
        canCancel,
        canRetry,
      });
    }
  );
});
