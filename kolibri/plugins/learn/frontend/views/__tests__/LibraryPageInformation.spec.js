import pluginData from 'kolibri-plugin-data';
import userEvent from '@testing-library/user-event';
import { Store } from 'vuex';
import VueRouter from 'vue-router';
import { LearningActivities, UserKinds } from 'kolibri/constants';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import useUser from 'kolibri/composables/useUser';
import { render, screen, within } from '@testing-library/vue';
import LibraryPage from '../LibraryPage';
import { PageNames } from '../../constants';
import stubHttp from './stubHttp';

jest.mock('kolibri-common/composables/useChannels');
jest.mock('../../composables/useCardLayoutSpan');
jest.mock('../../composables/useDevices');
jest.mock('../../composables/useLearnerResources');
jest.mock('../../composables/usePinnedDevices');
jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('kolibri/composables/useTotalProgress');
jest.mock('kolibri-common/utils/samePageCheckGenerator', () => jest.fn(() => () => true));
jest.unmock('kolibri/urls');

function makeStore() {
  return new Store({
    state: { core: {} },
    getters: {},
    mutations: {
      SET_WELCOME_MODAL_VISIBLE: jest.fn(),
    },
  });
}

describe('Library resource information', () => {
  const result = {
    id: 'audio',
    title: 'Audio resource',
    is_leaf: true,
    kind: 'audio',
    accessibility_labels: [],
    learning_activities: [LearningActivities.LISTEN],
  };
  let button;
  let libraryRouter;
  let libraryRoute;
  let unmount;
  let httpStub;
  let width;
  let locationBeforeTest;
  let previousSession;
  let previousUrls;

  beforeEach(async () => {
    locationBeforeTest = window.location.href;
    width = jest.replaceProperty(window, 'innerWidth', 400);
    previousSession = useUser().session.value;
    previousUrls = pluginData.urls;
    unmount = undefined;
    httpStub = undefined;
    libraryRouter = new VueRouter({
      mode: 'hash',
      routes: [
        { path: '/library', name: PageNames.LIBRARY },
        { path: '/topics/c/:id', name: PageNames.TOPICS_CONTENT },
      ],
    });
    await libraryRouter.push({
      name: PageNames.LIBRARY,
      query: { learning_activities: LearningActivities.LISTEN },
    });
    libraryRoute = libraryRouter.currentRoute;
    useUser().setSession({ session: { kind: [UserKinds.LEARNER], user_id: 'learner' } });
    pluginData.urls = {
      prefix: '/',
      urls: {
        'kolibri:core:contentnodeprogress_list': [['api/content/contentnodeprogress/', []]],
        'kolibri:core:contentnode_list': [['api/content/contentnode/', []]],
        'kolibri:core:contentnode_recommendations_for': [
          ['api/content/contentnode/%(pk)s/recommendations_for/', ['pk']],
        ],
      },
    };
    httpStub = stubHttp(jest.spyOn, (method, { pathname, searchParams }) => {
      if (method === 'GET' && pathname === '/api/content/contentnode/') {
        if (searchParams.get('learning_activities')?.includes(LearningActivities.LISTEN)) {
          return { results: [result] };
        }
        return searchParams.has('max_results') ? { results: [] } : [];
      }
      if (
        method === 'GET' &&
        [
          '/api/content/contentnodeprogress/',
          `/api/content/contentnode/${result.id}/recommendations_for/`,
        ].includes(pathname)
      ) {
        return [];
      }
      throw new Error(`Unexpected request: ${method} ${pathname}`);
    });
    unmount = render(LibraryPage, { store: makeStore(), router: libraryRouter }).unmount;
    const grid = await screen.findByTestId('mobile-card-grid');
    button = await within(grid).findByRole('button', {
      name: coreStrings.viewInformation$(),
    });
  });

  afterEach(() => {
    unmount?.();
    useUser().setSession({ session: previousSession });
    pluginData.urls = previousUrls;
    httpStub?.mockRestore();
    width.restore();
    window.history.replaceState({}, '', locationBeforeTest);
  });

  it.each(['click', 'Enter'])(
    'opens information from a Listen result at 400 px by %s',
    async activation => {
      const user = userEvent.setup();

      if (activation === 'click') {
        await user.click(button);
      } else {
        button.focus();
        await user.keyboard('{Enter}');
      }

      const panel = await screen.findByRole('region', { name: result.title });
      expect(within(panel).getByTestId('content-title')).toHaveTextContent(result.title);
      expect(libraryRouter.currentRoute).toBe(libraryRoute);
      expect(window.location.hash.split('?')[0]).toBe('#/library');
    },
  );
});
