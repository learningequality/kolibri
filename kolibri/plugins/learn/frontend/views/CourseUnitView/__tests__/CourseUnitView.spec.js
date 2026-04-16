import { render, waitFor, fireEvent, screen } from '@testing-library/vue';
import { useRouter, useRoute } from 'vue-router/composables';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import LearningActivities from 'kolibri-constants/labels/LearningActivities';
import Modalities from 'kolibri-constants/Modalities';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { LearnerCourseResource } from '../../../apiResources';
import CourseUnitView from '../index.vue';
import { PageNames } from '../../../constants';

const { nextLabel$, previousLabel$, courseNameLabel$ } = coursesStrings;

jest.mock('vue-router/composables');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('../../../apiResources', () => ({
  LearnerCourseResource: {
    getResumeData: jest.fn(),
    fetchModel: jest.fn(),
  },
}));
jest.mock('../../../composables/useContentNodeProgress');
jest.mock('../../../composables/useBookmarks');
jest.mock('../useCourseContentProgressTracking');

const LESSON_1_TITLE = 'Lesson 1';
const LESSON_2_TITLE = 'Lesson 2';
const RESOURCE_1_TITLE = 'Resource 1';
const RESOURCE_2_TITLE = 'Resource 2';
const UNIT_2_TITLE = 'Unit 2';
const PHYSICS_101_TITLE = 'Physics 101';

// Data helpers
const createResource = (id, title, parent, lft = 1) => ({
  id,
  title,
  parent,
  lft,
  kind: 'video',
  files: [],
  options: { title },
  duration: 100,
  learning_activities: [LearningActivities.EXPLORE],
});

const createLesson = (id, title, active, children = []) => ({
  id,
  title,
  modality: Modalities.LESSON,
  children: { results: children },
});

const createUnit = (id, title, children = []) => ({
  id,
  title,
  modality: Modalities.UNIT,
  children: { results: children },
});

