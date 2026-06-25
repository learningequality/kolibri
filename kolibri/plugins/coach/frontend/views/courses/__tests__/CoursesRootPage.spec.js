import { render, screen, fireEvent, within } from '@testing-library/vue';
import { ref } from 'vue';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import '@testing-library/jest-dom';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import CoursesRootPage from '../CoursesRootPage.vue';
import { UnitPhase } from '../../../constants/courseConstants';
// eslint-disable-next-line import-x/named
import useCourses, { useCoursesMock } from '../../../composables/useCourses';
// eslint-disable-next-line import-x/named
import useClassSummary, { useClassSummaryMock } from '../../../composables/useClassSummary';
import { coachStrings } from '../../common/commonCoachStrings';

const { courseDetailsAction$, editRecipientsAction$, preTestRunningLabel$, unitInProgressLabel$ } =
  coursesStrings;
const { deleteAction$, notStartedLabel$, completedLabel$ } = coreStrings;
const { entireClassLabel$ } = coachStrings;

jest.mock('../../../composables/useCourses');
jest.mock('../../../composables/useClassSummary');

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
    },
  });
}

function renderComponent() {
  return render(CoursesRootPage, {
    store: makeStore(),
    routes: new VueRouter({
      routes: [
        { path: '/', name: 'CoursesRoot' },
        { path: '/course', name: 'COURSE_SUMMARY' },
      ],
    }),
  });
}

describe('CoursesRootPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCourses.mockImplementation(() => useCoursesMock());
    useClassSummary.mockImplementation(() => useClassSummaryMock());
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

    it('shows learner progress data when test_learner_progress is provided', () => {
      renderWithCourse({
        unit_phase: UnitPhase.PRE_TEST_ACTIVE,
        test_learner_progress: { completed: 1, started: 2, notStarted: 3, total: 6 },
      });
      expect(screen.queryByText('—')).not.toBeInTheDocument();
    });

    it('shows entire class label in recipients column when course has group assignments', () => {
      renderWithCourse({ assignments: ['group-1'], learner_ids: [] });
      expect(screen.getByText(entireClassLabel$())).toBeInTheDocument();
    });
  });
});
