import Vuex from 'vuex';
import VueRouter from 'vue-router';
import { render, waitFor } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import { PageNames } from '../../constants';
import CourseWelcomePage from '../CourseWelcomePage.vue';
import useLearnerResources from '../../composables/useLearnerResources';

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
      options: {
        completion_criteria: {
          threshold: {
            pre_post_test: {
              version_a_item_ids: ['q1', 'q2', 'q3'],
            },
          },
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
          },
          {
            id: 'lesson-2',
            title: 'Lesson 2: Velocity',
            parent: 'lesson-2',
            on_device_resources: 3,
            sort_order: 1,
          },
        ],
      },
    },
    {
      id: 'unit-2',
      title: 'Unit 2: Forces',
      sort_order: 1,
      options: {
        completion_criteria: {
          threshold: {
            pre_post_test: {
              version_a_item_ids: ['q4', 'q5'],
            },
          },
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
          },
        ],
      },
    },
  ];

  const mockCourseContent = {
    thumbnail: 'thumbnail.png',
  };

  const makeLearnerResourcesMock = ({
    gating_state = 'NOT_STARTED',
    started = false,
    resume_position = null,
    active_test = null,
  } = {}) => {
    return {
      fetchCourse: jest.fn().mockResolvedValue({
        course: mockCourse,
        content: mockCourseContent,
        progress: {
          gating_state,
          started,
          resume_position,
          active_test,
        },
      }),
      getCourseContent: jest.fn().mockReturnValue(mockCourseContent),
      getCourseProgress: jest.fn().mockReturnValue({
        gating_state,
        started,
        resume_position,
        active_test,
      }),
      getCourseUnits: jest.fn().mockReturnValue(mockUnits),
      isUnitTestAvailable: jest.fn((courseId, unitId) => {
        // Only available when active and incomplete
        if (gating_state === 'PRE_TEST_ACTIVE_INCOMPLETE' && active_test?.test_type === 'pre') {
          return active_test.unit_id === unitId;
        }
        if (gating_state === 'POST_TEST_ACTIVE_INCOMPLETE' && active_test?.test_type === 'post') {
          return active_test.unit_id === unitId;
        }
        return false;
      }),
      isCourseLessonAvailable: jest.fn(() => {
        return (
          gating_state === 'RESOURCE_PROGRESSION' ||
          gating_state === 'RESOURCES_COMPLETE_POST_TEST_INACTIVE' ||
          gating_state === 'UNIT_COMPLETE' ||
          gating_state === 'COURSE_COMPLETE'
        );
      }),
      isCurrentCourseLesson: jest.fn(() => false),
    };
  };

  beforeEach(() => {
    router = new VueRouter({
      routes: [
        {
          name: PageNames.HOME,
          path: '/home',
        },
        {
          name: PageNames.COURSE_CONTENT,
          path: '/course/:courseId/content',
        },
      ],
    });

    router.push = jest.fn();

    store = new Vuex.Store({
      state: {
        core: {
          loading: false,
        },
      },
      getters: {
        isPageLoading: jest.fn(() => false),
      },
      actions: {
        handleApiError: jest.fn(),
      },
      mutations: {
        CORE_SET_ERROR: jest.fn(),
      },
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
      props: {
        courseSessionId: 'course-session-1',
        ...props,
      },
      global: {
        stubs: {
          ImmersivePage: {
            template: '<div data-test="immersive-page"><slot /></div>',
          },
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

  describe('initial load', () => {
    it('loads course data on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(learnerResources.fetchCourse).toHaveBeenCalledWith({
          courseSessionId: 'course-session-1',
          force: true,
        });
      });
    });

    it('calls getCourseUnits', async () => {
      renderComponent();

      await waitFor(() => {
        expect(learnerResources.getCourseUnits).toHaveBeenCalledWith('course-1');
      });
    });

    it('renders course title and subtitle after loading', async () => {
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByTestId('header-title')).toHaveTextContent('Introduction to Physics');
        expect(wrapper.getByText('2 units · 12 lessons')).toBeInTheDocument();
      });
    });

    it('renders course description', async () => {
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByText('Learn the fundamentals of physics')).toBeInTheDocument();
      });
    });

    it('displays course thumbnail', async () => {
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.container.querySelector('.course-thumbnail')).toBeInTheDocument();
      });
    });

    it('displays all units', async () => {
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByText('Unit 1: Motion')).toBeInTheDocument();
        expect(wrapper.getByText('Unit 2: Forces')).toBeInTheDocument();
      });
    });
  });

  describe('course action button state', () => {
    it('is disabled when NOT_STARTED', async () => {
      learnerResources = makeLearnerResourcesMock({ gating_state: 'NOT_STARTED' });
      useLearnerResources.mockReturnValue(learnerResources);
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByTestId('course-action-button')).toBeDisabled();
      });
    });

    it('is enabled with Start Course label when PRE_TEST_ACTIVE_INCOMPLETE on first unit', async () => {
      learnerResources = makeLearnerResourcesMock({
        gating_state: 'PRE_TEST_ACTIVE_INCOMPLETE',
        started: true,
        active_test: { unit_id: 'unit-1', test_type: 'pre' },
      });
      useLearnerResources.mockReturnValue(learnerResources);
      const wrapper = renderComponent();

      await waitFor(() => {
        const button = wrapper.getByTestId('course-action-button');
        expect(button).toBeEnabled();
        expect(button).toHaveTextContent('Start Course');
      });
    });

    it('is disabled when PRE_TEST_ACTIVE_COMPLETE', async () => {
      learnerResources = makeLearnerResourcesMock({
        gating_state: 'PRE_TEST_ACTIVE_COMPLETE',
        started: true,
        active_test: { unit_id: 'unit-1', test_type: 'pre' },
        resume_position: { unit_id: 'unit-1' },
      });
      useLearnerResources.mockReturnValue(learnerResources);
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByTestId('course-action-button')).toBeDisabled();
      });
    });

    it('is enabled when RESOURCE_PROGRESSION', async () => {
      learnerResources = makeLearnerResourcesMock({
        gating_state: 'RESOURCE_PROGRESSION',
        started: true,
        resume_position: {
          unit_id: 'unit-1',
          lesson_id: 'lesson-1',
          resource_id: 'resource-1',
        },
      });
      useLearnerResources.mockReturnValue(learnerResources);
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByTestId('course-action-button')).toBeEnabled();
      });
    });

    it('is disabled when RESOURCES_COMPLETE_POST_TEST_INACTIVE', async () => {
      learnerResources = makeLearnerResourcesMock({
        gating_state: 'RESOURCES_COMPLETE_POST_TEST_INACTIVE',
        started: true,
        resume_position: { unit_id: 'unit-1' },
      });
      useLearnerResources.mockReturnValue(learnerResources);
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByTestId('course-action-button')).toBeDisabled();
      });
    });

    it('is enabled when POST_TEST_ACTIVE_INCOMPLETE', async () => {
      learnerResources = makeLearnerResourcesMock({
        gating_state: 'POST_TEST_ACTIVE_INCOMPLETE',
        started: true,
        active_test: { unit_id: 'unit-1', test_type: 'post' },
      });
      useLearnerResources.mockReturnValue(learnerResources);
      const wrapper = renderComponent();

      await waitFor(() => {
        const button = wrapper.getByTestId('course-action-button');
        expect(button).toBeEnabled();
        expect(button).toHaveTextContent('Resume Course');
      });
    });

    it('is disabled when POST_TEST_ACTIVE_COMPLETE', async () => {
      learnerResources = makeLearnerResourcesMock({
        gating_state: 'POST_TEST_ACTIVE_COMPLETE',
        started: true,
        active_test: { unit_id: 'unit-1', test_type: 'post' },
        resume_position: { unit_id: 'unit-1' },
      });
      useLearnerResources.mockReturnValue(learnerResources);
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByTestId('course-action-button')).toBeDisabled();
      });
    });

    it('is disabled when UNIT_COMPLETE', async () => {
      learnerResources = makeLearnerResourcesMock({
        gating_state: 'UNIT_COMPLETE',
        started: true,
        resume_position: { unit_id: 'unit-1' },
      });
      useLearnerResources.mockReturnValue(learnerResources);
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByTestId('course-action-button')).toBeDisabled();
      });
    });

    it('is disabled when COURSE_COMPLETE', async () => {
      learnerResources = makeLearnerResourcesMock({
        gating_state: 'COURSE_COMPLETE',
        started: true,
        resume_position: { unit_id: 'unit-2' },
      });
      useLearnerResources.mockReturnValue(learnerResources);
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByTestId('course-action-button')).toBeDisabled();
      });
    });
  });
});
