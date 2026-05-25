import { fireEvent, render, screen } from '@testing-library/vue';
import TaskResource from 'kolibri/apiResources/TaskResource';
import { TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
import { createTranslator } from 'kolibri/utils/i18n';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import client from 'kolibri/client';
import { PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING } from 'kolibri-common/constants/Auth';
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
    sessionStorage.clear();
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

  it('stores picture password in sessionStorage and redirects when picture password is assigned', async () => {
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

    expect(redirectBrowser).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).toBe('true');
  });

  // Previously (before the picture-password fix) this case did NOT set the flag — that was the bug.
  // The facility has picture_password_settings but the user's picture_password hasn't synced yet;
  // the flag must stay set so the modal can appear after the next sync.
  it('stores picture password pending in sessionStorage when picture passwords are enabled but not yet synced', async () => {
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
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).toBe('true');
  });

  it('redirects without storing in sessionStorage when picture password is null and picture passwords are not enabled', async () => {
    TaskResource.fetchModel.mockResolvedValue(completedTask);
    client.mockResolvedValue({ data: { picture_password: null } });
    renderComponent();
    await flushUi();
    await fireEvent.click(screen.getByTestId('finishButton'));
    await flushUi();
    expect(redirectBrowser).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).not.toBe('true');
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
