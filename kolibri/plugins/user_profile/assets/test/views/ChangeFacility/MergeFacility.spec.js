import { mount, createLocalVue } from '@vue/test-utils';
import { TaskResource } from 'kolibri.resources';
import { TaskStatuses } from 'kolibri.utils.syncTaskUtils';
import redirectBrowser from 'kolibri.utils.redirectBrowser';
import MergeFacility from '../../../src/views/ChangeFacility/MergeFacility';

const localVue = createLocalVue();
const sendMachineEvent = jest.fn();
jest.mock('kolibri.urls');
jest.mock('kolibri.utils.redirectBrowser');
jest.mock('kolibri.resources', () => ({
  TaskResource: {
    fetchModel: jest.fn(),
    clear: jest.fn(),
  },
}));

function makeWrapper() {
  return mount(MergeFacility, {
    provide: {
      changeFacilityService: {
        send: sendMachineEvent,
        state: { value: 'syncChangeFacility' },
      },
      state: {
        value: {
          targetFacility: { name: 'Test Facility', url: 'http://url1' },
          fullname: 'Test User 1',
          username: 'test1',
          targetAccount: { username: 'test2' },
          taskId: 'task_1',
        },
      },
    },
    localVue,
  });
}

const task = {
  id: 'task_1',
  type: 'kolibri.plugins.user_profile.tasks.mergeuser',
  status: TaskStatuses.PENDING,
  percentage: 0,
  facility_id: 'facility_id1',
  extra_metadata: { facility_name: 'Test Facility' },
};
const incompleteTask = { ...task, status: TaskStatuses.PENDING };
const completedTask = { ...task, status: TaskStatuses.COMPLETED };

const getFinishButton = wrapper => wrapper.find('[data-test="finishButton"]');

const clickFinishButton = wrapper => getFinishButton(wrapper).trigger('click');

describe(`ChangeFacility/ConfirmMerge`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TaskResource.fetchModel.mockResolvedValue(task);
  });

  it(`smoke test`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toBeTruthy();
  });

  it(`finish button does not appear if the task is not completed`, async () => {
    TaskResource.fetchModel.mockResolvedValue(incompleteTask);

    const wrapper = makeWrapper();
    await global.flushPromises();
    await wrapper.vm.$nextTick();
    expect(getFinishButton(wrapper).exists()).toBeFalsy();
    expect(wrapper.vm.taskCompleted).toBe(false);
  });

  it(`when the task is completed, finish button appears`, async () => {
    TaskResource.fetchModel.mockResolvedValue(completedTask);

    const wrapper = makeWrapper();
    await global.flushPromises();
    await wrapper.vm.$nextTick();
    expect(getFinishButton(wrapper).exists()).toBeTruthy();
    expect(wrapper.vm.taskCompleted).toBe(true);
    await wrapper.vm.$nextTick();
    const messageDiv = wrapper.find('[data-test="completedMessage"]');
    expect(messageDiv.text()).toEqual('Successfully joined ‘Test Facility’ learning facility.');
  });

  it(`clicking finish button sends the finish event to the state machine`, async () => {
    TaskResource.fetchModel.mockResolvedValue(completedTask);

    const wrapper = makeWrapper();
    await global.flushPromises();
    await wrapper.vm.$nextTick();
    clickFinishButton(wrapper);

    await wrapper.vm.$nextTick();
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'FINISH',
    });
    expect(redirectBrowser).toHaveBeenCalledTimes(1);
  });
});
