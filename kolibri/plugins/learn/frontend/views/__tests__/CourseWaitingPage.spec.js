import Vuex from 'vuex';
import VueRouter from 'vue-router';
import { render, waitFor, screen } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import { PageNames } from '../../constants';
import CourseWaitingPage from '../CourseWaitingPage.vue';
import { LearnerCourseResource } from '../../apiResources';

jest.mock('../../apiResources');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => ({
  __esModule: true,
  default: () => ({ windowIsLarge: true }),
}));
jest.mock('kolibri-common/composables/usePreviousRoute', () => ({
  useGoBack: jest.fn(() => jest.fn()),
}));

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const COURSE_ID = 'a'.repeat(32);
const UNIT_ID = 'b'.repeat(32);
const LESSON_ID = 'c'.repeat(32);
const RESOURCE_ID = 'd'.repeat(32);

describe('CourseWaitingPage', () => {
  let router;
  let store;

  beforeEach(() => {
    router = new VueRouter({
      routes: [
        { name: PageNames.HOME, path: '/home' },
        { name: PageNames.COURSE_WELCOME, path: '/course-welcome' },
        { name: PageNames.COURSE_CONTENT__RESOURCE, path: '/course-resource' },
        { name: PageNames.COURSE_CONTENT_TEST, path: '/course-test' },
        { name: PageNames.COURSE_CONTENT__WAITING, path: '/course-waiting' },
      ],
    });
    router.replace = jest.fn();

    store = new Vuex.Store({
      state: { core: { loading: false } },
      getters: { isPageLoading: jest.fn(() => false) },
      actions: { handleApiError: jest.fn() },
      mutations: { CORE_SET_ERROR: jest.fn() },
    });

    LearnerCourseResource.getResumeData.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderComponent() {
    return render(CourseWaitingPage, {
      localVue,
      router,
      store,
      props: { courseId: COURSE_ID },
      global: {
        stubs: {
          ImmersivePage: {
            template: '<div data-test="immersive-page"><slot /></div>',
          },
        },
      },
    });
  }

  describe('gated states (should render waiting UI)', () => {
    it('shows waiting UI for completed pre-test still active', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        active_test: { unit_id: UNIT_ID, test_type: 'pre' },
        resume_position: {
          unit_id: UNIT_ID,
          lesson_id: LESSON_ID,
          resource_id: RESOURCE_ID,
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('course-waiting-page')).toBeInTheDocument();
      });
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('shows waiting UI for completed post-test still active', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        active_test: { unit_id: UNIT_ID, test_type: 'post' },
        resume_position: {
          unit_id: UNIT_ID,
          lesson_id: LESSON_ID,
          resource_id: RESOURCE_ID,
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('course-waiting-page')).toBeInTheDocument();
      });
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('shows waiting UI when resources done but no post-test activated', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        active_test: null,
        resume_position: {
          unit_id: UNIT_ID,
          lesson_id: null,
          resource_id: null,
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('course-waiting-page')).toBeInTheDocument();
      });
      expect(router.replace).not.toHaveBeenCalled();
    });
  });

  describe('redirect cases (not gated)', () => {
    it('redirects to COURSE_CONTENT__RESOURCE when learner has full resume position', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        active_test: null,
        resume_position: {
          unit_id: UNIT_ID,
          lesson_id: LESSON_ID,
          resource_id: RESOURCE_ID,
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: {
              courseId: COURSE_ID,
              unitId: UNIT_ID,
              lessonId: LESSON_ID,
              resourceId: RESOURCE_ID,
            },
          }),
        );
      });
    });

    it('redirects to COURSE_CONTENT_TEST when active test but no resume position', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        active_test: { unit_id: UNIT_ID, test_type: 'pre' },
        resume_position: null,
      });

      renderComponent();

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: PageNames.COURSE_CONTENT_TEST,
            params: {
              courseId: COURSE_ID,
              unitId: UNIT_ID,
              testType: 'pre',
            },
          }),
        );
      });
    });

    it('redirects to COURSE_WELCOME when not started', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: false,
        active_test: null,
        resume_position: null,
      });

      renderComponent();

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({ name: PageNames.COURSE_WELCOME }),
        );
      });
    });
  });

  describe('loading state', () => {
    it('shows loading spinner while fetching resume data', () => {
      // Never resolve - keeps loading state
      LearnerCourseResource.getResumeData.mockReturnValue(new Promise(() => {}));

      renderComponent();

      expect(screen.queryByTestId('course-waiting-page')).not.toBeInTheDocument();
      expect(router.replace).not.toHaveBeenCalled();
    });
  });
});
