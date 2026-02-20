import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TaskResource from 'kolibri/apiResources/TaskResource';
import LoadingTaskPage from '../LoadingTaskPage';

jest.mock('kolibri/apiResources/TaskResource', () => ({
  cancel: jest.fn(),
  clearAll: jest.fn(),
  restart: jest.fn(),
  list: jest.fn(),
}));

const facilityMock = {
  id: '4494060ae9b746af80200faa848eb23d',
  name: 'Kolibri School',
  username: 'username',
  password: 'password',
};


const renderComponent = () => {
  return render(LoadingTaskPage, {
    mocks: {
      wizardService: {
        state: { context: { selectedFacility: facilityMock } },
      },

      goToRootUrl: jest.fn(),
      $router: {
        push: jest.fn(),
        replace: jest.fn(),
      },
    },
    stubs: {

      FacilityTaskPanel: {
        template: `<div><button @click="$emit('cancel')">Cancel Task</button></div>`,
      },
    },
  });
};

describe('LoadingTaskPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TaskResource.clearAll.mockResolvedValue();
  });

  it('loads the first task in the queue and starts polling', async () => {
    TaskResource.list.mockResolvedValue([{ status: 'RUNNING' }]);
    renderComponent();


    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Import learning facility' })).toBeInTheDocument();
    });


    expect(screen.getByRole('button', { name: 'Cancel Task' })).toBeInTheDocument();
  });

  it.skip('when tasks succeeds, the "continue" button is available', async () => {
    TaskResource.list.mockResolvedValue([{ status: 'COMPLETED' }]);
    const { emitted } = renderComponent();


    const continueButton = await screen.findByRole('button', { name: 'Continue' });
    await userEvent.click(continueButton);


    expect(emitted().click_next).toBeTruthy();
  });

  it.skip('when task fails, the "retry" button is available', async () => {
    TaskResource.list.mockResolvedValue([{ status: 'FAILED' }]);
    renderComponent();

    const retryButton = await screen.findByRole('button', { name: 'Retry' });
    await userEvent.click(retryButton);

    expect(TaskResource.restart).toHaveBeenCalledTimes(1);
  });

  it.skip('when task fails, the "start over" button is available', async () => {
    TaskResource.list.mockResolvedValue([{ status: 'FAILED' }]);
    const { getByRole } = renderComponent();

    const startOverButton = await waitFor(() => getByRole('button', { name: 'Start over' }));
    await userEvent.click(startOverButton);

    expect(TaskResource.clearAll).toHaveBeenCalledTimes(1);
  });

  it('a cancel request is made when "cancel" is clicked', async () => {
    TaskResource.list.mockResolvedValue([{ status: 'RUNNING' }]);
    renderComponent();


    const cancelStubButton = await screen.findByRole('button', { name: 'Cancel Task' });
    await userEvent.click(cancelStubButton);

    expect(TaskResource.cancel).toHaveBeenCalledTimes(1);
  });
});