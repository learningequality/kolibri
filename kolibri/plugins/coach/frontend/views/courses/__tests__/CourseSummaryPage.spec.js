import { render, screen } from '@testing-library/vue';
import { Store } from 'vuex';
import VueRouter from 'vue-router';
import { ref } from 'vue';
import '@testing-library/jest-dom';
import { i18nSetup } from 'kolibri/utils/i18n';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import CourseSummaryPage from '../CourseSummaryPage.vue';
import { PageNames } from '../../../constants';
import { RouteSegments, COMPACT_UUID_PATTERN } from '../../../routes/utils';
/* eslint-disable import-x/named */
import { useCourseSession, useCourseSessionMock } from '../../../composables/useCourseSession';
/* eslint-enable import-x/named */
import UnitReportResource from '../../../apiResources/unitReport';

const { unitsLabel$, learningObjectivesLabel$ } = coursesStrings;
const { learnersLabel$ } = coreStrings;

const { CLASS, COURSE_SESSION } = RouteSegments;

// Tab/panel child routes render nothing (mirrors the NoRender component in coursesRoutes.js).
// CourseSummaryPage has a <router-view> for the assign-course side panel; using CourseSummaryPage
// as the child component would cause a second full copy to mount inside the router-view.
const NoRender = { render: () => null };

// Mirror the real route structure and patterns without importing all route components.
// Uses the same PageNames constants, UUID validation patterns, and nested hierarchy.
const ROUTES = [
  {
    name: PageNames.COURSES_ROOT,
    path: '/:classId?/courses',
    component: CourseSummaryPage,
  },
  {
    name: PageNames.COURSE_SUMMARY,
    path: CLASS + COURSE_SESSION,
    component: CourseSummaryPage,
    redirect: to => ({ name: PageNames.COURSE_SUMMARY_UNITS, params: to.params }),
    children: [
      {
        name: PageNames.COURSE_SUMMARY_UNITS,
        path: 'units',
        component: NoRender,
      },
      {
        name: PageNames.COURSE_SUMMARY_LEARNERS,
        path: 'learners',
        component: NoRender,
        children: [
          {
            name: PageNames.COURSE_SUMMARY_LEARNER,
            path: `:learnerId(${COMPACT_UUID_PATTERN})`,
            component: NoRender,
          },
        ],
      },
      {
        name: PageNames.COURSE_SUMMARY_OBJECTIVES,
        path: 'objectives',
        component: NoRender,
        children: [
          {
            name: PageNames.COURSE_SUMMARY_OBJECTIVE,
            path: `:objectiveId(${COMPACT_UUID_PATTERN})`,
            component: NoRender,
          },
        ],
      },
    ],
  },
];

// ── module-level store mock ───────────────────────────────────────────────────
// CourseSummaryPage imports `store` directly from 'kolibri/store' (not via $store) for
// classSummary getters and handleApiError dispatch. Provide those here so fetchAllUnitReports
// doesn't throw and trigger console.error.
jest.mock('kolibri/store', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn(),
    getters: {
      'classSummary/getGroupNamesForLearner': () => [],
    },
  },
}));

// ── resource/API stubs ────────────────────────────────────────────────────────
jest.mock('kolibri-common/apiResources/CourseSessionResource');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('kolibri/composables/useSnackbar', () => ({
  __esModule: true,
  default: () => ({ createSnackbar: jest.fn() }),
}));
jest.mock('../../../apiResources/unitReport', () => ({
  __esModule: true,
  default: {
    fetchReport: jest.fn().mockResolvedValue({
      learners: [],
      learning_objectives: [],
      pre_test: { status: 'not_activated', scores: {} },
      post_test: { status: 'not_activated', scores: {} },
    }),
  },
}));

// ── composable mocks ──────────────────────────────────────────────────────────
jest.mock('../../../composables/useCourseSession');
jest.mock('../../../composables/useClassSummary');

function makeStore() {
  return new Store({
    actions: {
      notLoading: jest.fn(),
      handleApiError: jest.fn(),
    },
    getters: {
      isPageLoading: () => false,
    },
    modules: {
      classSummary: {
        namespaced: true,
        state: { id: 'class-abc123' },
        getters: {
          getGroupNamesForLearner: () => () => [],
          getRecipientNamesForExam: () => () => [],
        },
      },
    },
  });
}

