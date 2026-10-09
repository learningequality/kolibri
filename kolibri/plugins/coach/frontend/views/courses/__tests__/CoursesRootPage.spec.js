import { render, screen, fireEvent, within } from '@testing-library/vue';
import { nextTick, ref } from 'vue';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import '@testing-library/jest-dom';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { handleApiError } from 'kolibri/utils/appError';
import CoursesRootPage from '../CoursesRootPage.vue';
import { UnitPhase } from '../../../constants/courseConstants';
// eslint-disable-next-line import-x/named
import useCourses, { useCoursesMock } from '../../../composables/useCourses';
// eslint-disable-next-line import-x/named
import useClassSummary, { useClassSummaryMock } from '../../../composables/useClassSummary';
import { coachStrings } from '../../common/commonCoachStrings';
import { learnerProgressTranslators } from '../../common/status/statusStrings';
import useSidePanelTitle from '../../../composables/useSidePanelTitle';

const {
  coursesLabel$,
  courseDetailsAction$,
  editRecipientsAction$,
  preTestRunningLabel$,
  unitInProgressLabel$,
  unitNotStartedLabel$,
} = coursesStrings;
const { deleteAction$, notStartedLabel$, completedLabel$ } = coreStrings;
const { entireClassLabel$ } = coachStrings;

const CLASS_NAME = 'Class A';

jest.mock('../../../composables/useCourses');
jest.mock('../../../composables/useClassSummary');
jest.mock('kolibri/utils/appError', () => ({
  ...jest.requireActual('kolibri/utils/appError'),
  handleApiError: jest.fn(),
}));

function makeStore() {
  return new Vuex.Store({
    actions: {
      initClassInfo: jest.fn(),
    },
    modules: {
      classSummary: {
        namespaced: true,
        state: { id: 'class-123' },
      },
      coachNotifications: {
        namespaced: true,
        state: { notifications: [] },
        getters: {
          maxNotificationTimestamp: state =>
            state.notifications.length > 0 ? state.notifications[0].timestamp : 0,
        },
        mutations: {
          SET_NOTIFICATIONS(state, notifications) {
            state.notifications = notifications;
          },
        },
      },
    },
  });
}

function renderComponent() {
  const store = makeStore();
  const utils = render(CoursesRootPage, {
    store,
    routes: new VueRouter({
      routes: [
        { path: '/', name: 'CoursesRoot' },
        { path: '/course', name: 'COURSE_SUMMARY' },
      ],
    }),
  });
  return { ...utils, store };
}

