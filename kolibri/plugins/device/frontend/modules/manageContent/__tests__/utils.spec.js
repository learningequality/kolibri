import TaskResource from 'kolibri/apiResources/TaskResource';
import { TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
import makeStore from '../../../__tests__/utils/makeStore';
import { cancelTask } from '../utils';

jest.mock('kolibri/apiResources/TaskResource');

describe('cancelTask', () => {
  it('clears the task once it shows up as CANCELED in the task list', async () => {
    const store = makeStore();
    store.commit('manageContent/SET_TASK_LIST', [{ id: 'task_1', status: TaskStatuses.RUNNING }]);
    TaskResource.cancel_v2.mockResolvedValue();
    TaskResource.clear_v2.mockResolvedValue();

    const cancelled = cancelTask(store, 'task_1');
    expect(TaskResource.cancel_v2).toHaveBeenCalledWith('task_1');
    expect(TaskResource.clear_v2).not.toHaveBeenCalled();

    store.commit('manageContent/SET_TASK_LIST', [{ id: 'task_1', status: TaskStatuses.CANCELED }]);
    await cancelled;

    expect(TaskResource.clear_v2).toHaveBeenCalledWith('task_1');
  });
});