// Compact hex UUIDs used in tests
const CLASS_ID = 'a'.repeat(32);
const SESSION_ID = 'b'.repeat(32);
const LEARNER_ID = 'c'.repeat(32);
const OBJECTIVE_ID = 'd'.repeat(32);

// Minimal course session object to satisfy template v-if guard and property access
const MOCK_COURSE_SESSION = {
  active: true,
  classroom: { name: 'Test Class' },
  assignments: [],
  date_created: new Date().toISOString(),
};

const STUBS = {
  CoachAppBarPage: { name: 'CoachAppBarPage', template: '<div><slot /></div>' },
  CoachHeader: { name: 'CoachHeader', template: '<div><slot name="actions" /></div>' },
  LearnerSidePanel: {
    name: 'LearnerSidePanel',
    props: ['learner', 'prefetchedData'],
    template: '<div data-testid="learner-side-panel" @click="$emit(\'close\')" />',
  },
  LearningObjectiveSidePanel: {
    name: 'LearningObjectiveSidePanel',
    props: ['objective', 'reportData'],
    template: '<div data-testid="objective-side-panel" @click="$emit(\'closePanel\')" />',
  },
};

// Render via a RouterView wrapper so that Vue Router controls component mounting at depth 0.
// Without this, directly rendering CourseSummaryPage AND having it contain a <router-view>
// causes the router-view inside to also match COURSE_SUMMARY → second CourseSummaryPage.
const RouterViewWrapper = { template: '<router-view />' };

function renderPage(routeName, params = {}) {
  const router = new VueRouter({ routes: ROUTES });
  router.push({
    name: routeName,
    params: { classId: CLASS_ID, courseSessionId: SESSION_ID, ...params },
  });
  return render(RouterViewWrapper, {
    store: makeStore(),
    router,
    // eslint-disable-next-line kolibri/tests-no-stubs
    stubs: STUBS,
  });
}

