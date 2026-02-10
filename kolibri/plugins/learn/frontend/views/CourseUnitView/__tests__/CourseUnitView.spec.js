import { render, waitFor } from '@testing-library/vue';
import { useRouter } from 'vue-router/composables';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { LearnerCourseResource } from '../../../apiResources';
import CourseUnitView from '../index.vue';
import { PageNames } from '../../../constants';

jest.mock('vue-router/composables');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('../../../apiResources', () => ({
  LearnerCourseResource: {
    getResumeData: jest.fn(),
    fetchModel: jest.fn(),
  },
}));

describe('CourseUnitView', () => {
  let router;

  beforeEach(() => {
    router = {
      replace: jest.fn(),
      back: jest.fn(),
    };
    useRouter.mockReturnValue(router);
    LearnerCourseResource.getResumeData.mockResolvedValue({});
    LearnerCourseResource.fetchModel.mockResolvedValue({ title: 'Test Course' });
    ContentNodeResource.fetchTree.mockResolvedValue({ children: { results: [] } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderComponent(props = {}) {
    return render(CourseUnitView, {
      props: {
        courseId: 'course-1',
        ...props,
      },
    });
  }

  describe('redirection logic', () => {
    it('redirects to HOME if resume data indicates not started', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({ started: false });

      renderComponent({
        unitId: 'unit-1',
        // Missing lessonId and resourceId to trigger checkRedirect logic
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.HOME,
        });
      });
    });

    it('redirects to active test if resume data has active_test', async () => {
      const activeTest = {
        unit_id: 'unit-1',
        test_type: 'pre',
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        active_test: activeTest,
      });

      renderComponent({
        unitId: 'unit-1',
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT_TEST,
          params: {
            courseId: 'course-1',
            unitId: 'unit-1',
            testType: 'pre',
          },
        });
      });
    });

    it('redirects to resume position if resume data has resume_position', async () => {
      const resumePosition = {
        unit_id: 'unit-1',
        lesson_id: 'lesson-1',
        resource_id: 'resource-1',
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      renderComponent({
        unitId: 'unit-1',
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: 'course-1',
            unitId: 'unit-1',
            lessonId: 'lesson-1',
            resourceId: 'resource-1',
          },
        });
      });
    });

    it('does not redirect if all params are present', async () => {
      renderComponent({
        unitId: 'unit-1',
        lessonId: 'lesson-1',
        resourceId: 'resource-1',
      });

      await waitFor(() => {
        expect(LearnerCourseResource.getResumeData).not.toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
      });
    });

    it('does not redirect if it is a pre/post test', async () => {
      renderComponent({
        unitId: 'unit-1',
        testType: 'pre',
      });

      await waitFor(() => {
        expect(LearnerCourseResource.getResumeData).not.toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
      });
    });
  });

  describe('data loading', () => {
    it('fetches course and unit tree data on mount', async () => {
      renderComponent({
        unitId: 'unit-1',
        lessonId: 'lesson-1',
        resourceId: 'resource-1',
      });

      await waitFor(() => {
        expect(LearnerCourseResource.fetchModel).toHaveBeenCalledWith({ id: 'course-1' });
        expect(ContentNodeResource.fetchTree).toHaveBeenCalledWith({ id: 'unit-1' });
      });
    });

    it('renders course title', async () => {
      LearnerCourseResource.fetchModel.mockResolvedValue({ title: 'Physics 101' });

      const wrapper = renderComponent({
        unitId: 'unit-1',
        lessonId: 'lesson-1',
        resourceId: 'resource-1',
      });

      await waitFor(() => {
        expect(wrapper.getByText(content => content.includes('Physics 101'))).toBeInTheDocument();
      });
    });
  });
});
