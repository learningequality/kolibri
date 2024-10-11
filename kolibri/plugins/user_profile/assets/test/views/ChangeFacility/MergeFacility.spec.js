import { mount, createLocalVue } from '@vue/test-utils';
import TaskResource from 'kolibri/apiResources/TaskResource';
import { TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import client from 'kolibri/client';
import MergeFacility from '../../../src/views/ChangeFacility/MergeFacility';

const localVue = createLocalVue();
const sendMachineEvent = jest.fn();
jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/utils/redirectBrowser');
jest.mock('kolibri/apiResources/TaskResource', () => ({
  fetchModel: jest.fn(),
  fetchCollection: jest.fn(),
  startTask: jest.fn(),
  clear: jest.fn(),
}));

function makeWrapper({ taskId = 'task_1' } = {}) {
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
          taskId,
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
const getRetryButton = wrapper => wrapper.find('[data-test="retryButton"]');
const clickRetryButton = wrapper => getRetryButton(wrapper).trigger('click');

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
    expect(messageDiv.text()).toEqual("Successfully joined 'Test Facility' learning facility.");
  });

  it(`clicking finish button sends the finish event to the state machine`, async () => {
    TaskResource.fetchModel.mockResolvedValue(completedTask);
    client.mockResolvedValue({});
    const wrapper = makeWrapper();
    await global.flushPromises();
    await wrapper.vm.$nextTick();
    clickFinishButton(wrapper);

    await wrapper.vm.$nextTick();
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'FINISH',
    });
    expect(client).toHaveBeenCalled();
    expect(redirectBrowser).toHaveBeenCalledTimes(1);
  });

  it(`clicking retry button sends the task error event to the state machine`, async () => {
    TaskResource.fetchCollection.mockResolvedValue([]);
    TaskResource.startTask.mockRejectedValue({
      response: { status: 400, data: [{ metadata: { message: 'USERNAME_ALREADY_EXISTS' } }] },
    });
    client.mockResolvedValue({});
    const wrapper = makeWrapper({ taskId: null });
    await global.flushPromises();
    await wrapper.vm.$nextTick();
    clickRetryButton(wrapper);

    await wrapper.vm.$nextTick();
    expect(sendMachineEvent).toHaveBeenCalledWith('TASKERROR');
  });
});
