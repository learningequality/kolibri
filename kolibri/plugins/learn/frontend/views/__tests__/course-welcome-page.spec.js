import Vuex from 'vuex';
import VueRouter from 'vue-router';
import { render, waitFor } from '@testing-library/vue';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { PageNames } from '../../constants';
import CourseWelcomePage from '../CourseWelcomePage.vue';
import useLearnerResources from '../../composables/useLearnerResources';

const { startCourseAction$, resumeCourseAction$ } = coursesStrings;

jest.mock('../../composables/useLearnerResources');

const COURSE_DESCRIPTION = 'Learn the fundamentals of physics';
const COURSE_SUBTITLE = '2 units · 12 lessons';
const UNIT_1_TITLE = 'Unit 1: Motion';
const UNIT_2_TITLE = 'Unit 2: Forces';

describe('CourseWelcomePage', () => {
  let learnerResources;
  let router;
  let store;

  const mockCourse = {
    id: 'course-session-1',
    course_id: 'course-1',
    title: 'Introduction to Physics',
    description: COURSE_DESCRIPTION,
    lesson_count: 12,
  };

  const mockUnits = [
    {
      id: 'unit-1',
      title: UNIT_1_TITLE,
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
      title: UNIT_2_TITLE,
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
        core: {},
      },
      getters: {},
      actions: {},
      mutations: {},
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
      router,
      store,
      props: {
        courseSessionId: 'course-session-1',
        ...props,
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
        expect(wrapper.getByText(COURSE_SUBTITLE)).toBeInTheDocument();
      });
    });

    it('renders course description', async () => {
      const wrapper = renderComponent();

      await waitFor(() => {
        expect(wrapper.getByText(COURSE_DESCRIPTION)).toBeInTheDocument();
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
        expect(wrapper.getByText(UNIT_1_TITLE)).toBeInTheDocument();
        expect(wrapper.getByText(UNIT_2_TITLE)).toBeInTheDocument();
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
        expect(wrapper.getByText(startCourseAction$())).toBeInTheDocument();
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
        expect(wrapper.getByText(resumeCourseAction$())).toBeInTheDocument();
        expect(wrapper.queryByText(startCourseAction$())).not.toBeInTheDocument();
      });
    });
  });
});
