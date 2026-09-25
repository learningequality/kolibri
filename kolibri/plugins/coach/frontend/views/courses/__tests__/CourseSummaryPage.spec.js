import { render, screen } from '@testing-library/vue';
import { Store } from 'vuex';
import VueRouter from 'vue-router';
import { nextTick, ref } from 'vue';
import '@testing-library/jest-dom';
import { i18nSetup } from 'kolibri/utils/i18n';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { Resource } from 'kolibri/apiResource';
import { pageHeading } from 'kolibri/composables/usePageTitle';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSummaryPage from '../CourseSummaryPage.vue';
import { PageNames } from '../../../constants';
import { RouteSegments, COMPACT_UUID_PATTERN } from '../../../routes/utils';
/* eslint-disable import-x/named */
import { useCourseSession, useCourseSessionMock } from '../../../composables/useCourseSession';
import useClassSummary, { useClassSummaryMock } from '../../../composables/useClassSummary';
/* eslint-enable import-x/named */
import UnitReportResource from '../../../apiResources/unitReport';
import useSidePanelTitle from '../../../composables/useSidePanelTitle';
import { UnitPhase } from '../../../constants/courseConstants';

const {
  unitsLabel$,
  learningObjectivesLabel$,
  unitTitleWithStatus$,
  preTestInProgress$,
  postTestResults$,
} = coursesStrings;
const { learnersLabel$ } = coreStrings;

const { CLASS, COURSE_SESSION } = RouteSegments;

const CLASS_NAME = 'Class A';
const COURSE_TITLE = 'Human Biology';

// Tab/panel child routes render nothing (mirrors the NoRender component in coursesRoutes.js).
// CourseSummaryPage has a <router-view> for the assign-course side panel; using CourseSummaryPage
// as the child component would cause a second full copy to mount inside the router-view.
const NoRender = { render: () => null };

// Stands in for the assign-course side panel, which registers the host's provided title.
const SidePanel = {
  setup() {
    useSidePanelTitle();
  },
  render: h => h('div', { attrs: { 'data-testid': 'side-panel' } }),
};

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
      {
        name: PageNames.COURSE_SUMMARY_ASSIGN,
        path: 'assign-course/',
        component: SidePanel,
      },
    ],
  },
  {
    name: PageNames.UNIT_DETAIL,
    path: CLASS + COURSE_SESSION + `/units/:unitContentnodeId(${COMPACT_UUID_PATTERN})`,
    component: NoRender,
  },
];