describe('CoursesRootPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCourses.mockImplementation(() => useCoursesMock());
    useClassSummary.mockImplementation(() => useClassSummaryMock({ className: ref(CLASS_NAME) }));
  });

  describe('page title', () => {
    // The empty state links to COURSES_ASSIGN, which this router lacks.
    beforeEach(() => {
      useCourses.mockImplementation(() =>
        useCoursesMock({
          courses: ref([
            { id: 'session-1', title: 'Course 1', active: true, contentMissing: false },
          ]),
        }),
      );
    });

    it('sets the tab title to the courses label and class name', async () => {
      renderComponent();
      await nextTick();
      expect(document.title).toBe(`${coursesLabel$()} - ${CLASS_NAME} - Kolibri`);
    });

    it('renders its visible header as the only h1', async () => {
      renderComponent();
      await nextTick();
      const headings = screen.queryAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(coursesLabel$());
    });

    it('gives the side panel the page title', async () => {
      const SidePanel = {
        setup() {
          useSidePanelTitle();
        },
        render: h => h('div', { attrs: { 'data-testid': 'side-panel' } }),
      };
      render(CoursesRootPage, {
        store: makeStore(),
        routes: new VueRouter({
          routes: [
            { path: '/', component: SidePanel },
            { path: '/course', name: 'COURSE_SUMMARY' },
          ],
        }),
      });
      await screen.findByTestId('side-panel');
      expect(document.title).toBe(`${coursesLabel$()} - ${CLASS_NAME} - Kolibri`);
    });
  });

  it('should show the missing resource alert when any course has missing content', () => {
    useCourses.mockImplementation(() =>
      useCoursesMock({
        courses: ref([
          { id: 'session-1', title: 'Course 1', active: true, contentMissing: false },
          { id: 'session-2', title: 'Course 2', active: true, contentMissing: true },
        ]),
      }),
    );

    renderComponent();

    expect(screen.getByTestId('missing-resource-alert')).toBeInTheDocument();
  });

  it('should not show the missing resource alert when no courses have missing content', () => {
    useCourses.mockImplementation(() =>
      useCoursesMock({
        courses: ref([
          { id: 'session-1', title: 'Course 1', active: true, contentMissing: false },
          { id: 'session-2', title: 'Course 2', active: true, contentMissing: false },
        ]),
      }),
    );

    renderComponent();

    expect(screen.queryByTestId('missing-resource-alert')).not.toBeInTheDocument();
  });

  it('should only show delete option for courses with missing content', async () => {
    useCourses.mockImplementation(() =>
      useCoursesMock({
        courses: ref([{ id: 'session-1', title: 'Course 1', active: true, contentMissing: true }]),
      }),
    );

    renderComponent();
    await global.flushPromises();
    await fireEvent.click(document.querySelector('[aria-haspopup="menu"]'));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByText(deleteAction$())).toBeInTheDocument();
    expect(within(menu).queryByText(courseDetailsAction$())).not.toBeInTheDocument();
    expect(within(menu).queryByText(editRecipientsAction$())).not.toBeInTheDocument();
  });

  it('should show all options for courses with content present', async () => {
    useCourses.mockImplementation(() =>
      useCoursesMock({
        courses: ref([{ id: 'session-1', title: 'Course 1', active: true, contentMissing: false }]),
      }),
    );

    renderComponent();
    await global.flushPromises();
    await fireEvent.click(document.querySelector('[aria-haspopup="menu"]'));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByText(deleteAction$())).toBeInTheDocument();
    expect(within(menu).getByText(courseDetailsAction$())).toBeInTheDocument();
    expect(within(menu).getByText(editRecipientsAction$())).toBeInTheDocument();
  });

  it('should disable visibility toggle for courses with missing content', () => {
    useCourses.mockImplementation(() =>
      useCoursesMock({
        courses: ref([{ id: 'session-1', title: 'Course 1', active: true, contentMissing: true }]),
      }),
    );

    renderComponent();

    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeDisabled();
  });

  it('refetches courses when a new coach notification arrives', async () => {
    const { refreshClassCourses } = useCoursesMock();
    useCourses.mockImplementation(() =>
      useCoursesMock({
        refreshClassCourses,
        courses: ref([{ id: 'session-1', title: 'Course 1', active: true, contentMissing: false }]),
      }),
    );

    const { store } = renderComponent();
    await global.flushPromises();
    refreshClassCourses.mockClear();

    store.commit('coachNotifications/SET_NOTIFICATIONS', [
      {
        id: 1,
        course_session_id: 'session-1',
        classroom_id: undefined,
        timestamp: '2024-01-01T10:00:00Z',
      },
    ]);
    await global.flushPromises();

    expect(refreshClassCourses).toHaveBeenCalledTimes(1);
  });

  it('does not surface a global error when a poll-triggered refresh fails', async () => {
    const COURSE_TITLE = 'Course 1';
    const refreshClassCourses = jest.fn().mockRejectedValue(new Error('network error'));
    useCourses.mockImplementation(() =>
      useCoursesMock({
        refreshClassCourses,
        courses: ref([
          { id: 'session-1', title: COURSE_TITLE, active: true, contentMissing: false },
        ]),
      }),
    );

    const { store } = renderComponent();
    await global.flushPromises();
    refreshClassCourses.mockClear();
    handleApiError.mockClear();

    store.commit('coachNotifications/SET_NOTIFICATIONS', [
      {
        id: 1,
        course_session_id: 'session-1',
        classroom_id: undefined,
        timestamp: '2024-01-01T10:00:00Z',
      },
    ]);
    await global.flushPromises();

    expect(refreshClassCourses).toHaveBeenCalledTimes(1);
    expect(handleApiError).not.toHaveBeenCalled();
    expect(screen.getByText(COURSE_TITLE)).toBeInTheDocument();
  });

  it('should enable visibility toggle for courses with content present', () => {
    useCourses.mockImplementation(() =>
      useCoursesMock({
        courses: ref([{ id: 'session-1', title: 'Course 1', active: true, contentMissing: false }]),
      }),
    );

    renderComponent();

    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeEnabled();
  });

  describe('new column data', () => {
    function renderWithCourse(courseOverrides = {}) {
      const course = {
        id: 'session-1',
        title: 'My Course',
        active: true,
        contentMissing: false,
        assignments: [],
        learner_ids: [],
        unit_phase: UnitPhase.PRE_TEST_PENDING,
        active_unit_number: 1,
        active_unit_title: 'Unit One',
        test_learner_progress: null,
        ...courseOverrides,
      };
      useCourses.mockImplementation(() => useCoursesMock({ courses: ref([course]) }));
      return renderComponent();
    }

    it('shows "not started" label in status column when unit_phase is pre_test_pending', () => {
      renderWithCourse({ unit_phase: UnitPhase.PRE_TEST_PENDING });
      expect(screen.getByText(notStartedLabel$())).toBeInTheDocument();
    });

    // After a unit's post-test ends, the next unit is pre_test_pending too;
    // it must not look like the course was never started.
    it('shows the next unit number when pre_test_pending follows a completed unit', () => {
      renderWithCourse({
        unit_phase: UnitPhase.PRE_TEST_PENDING,
        active_unit_number: 2,
        active_unit_title: 'Unit Two',
      });
      expect(screen.getByText(unitNotStartedLabel$({ num: 2 }))).toBeInTheDocument();
      expect(screen.queryByText(notStartedLabel$())).not.toBeInTheDocument();
    });

    it('shows pre-test running label in status column when unit_phase is pre_test_active', () => {
      renderWithCourse({
        unit_phase: UnitPhase.PRE_TEST_ACTIVE,
        active_unit_number: 2,
        active_unit_title: 'Unit Two',
      });
      expect(screen.getByText(preTestRunningLabel$({ num: 2 }))).toBeInTheDocument();
    });

    it('shows unit in progress label in status column when unit_phase is post_test_pending', () => {
      renderWithCourse({
        unit_phase: UnitPhase.POST_TEST_PENDING,
        active_unit_number: 1,
        active_unit_title: 'Unit One',
      });
      expect(screen.getByText(unitInProgressLabel$({ num: 1 }))).toBeInTheDocument();
    });

    it('shows completed label in status column when unit_phase is complete', () => {
      renderWithCourse({
        unit_phase: UnitPhase.COMPLETE,
        active_unit_number: null,
        active_unit_title: null,
      });
      expect(screen.getByText(completedLabel$())).toBeInTheDocument();
    });

    it('shows dash in learner progress column when test_learner_progress is null', () => {
      renderWithCourse({ test_learner_progress: null });
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    // The API omits helpNeeded, which tests have no signal for; the ratio
    // denominator must not become NaN.
    it('shows learner progress ratios when test_learner_progress is provided', () => {
      renderWithCourse({
        unit_phase: UnitPhase.PRE_TEST_ACTIVE,
        test_learner_progress: { completed: 1, started: 2, notStarted: 3, total: 6 },
      });
      expect(screen.queryByText('—')).not.toBeInTheDocument();
      expect(
        screen.getByText(
          learnerProgressTranslators.completed.$tr('ratioShort', { count: 1, total: 6 }),
        ),
      ).toBeInTheDocument();
    });

    // calculating learner progress for every lesson is expensive, so between
    // tests and after the last one closes there is no tally to show
    it('shows dash in learner progress column when unit_phase is post_test_pending', () => {
      renderWithCourse({
        unit_phase: UnitPhase.POST_TEST_PENDING,
        test_learner_progress: null,
      });
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('shows dash in learner progress column when unit_phase is complete', () => {
      renderWithCourse({
        unit_phase: UnitPhase.COMPLETE,
        active_unit_number: null,
        active_unit_title: null,
        test_learner_progress: null,
      });
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('shows entire class label in recipients column when course has group assignments', () => {
      renderWithCourse({ assignments: ['group-1'], learner_ids: [] });
      expect(screen.getByText(entireClassLabel$())).toBeInTheDocument();
    });
  });
});
