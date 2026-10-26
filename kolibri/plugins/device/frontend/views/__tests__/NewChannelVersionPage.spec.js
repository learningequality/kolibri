import VueRouter from 'vue-router';
import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import TaskResource from 'kolibri/apiResources/TaskResource';
import NewChannelVersionPage, {
  pageTitleStrings,
} from '../ManageContentPage/NewChannelVersionPage';
import { fetchOrTriggerChannelDiffStatsTask } from '../ManageContentPage/api';
import { makeSelectContentPageStore } from '../../__tests__/utils/makeStore';

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('../ManageContentPage/api', () => ({
  fetchChannelAtSource: jest.fn().mockResolvedValue([
    { id: 'awesome_channel', name: 'Awesome Channel', version: 5 },
    { id: 'awesome_channel', name: 'Awesome Channel', version: 10, version_notes: {} },
  ]),
  fetchOrTriggerChannelDiffStatsTask: jest.fn(),
}));
jest.mock('kolibri/apiResources/TaskResource', () => ({
  clear: jest.fn().mockResolvedValue({}),
  startTask: jest.fn().mockResolvedValue({ id: 'task-1', extra_metadata: {} }),
}));

const DIFF_STATS_TASK = {
  clearable: true,
  status: 'COMPLETED',
  extra_metadata: {
    // 0 new resources keeps handleSubmit on its simpler "go straight to
    // Manage Tasks" path, rather than the one that watches the task list.
    new_resources_count: 0,
    deleted_resources_count: 1,
    updated_resources_count: 2,
  },
};

const { updateChannelAction$ } = createTranslator(
  NewChannelVersionPage.name,
  NewChannelVersionPage.$trs,
);
const { continueAction$ } = coreStrings;

function makeRenderOptions(routeQuery) {
  const store = makeSelectContentPageStore();
  const routes = new VueRouter({
    routes: [
      {
        name: 'NEW_CHANNEL_VERSION_PAGE',
        path: '/content/manage_channel/:channel_id/upgrade',
      },
      { name: 'MANAGE_CONTENT_PAGE', path: '/content' },
      { name: 'MANAGE_TASKS', path: '/content/tasks' },
      { name: 'MANAGE_CHANNEL', path: '/content/manage_channel/:channel_id' },
    ],
  });
  routes.push({
    name: 'NEW_CHANNEL_VERSION_PAGE',
    params: { channel_id: 'awesome_channel' },
    query: routeQuery,
  });
  return { store, routes };
}

function renderPage(routeQuery = {}) {
  return render(NewChannelVersionPage, makeRenderOptions(routeQuery));
}

async function renderLoadedPage(routeQuery = {}) {
  renderPage(routeQuery);
  const updateButton = await screen.findByRole('button', { name: updateChannelAction$() });
  await waitFor(() => expect(updateButton).toBeEnabled());
  return updateButton;
}

describe('NewChannelVersionPage', () => {
  beforeEach(() => {
    fetchOrTriggerChannelDiffStatsTask.mockResolvedValue(DIFF_STATS_TASK);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('titles the tab with the loaded version text, its only h1', async () => {
    document.title = '';
    renderPage();
    const versionText = pageTitleStrings.versionIsAvailable$({
      channelName: 'Awesome Channel',
      nextVersion: '10',
    });
    await waitFor(() => {
      expect(document.title).toBe(`${versionText} - Kolibri`);
    });
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(versionText);
  });

  it('disables the "Update channel" action until the channel and task info have loaded', async () => {
    let resolveDiffStats;
    fetchOrTriggerChannelDiffStatsTask.mockReturnValue(
      new Promise(resolve => {
        resolveDiffStats = resolve;
      }),
    );
    renderPage();

    const updateButton = await screen.findByRole('button', { name: updateChannelAction$() });
    expect(updateButton).toBeDisabled();

    resolveDiffStats(DIFF_STATS_TASK);
    await waitFor(() => {
      expect(updateButton).toBeEnabled();
    });
  });

  it('starts the update task with the token when the user arrived with a token in the URL', async () => {
    // In the real app, submitting navigates away to Manage Tasks and this page is
    // unmounted. Here it stays mounted standalone, so its own back-link keeps
    // reacting to that new route and warns about a route it's not relevant to
    // anymore; that warning is a test-harness artifact, not app behavior.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const updateButton = await renderLoadedPage({ token: 'my-special-token' });

    await userEvent.click(updateButton);
    await userEvent.click(screen.getByRole('button', { name: continueAction$() }));

    await waitFor(() => {
      expect(TaskResource.startTask).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'my-special-token' }),
      );
    });
    warnSpy.mockRestore();
  });

  it('starts the update task without a token when the user arrived without one', async () => {
    // See the comment in the previous test for why console.warn is stubbed here.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const updateButton = await renderLoadedPage({});

    await userEvent.click(updateButton);
    await userEvent.click(screen.getByRole('button', { name: continueAction$() }));

    await waitFor(() => {
      expect(TaskResource.startTask).toHaveBeenCalled();
    });
    const [callArgs] = TaskResource.startTask.mock.calls.at(-1);
    expect(callArgs).not.toHaveProperty('token');
    warnSpy.mockRestore();
  });
});
