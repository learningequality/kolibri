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
  cancel_v2: jest.fn().mockResolvedValue({}),
  clearAll_v2: jest.fn().mockResolvedValue({}),
  restart_v2: jest.fn().mockResolvedValue({}),
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
    expect(TaskResource.clearAll_v2).toHaveBeenCalledTimes(1);
  });

  it('when task fails, the "retry" button is available', async () => {
    TaskResource.list.mockResolvedValue([makeTask('FAILED')]);
    renderComponent();

    await global.flushPromises();

    const retryButton = await screen.findByRole('button', { name: retryAction$() });
    expect(retryButton).toBeInTheDocument();

    await userEvent.click(retryButton);

    expect(TaskResource.restart_v2).toHaveBeenCalledTimes(1);
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

    expect(TaskResource.clearAll_v2).toHaveBeenCalledTimes(1);
  });

  it('a cancel request is made when "cancel" is clicked', async () => {
    TaskResource.list.mockResolvedValue([makeTask('RUNNING')]);
    renderComponent();

    await global.flushPromises();

    const cancelButton = await screen.findByRole('button', { name: cancelAction$() });
    await fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(TaskResource.cancel_v2).toHaveBeenCalledTimes(1);
    });
  });

  it('after retry the poll loop re-arms so the loading step reflects the restarted task (issue #15235)', async () => {
    // 1. Initial state: a FAILED task is shown with the Retry button.
    TaskResource.list.mockResolvedValue([makeTask('FAILED')]);
    renderComponent();

    await global.flushPromises();

    expect(screen.getByRole('button', { name: retryAction$() })).toBeInTheDocument();

    // 2. The first poll ran on mount; the second poll is the short-circuited timer.
    expect(TaskResource.list).toHaveBeenCalledTimes(2);

    // 3. Click Retry. The restart succeeds and the component re-arms the poll loop.
    await userEvent.click(screen.getByRole('button', { name: retryAction$() }));

    expect(TaskResource.restart_v2).toHaveBeenCalledTimes(1);
    // After a successful restart the poll loop is re-armed and fires once more.
    expect(TaskResource.list).toHaveBeenCalledTimes(3);
  });

  it('a rejected restart keeps the user in the wizard instead of the global error page (issue #15235)', async () => {
    const { sendMock } = renderComponent();

    // A FAILED task with a restart endpoint that rejects (as if the task were QUEUED).
    TaskResource.list.mockResolvedValue([makeTask('FAILED')]);
    TaskResource.restart_v2.mockRejectedValueOnce(new Error('Cannot restart job with state: QUEUED'));

    await global.flushPromises();

    await userEvent.click(screen.getByRole('button', { name: retryAction$() }));

    // The restart failed, but the wizard was not kicked to the global error page.
    expect(sendMock).not.toHaveBeenCalledWith('ERROR');
    // The poll loop is still active; the component will re-fetch on the next timer.
    expect(TaskResource.list).toHaveBeenCalledTimes(2);
  });

  it('the poll loop recovers from a non-500 network error instead of freezing (issue #15235)', async () => {
    const originalSetTimeout = global.setTimeout;
    let pollCount = 0;

    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((cb, delay) => {
      if (delay > 0) {
        if (pollCount < 2) {
          pollCount++;
          originalSetTimeout(cb, 0);
        }
        return 123;
      }
      return originalSetTimeout(cb, delay);
    });

    // The first list call fails with a non-500 error (for example a transient network hiccup).
    TaskResource.list.mockRejectedValueOnce(new Error('Network error'));

    renderComponent();

    await global.flushPromises();
    await global.flushPromises();

    // The poll loop recovered and ran again after the error.
    expect(TaskResource.list).toHaveBeenCalledTimes(3);

    timeoutSpy.mockRestore();
  });
});
