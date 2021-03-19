import { mount } from '@vue/test-utils';
import LoadingTaskPage from '../LoadingTaskPage';
import { SetupTasksResource } from '../../../api';

jest.mock('../../../api', () => ({
  SetupTasksResource: {
    canceltask: jest.fn(),
    cleartasks: jest.fn(),
    fetchCollection: jest.fn(),
  },
}));

function makeWrapper() {
  afterEach(() => {
    SetupTasksResource.canceltask.mockReset();
    SetupTasksResource.cleartasks.mockReset();
    SetupTasksResource.fetchCollection.mockReset();
  });

  const wrapper = mount(LoadingTaskPage, {
    propsData: {
      facility: {
        name: 'Kolibri School',
      },
    },
  });
  return { wrapper };
}

describe('LoadingTaskPage', () => {
  it('loads the first task in the queue and starts polling', async () => {
    SetupTasksResource.fetchCollection.mockResolvedValue([{ status: 'RUNNING' }]);
    const { wrapper } = makeWrapper();
    await global.flushPromises();
    const taskPanel = wrapper.findComponent({ name: 'FacilityTaskPanel' });
    expect(taskPanel.exists()).toBe(true);
    expect(wrapper.vm.isPolling).toBe(true);
  });
});
