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

const renderComponent = () => {
  const store = makeStore();
  store.dispatch = jest.fn().mockResolvedValue({});

  return render(LoadingTaskPage, {
    store,
    provide: {
      wizardService: {
        send: jest.fn(),
        state: { context: { selectedFacility: facilityMock } },
      },
    },
    props: {
      footerMessageType: 'IMPORT_FACILITY',
    },
    stubs: {
      FacilityTaskPanel: {
        template: '<div data-testid="task-panel"><button data-testid="stub-cancel" @click="$emit(\'cancel\')">Cancel Task</button></div>',
      },
    },
  });
};

describe('LoadingTaskPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the first task in the queue and starts polling', async () => {
    TaskResource.list.mockResolvedValue([{ id: 'task_1', status: 'RUNNING' }]);
    renderComponent();

    await flushPromises();

    expect(screen.getByRole('heading', { name: /import learning facility/i })).toBeInTheDocument();
    expect(screen.getByTestId('task-panel')).toBeInTheDocument();
  });

  it('when tasks succeeds, the "continue" button is available', async () => {
    TaskResource.list.mockResolvedValue([{ id: 'task_1', status: 'COMPLETED' }]);
    const { emitted } = renderComponent();

    await flushPromises();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await userEvent.click(continueButton);

    expect(emitted().click_next).toBeTruthy();
  });

  it('when task fails, the "retry" button is available', async () => {
    TaskResource.list.mockResolvedValue([{ id: 'task_1', status: 'FAILED' }]);
    renderComponent();

    await flushPromises();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryButton);

    expect(TaskResource.restart).toHaveBeenCalledTimes(1);
  });

  it('when task fails, the "start over" button is available', async () => {
    TaskResource.list.mockResolvedValue([{ id: 'task_1', status: 'FAILED' }]);
    renderComponent();

    await flushPromises();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument();
    });

    const startOverButton = screen.getByRole('button', { name: /start over/i });
    await userEvent.click(startOverButton);

    expect(TaskResource.clearAll).toHaveBeenCalledTimes(1);
  });

  it('a cancel request is made when "cancel" is clicked', async () => {
    TaskResource.list.mockResolvedValue([{ id: 'task_1', status: 'RUNNING' }]);
    renderComponent();

    await flushPromises();
    const cancelButton = await screen.findByTestId('stub-cancel');
    await userEvent.click(cancelButton);

    await waitFor(() => {
      expect(TaskResource.cancel).toHaveBeenCalledTimes(1);
    });
  });
});