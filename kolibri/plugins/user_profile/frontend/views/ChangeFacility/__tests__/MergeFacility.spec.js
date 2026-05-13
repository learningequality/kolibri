import { fireEvent, render, screen } from '@testing-library/vue';
import TaskResource from 'kolibri/apiResources/TaskResource';
import { TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { createTranslator } from 'kolibri/utils/i18n';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import client from 'kolibri/client';
import MergeFacility from '../MergeFacility';

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

const TARGET_FACILITY_NAME = 'Test Facility';
const TARGET_FACILITY_URL = 'http://url1';
const { continueAction$ } = coreStrings;
const { documentTitle$, success$ } = createTranslator(MergeFacility.name, MergeFacility.$trs);

function renderComponent({
  taskId = 'task_1',
  targetFacility = { id: 'facility_id1', name: TARGET_FACILITY_NAME, url: TARGET_FACILITY_URL },
  targetAccount = { id: 'target-user-id', username: 'test2' },
} = {}) {
  return render(MergeFacility, {
    provide: {
      changeFacilityService: {
        send: sendMachineEvent,
        state: { value: 'syncChangeFacility' },
      },
      state: {
        targetFacility,
        value: {
          targetFacility,
          fullname: 'Test User 1',
          username: 'test1',
          userId: 'local-user-id',
          targetAccount,
          taskId,
        },
      },
    },
  });
}

async function flushUi() {
  await global.flushPromises();
  await global.flushPromises();
}

const task = {
  id: 'task_1',
  type: 'kolibri.plugins.user_profile.tasks.mergeuser',
  status: TaskStatuses.PENDING,
  percentage: 0,
  facility_id: 'facility_id1',
  extra_metadata: { facility_name: 'Test Facility', remote_user_pk: 'remote-user-id' },
};
const incompleteTask = { ...task, status: TaskStatuses.PENDING };
const completedTask = { ...task, status: TaskStatuses.COMPLETED };

describe(`ChangeFacility/ConfirmMerge`, () => {
  let setTimeoutSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    TaskResource.fetchModel.mockResolvedValue(task);
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(() => 0);
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
  });

  it(`smoke test`, () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: documentTitle$() })).toBeInTheDocument();
  });

  it(`finish button does not appear if the task is not completed`, async () => {
    TaskResource.fetchModel.mockResolvedValue(incompleteTask);

    renderComponent();
    await flushUi();
    expect(screen.queryByTestId('finishButton')).not.toBeInTheDocument();
  });

  it(`when the task is completed, finish button appears`, async () => {
    TaskResource.fetchModel.mockResolvedValue(completedTask);

    renderComponent();
    await flushUi();
    expect(screen.getByTestId('finishButton')).toBeInTheDocument();
    expect(screen.getByTestId('completedMessage')).toHaveTextContent(
      success$({ target_facility: TARGET_FACILITY_NAME }),
    );
  });

  it(`clicking finish button sends the finish event to the state machine`, async () => {
    TaskResource.fetchModel.mockResolvedValue(completedTask);
    client.mockResolvedValue({ data: { picture_password: null } });
    renderComponent();

    await flushUi();
    await fireEvent.click(screen.getByTestId('finishButton'));
    await flushUi();
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'FINISH',
    });
    expect(client).toHaveBeenCalled();
    expect(redirectBrowser).toHaveBeenCalledTimes(1);
  });

  it('shows picture password confirmation modal after facility change when picture password is assigned', async () => {
    TaskResource.fetchModel.mockResolvedValue(completedTask);
    client.mockResolvedValue({ data: { picture_password: '3.7.12' } });
    renderComponent({
      targetFacility: {
        id: 'facility_id1',
        name: TARGET_FACILITY_NAME,
        url: TARGET_FACILITY_URL,
        picture_password_settings: { icon_style: 'colorful', show_icon_text: true },
      },
    });
    await flushUi();
    await fireEvent.click(screen.getByTestId('finishButton'));
    await flushUi();

    expect(screen.getByTestId('continue-checkbox')).toBeInTheDocument();
    expect(redirectBrowser).not.toHaveBeenCalled();
  });

  it('redirects immediately when picture password is null after facility change', async () => {
    TaskResource.fetchModel.mockResolvedValue(completedTask);
    client.mockResolvedValue({ data: { picture_password: null } });
    renderComponent({
      targetFacility: {
        id: 'facility_id1',
        name: TARGET_FACILITY_NAME,
        url: TARGET_FACILITY_URL,
        picture_password_settings: { icon_style: 'colorful', show_icon_text: true },
      },
    });
    await flushUi();
    await fireEvent.click(screen.getByTestId('finishButton'));
    await flushUi();
    expect(redirectBrowser).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('continue-checkbox')).not.toBeInTheDocument();
  });

  it('redirects when picture password modal is confirmed', async () => {
    TaskResource.fetchModel.mockResolvedValue(completedTask);
    client.mockResolvedValue({ data: { picture_password: '3.7.12' } });

    renderComponent({
      targetFacility: {
        id: 'facility_id1',
        name: TARGET_FACILITY_NAME,
        url: TARGET_FACILITY_URL,
        picture_password_settings: { icon_style: 'colorful', show_icon_text: true },
      },
    });

    await flushUi();
    await fireEvent.click(screen.getByTestId('finishButton'));
    await flushUi();
    await fireEvent.click(screen.getByTestId('continue-checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: continueAction$() }));
    await flushUi();
    expect(redirectBrowser).toHaveBeenCalledTimes(1);
  });

  it(`clicking retry button sends the task error event to the state machine`, async () => {
    TaskResource.fetchCollection.mockResolvedValue([]);
    TaskResource.startTask.mockRejectedValue({
      response: { status: 400, data: [{ metadata: { message: 'USERNAME_ALREADY_EXISTS' } }] },
    });
    client.mockResolvedValue({});
    renderComponent({ taskId: null });
    await flushUi();
    await fireEvent.click(screen.getByTestId('retryButton'));
    expect(sendMachineEvent).toHaveBeenCalledWith('TASKERROR');
  });
});