// ── module-level store mock ───────────────────────────────────────────────────
// CourseSummaryPage imports `store` directly from the coach store module (not via $store) for
// classSummary getters and handleApiError dispatch. Provide those here so fetchAllUnitReports
// doesn't throw and trigger console.error.
jest.mock('../../../store', () => ({
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
    fetchReports: jest.fn().mockResolvedValue({
      course_title: '',
      learners: [],
      units: [],
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
const UNIT_A = 'e'.repeat(32);
const UNIT_B = 'f'.repeat(32);

function unitFixture(overrides = {}) {
  return {
    unit_contentnode_id: UNIT_A,
    unit_title: 'A',
    unit_number: 1,
    learning_objectives: [],
    lesson_objectives: {},
    pre_test: { status: 'not_activated', scores: {} },
    post_test: { status: 'not_activated', scores: {} },
    ...overrides,
  };
}

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
    props: ['learner', 'unitReports'],
    template:
      '<div data-testid="learner-side-panel" :data-unit-titles="unitReports.map(u => u.title).join(\'|\')" @click="$emit(\'close\')" />',
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

  beforeEach(() => {
    // The automock stubs out `useList` wholesale, which leaves the assign-course side panel
    // without a fetch object.
    ContentNodeResource.list.mockResolvedValue([]);
    ContentNodeResource.useList.mockImplementation(
      Resource.prototype.useList.bind(ContentNodeResource),
    );
  });

  describe('CourseSummaryPage — page title', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useClassSummary.mockImplementation(() => useClassSummaryMock({ className: ref(CLASS_NAME) }));
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({
          courseSession: ref(MOCK_COURSE_SESSION),
          course: ref({ title: COURSE_TITLE }),
          units: ref([{ id: UNIT_A }]),
        }),
      );
    });

    it('sets the tab title to the course title and class name', async () => {
      renderPage('COURSE_SUMMARY_UNITS');
      await nextTick();
      expect(document.title).toBe(`${COURSE_TITLE} - ${CLASS_NAME} - Kolibri`);
    });

    it('tells the page shell it renders its own h1', async () => {
      renderPage('COURSE_SUMMARY_UNITS');
      await nextTick();
      expect(pageHeading.value).toBe('');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(COURSE_TITLE);
    });

    it('gives the assign-course side panel the page title', async () => {
      renderPage('COURSE_SUMMARY_ASSIGN');
      await screen.findByTestId('side-panel');
      expect(document.title).toBe(`${COURSE_TITLE} - ${CLASS_NAME} - Kolibri`);
    });
  });

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
      UnitReportResource.fetchReports.mockResolvedValue({
        course_title: 'Course',
        learners: [{ id: LEARNER_ID, groupIds: [] }],
        units: [unitFixture()],
      });
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({
          courseSession: ref(MOCK_COURSE_SESSION),
          units: ref([{ id: UNIT_A }]),
        }),
      );

      const { findByTestId } = renderPage('COURSE_SUMMARY_LEARNER', { learnerId: LEARNER_ID });
      const panel = await findByTestId('learner-side-panel');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('CourseSummaryPage — learner report unit', () => {
    const UNIT_C = '9'.repeat(32);
    const UNITS = [
      { id: UNIT_A, numberedTitle: 'Unit 1: A' },
      { id: UNIT_B, numberedTitle: 'Unit 2: B' },
      { id: UNIT_C, numberedTitle: 'Unit 3: C' },
    ];
    const closedPostTest = { status: 'closed', scores: { [LEARNER_ID]: {} } };

    function setup({ activeUnit, reports, unitPhase = null }) {
      UnitReportResource.fetchReports.mockResolvedValue({
        course_title: 'Course',
        learners: [{ id: LEARNER_ID, groupIds: [] }],
        units: reports,
      });
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({
          courseSession: ref(MOCK_COURSE_SESSION),
          units: ref(UNITS),
          activeUnit: ref(activeUnit),
          unitPhase: ref(unitPhase),
        }),
      );
      return renderPage('COURSE_SUMMARY_LEARNER', { learnerId: LEARNER_ID });
    }

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows every unit in the panel and the last unit in the table once the course is complete', async () => {
      const { findByTestId } = setup({
        activeUnit: null,
        unitPhase: UnitPhase.COMPLETE,
        reports: [UNIT_A, UNIT_B, UNIT_C].map(id =>
          unitFixture({ unit_contentnode_id: id, post_test: closedPostTest }),
        ),
      });
      const labels = ['Unit 1: A', 'Unit 2: B', 'Unit 3: C'].map(title =>
        unitTitleWithStatus$({ title, status: postTestResults$() }),
      );

      const panel = await findByTestId('learner-side-panel');
      expect(panel).toHaveAttribute('data-unit-titles', labels.join('|'));
      expect(screen.getByRole('heading', { level: 2, name: labels[2] })).toBeInTheDocument();
    });

    it('shows the previous unit while the active unit has no test started', async () => {
      const { findByTestId } = setup({
        activeUnit: UNITS[1],
        reports: [
          unitFixture({ unit_contentnode_id: UNIT_A, post_test: closedPostTest }),
          unitFixture({ unit_contentnode_id: UNIT_B }),
          unitFixture({ unit_contentnode_id: UNIT_C }),
        ],
      });
      const label = unitTitleWithStatus$({ title: 'Unit 1: A', status: postTestResults$() });

      const panel = await findByTestId('learner-side-panel');
      expect(panel).toHaveAttribute('data-unit-titles', label);
      expect(screen.getByRole('heading', { level: 2, name: label })).toBeInTheDocument();
    });

    it('shows the active unit once its test has started, with finished units in the panel', async () => {
      const { findByTestId } = setup({
        activeUnit: UNITS[1],
        reports: [
          unitFixture({ unit_contentnode_id: UNIT_A, post_test: closedPostTest }),
          unitFixture({
            unit_contentnode_id: UNIT_B,
            pre_test: { status: 'open', scores: {} },
          }),
          unitFixture({ unit_contentnode_id: UNIT_C }),
        ],
      });
      const activeLabel = unitTitleWithStatus$({
        title: 'Unit 2: B',
        status: preTestInProgress$(),
      });

      const panel = await findByTestId('learner-side-panel');
      expect(panel).toHaveAttribute(
        'data-unit-titles',
        [
          unitTitleWithStatus$({ title: 'Unit 1: A', status: postTestResults$() }),
          activeLabel,
        ].join('|'),
      );
      expect(screen.getByText(UNITS[1].numberedTitle)).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { level: 2, name: activeLabel }),
      ).not.toBeInTheDocument();
    });
  });

  describe('CourseSummaryPage — unit report fetching', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('fetches every unit report in one request', async () => {
      UnitReportResource.fetchReports.mockResolvedValue({
        course_title: 'Course',
        learners: [],
        units: [unitFixture(), unitFixture({ unit_contentnode_id: UNIT_B, unit_number: 2 })],
      });
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({
          courseSession: ref(MOCK_COURSE_SESSION),
          units: ref([{ id: UNIT_A }, { id: UNIT_B }]),
        }),
      );

      renderPage('COURSE_SUMMARY_UNITS');
      await global.flushPromises();

      expect(UnitReportResource.fetchReports).toHaveBeenCalledTimes(1);
      expect(UnitReportResource.fetchReports).toHaveBeenCalledWith({
        courseSessionId: SESSION_ID,
        unitIds: [UNIT_A, UNIT_B],
      });
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
      UnitReportResource.fetchReports.mockResolvedValue({
        course_title: 'Course',
        learners: [{ id: LEARNER_ID, groupIds: [] }],
        units: [unitFixture()],
      });
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({
          courseSession: ref(MOCK_COURSE_SESSION),
          units: ref([{ id: UNIT_A }]),
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
      UnitReportResource.fetchReports.mockResolvedValue({
        course_title: 'Course',
        learners: [],
        units: [
          unitFixture({
            learning_objectives: [{ id: OBJECTIVE_ID, text: 'Test Objective', num_questions: 5 }],
            pre_test: { status: 'open', scores: {} },
          }),
        ],
      });
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({
          courseSession: ref(MOCK_COURSE_SESSION),
          units: ref([{ id: UNIT_A }]),
        }),
      );

      const { findByTestId } = renderPage('COURSE_SUMMARY_OBJECTIVE', {
        objectiveId: OBJECTIVE_ID,
      });
      const panel = await findByTestId('objective-side-panel');
      expect(panel).toBeInTheDocument();
    });

    it('closing the objective side panel navigates to COURSE_SUMMARY_OBJECTIVES', async () => {
      UnitReportResource.fetchReports.mockResolvedValue({
        course_title: 'Course',
        learners: [],
        units: [
          unitFixture({
            learning_objectives: [{ id: OBJECTIVE_ID, text: 'Test Objective', num_questions: 5 }],
            pre_test: { status: 'open', scores: {} },
          }),
        ],
      });
      useCourseSession.mockImplementation(() =>
        useCourseSessionMock({
          courseSession: ref(MOCK_COURSE_SESSION),
          units: ref([{ id: UNIT_A }]),
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
