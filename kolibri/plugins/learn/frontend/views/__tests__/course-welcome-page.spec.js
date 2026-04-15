import Vuex from 'vuex';
import VueRouter from 'vue-router';
import { render, waitFor, fireEvent } from '@testing-library/vue';
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
    started = false,
    resume_position = null,
    active_test = null,
  } = {}) => {
    return {
      fetchCourse: jest.fn().mockResolvedValue({
        course: mockCourse,
        content: mockCourseContent,
        progress: {
          started,
          resume_position,
          active_test,
        },
      }),
      getCourseContent: jest.fn().mockReturnValue(mockCourseContent),
      getCourseProgress: jest.fn().mockReturnValue({
        started,
        resume_position,
        active_test,
      }),
      getCourseUnits: jest.fn().mockReturnValue(mockUnits),
      isUnitTestAvailable: jest.fn((courseId, unitId, testType) => {
        if (!active_test) return false;
        return active_test.unit_id === unitId && active_test.test_type === testType;
      }),
      isCourseLessonAvailable: jest.fn(() => started),
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
        // Subtitle is rendered with the unit and lesson counts; we just verify it exists.
        expect(wrapper.getByTestId('course-subtitle')).toBeInTheDocument();
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

  describe('course not started', () => {
    beforeEach(() => {
      learnerResources = makeLearnerResourcesMock({ started: false });
      useLearnerResources.mockReturnValue(learnerResources);
    });

    it('shows the disabled action button when course has not been started', async () => {
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByTestId('welcome-action-button')).toBeInTheDocument();
        expect(wrapper.queryByTestId('welcome-action-link')).not.toBeInTheDocument();
      });
    });
  });

  describe('course not started - button state', () => {
    beforeEach(() => {
      learnerResources = makeLearnerResourcesMock({ started: false });
      useLearnerResources.mockReturnValue(learnerResources);
    });

    it('Start button is disabled before the pre-test is activated', async () => {
      const wrapper = renderComponent();

      await waitFor(() => {
        const button = wrapper.getByTestId('welcome-action-button');
        expect(button).toBeDisabled();
      });
    });
  });

  describe('course started', () => {
    beforeEach(() => {
      learnerResources = makeLearnerResourcesMock({
        started: true,
        resume_position: {
          unit_id: 'unit-1',
          lesson_id: 'lesson-1',
          resource_id: 'resource-1',
        },
        active_test: null,
      });
      useLearnerResources.mockReturnValue(learnerResources);
    });

    it('shows the action link (not the disabled button) when course has been started', async () => {
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByTestId('welcome-action-link')).toBeInTheDocument();
        expect(wrapper.queryByTestId('welcome-action-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('lesson availability', () => {
    it('unit lessons are locked before the course is started', async () => {
      learnerResources = makeLearnerResourcesMock({ started: false });
      useLearnerResources.mockReturnValue(learnerResources);

      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByText('Unit 1: Motion')).toBeInTheDocument();
      });

      // Expand both units to reveal their lesson buttons
      await fireEvent.click(wrapper.getByRole('button', { name: /Unit 1: Motion/i }));
      await fireEvent.click(wrapper.getByRole('button', { name: /Unit 2: Forces/i }));

      // All lessons across both units should be disabled
      await waitFor(() => {
        // Unit 1: Lessons 1-2, Unit 2: Lesson 3
        for (const title of [
          'Lesson 1: Introduction',
          'Lesson 2: Velocity',
          "Lesson 3: Newton's Laws",
        ]) {
          expect(wrapper.getByRole('button', { name: title })).toBeDisabled();
        }
      });
    });

    it('unit lessons are locked during an active pre-test', async () => {
      learnerResources = makeLearnerResourcesMock({
        started: true,
        active_test: { unit_id: 'unit-1', test_type: 'pre' },
        resume_position: null,
      });
      // The default mock returns `started` (true here), but the real implementation
      // returns false when there's an active pre-test with no resume_position.
      learnerResources.isCourseLessonAvailable = jest.fn(() => false);
      useLearnerResources.mockReturnValue(learnerResources);

      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByText('Unit 1: Motion')).toBeInTheDocument();
      });

      // Expand both units to reveal their lesson buttons
      await fireEvent.click(wrapper.getByRole('button', { name: /Unit 1: Motion/i }));
      await fireEvent.click(wrapper.getByRole('button', { name: /Unit 2: Forces/i }));

      // All lessons across both units should be disabled
      await waitFor(() => {
        // Unit 1: Lessons 1-2, Unit 2: Lesson 3
        for (const title of [
          'Lesson 1: Introduction',
          'Lesson 2: Velocity',
          "Lesson 3: Newton's Laws",
        ]) {
          expect(wrapper.getByRole('button', { name: title })).toBeDisabled();
        }
      });
    });
  });

  describe('navigation with active_test', () => {
    it('Start button navigates to the pre-test when it is active', async () => {
      learnerResources = makeLearnerResourcesMock({
        started: true,
        active_test: { unit_id: 'unit-1', test_type: 'pre' },
        resume_position: null,
      });
      useLearnerResources.mockReturnValue(learnerResources);

      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByTestId('welcome-action-link')).toBeInTheDocument();
      });

      const link = wrapper.getByTestId('welcome-action-link');
      const anchor = link.closest('a');
      anchor.click();

      await waitFor(() => {
        const pushCall = router.push.mock.calls[0][0];
        expect(pushCall).toEqual(
          expect.objectContaining({
            name: PageNames.COURSE_CONTENT_TEST,
            params: expect.objectContaining({
              unitId: 'unit-1',
              testType: 'pre',
            }),
          }),
        );
      });
    });

    it('Resume button navigates to the resume position when no active test', async () => {
      learnerResources = makeLearnerResourcesMock({
        started: true,
        resume_position: {
          unit_id: 'unit-1',
          lesson_id: 'lesson-1',
          resource_id: 'resource-1',
        },
        active_test: null,
      });
      useLearnerResources.mockReturnValue(learnerResources);

      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByTestId('welcome-action-link')).toBeInTheDocument();
      });

      const link = wrapper.getByTestId('welcome-action-link');
      const anchor = link.closest('a');
      anchor.click();

      await waitFor(() => {
        const pushCall = router.push.mock.calls[0][0];
        expect(pushCall).toEqual(
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
  });
});
