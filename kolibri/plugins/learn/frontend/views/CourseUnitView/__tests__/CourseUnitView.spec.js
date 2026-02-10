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

  const COURSE_ID = 'course-1';
  const COURSE_CONTENT_ID = 'course-content-1';
  const UNIT_1 = 'unit-1';
  const UNIT_2 = 'unit-2';
  const LESSON_1 = 'lesson-1';
  const LESSON_2 = 'lesson-2';
  const RESOURCE_1 = 'resource-1';
  const RESOURCE_2 = 'resource-2';

  beforeEach(() => {
    router = {
      replace: jest.fn(),
      back: jest.fn(),
    };
    useRouter.mockReturnValue(router);
    LearnerCourseResource.getResumeData.mockResolvedValue({});
    LearnerCourseResource.fetchModel.mockResolvedValue({
      title: 'Test Course',
      course_id: COURSE_CONTENT_ID,
    });
    ContentNodeResource.fetchCollection.mockResolvedValue([{ id: UNIT_1 }, { id: UNIT_2 }]);
    ContentNodeResource.fetchTree.mockResolvedValue({
      children: { results: [] },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderComponent(props = {}) {
    return render(CourseUnitView, {
      props: {
        courseId: COURSE_ID,
        ...props,
      },
    });
  }

  /**
   * Sets up a full unit tree mock with lessons and resources so that
   * the `shouldRedirectToResumePosition` checks can find the resource
   * in the tree structure.
   */
  function setupUnitTree({
    lessonIds = [LESSON_1, LESSON_2],
    resourceIdsByLesson = {
      [LESSON_1]: [RESOURCE_1],
      [LESSON_2]: [RESOURCE_2],
    },
  } = {}) {
    ContentNodeResource.fetchTree.mockResolvedValue({
      children: {
        results: lessonIds.map(lessonId => ({
          id: lessonId,
          modality: 'LESSON',
          children: {
            results: (resourceIdsByLesson[lessonId] || []).map(rId => ({
              id: rId,
            })),
          },
        })),
      },
    });
  }

  describe('redirection logic', () => {
    it('redirects to HOME if resume data indicates not started', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({ started: false });

      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_1,
        resourceId: RESOURCE_1,
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.HOME,
        });
      });
    });

    it('redirects to active test if resume data has active_test', async () => {
      const activeTest = {
        unit_id: UNIT_1,
        test_type: 'pre',
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        active_test: activeTest,
      });

      renderComponent({
        unitId: UNIT_2,
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT_TEST,
          params: {
            courseId: COURSE_ID,
            unitId: UNIT_1,
            testType: 'pre',
          },
        });
      });
    });

    it('does not redirect if already on the active test page', async () => {
      const activeTest = {
        unit_id: UNIT_1,
        test_type: 'pre',
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        active_test: activeTest,
      });

      renderComponent({
        unitId: UNIT_1,
        testType: 'pre',
      });

      await waitFor(() => {
        expect(LearnerCourseResource.getResumeData).toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
      });
    });

    it('redirects to resume position when props have missing IDs', async () => {
      const resumePosition = {
        unit_id: UNIT_1,
        lesson_id: LESSON_1,
        resource_id: RESOURCE_1,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      renderComponent({
        unitId: UNIT_1,
        // Missing lessonId and resourceId
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: COURSE_ID,
            unitId: UNIT_1,
            lessonId: LESSON_1,
            resourceId: RESOURCE_1,
          },
        });
      });
    });

    it('does not redirect when already at the resume position', async () => {
      const resumePosition = {
        unit_id: UNIT_1,
        lesson_id: LESSON_1,
        resource_id: RESOURCE_1,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      setupUnitTree();

      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_1,
        resourceId: RESOURCE_1,
      });

      await waitFor(() => {
        expect(LearnerCourseResource.getResumeData).toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
      });
    });

    it('redirects when unit is ahead of the resume position', async () => {
      const resumePosition = {
        unit_id: UNIT_1,
        lesson_id: LESSON_1,
        resource_id: RESOURCE_1,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      ContentNodeResource.fetchCollection.mockResolvedValue([{ id: UNIT_1 }, { id: UNIT_2 }]);

      setupUnitTree();

      // User is on UNIT_2, but resume is at UNIT_1 (unit_2 is ahead)
      renderComponent({
        unitId: UNIT_2,
        lessonId: LESSON_1,
        resourceId: RESOURCE_1,
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: COURSE_ID,
            unitId: UNIT_1,
            lessonId: LESSON_1,
            resourceId: RESOURCE_1,
          },
        });
      });
    });

    it('redirects when lesson is ahead of the resume position', async () => {
      const resumePosition = {
        unit_id: UNIT_1,
        lesson_id: LESSON_1,
        resource_id: RESOURCE_1,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      setupUnitTree();

      // User is on LESSON_2, but resume is at LESSON_1 (lesson_2 is ahead)
      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_2,
        resourceId: RESOURCE_1,
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: COURSE_ID,
            unitId: UNIT_1,
            lessonId: LESSON_1,
            resourceId: RESOURCE_1,
          },
        });
      });
    });

    it('redirects when resource is ahead of the resume position', async () => {
      const resumePosition = {
        unit_id: UNIT_1,
        lesson_id: LESSON_1,
        resource_id: RESOURCE_1,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      setupUnitTree({
        lessonIds: [LESSON_1],
        resourceIdsByLesson: {
          [LESSON_1]: [RESOURCE_1, RESOURCE_2],
        },
      });

      // User is on RESOURCE_2, but resume is at RESOURCE_1 (resource_2 is ahead)
      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_1,
        resourceId: RESOURCE_2,
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: COURSE_ID,
            unitId: UNIT_1,
            lessonId: LESSON_1,
            resourceId: RESOURCE_1,
          },
        });
      });
    });

    it('redirects when lesson does not belong to the unit', async () => {
      const unknownLesson = 'lesson-unknown';
      const resumePosition = {
        unit_id: UNIT_1,
        lesson_id: LESSON_1,
        resource_id: RESOURCE_1,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      setupUnitTree();

      // unknownLesson is not in the unit tree
      renderComponent({
        unitId: UNIT_1,
        lessonId: unknownLesson,
        resourceId: RESOURCE_1,
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: COURSE_ID,
            unitId: UNIT_1,
            lessonId: LESSON_1,
            resourceId: RESOURCE_1,
          },
        });
      });
    });

    it('redirects when resource does not belong to the lesson', async () => {
      const resumePosition = {
        unit_id: UNIT_1,
        lesson_id: LESSON_2,
        resource_id: RESOURCE_2,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      setupUnitTree();

      // Resource 1 does not belong to lesson 2
      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_2,
        resourceId: RESOURCE_1,
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: COURSE_ID,
            unitId: UNIT_1,
            lessonId: LESSON_2,
            resourceId: RESOURCE_2,
          },
        });
      });
    });

    it('does not redirect when at a valid earlier position than resume', async () => {
      const resumePosition = {
        unit_id: UNIT_2,
        lesson_id: LESSON_2,
        resource_id: RESOURCE_2,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      ContentNodeResource.fetchCollection.mockResolvedValue([{ id: UNIT_1 }, { id: UNIT_2 }]);

      setupUnitTree();

      // User is on UNIT_1, which is before UNIT_2 resume — allowed
      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_1,
        resourceId: RESOURCE_1,
      });

      await waitFor(() => {
        expect(LearnerCourseResource.getResumeData).toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
      });
    });

    it('does not redirect if lesson is in an earlier position than resume', async () => {
      const resumePosition = {
        unit_id: UNIT_1,
        lesson_id: LESSON_2,
        resource_id: RESOURCE_2,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      setupUnitTree();

      // User is on LESSON_1, which is before LESSON_2 resume — allowed
      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_1,
        resourceId: RESOURCE_1,
      });

      await waitFor(() => {
        expect(LearnerCourseResource.getResumeData).toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
      });
    });

    it('does not redirect if resource is in an earlier position than resume', async () => {
      const resumePosition = {
        unit_id: UNIT_1,
        lesson_id: LESSON_1,
        resource_id: RESOURCE_2,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      setupUnitTree({
        lessonIds: [LESSON_1],
        resourceIdsByLesson: {
          [LESSON_1]: [RESOURCE_1, RESOURCE_2],
        },
      });

      // User is on RESOURCE_1, which is before RESOURCE_2 resume — allowed
      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_1,
        resourceId: RESOURCE_1,
      });

      await waitFor(() => {
        expect(LearnerCourseResource.getResumeData).toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
      });
    });

    it('does not redirect for completed course with no resume_position or active_test', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        // no resume_position, no active_test → completed course
      });

      setupUnitTree();

      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_1,
        resourceId: RESOURCE_1,
      });

      await waitFor(() => {
        expect(LearnerCourseResource.getResumeData).toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
      });
    });
  });

  describe('data loading', () => {
    it('fetches course and unit tree data on mount', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: {
          unit_id: UNIT_1,
          lesson_id: LESSON_1,
          resource_id: RESOURCE_1,
        },
      });

      setupUnitTree();

      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_1,
        resourceId: RESOURCE_1,
      });

      await waitFor(() => {
        expect(LearnerCourseResource.fetchModel).toHaveBeenCalledWith({ id: COURSE_ID });
        expect(ContentNodeResource.fetchTree).toHaveBeenCalledWith({ id: UNIT_1 });
      });
    });

    it('renders course title', async () => {
      LearnerCourseResource.fetchModel.mockResolvedValue({
        title: 'Physics 101',
        course_id: COURSE_CONTENT_ID,
      });
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: {
          unit_id: UNIT_1,
          lesson_id: LESSON_1,
          resource_id: RESOURCE_1,
        },
      });

      setupUnitTree();

      const wrapper = renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_1,
        resourceId: RESOURCE_1,
      });

      await waitFor(() => {
        expect(wrapper.getByText(content => content.includes('Physics 101'))).toBeInTheDocument();
      });
    });
  });
});
