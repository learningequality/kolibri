import { render, screen, fireEvent, within } from '@testing-library/vue';
import { ref } from 'vue';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import '@testing-library/jest-dom';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import CoursesRootPage from '../CoursesRootPage.vue';
// eslint-disable-next-line import-x/named
import useCourses, { useCoursesMock } from '../../../composables/useCourses';

const { courseDetailsAction$, editRecipientsAction$ } = coursesStrings;
const { deleteAction$ } = coreStrings;

jest.mock('../../../composables/useCourses');

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
});
