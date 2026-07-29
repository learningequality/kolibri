import { render, screen } from '@testing-library/vue';
import TaskResource from 'kolibri/apiResources/TaskResource';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import { crossComponentTranslator } from 'kolibri/utils/i18n';
import { TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
import FacilityNameAndSyncStatus from 'kolibri-common/components/syncComponentSet/FacilityNameAndSyncStatus';
import {
  FACILITY_ID,
  FACILITY_NAME,
  syncSchedule,
} from 'kolibri-common/utils/__tests__/syncSchedule';
import FacilitiesPage from '../index.vue';

jest.mock('kolibri/urls');
jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: { deprecationWarnings: {} },
}));
jest.mock('kolibri/apiResources/TaskResource', () => ({
  list: jest.fn(),
}));
jest.mock('kolibri-common/apiResources/FacilityResource', () => ({
  fetchCollection: jest.fn(),
}));

const { syncing$ } = crossComponentTranslator(FacilityNameAndSyncStatus);

const FACILITY = {
  id: FACILITY_ID,
  name: FACILITY_NAME,
  dataset: { registered: true },
  last_successful_sync: null,
};

async function renderPage(tasks) {
  TaskResource.list.mockResolvedValue(tasks);
  FacilityResource.fetchCollection.mockResolvedValue([FACILITY]);
  render(FacilitiesPage, {
    routes: [{ path: '/facilities/tasks', name: 'FACILITIES_TASKS_PAGE' }],
  });
  await global.flushPromises();
}

describe('FacilitiesPage', () => {
  it('shows a facility as syncing while its scheduled sync is running', async () => {
    await renderPage([syncSchedule({ status: TaskStatuses.RUNNING })]);

    expect(screen.getByText(syncing$())).toBeInTheDocument();
  });

  it('does not show a facility as syncing between runs of its sync schedule', async () => {
    await renderPage([syncSchedule({ lastFinishedStatus: TaskStatuses.COMPLETED })]);

    expect(screen.getByText(FACILITY_NAME)).toBeInTheDocument();
    expect(screen.queryByText(syncing$())).not.toBeInTheDocument();
  });
});
