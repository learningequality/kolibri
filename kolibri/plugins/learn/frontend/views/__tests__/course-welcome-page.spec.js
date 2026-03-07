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
    on_device_resources: 12,
    children: {
      results: mockUnits,
    },
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
        {
          name: PageNames.COURSE_CONTENT_TEST,
          path: '/course/:courseId/unit/:unitId/test/:testType',
        },
        {
          name: PageNames.COURSE_CONTENT__LESSON,
          path: '/course/:courseId/unit/:unitId/lesson/:lessonId',
        },
        {
          name: PageNames.COURSE_CONTENT__UNIT,
          path: '/course/:courseId/unit/:unitId',
        },
        {
          name: PageNames.COURSE_CONTENT__RESOURCE,
          path: '/course/:courseId/unit/:unitId/lesson/:lessonId/resource/:resourceId',
        },
        {
          name: PageNames.COURSE_CONTENT__COURSE,
          path: '/course/:courseId',
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
        notLoading: jest.fn(),
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
        expect(wrapper.getByText('2 units · 12 resources')).toBeInTheDocument();
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

    it('shows "Start course" button when course has not been started', async () => {
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByText(content => content.includes('Start Course'))).toBeInTheDocument();
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

    it('shows "Resume course" button when course has been started', async () => {
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByText(content => content.includes('Resume Course'))).toBeInTheDocument();
        expect(wrapper.queryByText('Start Course')).not.toBeInTheDocument();
      });
    });
  });
});
