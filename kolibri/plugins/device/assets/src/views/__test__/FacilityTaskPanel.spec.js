import { mount } from '@vue/test-utils';
import FacilityTaskPanel from '../../views/FacilitiesPage/FacilityTaskPanel';
import { SyncTaskStatuses, TaskStatuses, TaskTypes } from '../../constants';

const ALL_STATUSES = Object.values(TaskStatuses);
const CLEARABLE_STATUSES = ['COMPLETED', 'CANCELED', 'FAILED'];
const CANCELLABLE_SYNC_STATES = [
  SyncTaskStatuses.SESSION_CREATION,
  SyncTaskStatuses.PULLING,
  SyncTaskStatuses.PUSHING,
  SyncTaskStatuses.REMOTE_QUEUING,
];

function makeWrapper(task) {
  return mount(FacilityTaskPanel, {
    propsData: {
      task,
    },
  });
}

function makeTask(sync_state, type = TaskTypes.SYNCPEERFULL, overrides = {}) {
  let status;
  if (!TaskStatuses[sync_state]) {
    status = TaskStatuses.RUNNING;
  } else {
    status = sync_state;
    sync_state = undefined;
  }
  return {
    type,
    status,
    facility_id: 'fac123',
    extra_metadata: {
      sync_state,
      device_name: 'generic device',
      device_id: 'dev123',
      facility_name: 'generic facility',
      facility: 'fac123',
      bytes_sent: 1000000,
      bytes_received: 500000000,
    },
    exception: 'RuntimeError',
    cancellable: CANCELLABLE_SYNC_STATES.indexOf(sync_state) >= 0,
    clearable: CLEARABLE_STATUSES.indexOf(status) >= 0,
    ...overrides,
  };
}

