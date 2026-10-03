import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import logger from 'kolibri-logging';
import useSidePanelTitle from '../../../../composables/useSidePanelTitle';
import makeStore from '../../../../__tests__/utils/makeStore';
import store from '../../../../store';
import lessonsRoutes from '../../../../routes/lessonsRoutes';
import { PageNames } from '../../../../constants';

jest.mock('kolibri-logging', () => {
  const log = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { getLogger: () => log, setLevel: jest.fn() };
});
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('kolibri-common/composables/useChannels');
jest.mock('../../../../modules/lessonSummary/handlers');
jest.mock('../../../../composables/fetchClassSyncStatus');
jest.mock('kolibri/urls');
jest.mock('kolibri/router', () => ({
  getRoute: jest.fn((name, params) => ({ name, params })),
  getReactiveRoute: jest.fn(() => ({ params: {} })),
}));
jest.mock('kolibri/components/pages/NotificationsRoot/internal/PingbackNotificationResource');
jest.mock(
  'kolibri/components/pages/NotificationsRoot/internal/PingbackNotificationDismissedResource',
);

const PanelStub = {
  setup() {
    useSidePanelTitle();
  },
  render: h => h('div', { attrs: { 'data-testid': 'panel' } }),
};

const CLASS_ID = 'c'.repeat(32);
const LESSON = {
  id: 'deleted-lesson',
  title: 'Deleted lesson',
  classroom: { id: CLASS_ID },
  assignments: [],
  learner_ids: [],
  resources: [],
};

async function renderDeletedLessonSummary({
  currentLesson = LESSON,
  lessonMap = {},
  routeName = PageNames.LESSON_SUMMARY,
} = {}) {
  store.replaceState(makeStore().state);
  store.state.classSummary.id = CLASS_ID;
  store.state.classSummary.name = 'Class 1';
  store.state.classSummary.lessonMap = lessonMap;
  store.state.lessonSummary.currentLesson = currentLesson;
  const router = new VueRouter({
    routes: lessonsRoutes
      .filter(route => [PageNames.LESSONS_ROOT, PageNames.LESSON_SUMMARY].includes(route.name))
      .map(route => ({
        ...route,
        // The real panel's sub-pages fetch over the network, so a stub panel stands in.
        children: route.children?.map(child => ({
          ...child,
          component: PanelStub,
          children: [],
          redirect: undefined,
        })),
      })),
  });
  await router.push({
    name: routeName,
    params: { classId: CLASS_ID, lessonId: LESSON.id },
  });
  // The page's own <router-view> renders its side panels, so it must not be the root.
  render({ template: '<router-view />' }, { store, routes: router });
  await global.flushPromises();
}

describe('LessonSummaryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockImplementation(() => useUserMock({ isCoach: true }));
  });

  it('logs no title error once its lesson is gone from the class summary', async () => {
    await renderDeletedLessonSummary();
    const errors = logger.getLogger().error.mock.calls.map(([message]) => String(message));
    expect(errors.filter(message => message.startsWith('Failed to obtain page title.'))).toEqual(
      [],
    );
  });

  it('titles the tab with the lesson once it is gone from the class summary', async () => {
    await renderDeletedLessonSummary();
    expect(document.title).toBe('Deleted lesson - Class 1 - Kolibri');
  });

  it('titles the tab from the class summary while the lesson loads', async () => {
    await renderDeletedLessonSummary({
      currentLesson: { ...LESSON, title: undefined },
      lessonMap: { [LESSON.id]: { ...LESSON, title: 'Mapped lesson' } },
    });
    expect(document.title).toBe('Mapped lesson - Class 1 - Kolibri');
  });

  it('leaves the tab at the site title while the resource selection panel is open', async () => {
    await renderDeletedLessonSummary({ routeName: PageNames.LESSON_SELECT_RESOURCES });
    expect(screen.getByTestId('panel')).toBeInTheDocument();
    expect(document.title).toBe('Kolibri');
  });

  it('renders its visible header as the only h1', async () => {
    await renderDeletedLessonSummary();
    expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
