import VueRouter from 'vue-router';
import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { crossComponentTranslator } from 'kolibri/utils/i18n';
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

const NO_NEW_RESOURCES_TASK = {
  clearable: true,
  status: 'COMPLETED',
  extra_metadata: {
    new_resources_count: 0,
    deleted_resources_count: 1,
    updated_resources_count: 2,
  },
};

const { updateChannelAction$ } = crossComponentTranslator(NewChannelVersionPage);
const { continueAction$ } = coreStrings;

// Submitting the update navigates away to Manage Tasks with ?last=MANAGE_CHANNEL.
// This page stays mounted standalone in the test (no router-view swaps it out as
// in the real app), so its own back-link re-resolves against that query param and
// vue-router warns that MANAGE_CHANNEL needs a channel_id param it wasn't given.
const BACK_LINK_ROUTE_WARNING = /missing param for named route "MANAGE_CHANNEL"/;

function stubBackLinkRouteWarning() {
  const realWarn = console.warn; // eslint-disable-line no-console
  return jest.spyOn(console, 'warn').mockImplementation((message, ...rest) => {
    if (!BACK_LINK_ROUTE_WARNING.test(message)) {
      realWarn(message, ...rest);
    }
  });
}

function makeRouter(routeQuery) {
  const router = new VueRouter({
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
  router.push({
    name: 'NEW_CHANNEL_VERSION_PAGE',
    params: { channel_id: 'awesome_channel' },
    query: routeQuery,
  });
  return router;
}

function renderPage(routeQuery = {}) {
  const store = makeSelectContentPageStore();
  const router = makeRouter(routeQuery);
  render(NewChannelVersionPage, { store, routes: router });
  return router;
}

async function renderLoadedPage(routeQuery = {}) {
  const router = renderPage(routeQuery);
  const updateButton = await screen.findByRole('button', { name: updateChannelAction$() });
  await waitFor(() => expect(updateButton).toBeEnabled());
  return { updateButton, router };
}

describe('NewChannelVersionPage', () => {
  beforeEach(() => {
    fetchOrTriggerChannelDiffStatsTask.mockResolvedValue(NO_NEW_RESOURCES_TASK);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
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

  it('disables the "Update channel" action until the update details have loaded', async () => {
    let resolveDiffStats;
    fetchOrTriggerChannelDiffStatsTask.mockReturnValue(
      new Promise(resolve => {
        resolveDiffStats = resolve;
      }),
    );
    renderPage();

    const updateButton = await screen.findByRole('button', { name: updateChannelAction$() });
    expect(updateButton).toBeDisabled();

    resolveDiffStats(NO_NEW_RESOURCES_TASK);
    await waitFor(() => {
      expect(updateButton).toBeEnabled();
    });
  });

  it('starts the update task with the token when the user arrived with a token in the URL', async () => {
    const warnSpy = stubBackLinkRouteWarning();
    const { updateButton, router } = await renderLoadedPage({ token: 'my-special-token' });

    await userEvent.click(updateButton);
    await userEvent.click(screen.getByRole('button', { name: continueAction$() }));

    await waitFor(() => {
      expect(TaskResource.startTask).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'my-special-token' }),
      );
    });
    await waitFor(() => {
      expect(router.currentRoute.name).toBe('MANAGE_TASKS');
      expect(router.currentRoute.query).toMatchObject({
        last: 'MANAGE_CHANNEL',
        channel_id: 'awesome_channel',
      });
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(BACK_LINK_ROUTE_WARNING));
  });

  it('starts the update task without a token when the user arrived without one', async () => {
    const warnSpy = stubBackLinkRouteWarning();
    const { updateButton, router } = await renderLoadedPage({});

    await userEvent.click(updateButton);
    await userEvent.click(screen.getByRole('button', { name: continueAction$() }));

    await waitFor(() => {
      expect(TaskResource.startTask).toHaveBeenCalled();
    });
    const [callArgs] = TaskResource.startTask.mock.calls.at(-1);
    expect(callArgs).not.toHaveProperty('token');
    await waitFor(() => {
      expect(router.currentRoute.name).toBe('MANAGE_TASKS');
      expect(router.currentRoute.query).toMatchObject({
        last: 'MANAGE_CHANNEL',
        channel_id: 'awesome_channel',
      });
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(BACK_LINK_ROUTE_WARNING));
  });
});
