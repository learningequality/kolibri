import { render, waitFor, fireEvent, screen } from '@testing-library/vue';
import { useRouter, useRoute } from 'vue-router/composables';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import LearningActivities from 'kolibri-constants/labels/LearningActivities';
import Modalities from 'kolibri-constants/Modalities';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { LearnerCourseResource } from '../../../apiResources';
import CourseUnitView from '../index.vue';
import { PageNames } from '../../../constants';

const { previousLabel$, nextLabel$ } = coursesStrings;

const mockPreviousRouteRef = { value: null };

jest.mock('vue-router/composables');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('kolibri-common/composables/usePreviousRoute', () => ({
  injectPreviousRoute: () => mockPreviousRouteRef,
}));
jest.mock('../../../apiResources', () => ({
  LearnerCourseResource: {
    getResumeData: jest.fn(),
    fetchModel: jest.fn(),
  },
}));

jest.mock('../../../composables/useProgressTracking', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    progress: { value: 0 },
    time_spent: { value: 0 },
    extra_fields: { value: {} },
    initContentSession: jest.fn().mockResolvedValue(),
    updateContentSession: jest.fn().mockResolvedValue(),
    startTrackingProgress: jest.fn(),
    stopTrackingProgress: jest.fn(),
  })),
}));

jest.mock('../../../composables/useContentNodeProgress');
jest.mock('../../../composables/useBookmarks');
jest.mock('../useCourseContentProgressTracking');

const ContentViewerMock = {
  name: 'ContentViewer',
  template: '<div data-testid="content-viewer">{{ options && options.title }}</div>',
  props: ['options'],
};

const CourseContentViewerStub = {
  name: 'CourseContentViewer',
  template:
    '<div data-testid="course-content-viewer"><button data-testid="finish-btn" @click="$emit(\'finished\')">Finish</button><div data-testid="content-viewer">{{ contentNode && contentNode.title }}</div></div>',
  props: ['contentNode', 'nextResource', 'previousResource'],
  emits: ['finished', 'next', 'prev'],
};

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

const AccordionItemStub = {
  template: `
    <div data-testid="accordion-item">
      <div data-testid="accordion-header">
        <slot name="title" />
      </div>
      <div data-testid="accordion-content">
        <slot name="content" />
      </div>
    </div>
  `,
};

