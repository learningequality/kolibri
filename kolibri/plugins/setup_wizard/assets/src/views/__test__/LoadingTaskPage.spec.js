import { mount } from '@vue/test-utils';
import TaskResource from 'kolibri/apiResources/TaskResource';
import LoadingTaskPage from '../LoadingTaskPage';

jest.mock('kolibri/apiResources/TaskResource', () => ({
  cancel: jest.fn(),
  clearAll: jest.fn(),
  restart: jest.fn(),
  list: jest.fn(),
}));

const cancelTaskMock = TaskResource.cancel;
const clearTasksMock = TaskResource.clearAll;
const restartMock = TaskResource.restart;
const listMock = TaskResource.list;

const facilityMock = {
  id: '4494060ae9b746af80200faa848eb23d',
  name: 'Kolibri School',
  username: 'username',
  password: 'password',
};

function makeWrapper() {
  const wrapper = mount(LoadingTaskPage, {
    mocks: {
      wizardService: { state: { context: { selectedFacility: facilityMock } } },
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
    listMock.mockReset();
    restartMock.mockReset();
  });

  it('loads the first task in the queue and starts polling', async () => {
    listMock.mockResolvedValue([{ status: 'RUNNING' }]);
    const { wrapper } = makeWrapper();
    await global.flushPromises();
    const taskPanel = wrapper.findComponent({ name: 'FacilityTaskPanel' });
    expect(taskPanel.exists()).toBe(true);
    expect(wrapper.vm.isPolling).toBe(true);
    expect(wrapper.find('h1').text()).toEqual('Import learning facility');
  });

  it.skip('when tasks succeeds, the "continue" button is available', async () => {
    listMock.mockResolvedValue([{ status: 'COMPLETED' }]);
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

  it.skip('when task fails, the "retry" button is available', async () => {
    listMock.mockResolvedValue([{ status: 'FAILED' }]);
    const { wrapper } = makeWrapper();
    const retrySpy = jest.spyOn(wrapper.vm, 'retryImport');

    await global.flushPromises();
    const buttons = wrapper.findAllComponents({ name: 'KButton' });
    expect(buttons).toHaveLength(2);
    const retryButton = buttons.at(0);
    expect(retryButton.props().text).toEqual('Retry');

    retryButton.trigger('click');
    await global.flushPromises();

    expect(retrySpy).toBeCalledTimes(1);
    expect(restartMock).toBeCalledTimes(1);
  });

  it.skip('when task fails, the "start over" button is available', async () => {
    listMock.mockResolvedValue([{ status: 'FAILED' }]);
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
    listMock.mockResolvedValue([{ status: 'RUNNING' }]);
    const { wrapper } = makeWrapper();
    await global.flushPromises();
    const taskPanel = wrapper.findComponent({ name: 'FacilityTaskPanel' });
    // Simulating a 'cancel' event rather than clicking the cancel button within
    taskPanel.vm.$emit('cancel');
    expect(cancelTaskMock).toBeCalledTimes(1);
  });
});
