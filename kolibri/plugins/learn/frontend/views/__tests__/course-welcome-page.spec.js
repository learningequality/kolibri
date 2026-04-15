import Vuex from 'vuex';
import VueRouter from 'vue-router';
import { render, waitFor, fireEvent } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { PageNames } from '../../constants';
import CourseWelcomePage from '../CourseWelcomePage.vue';
import useLearnerResources from '../../composables/useLearnerResources';

const { startCourseAction$, resumeCourseAction$ } = coursesStrings;

jest.mock('../../composables/useLearnerResources');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => ({
  __esModule: true,
  default: () => ({ windowIsLarge: true }),
}));

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

describe('CourseWelcomePage', () => {
  let learnerResources;
  let router;
  let store;

  const mockCourse = {
    id: 'course-session-1',
    course_id: 'course-1',
    title: 'Introduction to Physics',
    description: 'Learn the fundamentals of physics',
    lesson_count: 12,
  };

  const mockUnits = [
    {
      id: 'unit-1',
      title: 'Unit 1: Motion',
      sort_order: 0,
      lft: 2,
      options: {
        completion_criteria: {
          threshold: { pre_post_test: { version_a_item_ids: ['q1', 'q2', 'q3'] } },
        },
      },
      children: {
        results: [
          {
            id: 'lesson-1',
            title: 'Lesson 1: Introduction',
            parent: 'lesson-1',
            on_device_resources: 5,
            sort_order: 0,
            lft: 3,
          },
          {
            id: 'lesson-2',
            title: 'Lesson 2: Velocity',
            parent: 'lesson-2',
            on_device_resources: 3,
            sort_order: 1,
            lft: 6,
          },
        ],
      },
    },
    {
      id: 'unit-2',
      title: 'Unit 2: Forces',
      sort_order: 1,
      lft: 10,
      options: {
        completion_criteria: {
          threshold: { pre_post_test: { version_a_item_ids: ['q4', 'q5'] } },
        },
      },
      children: {
        results: [
          {
            id: 'lesson-3',
            title: "Lesson 3: Newton's Laws",
            parent: 'lesson-3',
            on_device_resources: 4,
            sort_order: 0,
            lft: 11,
          },
        ],
      },
    },
  ];

  const mockCourseContent = { thumbnail: 'thumbnail.png' };

  const makeLearnerResourcesMock = ({
    started = false,
    resume_position = null,
    active_test = null,
  } = {}) => ({
    fetchCourse: jest.fn().mockResolvedValue({
      course: mockCourse,
      content: mockCourseContent,
      progress: { started, resume_position, active_test },
    }),
    getCourseContent: jest.fn().mockReturnValue(mockCourseContent),
    getCourseProgress: jest.fn().mockReturnValue({ started, resume_position, active_test }),
    getCourseUnits: jest.fn().mockReturnValue(mockUnits),
    isUnitTestAvailable: jest.fn((courseId, unitId, testType) => {
      if (!active_test) return false;
      return active_test.unit_id === unitId && active_test.test_type === testType;
    }),
  });

  beforeEach(() => {
    router = new VueRouter({
      routes: [
        { name: PageNames.HOME, path: '/home' },
        { name: PageNames.COURSE_CONTENT, path: '/course/:courseId/content' },
      ],
    });
    router.push = jest.fn();

    store = new Vuex.Store({
      state: { core: { loading: false } },
      getters: { isPageLoading: jest.fn(() => false) },
      actions: { handleApiError: jest.fn() },
      mutations: { CORE_SET_ERROR: jest.fn() },
    });

    learnerResources = makeLearnerResourcesMock();
    useLearnerResources.mockReturnValue(learnerResources);

    global.requestAnimationFrame = jest.fn(cb => {
      cb();
      return 0;
    });
    global.cancelAnimationFrame = jest.fn();
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderComponent(props = {}) {
    return render(CourseWelcomePage, {
      localVue,
      router,
      store,
      props: { courseSessionId: 'course-session-1', ...props },
      global: {
        stubs: {
          ImmersivePage: { template: '<div data-test="immersive-page"><slot /></div>' },
          AccordionContainer: {
            template: `
              <div data-test="accordion-container">
                <slot name="header" v-bind="{
                  expandAll: () => {},
                  collapseAll: () => {},
                  canExpandAll: true,
                  canCollapseAll: true
                }" />
                <slot />
              </div>
            `,
          },
          AccordionItem: {
            template: `
              <div data-testid="accordion-item">
                <div data-testid="accordion-title">{{ title }}</div>
                <slot name="content" />
                <slot name="trailing-actions" />
              </div>
            `,
            props: ['title', 'disabled'],
          },
        },
      },
    });
  }

  function useResources(overrides) {
    learnerResources = makeLearnerResourcesMock(overrides);
    useLearnerResources.mockReturnValue(learnerResources);
  }

  it('shows a disabled action button when the course has not started', async () => {
    useResources({ started: false });
    const wrapper = renderComponent();

    await waitFor(() => {
      const button = wrapper.getByTestId('welcome-action-button');
      expect(button).toBeDisabled();
      expect(wrapper.queryByTestId('welcome-action-link')).not.toBeInTheDocument();
    });
  });

  it('navigates to the resume position when the Resume link is clicked', async () => {
    useResources({
      started: true,
      resume_position: { unit_id: 'unit-1', lesson_id: 'lesson-1', resource_id: 'resource-1' },
    });
    const wrapper = renderComponent();

    const link = await wrapper.findByRole('link', { name: resumeCourseAction$() });
    expect(wrapper.queryByTestId('welcome-action-button')).not.toBeInTheDocument();

    link.click();

    await waitFor(() => {
      expect(router.push.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: expect.objectContaining({
            unitId: 'unit-1',
            lessonId: 'lesson-1',
            resourceId: 'resource-1',
          }),
        }),
      );
    });
  });

  it('locks all unit lessons when the course has not started', async () => {
    useResources({ started: false });
    const wrapper = renderComponent();

    await waitFor(() => expect(wrapper.getByText('Unit 1: Motion')).toBeInTheDocument());

    await fireEvent.click(wrapper.getByRole('button', { name: /Unit 1: Motion/i }));
    await fireEvent.click(wrapper.getByRole('button', { name: /Unit 2: Forces/i }));

    await waitFor(() => {
      for (const title of [
        'Lesson 1: Introduction',
        'Lesson 2: Velocity',
        "Lesson 3: Newton's Laws",
      ]) {
        expect(wrapper.getByRole('button', { name: title })).toBeDisabled();
      }
    });
  });

  it('navigates to the pre-test when the Start link is clicked during an active test', async () => {
    useResources({
      started: true,
      active_test: { unit_id: 'unit-1', test_type: 'pre' },
      resume_position: null,
    });
    const wrapper = renderComponent();

    const link = await wrapper.findByRole('link', { name: startCourseAction$() });
    link.click();

    await waitFor(() => {
      expect(router.push.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          name: PageNames.COURSE_CONTENT_TEST,
          params: expect.objectContaining({ unitId: 'unit-1', testType: 'pre' }),
        }),
      );
    });
  });

  it('locks lessons past the resume position within the resume unit', async () => {
    useResources({
      started: true,
      resume_position: { unit_id: 'unit-1', lesson_id: 'lesson-1', resource_id: 'r1' },
    });
    const wrapper = renderComponent();
    await waitFor(() => expect(wrapper.getByText('Unit 1: Motion')).toBeInTheDocument());
    await fireEvent.click(wrapper.getByRole('button', { name: /Unit 1: Motion/i }));

    await waitFor(() => {
      expect(wrapper.getByRole('button', { name: 'Lesson 2: Velocity' })).toHaveAttribute(
        'data-lesson-status',
        'locked',
      );
    });
  });
});
