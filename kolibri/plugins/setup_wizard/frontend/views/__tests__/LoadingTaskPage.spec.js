import { render, screen, waitFor, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { syncStrings } from 'kolibri-common/mixins/commonSyncElements';
import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
import TaskResource from 'kolibri/apiResources/TaskResource';
import LoadingTaskPage from '../LoadingTaskPage';
import makeStore from '../../__tests__/utils/makeStore';

const { continueAction$, retryAction$, startOverAction$, cancelAction$ } = coreStrings;

const { importFacilityAction$ } = syncStrings;

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
  type: TaskTypes.SYNCPEERPULL,
  facility_id: 'facility_1',
  clearable: false,
  cancellable: true,
  extra_metadata: {},
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
  });

  return { ...utils, sendMock };
};

describe('LoadingTaskPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the first task in the queue and starts polling', async () => {
    // 1. Save original timeout so standard execution isn't entirely broken
    const originalSetTimeout = global.setTimeout;

    // Counter to prevent infinite loops (test hanging)
    let pollCount = 0;

    // 2. Short-circuit the delay using a mock as the maintainer recommended
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((cb, delay) => {
      // If it's a long polling delay, short circuit it!
      if (delay > 0) {
        if (pollCount < 1) {
          pollCount++;
          // Defer the execution by 0ms to ensure Vue's state updates properly before the next poll
          originalSetTimeout(cb, 0);
        }
        return 123; // Dummy ID
      }
      return originalSetTimeout(cb, delay);
    });

    const intervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(cb => {
      if (pollCount < 1) {
        pollCount++;
        originalSetTimeout(cb, 0);
      }
      return 123;
    });

    TaskResource.list.mockResolvedValue([makeTask('RUNNING')]);

    const { unmount } = renderComponent();

    // 3. Flush promises twice to allow the initial mount AND the mocked short-circuit to finish
    await global.flushPromises();
    await global.flushPromises();

    expect(screen.getByRole('heading', { name: importFacilityAction$() })).toBeInTheDocument();

    const panel = screen.getByTestId('task-panel');
    expect(panel).toBeInTheDocument();

    // 4. Prove the polling works!
    // The API was called once on mount, and once by our short-circuited timer
    expect(TaskResource.list).toHaveBeenCalledTimes(2);

    // 5. Clean up
    timeoutSpy.mockRestore();
    intervalSpy.mockRestore();
    unmount();
  });

  it('when tasks succeeds, the "continue" button is available', async () => {
    TaskResource.list.mockResolvedValue([makeTask('COMPLETED')]);
    const { sendMock } = renderComponent();

    await global.flushPromises();

    const continueButton = await screen.findByRole('button', {
      name: continueAction$(),
    });
    expect(continueButton).toBeInTheDocument();

    await userEvent.click(continueButton);

    expect(sendMock).toHaveBeenCalledWith('CONTINUE');
    expect(TaskResource.clearAll).toHaveBeenCalledTimes(1);
  });

  it('when task fails, the "retry" button is available', async () => {
    TaskResource.list.mockResolvedValue([makeTask('FAILED')]);
    renderComponent();

    await global.flushPromises();

    const retryButton = await screen.findByRole('button', { name: retryAction$() });
    expect(retryButton).toBeInTheDocument();

    await userEvent.click(retryButton);

    expect(TaskResource.restart).toHaveBeenCalledTimes(1);
  });

  it('when task fails, the "start over" button is available', async () => {
    TaskResource.list.mockResolvedValue([makeTask('FAILED')]);
    renderComponent();

    await global.flushPromises();

    const startOverButton = await screen.findByRole('button', {
      name: startOverAction$(),
    });
    expect(startOverButton).toBeInTheDocument();

    await userEvent.click(startOverButton);

    expect(TaskResource.clearAll).toHaveBeenCalledTimes(1);
  });

  it('a cancel request is made when "cancel" is clicked', async () => {
    TaskResource.list.mockResolvedValue([makeTask('RUNNING')]);
    renderComponent();

    await global.flushPromises();

    const cancelButton = await screen.findByRole('button', { name: cancelAction$() });
    await fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(TaskResource.cancel).toHaveBeenCalledTimes(1);
    });
  });
});