describe('FacilityTaskPanel component', () => {
  let wrapper;
  let task;

  describe('when provided a sync task', () => {
    beforeAll(() => {
      task = makeTask(TaskStatuses.PENDING);
      wrapper = makeWrapper(task);
    });

    it('should produce the proper heading message', () => {
      ALL_STATUSES.forEach(status => {
        wrapper.setProps({ task: makeTask(status) });
        expect(wrapper.vm.headingMsg).toEqual("Sync 'generic facility' (fac1)");
      });
    });

    it('should produce the proper under-heading message', () => {
      ALL_STATUSES.forEach(status => {
        wrapper.setProps({ task: makeTask(status) });
        expect(wrapper.vm.underHeadingMsg).toEqual("'generic device' (dev1)");
      });
    });

    it('should produce a message describing the bandwidth used when FINISHED', () => {
      ALL_STATUSES.forEach(status => {
        wrapper.setProps({ task: makeTask(status) });
        if (status === TaskStatuses.COMPLETED) {
          expect(wrapper.vm.underProgressMsg).toEqual('1 MB sent • 500 MB received');
        } else {
          expect(wrapper.vm.underProgressMsg).toEqual('');
        }
      });
    });

    const simpleStatusesMsgTests = [
      [TaskStatuses.PENDING, 'Waiting'],
      [TaskStatuses.COMPLETED, 'Finished'],
      [TaskStatuses.CANCELED, 'Canceled'],
      [TaskStatuses.CANCELING, 'Canceling'],
      [TaskStatuses.FAILED, 'Failed: RuntimeError'],
    ];
    test.each(simpleStatusesMsgTests)(
      'should produce the proper status message with task status %s',
      (status, msg) => {
        wrapper.setProps({ task: makeTask(status) });
        expect(wrapper.vm.statusMsg).toEqual(msg);
      }
    );

    const orderedStatusesMsgTests = [
      [SyncTaskStatuses.SESSION_CREATION, '1 of 7: Establishing connection'],
      [SyncTaskStatuses.REMOTE_QUEUING, '2 of 7: Remotely preparing data'],
      [SyncTaskStatuses.PULLING, '3 of 7: Receiving data'],
      [SyncTaskStatuses.LOCAL_DEQUEUING, '4 of 7: Locally integrating received data'],
      [SyncTaskStatuses.LOCAL_QUEUING, '5 of 7: Locally preparing data to send'],
      [SyncTaskStatuses.PUSHING, '6 of 7: Sending data'],
      [SyncTaskStatuses.REMOTE_DEQUEUING, '7 of 7: Remotely integrating data'],
    ];

    test.each(orderedStatusesMsgTests)(
      'should produce the proper status message with sync-specific status %s',
      (status, msg) => {
        wrapper.setProps({ task: makeTask(status) });
        expect(wrapper.vm.statusMsg).toEqual(msg);
      }
    );

    const controlAndStatusTests = [
      // [status, canClear/hideCancel, isRunning, canCancel]
      [TaskStatuses.PENDING, false, false, false],
      [TaskStatuses.CANCELED, true, false, false],
      [TaskStatuses.CANCELING, false, false, false],
      [TaskStatuses.FAILED, true, false, false],
      [SyncTaskStatuses.SESSION_CREATION, false, true, true],
      [SyncTaskStatuses.REMOTE_QUEUING, false, true, true],
      [SyncTaskStatuses.PULLING, false, true, true],
      [SyncTaskStatuses.LOCAL_DEQUEUING, false, true, false],
      [SyncTaskStatuses.LOCAL_QUEUING, false, true, false],
      [SyncTaskStatuses.PUSHING, false, true, true],
      [SyncTaskStatuses.REMOTE_DEQUEUING, false, true, false],
      [SyncTaskStatuses.COMPLETED, true, false, false],
    ];

    test.each(controlAndStatusTests)(
      'it should produce proper clear/cancel/retry conditions for status %s',
      (status, canClear, isRunning, canCancel) => {
        wrapper.setProps({ task: makeTask(status) });
        expect(wrapper.vm.canClear).toBe(canClear);
        expect(wrapper.vm.isRunning).toBe(isRunning);
        expect(wrapper.vm.canCancel).toBe(canCancel);
      }
    );
  });

  describe('when provided a facility deletion task', () => {
    beforeAll(() => {
      task = makeTask(TaskStatuses.PENDING, TaskTypes.DELETEFACILITY);
      wrapper = makeWrapper(task);
    });

    it('should produce the proper heading message', () => {
      ALL_STATUSES.forEach(status => {
        wrapper.setProps({ task: makeTask(status, task.type) });
        expect(wrapper.vm.headingMsg).toEqual("Remove 'generic facility' (fac1)");
      });
    });

    const simpleStatusesMsgTests = [
      [TaskStatuses.PENDING, 'Waiting'],
      [TaskStatuses.COMPLETED, 'Finished'],
      [TaskStatuses.CANCELED, 'Canceled'],
      [TaskStatuses.CANCELING, 'Canceling'],
      [TaskStatuses.FAILED, 'Failed'],
      [TaskStatuses.RUNNING, 'Removing facility'],
    ];

    test.each(simpleStatusesMsgTests)(
      'should produce the proper status message with task status %s',
      (status, msg) => {
        wrapper.setProps({ task: makeTask(status, task.type) });
        expect(wrapper.vm.statusMsg).toEqual(msg);
      }
    );

    const controlAndStatusTests = [
      // [status, canCancel, canClear, canRetry]
      [TaskStatuses.PENDING, true, false, false],
      [TaskStatuses.CANCELED, false, true, false],
      [TaskStatuses.CANCELING, false, false, false],
      [TaskStatuses.FAILED, false, true, true],
      [TaskStatuses.RUNNING, false, false, false],
      [TaskStatuses.COMPLETED, false, true, false],
    ];

    test.each(controlAndStatusTests)(
      'it should produce proper clear/cancel/retry conditions for status %s',
      (status, canCancel, canClear, canRetry) => {
        wrapper.setProps({ task: makeTask(status, task.type, { cancellable: true }) });
        expect(wrapper.vm.canClear).toBe(canClear);
        expect(wrapper.vm.canCancel).toBe(canCancel);
        expect(wrapper.vm.canRetry).toBe(canRetry);
      }
    );
  });
});
