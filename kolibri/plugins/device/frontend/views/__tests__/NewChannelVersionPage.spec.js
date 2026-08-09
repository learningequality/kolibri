import { render, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import NewChannelVersionPage from '../ManageContentPage/NewChannelVersionPage';
import { fetchChannelAtSource } from '../ManageContentPage/api';
import { makeSelectContentPageStore } from '../../__tests__/utils/makeStore';

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('../ManageContentPage/api', () => ({
  fetchChannelAtSource: jest.fn().mockResolvedValue([
    { id: 'awesome_channel', name: 'Awesome Channel', version: 5 },
    { id: 'awesome_channel', name: 'Awesome Channel', version: 10, version_notes: {} },
  ]),
  fetchOrTriggerChannelDiffStatsTask: jest.fn().mockResolvedValue({
    clearable: true,
    status: 'COMPLETED',
    extra_metadata: {
      new_resources_count: 5,
      deleted_resources_count: 1,
      updated_resources_count: 2,
    },
  }),
}));
jest.mock('kolibri/apiResources/TaskResource', () => ({
  clear_v2: jest.fn().mockResolvedValue({}),
  startTask: jest.fn().mockResolvedValue({ id: 'task-1', extra_metadata: {} }),
}));

function createRouter() {
  return new VueRouter({
    routes: [
      { name: 'NEW_CHANNEL_VERSION_PAGE', path: '/content/manage_channel/:channel_id/upgrade' },
      { name: 'MANAGE_CONTENT_PAGE', path: '/content' },
      { name: 'MANAGE_TASKS', path: '/content/tasks' },
    ],
  });
}

async function renderComponent(routeQuery = {}) {
  const store = makeSelectContentPageStore();
  const router = createRouter();
  await router.push({
    name: 'NEW_CHANNEL_VERSION_PAGE',
    params: { channel_id: 'awesome_channel' },
    query: routeQuery,
  });
  return render(NewChannelVersionPage, { store, router });
}

describe('NewChannelVersionPage', () => {
  beforeEach(() => {
    // Mock call history isn't automatically reset between tests, so without this
    // the second test could see stale calls left over from the first.
    jest.clearAllMocks();
  });

  it('includes the token in the channel lookup params when a token is present in the route query', async () => {
    await renderComponent({ token: 'my-special-token' });

    await waitFor(() => {
      expect(fetchChannelAtSource).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'my-special-token' }),
      );
    });
  });

  it('does not include a token in the channel lookup params when the route query has no token', async () => {
    await renderComponent({});

    await waitFor(() => {
      expect(fetchChannelAtSource).toHaveBeenCalled();
    });

    const calledParams = fetchChannelAtSource.mock.calls[0][0];
    expect(calledParams.token).toBeUndefined();
  });
});