describe('CourseSummaryPage', () => {
  beforeAll(() => i18nSetup(true));

  describe('CourseSummaryPage — tab routing', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({ courseSession: ref(MOCK_COURSE_SESSION) }),
      );
    });

    it('shows the units tab as active when route is COURSE_SUMMARY_UNITS', async () => {
      renderPage('COURSE_SUMMARY_UNITS');
      const tab = screen.getByRole('tab', { name: unitsLabel$() });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });

    it('shows the learners tab as active when route is COURSE_SUMMARY_LEARNERS', async () => {
      renderPage('COURSE_SUMMARY_LEARNERS');
      const tab = screen.getByRole('tab', { name: learnersLabel$() });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });

    it('shows the objectives tab as active when route is COURSE_SUMMARY_OBJECTIVES', async () => {
      renderPage('COURSE_SUMMARY_OBJECTIVES');
      const tab = screen.getByRole('tab', { name: learningObjectivesLabel$() });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });

    it('shows the learner side panel when route is COURSE_SUMMARY_LEARNER and learner data loads', async () => {
      UnitReportResource.fetchReport.mockResolvedValue({
        learners: [{ id: LEARNER_ID, groupIds: [] }],
        learning_objectives: [],
        pre_test: { status: 'not_activated', scores: {} },
        post_test: { status: 'not_activated', scores: {} },
      });
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({
          courseSession: ref(MOCK_COURSE_SESSION),
          units: ref([{ id: 'a'.repeat(32) }]),
        }),
      );

      const { findByTestId } = renderPage('COURSE_SUMMARY_LEARNER', { learnerId: LEARNER_ID });
      const panel = await findByTestId('learner-side-panel');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('CourseSummaryPage — panel close navigation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({ courseSession: ref(MOCK_COURSE_SESSION) }),
      );
    });

    it('closing the learner side panel navigates to COURSE_SUMMARY_LEARNERS', async () => {
      UnitReportResource.fetchReport.mockResolvedValue({
        learners: [{ id: LEARNER_ID, groupIds: [] }],
        learning_objectives: [],
        pre_test: { status: 'not_activated', scores: {} },
        post_test: { status: 'not_activated', scores: {} },
      });
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({
          courseSession: ref(MOCK_COURSE_SESSION),
          units: ref([{ id: 'a'.repeat(32) }]),
        }),
      );

      const router = new VueRouter({ routes: ROUTES });
      router.push({
        name: 'COURSE_SUMMARY_LEARNER',
        params: { classId: CLASS_ID, courseSessionId: SESSION_ID, learnerId: LEARNER_ID },
      });
      const { findByTestId } = render(RouterViewWrapper, {
        store: makeStore(),
        router,
        // eslint-disable-next-line kolibri/tests-no-stubs
        stubs: STUBS,
      });

      const panel = await findByTestId('learner-side-panel');
      await panel.click();

      expect(router.currentRoute.name).toBe('COURSE_SUMMARY_LEARNERS');
    });

    it('objective side panel is absent when unitReportInfo has no matching objective', () => {
      renderPage('COURSE_SUMMARY_OBJECTIVE', { objectiveId: OBJECTIVE_ID });
      expect(screen.queryByTestId('objective-side-panel')).not.toBeInTheDocument();
    });

    it('shows the objective side panel when route is COURSE_SUMMARY_OBJECTIVE and objective data loads', async () => {
      UnitReportResource.fetchReport.mockResolvedValue({
        learners: [],
        learning_objectives: [{ id: OBJECTIVE_ID, text: 'Test Objective', num_questions: 5 }],
        pre_test: { status: 'open', scores: {} },
        post_test: { status: 'not_activated', scores: {} },
      });
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({
          courseSession: ref(MOCK_COURSE_SESSION),
          units: ref([{ id: 'a'.repeat(32) }]),
        }),
      );

      const { findByTestId } = renderPage('COURSE_SUMMARY_OBJECTIVE', {
        objectiveId: OBJECTIVE_ID,
      });
      const panel = await findByTestId('objective-side-panel');
      expect(panel).toBeInTheDocument();
    });

    it('closing the objective side panel navigates to COURSE_SUMMARY_OBJECTIVES', async () => {
      UnitReportResource.fetchReport.mockResolvedValue({
        learners: [],
        learning_objectives: [{ id: OBJECTIVE_ID, text: 'Test Objective', num_questions: 5 }],
        pre_test: { status: 'open', scores: {} },
        post_test: { status: 'not_activated', scores: {} },
      });
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({
          courseSession: ref(MOCK_COURSE_SESSION),
          units: ref([{ id: 'a'.repeat(32) }]),
        }),
      );

      const router = new VueRouter({ routes: ROUTES });
      router.push({
        name: 'COURSE_SUMMARY_OBJECTIVE',
        params: { classId: CLASS_ID, courseSessionId: SESSION_ID, objectiveId: OBJECTIVE_ID },
      });
      const { findByTestId } = render(RouterViewWrapper, {
        store: makeStore(),
        router,
        // eslint-disable-next-line kolibri/tests-no-stubs
        stubs: STUBS,
      });

      const panel = await findByTestId('objective-side-panel');
      await panel.click();

      expect(router.currentRoute.name).toBe('COURSE_SUMMARY_OBJECTIVES');
    });
  });

  describe('CourseSummaryPage — tab click navigation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({ courseSession: ref(MOCK_COURSE_SESSION) }),
      );
    });

    it('clicking the learners tab navigates to COURSE_SUMMARY_LEARNERS', async () => {
      const router = new VueRouter({ routes: ROUTES });
      router.push({
        name: 'COURSE_SUMMARY_UNITS',
        params: { classId: CLASS_ID, courseSessionId: SESSION_ID },
      });
      render(RouterViewWrapper, {
        store: makeStore(),
        router,
        // eslint-disable-next-line kolibri/tests-no-stubs
        stubs: STUBS,
      });

      await screen.getByRole('tab', { name: learnersLabel$() }).click();

      expect(router.currentRoute.name).toBe('COURSE_SUMMARY_LEARNERS');
    });

    it('clicking the objectives tab navigates to COURSE_SUMMARY_OBJECTIVES', async () => {
      const router = new VueRouter({ routes: ROUTES });
      router.push({
        name: 'COURSE_SUMMARY_UNITS',
        params: { classId: CLASS_ID, courseSessionId: SESSION_ID },
      });
      render(RouterViewWrapper, {
        store: makeStore(),
        router,
        // eslint-disable-next-line kolibri/tests-no-stubs
        stubs: STUBS,
      });

      await screen.getByRole('tab', { name: learningObjectivesLabel$() }).click();

      expect(router.currentRoute.name).toBe('COURSE_SUMMARY_OBJECTIVES');
    });
  });
});
