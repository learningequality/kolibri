import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TaskResource from 'kolibri/apiResources/TaskResource';
import LoadingTaskPage from '../LoadingTaskPage';
import makeStore from '../../__tests__/utils/makeStore';

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

jest.mock('kolibri/apiResources/TaskResource', () => ({
  cancel: jest.fn().mockResolvedValue({}),
  clearAll: jest.fn().mockResolvedValue({}),
  restart: jest.fn().mockResolvedValue({}),
  list: jest.fn().mockResolvedValue([]),
}));

const facilityMock = {
  id: '4494060ae9b746af80200faa848eb23d',
  name: 'Kolibri School',
  username: 'username',
  password: 'password',
};

const makeTask = status => ({
  id: 'task_1',
  status,
  type: 'facility_import',
  started_by: 'username',
  clearable: false,
  cancellable: true,
  extra_metadata: { started_by: 'tester' },
});

const renderComponent = () => {
  const store = makeStore();
  store.dispatch = jest.fn().mockResolvedValue({});

  const sendMock = jest.fn();

  const utils = render(LoadingTaskPage, {
    store,
    provide: {
      wizardService: {
        send: sendMock,
        state: {
          context: {
            selectedFacility: facilityMock,
            importedUsers: [],
          },
        },
      },
    },
    props: {
      footerMessageType: 'IMPORT_FACILITY',
    },
    stubs: {
      FacilityTaskPanel: {
        name: 'FacilityTaskPanel',
        template:
          '<div data-testid="task-panel"><button data-testid="stub-cancel" @click="$emit(\'cancel\')">Cancel Task</button></div>',
      },
    },
  });

  return { ...utils, sendMock };
};

describe('LoadingTaskPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the first task in the queue and starts polling', async () => {
    TaskResource.list.mockResolvedValue([makeTask('RUNNING')]);
    renderComponent();

    await flushPromises();

    expect(screen.getByRole('heading', { name: /import learning facility/i })).toBeInTheDocument();

    const panel = await screen.findByTestId('task-panel');
    expect(panel).toBeInTheDocument();
  });

  it('when tasks succeeds, the "continue" button is available', async () => {
    TaskResource.list.mockResolvedValue([makeTask('COMPLETED')]);
    const { sendMock } = renderComponent();

    await flushPromises();

    const continueButton = await screen.findByRole('button', { name: /continue/i });
    expect(continueButton).toBeInTheDocument();

    await userEvent.click(continueButton);

    expect(sendMock).toHaveBeenCalledWith('CONTINUE');
    expect(TaskResource.clearAll).toHaveBeenCalledTimes(1);
  });

  it('when task fails, the "retry" button is available', async () => {
    TaskResource.list.mockResolvedValue([makeTask('FAILED')]);
    renderComponent();

    await flushPromises();

    const retryButton = await screen.findByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    await userEvent.click(retryButton);

    expect(TaskResource.restart).toHaveBeenCalledTimes(1);
  });

  it('when task fails, the "start over" button is available', async () => {
    TaskResource.list.mockResolvedValue([makeTask('FAILED')]);
    renderComponent();

    await flushPromises();

    const startOverButton = await screen.findByRole('button', { name: /start over/i });
    expect(startOverButton).toBeInTheDocument();

    await userEvent.click(startOverButton);

    expect(TaskResource.clearAll).toHaveBeenCalledTimes(1);
  });

  it('a cancel request is made when "cancel" is clicked', async () => {
    TaskResource.list.mockResolvedValue([makeTask('RUNNING')]);
    renderComponent();

    await flushPromises();

    const cancelButton = await screen.findByTestId('stub-cancel');
    await userEvent.click(cancelButton);

    await waitFor(() => {
      expect(TaskResource.cancel).toHaveBeenCalledTimes(1);
    });
  });
});
