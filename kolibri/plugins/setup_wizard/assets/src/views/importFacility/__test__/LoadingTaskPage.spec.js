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

const cancelTaskMock = SetupTasksResource.canceltask;
const clearTasksMock = SetupTasksResource.cleartasks;
const fetchCollectionMock = SetupTasksResource.fetchCollection;

function makeWrapper() {
  const wrapper = mount(LoadingTaskPage, {
    propsData: {
      facility: {
        id: '4494060ae9b746af80200faa848eb23d',
        name: 'Kolibri School',
        username: 'username',
        password: 'password',
      },
      device: {
        baseurl: 'http://localhost:8000',
      },
    },
  });
  return { wrapper };
}

describe('LoadingTaskPage', () => {
  beforeEach(() => {
    clearTasksMock.mockResolvedValue();
  });

  afterEach(() => {
    cancelTaskMock.mockReset();
    clearTasksMock.mockReset();
    fetchCollectionMock.mockReset();
  });

  it('loads the first task in the queue and starts polling', async () => {
    fetchCollectionMock.mockResolvedValue([{ status: 'RUNNING' }]);
    const { wrapper } = makeWrapper();
    await global.flushPromises();
    const taskPanel = wrapper.findComponent({ name: 'FacilityTaskPanel' });
    expect(taskPanel.exists()).toBe(true);
    expect(wrapper.vm.isPolling).toBe(true);
    expect(wrapper.find('h1').text()).toEqual("Loading 'Kolibri School'");
  });

  it('when tasks succeeds, the "continue" button is available', async () => {
    fetchCollectionMock.mockResolvedValue([{ status: 'COMPLETED' }]);
    const { wrapper } = makeWrapper();
    const continueSpy = jest.spyOn(wrapper.vm, 'handleClickContinue');
    await global.flushPromises();
    const buttons = wrapper.findAllComponents({ name: 'KButton' });
    expect(buttons).toHaveLength(1);
    const continueButton = buttons.at(0);
    expect(continueButton.props('text')).toEqual('Continue');
    continueButton.trigger('click');
    expect(continueSpy).toBeCalled();
    expect(wrapper.emitted().click_next).toBeTruthy();
    expect(wrapper.vm.isPolling).toBe(false);
  });

  it('when task fails, the "retry" button is available', async () => {
    fetchCollectionMock.mockResolvedValue([{ status: 'FAILED' }]);
    const { wrapper } = makeWrapper();
    const retrySpy = jest.spyOn(wrapper.vm, 'retryImport');

    // Mocking the proxied method instead of the whole mixin module
    const startImportSpy = jest.spyOn(wrapper.vm, 'startPeerImportTask').mockResolvedValue();

    await global.flushPromises();
    const buttons = wrapper.findAllComponents({ name: 'KButton' });
    expect(buttons).toHaveLength(2);
    const retryButton = buttons.at(0);
    expect(retryButton.props().text).toEqual('Retry');

    retryButton.trigger('click');
    await global.flushPromises();

    expect(retrySpy).toBeCalledTimes(1);
    expect(clearTasksMock).toBeCalledTimes(1);
    expect(startImportSpy).toBeCalledTimes(1);
    expect(startImportSpy).toBeCalledWith({
      facility: '4494060ae9b746af80200faa848eb23d',
      facility_name: 'Kolibri School',
      username: 'username',
      password: 'password',
      baseurl: 'http://localhost:8000',
    });
  });

  it('when task fails, the "start over" button is available', async () => {
    fetchCollectionMock.mockResolvedValue([{ status: 'FAILED' }]);
    const { wrapper } = makeWrapper();
    const startOverSpy = jest.spyOn(wrapper.vm, 'startOver');

    // Mocking the method because the router can't be mocked
    const goToRootSpy = jest.spyOn(wrapper.vm, 'goToRootUrl').mockResolvedValue();

    await global.flushPromises();
    const buttons = wrapper.findAllComponents({ name: 'KButton' });
    expect(buttons).toHaveLength(2);
    const startOverButton = buttons.at(1);
    expect(startOverButton.props().text).toEqual('Start over');

    startOverButton.trigger('click');
    await global.flushPromises();

    expect(startOverSpy).toBeCalledTimes(1);
    expect(clearTasksMock).toBeCalledTimes(1);
    expect(goToRootSpy).toBeCalledTimes(1);
    expect(wrapper.vm.isPolling).toBe(false);
  });

  it('a cancel request is made when "cancel" is clicked', async () => {
    fetchCollectionMock.mockResolvedValue([{ status: 'RUNNING' }]);
    const { wrapper } = makeWrapper();
    await global.flushPromises();
    const taskPanel = wrapper.findComponent({ name: 'FacilityTaskPanel' });
    // Simulating a 'cancel' event rather than clicking the cancel button within
    taskPanel.vm.$emit('cancel');
    expect(cancelTaskMock).toBeCalledTimes(1);
  });
});
