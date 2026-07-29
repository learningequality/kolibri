import { render, screen } from '@testing-library/vue';
import TaskResource from 'kolibri/apiResources/TaskResource';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import { syncFacilityTaskDisplayInfo, TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
import { syncSchedule } from 'kolibri-common/utils/__tests__/syncSchedule';
import { deviceStrings } from '../../commonDeviceStrings';
import FacilitiesTasksPage from '../FacilitiesTasksPage';

jest.mock('kolibri/apiResources/TaskResource', () => ({
  list: jest.fn(),
}));

const { emptyTasksMessage$ } = deviceStrings;

const SYNC_HEADING = syncFacilityTaskDisplayInfo(syncSchedule()).headingMsg;

async function renderPage(tasks) {
  TaskResource.list.mockResolvedValue(tasks);
  render(FacilitiesTasksPage, {
    routes: [{ path: '/facilities', name: 'FACILITIES_PAGE' }],
  });
  // Let the poll resolve, so an empty list and a filtered-out one differ.
  await global.flushPromises();
}

describe('FacilitiesTasksPage', () => {
  it('lists a repeating sync showing the run that just finished, with no clear or retry', async () => {
    const task = syncSchedule({ lastFinishedStatus: TaskStatuses.COMPLETED });
    // Wording is asserted in syncTaskUtils.spec.js; here only that it is rendered.
    const { statusMsg, bytesTransferredMsg } = syncFacilityTaskDisplayInfo(task);
    await renderPage([task]);

    expect(screen.getByText(SYNC_HEADING)).toBeInTheDocument();
    expect(screen.getByText(statusMsg)).toBeInTheDocument();
    expect(screen.getByText(bytesTransferredMsg)).toBeInTheDocument();
    for (const action of ['clearAction', 'retryAction', 'cancelAction']) {
      expect(screen.queryByRole('button', { name: coreString(action) })).not.toBeInTheDocument();
    }
  });

  it('shows the no-tasks message when a schedule that has never run is the only task', async () => {
    await renderPage([syncSchedule()]);

    expect(screen.getByText(emptyTasksMessage$())).toBeInTheDocument();
    expect(screen.queryByText(SYNC_HEADING)).not.toBeInTheDocument();
  });
});