describe('CourseUnitView', () => {
  let router;
  let sampleUnitTree;
  let sampleCourseUnits;

  const COURSE_ID = 'course-1';
  const COURSE_CONTENT_ID = 'course-content-1';
  const UNIT_1 = 'unit-1';
  const UNIT_2 = 'unit-2';
  const LESSON_1 = 'lesson-1';
  const LESSON_2 = 'lesson-2';
  const LESSON_3 = 'lesson-3';
  const RESOURCE_1 = 'resource-1';
  const RESOURCE_2 = 'resource-2';
  const RESOURCE_3 = 'resource-3';

  beforeEach(() => {
    router = {
      replace: jest.fn(),
      back: jest.fn(),
    };
    useRouter.mockReturnValue(router);
    useRoute.mockReturnValue({ params: { courseId: 'course-1' } });
    LearnerCourseResource.getResumeData.mockResolvedValue({});
    LearnerCourseResource.fetchModel.mockResolvedValue({
      title: 'Test Course',
      course_id: COURSE_CONTENT_ID,
    });

    // Setup sample data for rendering/interaction tests
    const r1 = createResource('r1', RESOURCE_1_TITLE, 'l1', 10);
    const r2 = createResource('r2', RESOURCE_2_TITLE, 'l1', 20);
    const r3 = createResource('r3', 'Resource 3', 'l2', 30);

    const l1 = createLesson('l1', LESSON_1_TITLE, true, [r1, r2]);
    const l2 = createLesson('l2', LESSON_2_TITLE, false, [r3]);

    sampleUnitTree = createUnit('unit-1', 'Unit 1', [l1, l2]);

    // For fetchModel results (course units list)
    sampleCourseUnits = [
      { id: 'unit-1', title: 'Unit 1', modality: 'UNIT' },
      { id: 'unit-2', title: UNIT_2_TITLE, modality: 'UNIT' },
    ];

    ContentNodeResource.fetchTree.mockResolvedValue(sampleUnitTree);
    ContentNodeResource.fetchCollection.mockResolvedValue(sampleCourseUnits);
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
    unitId = UNIT_1,
    lessonIds = [LESSON_1, LESSON_2, LESSON_3],
    resourceIdsByLesson = {
      [LESSON_1]: [RESOURCE_1],
      [LESSON_2]: [RESOURCE_2],
      [LESSON_3]: [RESOURCE_3],
    },
  } = {}) {
    ContentNodeResource.fetchTree.mockResolvedValue({
      id: unitId,
      children: {
        results: lessonIds.map(lessonId => ({
          id: lessonId,
          modality: 'LESSON',
          children: {
            results: (resourceIdsByLesson[lessonId] || []).map((rId, index) => ({
              id: rId,
              parent: lessonId,
              lft: index + 1, // Provide a valid lft for logic checks
            })),
          },
        })),
      },
    });
  }

  describe('redirection logic', () => {
    it('redirects to COURSE_WELCOME if resume data indicates not started', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({ started: false });

      renderComponent();

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_WELCOME,
          params: { courseSessionId: COURSE_ID },
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

    it('does not redirect if all params are present and valid', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: {
          unit_id: 'unit-1',
          lesson_id: 'l1',
          resource_id: 'r1',
        },
      });

      renderComponent({
        unitId: 'unit-1',
        lessonId: 'l1',
        resourceId: 'r1',
      });

      await waitFor(() => {
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

    it('redirects to the first resource of the unit when resume_position only has unit_id, and props have invalid unit', async () => {
      const resumePosition = {
        unit_id: UNIT_1,
        // No lesson_id or resource_id
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      setupUnitTree();

      // User is on UNIT_2, but this is ahead of the resume UNIT_1, so should redirect to the first
      // resource of UNIT_1
      renderComponent({
        unitId: UNIT_2,
      });

      // mock implementation of router.replace to renderComponent with the new params when called
      router.replace.mockImplementation(({ name, params }) => {
        if (name.startsWith('COURSE_CONTENT')) {
          renderComponent({
            unitId: params.unitId,
            lessonId: params.lessonId,
            resourceId: params.resourceId,
          });
        }
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: COURSE_ID,
            unitId: UNIT_1,
            // Should be first resource of UNIT_1
            lessonId: LESSON_1,
            resourceId: RESOURCE_1,
          },
        });
      });
    });

    it('redirects to the first resource of the unit when props only have unitId, and resume_position only have the same unit_id', async () => {
      // already on the right unit (matches resume), but missing lesson/resource params
      const resumePosition = {
        unit_id: UNIT_1,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      setupUnitTree();

      renderComponent({
        unitId: UNIT_1,
        // missing lessonId and resourceId
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: COURSE_ID,
            unitId: UNIT_1,
            // Should default to first resource
            lessonId: LESSON_1,
            resourceId: RESOURCE_1,
          },
        });
      });
    });

    it('redirects to the first resource of the lesson when props only have unitId and lessonId - resume position with same unit_id, completed', async () => {
      // already on the right unit
      const resumePosition = {
        unit_id: UNIT_1,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      setupUnitTree();

      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_2,
        // missing resourceId
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: COURSE_ID,
            unitId: UNIT_1,
            lessonId: LESSON_2,
            // Should default to first resource of the lesson
            resourceId: RESOURCE_2,
          },
        });
      });
    });

    it('redirects to the first resource of the lesson when props only have unitId and lessonId - resume position with same unit_id, next lesson', async () => {
      // already on the right unit
      const resumePosition = {
        unit_id: UNIT_1,
        lesson_id: LESSON_3,
        resource_id: RESOURCE_3,
      };

      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      setupUnitTree();

      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_2,
        // missing resourceId
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: COURSE_ID,
            unitId: UNIT_1,
            lessonId: LESSON_2,
            // Should default to first resource of the lesson
            resourceId: RESOURCE_2,
          },
        });
      });
    });

    it('redirects to the first resource of the lesson when props only have unitId and lessonId - resume position with next unit_id, completed', async () => {
      // already on the right unit
      const resumePosition = {
        unit_id: UNIT_2,
      };
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        resume_position: resumePosition,
      });

      setupUnitTree();

      renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_2,
        // missing resourceId
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: COURSE_ID,
            unitId: UNIT_1,
            lessonId: LESSON_2,
            // Should default to first resource of the lesson
            resourceId: RESOURCE_2,
          },
        });
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
        expect(ContentNodeResource.fetchTree).toHaveBeenCalledWith({
          id: UNIT_1,
          params: { no_available_filtering: true },
        });
      });
    });

    it('renders course title', async () => {
      LearnerCourseResource.fetchModel.mockResolvedValue({
        title: PHYSICS_101_TITLE,
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
        expect(wrapper.getByText(courseNameLabel$({ name: PHYSICS_101_TITLE }))).toBeVisible();
      });
    });
  });

  describe('rendering and interaction', () => {
    beforeEach(() => {
      // Set up resume data so that checkRedirect doesn't redirect
      // and the component renders normally for interaction tests.
      // We simulate a completed unit (no resume_position) to allow full navigation.
      LearnerCourseResource.getResumeData.mockResolvedValue({
        started: true,
        // No resume_position implies completed unit/course -> free navigation
      });
    });

    it('renders the correct content in ContentViewer', async () => {
      renderComponent({
        unitId: 'unit-1',
        lessonId: 'l1',
        resourceId: 'r1',
      });

      await waitFor(() => {
        expect(screen.getByTestId('content-viewer')).toHaveTextContent(RESOURCE_1_TITLE);
      });
    });

    it('renders the side panel with lessons and resources', async () => {
      renderComponent({
        unitId: 'unit-1',
        lessonId: 'l1',
        resourceId: 'r1',
      });

      const sidePanelToggle = await screen.findByTestId('side-panel-toggle');
      await fireEvent.click(sidePanelToggle);

      await waitFor(() => {
        expect(screen.getByText(LESSON_1_TITLE)).toBeVisible();
        expect(screen.getByText(LESSON_2_TITLE)).toBeVisible();
        // Resource 1 appears in both ContentViewer and side panel
        expect(screen.getAllByText(RESOURCE_1_TITLE).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(RESOURCE_2_TITLE)).toBeVisible();
      });
    });

    it('navigates to a resource when clicked in side panel', async () => {
      renderComponent({
        unitId: 'unit-1',
        lessonId: 'l1',
        resourceId: 'r1',
      });

      const sidePanelToggle = await screen.findByTestId('side-panel-toggle');
      await fireEvent.click(sidePanelToggle);

      await waitFor(() => {
        expect(screen.getByText(RESOURCE_2_TITLE)).toBeVisible();
      });

      fireEvent.click(screen.getByText(RESOURCE_2_TITLE));

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: expect.objectContaining({
              resourceId: 'r2',
              lessonId: 'l1',
            }),
          }),
        );
      });
    });

    it('handles "Next" button navigation correctly', async () => {
      // Start at r1 (1st of 2 in Lesson 1)
      renderComponent({
        unitId: 'unit-1',
        lessonId: 'l1',
        resourceId: 'r1',
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: nextLabel$() })).toBeEnabled();
      });
      const nextButton = screen.getByRole('button', { name: nextLabel$() });

      await fireEvent.click(nextButton);

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: expect.objectContaining({
              resourceId: 'r2',
            }),
          }),
        );
      });
    });

    it('handles "Previous" button navigation correctly', async () => {
      // Start at r2 (2nd of 2 in Lesson 1)
      renderComponent({
        unitId: 'unit-1',
        lessonId: 'l1',
        resourceId: 'r2',
      });

      const prevButton = await screen.findByRole('button', { name: previousLabel$() });
      expect(prevButton).toBeEnabled();

      await fireEvent.click(prevButton);

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: expect.objectContaining({
              resourceId: 'r1',
            }),
          }),
        );
      });
    });

    it('handles "Next" button navigation on last resource of lesson', async () => {
      // Start at r2 (2nd of 2 in Lesson 1)
      renderComponent({
        unitId: 'unit-1',
        lessonId: 'l1',
        resourceId: 'r2',
      });

      const nextButton = await screen.findByRole('button', { name: nextLabel$() });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });

      await fireEvent.click(nextButton);

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: expect.objectContaining({
              // expect to go to the next lesson
              lessonId: 'l2',
              resourceId: 'r3',
            }),
          }),
        );
      });
    });

    it('handles "Previous" button navigation correctly on first resource of lesson', async () => {
      // Start at r3 (1st of 2 in Lesson 2)
      renderComponent({
        unitId: 'unit-1',
        lessonId: 'l2',
        resourceId: 'r3',
      });

      const prevButton = await screen.findByRole('button', { name: previousLabel$() });
      expect(prevButton).toBeEnabled();

      await fireEvent.click(prevButton);

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: expect.objectContaining({
              // expect to go to the last resource of the previous lesson
              lessonId: 'l1',
              resourceId: 'r2',
            }),
          }),
        );
      });
    });

    it('disables "Previous" button on the first resource of the unit', async () => {
      renderComponent({
        unitId: 'unit-1',
        lessonId: 'l1',
        resourceId: 'r1',
      });

      const prevButton = await screen.findByRole('button', { name: previousLabel$() });
      expect(prevButton).toBeDisabled();
    });

    // Note: Cross-lesson navigation via Next is not implemented in the provided code snippet logic
    // The code only calculates index within `unitResources` which FLATTENS the unit.
    // `unitResources` = [r1, r2, r3].
    // nextEnabled checks `currentResourceIndexInUnit < unitResources.length - 1`.

    it('enables "Next" button to cross lessons within the unit', async () => {
      // r2 is last in Lesson 1. r3 is in Lesson 2.
      // flattened list: r1, r2, r3.
      // r2 index is 1. length is 3. 1 < 2 => Next Enabled.

      renderComponent({
        unitId: 'unit-1',
        lessonId: 'l1',
        resourceId: 'r2',
      });

      const nextButton = await screen.findByRole('button', { name: nextLabel$() });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });

      await fireEvent.click(nextButton);

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: expect.objectContaining({
              resourceId: 'r3',
              lessonId: 'l2', // Should switch to l2
            }),
          }),
        );
      });
    });

    it('disables "Next" button on the last resource of the unit', async () => {
      renderComponent({
        unitId: 'unit-1',
        lessonId: 'l2',
        resourceId: 'r3',
      });

      const nextButton = await screen.findByRole('button', { name: nextLabel$() });
      expect(nextButton).toBeDisabled();
    });

    it('displays the "Up Next" unit in the side panel footer', async () => {
      // unit-1 is current. unit-2 is next.
      // Ensure fetchCollection returns units with proper structure
      ContentNodeResource.fetchCollection.mockResolvedValue([
        { id: 'unit-1', title: 'Unit 1', modality: 'UNIT' },
        { id: 'unit-2', title: 'Unit 2', modality: 'UNIT' },
      ]);

      renderComponent({
        unitId: 'unit-1',
        lessonId: 'l1',
        resourceId: 'r1',
      });

      // Click on side panel toggle
      const sidePanelToggle = await screen.findByTestId('side-panel-toggle');
      await fireEvent.click(sidePanelToggle);

      await waitFor(() => {
        // Check for Unit 2 title.
        expect(screen.getByText(UNIT_2_TITLE)).toBeVisible();
      });
    });
  });
});