describe('CourseUnitView', () => {
  let router;

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
  const UNIT_1_TITLE = 'Unit 1';
  const UNIT_2_TITLE = 'Unit 2';
  const L1_TITLE = 'Lesson 1';
  const L2_TITLE = 'Lesson 2';
  const R1_TITLE = 'Resource 1';
  const R2_TITLE = 'Resource 2';
  const R3_TITLE = 'Resource 3';
  const R4_TITLE = 'Resource 4';
  const R5_TITLE = 'Resource 5';

  beforeEach(() => {
    router = { replace: jest.fn(), back: jest.fn() };
    useRouter.mockReturnValue(router);
    useRoute.mockReturnValue({ params: { courseId: 'course-1' } });
    LearnerCourseResource.getResumeData.mockResolvedValue({});
    LearnerCourseResource.fetchModel.mockResolvedValue({
      title: 'Test Course',
      course_id: COURSE_CONTENT_ID,
    });

    // Default unit tree for rendering/navigation tests:
    // Unit 1 → Lesson 1 [r1, r2], Lesson 2 [r3]
    const r1 = createResource('r1', R1_TITLE, 'l1', 10);
    const r2 = createResource('r2', R2_TITLE, 'l1', 20);
    const r3 = createResource('r3', R3_TITLE, 'l2', 30);
    const l1 = createLesson('l1', L1_TITLE, true, [r1, r2]);
    const l2 = createLesson('l2', L2_TITLE, false, [r3]);

    ContentNodeResource.fetchTree.mockResolvedValue(createUnit('unit-1', UNIT_1_TITLE, [l1, l2]));
    ContentNodeResource.fetchCollection.mockResolvedValue([
      { id: UNIT_1, title: UNIT_1_TITLE, modality: 'UNIT' },
      { id: UNIT_2, title: UNIT_2_TITLE, modality: 'UNIT' },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockPreviousRouteRef.value = null;
  });

  function renderComponent(props = {}, { stubCourseContentViewer = false } = {}) {
    const stubs = { ContentViewer: ContentViewerMock, AccordionItem: AccordionItemStub };
    if (stubCourseContentViewer) stubs.CourseContentViewer = CourseContentViewerStub;
    // eslint-disable-next-line kolibri/tests-no-stubs
    return render(CourseUnitView, { props: { courseId: COURSE_ID, ...props }, stubs });
  }

  /**
   * Mocks the unit tree returned by ContentNodeResource.fetchTree for the
   * redirect-guard tests that need a specific parent/child shape.
   * @param {object} [config] - Tree configuration.
   * @param {string} [config.unitId] - id of the unit at the root of the mocked tree.
   * @param {Array<string>} [config.lessonIds] - Lesson ids to include as children of the unit.
   * @param {{[lessonId: string]: Array<string>}} [config.resourceIdsByLesson] - Map of
   * lesson id to the resource ids placed under that lesson.
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
              lft: index + 1,
            })),
          },
        })),
      },
    });
  }

  function mockResumeData(overrides) {
    LearnerCourseResource.getResumeData.mockResolvedValue({ started: true, ...overrides });
  }

  describe('redirect guard', () => {
    it('redirects to the welcome page when the course has not started, even with a deep-linked URL', async () => {
      LearnerCourseResource.getResumeData.mockResolvedValue({ started: false });
      setupUnitTree();

      renderComponent({ unitId: UNIT_1, lessonId: LESSON_1, resourceId: RESOURCE_1 });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_WELCOME,
          params: { courseSessionId: COURSE_ID },
        });
      });
    });

    it('redirects to the active test when resume data has one', async () => {
      mockResumeData({ active_test: { unit_id: UNIT_1, test_type: 'pre' } });

      renderComponent({ unitId: UNIT_2 });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT_TEST,
          params: { courseId: COURSE_ID, unitId: UNIT_1, testType: 'pre' },
        });
      });
    });

    it('does not redirect when already on the active test page', async () => {
      mockResumeData({ active_test: { unit_id: UNIT_1, test_type: 'pre' } });

      renderComponent({ unitId: UNIT_1, testType: 'pre' });

      await waitFor(() => {
        expect(LearnerCourseResource.getResumeData).toHaveBeenCalled();
      });
      expect(router.replace).not.toHaveBeenCalled();
    });

    // All these cases land at the same resume position — the common behavior is
    // "if the URL doesn't point at a valid non-advanced spot, send the learner
    // back to where they left off."
    it.each([
      {
        when: 'props are missing lesson/resource IDs',
        resume: { unit_id: UNIT_1, lesson_id: LESSON_1, resource_id: RESOURCE_1 },
        props: { unitId: UNIT_1 },
      },
      {
        when: 'unit is ahead of resume',
        resume: { unit_id: UNIT_1, lesson_id: LESSON_1, resource_id: RESOURCE_1 },
        props: { unitId: UNIT_2, lessonId: LESSON_1, resourceId: RESOURCE_1 },
      },
      {
        when: 'lesson is ahead of resume',
        resume: { unit_id: UNIT_1, lesson_id: LESSON_1, resource_id: RESOURCE_1 },
        props: { unitId: UNIT_1, lessonId: LESSON_2, resourceId: RESOURCE_1 },
      },
      {
        when: 'resource is ahead of resume',
        resume: { unit_id: UNIT_1, lesson_id: LESSON_1, resource_id: RESOURCE_1 },
        props: { unitId: UNIT_1, lessonId: LESSON_1, resourceId: RESOURCE_2 },
        tree: {
          lessonIds: [LESSON_1],
          resourceIdsByLesson: { [LESSON_1]: [RESOURCE_1, RESOURCE_2] },
        },
      },
      {
        when: 'lesson does not belong to the unit',
        resume: { unit_id: UNIT_1, lesson_id: LESSON_1, resource_id: RESOURCE_1 },
        props: { unitId: UNIT_1, lessonId: 'lesson-unknown', resourceId: RESOURCE_1 },
      },
      {
        when: 'resource does not belong to the lesson',
        resume: { unit_id: UNIT_1, lesson_id: LESSON_2, resource_id: RESOURCE_2 },
        props: { unitId: UNIT_1, lessonId: LESSON_2, resourceId: RESOURCE_1 },
      },
    ])('redirects to the resume position when $when', async ({ resume, props, tree }) => {
      mockResumeData({ resume_position: resume });
      setupUnitTree(tree);

      renderComponent(props);

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: COURSE_ID,
            unitId: resume.unit_id,
            lessonId: resume.lesson_id,
            resourceId: resume.resource_id,
          },
        });
      });
    });

    it.each([
      {
        when: 'all params match the resume position',
        resume: { unit_id: UNIT_1, lesson_id: LESSON_1, resource_id: RESOURCE_1 },
        props: { unitId: UNIT_1, lessonId: LESSON_1, resourceId: RESOURCE_1 },
      },
      {
        when: 'unit is before the resume position',
        resume: { unit_id: UNIT_2, lesson_id: LESSON_2, resource_id: RESOURCE_2 },
        props: { unitId: UNIT_1, lessonId: LESSON_1, resourceId: RESOURCE_1 },
      },
      {
        when: 'lesson is before the resume position',
        resume: { unit_id: UNIT_1, lesson_id: LESSON_2, resource_id: RESOURCE_2 },
        props: { unitId: UNIT_1, lessonId: LESSON_1, resourceId: RESOURCE_1 },
      },
      {
        when: 'resource is before the resume position',
        resume: { unit_id: UNIT_1, lesson_id: LESSON_1, resource_id: RESOURCE_2 },
        props: { unitId: UNIT_1, lessonId: LESSON_1, resourceId: RESOURCE_1 },
        tree: {
          lessonIds: [LESSON_1],
          resourceIdsByLesson: { [LESSON_1]: [RESOURCE_1, RESOURCE_2] },
        },
      },
    ])('stays on the current URL when $when', async ({ resume, props, tree }) => {
      mockResumeData({ resume_position: resume });
      setupUnitTree(tree);

      renderComponent(props);

      await waitFor(() => {
        expect(LearnerCourseResource.getResumeData).toHaveBeenCalled();
      });
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('does not redirect for a completed course (no resume_position or active_test)', async () => {
      mockResumeData({});
      setupUnitTree();

      renderComponent({ unitId: UNIT_1, lessonId: LESSON_1, resourceId: RESOURCE_1 });

      await waitFor(() => {
        expect(LearnerCourseResource.getResumeData).toHaveBeenCalled();
      });
      expect(router.replace).not.toHaveBeenCalled();
    });

    it.each([
      {
        when: 'props have only a unit, so fill from the first lesson',
        resume: { unit_id: UNIT_1 },
        props: { unitId: UNIT_1 },
        expected: { unitId: UNIT_1, lessonId: LESSON_1, resourceId: RESOURCE_1 },
      },
      {
        when: 'props have unit and lesson but no resource',
        resume: { unit_id: UNIT_1 },
        props: { unitId: UNIT_1, lessonId: LESSON_2 },
        expected: { unitId: UNIT_1, lessonId: LESSON_2, resourceId: RESOURCE_2 },
      },
    ])(
      'redirects to the first resource of the expected lesson when $when',
      async ({ resume, props, expected }) => {
        mockResumeData({ resume_position: resume });
        setupUnitTree();

        renderComponent(props);

        await waitFor(() => {
          expect(router.replace).toHaveBeenCalledWith({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: { courseId: COURSE_ID, ...expected },
          });
        });
      },
    );
  });

  describe('back navigation', () => {
    beforeEach(() => {
      mockResumeData({
        resume_position: { unit_id: UNIT_1, lesson_id: LESSON_1, resource_id: RESOURCE_1 },
      });
      setupUnitTree();
    });

    it('returns to the existing welcome page when the learner came from it', async () => {
      mockPreviousRouteRef.value = { name: PageNames.COURSE_WELCOME };

      const wrapper = renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_1,
        resourceId: RESOURCE_1,
      });

      const backButton = await wrapper.findByTestId('course-back-button');
      await fireEvent.click(backButton);

      expect(router.back).toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: PageNames.COURSE_WELCOME }),
      );
    });

    it('navigates forward to the welcome page for deep-link entries', async () => {
      mockPreviousRouteRef.value = null;

      const wrapper = renderComponent({
        unitId: UNIT_1,
        lessonId: LESSON_1,
        resourceId: RESOURCE_1,
      });

      const backButton = await wrapper.findByTestId('course-back-button');
      await fireEvent.click(backButton);

      expect(router.replace).toHaveBeenCalledWith({
        name: PageNames.COURSE_WELCOME,
        params: { courseSessionId: COURSE_ID },
      });
      expect(router.back).not.toHaveBeenCalled();
    });
  });

  describe('interstitial state', () => {
    async function waitForContentViewer() {
      await waitFor(
        () => {
          expect(screen.getByTestId('course-content-viewer')).toBeVisible();
        },
        { timeout: 2000 },
      );
    }

    function mockEmptyProgress() {
      const useContentNodeProgress = require('../../../composables/useContentNodeProgress').default;
      useContentNodeProgress.mockImplementation(() => ({
        contentNodeProgressMap: {},
        fetchContentNodeProgress: jest.fn(),
        fetchContentNodeTreeProgress: jest.fn(),
      }));
    }

    it.each([{ testType: 'pre' }, { testType: 'post' }])(
      'shows the test-completed interstitial after finishing a $testType-test',
      async ({ testType }) => {
        mockResumeData({ active_test: { unit_id: UNIT_1, test_type: testType } });
        setupUnitTree();

        renderComponent({ unitId: UNIT_1, testType }, { stubCourseContentViewer: true });

        await waitForContentViewer();
        await fireEvent.click(screen.getByTestId('finish-btn'));

        await waitFor(() => {
          expect(screen.getByTestId('test-completed-interstitial')).toBeVisible();
        });
      },
    );

    it('shows the unit-completed interstitial after finishing the last resource in the unit', async () => {
      mockResumeData({
        resume_position: { unit_id: 'unit-1', lesson_id: 'l2', resource_id: 'r3' },
      });
      mockEmptyProgress();

      renderComponent(
        { unitId: 'unit-1', lessonId: 'l2', resourceId: 'r3' },
        { stubCourseContentViewer: true },
      );

      await waitForContentViewer();
      await fireEvent.click(screen.getByTestId('finish-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('unit-completed-interstitial')).toBeVisible();
      });
    });

    it('disables both Prev and Next during the test-completion interstitial', async () => {
      mockResumeData({ active_test: { unit_id: UNIT_1, test_type: 'pre' } });
      setupUnitTree();

      renderComponent({ unitId: UNIT_1, testType: 'pre' }, { stubCourseContentViewer: true });

      await waitForContentViewer();
      await fireEvent.click(screen.getByTestId('finish-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('test-completed-interstitial')).toBeVisible();
      });

      expect(screen.getByRole('button', { name: previousLabel$() })).toBeDisabled();
      expect(screen.getByRole('button', { name: nextLabel$() })).toBeDisabled();
    });

    it('enables Prev during the unit-completion interstitial, navigates back to the last resource, and clears the interstitial', async () => {
      mockResumeData({
        resume_position: { unit_id: 'unit-1', lesson_id: 'l2', resource_id: 'r3' },
      });
      mockEmptyProgress();

      renderComponent(
        { unitId: 'unit-1', lessonId: 'l2', resourceId: 'r3' },
        { stubCourseContentViewer: true },
      );

      await waitForContentViewer();
      await fireEvent.click(screen.getByTestId('finish-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('unit-completed-interstitial')).toBeVisible();
      });

      await fireEvent.click(screen.getByRole('button', { name: previousLabel$() }));

      await waitFor(() => {
        expect(screen.queryByTestId('unit-completed-interstitial')).not.toBeInTheDocument();
      });
      expect(router.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: expect.objectContaining({
            unitId: 'unit-1',
            lessonId: 'l2',
            resourceId: 'r3',
          }),
        }),
      );
    });

    it('handlePrev skips unavailable resources when navigating back from the unit-completed interstitial', async () => {
      const r1 = { ...createResource('r1', R1_TITLE, 'l1', 10), available: true };
      const r2 = { ...createResource('r2', R2_TITLE, 'l1', 20), available: true };
      const r3 = { ...createResource('r3', R3_TITLE, 'l2', 30), available: false };
      const l1 = createLesson('l1', L1_TITLE, true, [r1, r2]);
      const l2 = createLesson('l2', L2_TITLE, false, [r3]);
      ContentNodeResource.fetchTree.mockResolvedValue(createUnit('unit-1', UNIT_1_TITLE, [l1, l2]));

      mockResumeData({
        resume_position: { unit_id: 'unit-1', lesson_id: 'l2', resource_id: 'r3' },
      });
      mockEmptyProgress();

      renderComponent(
        { unitId: 'unit-1', lessonId: 'l2', resourceId: 'r3' },
        { stubCourseContentViewer: true },
      );

      await waitForContentViewer();
      await fireEvent.click(screen.getByTestId('finish-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('unit-completed-interstitial')).toBeVisible();
      });

      await fireEvent.click(screen.getByRole('button', { name: previousLabel$() }));

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: expect.objectContaining({
              unitId: 'unit-1',
              lessonId: 'l1',
              resourceId: 'r2',
            }),
          }),
        );
      });
    });
  });

  describe('rendering and navigation', () => {
    beforeEach(() => {
      // No resume_position → completed unit → free navigation through all resources.
      mockResumeData({});
    });

    it('shows lessons/resources in the side panel and navigates on click', async () => {
      renderComponent({ unitId: 'unit-1', lessonId: 'l1', resourceId: 'r1' });

      await waitFor(() => {
        expect(screen.getByText(L1_TITLE)).toBeVisible();
        expect(screen.getByText(L2_TITLE)).toBeVisible();
        expect(screen.getByText(R2_TITLE)).toBeVisible();
      });

      fireEvent.click(screen.getByText(R2_TITLE));

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: expect.objectContaining({ resourceId: 'r2', lessonId: 'l1' }),
          }),
        );
      });
    });

    it.each([
      {
        when: 'Next within a lesson',
        start: { lessonId: 'l1', resourceId: 'r1' },
        button: () => nextLabel$(),
        expected: { lessonId: 'l1', resourceId: 'r2' },
      },
      {
        when: 'Next across a lesson boundary',
        start: { lessonId: 'l1', resourceId: 'r2' },
        button: () => nextLabel$(),
        expected: { lessonId: 'l2', resourceId: 'r3' },
      },
      {
        when: 'Previous within a lesson',
        start: { lessonId: 'l1', resourceId: 'r2' },
        button: () => previousLabel$(),
        expected: { lessonId: 'l1', resourceId: 'r1' },
      },
      {
        when: 'Previous across a lesson boundary',
        start: { lessonId: 'l2', resourceId: 'r3' },
        button: () => previousLabel$(),
        expected: { lessonId: 'l1', resourceId: 'r2' },
      },
    ])('navigates correctly: $when', async ({ start, button, expected }) => {
      renderComponent({ unitId: 'unit-1', ...start });

      const btn = await screen.findByRole('button', { name: button() });
      await waitFor(() => expect(btn).toBeEnabled());
      await fireEvent.click(btn);

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: expect.objectContaining(expected),
          }),
        );
      });
    });

    it.each([
      {
        when: 'Previous on first resource of unit',
        start: { lessonId: 'l1', resourceId: 'r1' },
        button: () => previousLabel$(),
      },
      {
        when: 'Next on last resource of unit',
        start: { lessonId: 'l2', resourceId: 'r3' },
        button: () => nextLabel$(),
      },
    ])('disables $when', async ({ start, button }) => {
      renderComponent({ unitId: 'unit-1', ...start });

      const btn = await screen.findByRole('button', { name: button() });
      expect(btn).toBeDisabled();
    });

    it('gates navigation past the resume position in the side panel and the Next button', async () => {
      const r1 = createResource('r1', R1_TITLE, 'l1', 10);
      const r2 = createResource('r2', R2_TITLE, 'l1', 20);
      const r3 = createResource('r3', R3_TITLE, 'l1', 30);
      const r4 = createResource('r4', R4_TITLE, 'l2', 40);
      const r5 = createResource('r5', R5_TITLE, 'l2', 50);
      const l1 = createLesson('l1', L1_TITLE, true, [r1, r2, r3]);
      const l2 = createLesson('l2', L2_TITLE, false, [r4, r5]);
      ContentNodeResource.fetchTree.mockResolvedValue(createUnit('unit-1', UNIT_1_TITLE, [l1, l2]));

      mockResumeData({
        resume_position: { unit_id: 'unit-1', lesson_id: 'l1', resource_id: 'r3' },
      });

      // Render at the resume position — Next should be disabled here.
      renderComponent({ unitId: 'unit-1', lessonId: 'l1', resourceId: 'r3' });

      await waitFor(() => expect(screen.getByTestId('content-viewer')).toBeVisible());

      expect(screen.getByRole('button', { name: nextLabel$() })).toBeDisabled();

      await waitFor(() => {
        // Resources at or before the resume position are enabled; those beyond are disabled.
        expect(screen.getByText(R2_TITLE).closest('button')).toBeEnabled();
        expect(screen.getByText(R4_TITLE).closest('button')).toBeDisabled();
        expect(screen.getByText(R5_TITLE).closest('button')).toBeDisabled();
      });
    });

    it('displays the Up Next unit in the side panel footer', async () => {
      renderComponent({ unitId: 'unit-1', lessonId: 'l1', resourceId: 'r1' });

      await waitFor(() => {
        expect(screen.getByText(UNIT_2_TITLE)).toBeVisible();
      });
    });
  });
});
