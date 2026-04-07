import { ref } from 'vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import { TestType, UnitPhase } from '../../constants/courseConstants';
import useCourseSession from '../useCourseSession';

jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('kolibri-common/apiResources/CourseSessionResource');
jest.mock('kolibri/composables/useSnackbar', () => ({
  __esModule: true,
  default: () => ({ createSnackbar: jest.fn() }),
}));
jest.mock('kolibri-common/strings/coursesStrings', () => ({
  coursesStrings: {
    unitNLabel$: ({ num }) => `Unit ${num}:`,
    courseVisible$: jest.fn(),
    courseNotVisible$: jest.fn(),
    preTestStartedForUnit$: jest.fn(),
    postTestStartedForUnit$: jest.fn(),
    preTestEndedForUnit$: jest.fn(),
    postTestEndedForUnit$: jest.fn(),
  },
}));
jest.mock('kolibri/uiText/commonCoreStrings', () => ({
  coreStrings: {
    defaultErrorMessage$: jest.fn(),
  },
}));

describe('useCourseSession', () => {
  const mockCourseSessionId = ref('session-123');

  const mockCourseSession = {
    id: mockCourseSessionId.value,
    course: 'course-456',
    title: 'Test Course Session',
    collection: 'class-789',
  };

  const mockCourse = {
    id: 'course-456',
    title: 'Test Course',
    children: {
      results: [
        { id: 'unit-1', title: 'Introduction' },
        { id: 'unit-2', title: 'Fundamentals' },
        { id: 'unit-3', title: 'Advanced Topics' },
      ],
    },
  };

  // Active pre-test on unit 1
  const mockActivePreTest = {
    id: 'test-1',
    unit_contentnode_id: 'unit-1',
    test_type: TestType.PRE,
    closed: false,
    unit_phase: UnitPhase.PRE_TEST_ACTIVE,
    active_unit_id: 'unit-1',
  };

  // Active post-test on unit 1
  const mockActivePostTest = {
    id: 'test-2',
    unit_contentnode_id: 'unit-1',
    test_type: TestType.POST,
    closed: false,
    unit_phase: UnitPhase.POST_TEST_ACTIVE,
    active_unit_id: 'unit-1',
  };

  // Completed pre-test on unit 1
  const mockCompletedPreTest = {
    id: 'test-1',
    unit_contentnode_id: 'unit-1',
    test_type: TestType.PRE,
    closed: true,
    unit_phase: UnitPhase.POST_TEST_PENDING,
    active_unit_id: 'unit-1',
  };

  // Completed post-test on unit 1
  const mockCompletedPostTest = {
    id: 'test-2',
    unit_contentnode_id: 'unit-1',
    test_type: TestType.POST,
    closed: true,
    unit_phase: UnitPhase.PRE_TEST_PENDING,
    active_unit_id: 'unit-2',
  };

  // Server response when no tests have been taken
  const mockNoTests = {
    id: null,
    unit_contentnode_id: null,
    test_type: null,
    closed: null,
    activated_by: null,
    unit_phase: UnitPhase.PRE_TEST_PENDING,
    active_unit_id: 'unit-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations - no tests taken yet
    CourseSessionResource.fetchModel.mockResolvedValue(mockCourseSession);
    ContentNodeResource.fetchTree.mockResolvedValue(mockCourse);
    CourseSessionResource.lastUnitTest.mockResolvedValue(mockNoTests);
  });

  describe('initialization', () => {
    it('should start with pageLoading=true', () => {
      const { pageLoading } = useCourseSession(ref(mockCourseSessionId));
      expect(pageLoading.value).toBe(true);
    });

    it('should fetch course session on initialization', () => {
      useCourseSession(ref(mockCourseSessionId));
      expect(CourseSessionResource.fetchModel).toHaveBeenCalledWith({
        id: mockCourseSessionId.value,
      });
    });

    it('should fetch course and lastUnitTest after session is loaded', async () => {
      useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(ContentNodeResource.fetchTree).toHaveBeenCalledWith({ id: mockCourseSession.course });
      expect(CourseSessionResource.lastUnitTest).toHaveBeenCalledWith({
        id: mockCourseSessionId.value,
      });
    });

    it('should set pageLoading=false after all data is loaded', async () => {
      const { pageLoading } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(pageLoading.value).toBe(false);
    });

    it('should populate courseSession after fetch', async () => {
      const { courseSession } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(courseSession.value).toEqual(mockCourseSession);
    });

    it('should populate course after fetch', async () => {
      const { course } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(course.value).toEqual(mockCourse);
    });

    it('should set contentMissing when fetchTree fails', async () => {
      ContentNodeResource.fetchTree.mockRejectedValue(new Error('Content not found'));

      const { contentMissing, courseSession, course, pageLoading } = useCourseSession(
        ref(mockCourseSessionId),
      );

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(contentMissing.value).toBe(true);
      expect(course.value).toBe(null);
      expect(courseSession.value).toEqual(mockCourseSession);
      expect(pageLoading.value).toBe(false);
    });
  });

  describe('units computed', () => {
    it('should return empty array when course is null', () => {
      const { units } = useCourseSession(ref(mockCourseSessionId));
      expect(units.value).toEqual([]);
    });

    it('should return units with numberedTitle', async () => {
      const { units } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(units.value).toHaveLength(3);
      expect(units.value[0].numberedTitle).toBe('Unit 1: Introduction');
      expect(units.value[1].numberedTitle).toBe('Unit 2: Fundamentals');
      expect(units.value[2].numberedTitle).toBe('Unit 3: Advanced Topics');
    });

    it('should preserve original title and other properties', async () => {
      const { units } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(units.value[0].id).toBe('unit-1');
      expect(units.value[0].title).toBe('Introduction');
      expect(units.value[1].id).toBe('unit-2');
      expect(units.value[1].title).toBe('Fundamentals');
    });
  });

  describe('activeTest computed', () => {
    it('should return null when no tests taken', async () => {
      const { activeTest } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeTest.value).toBe(null);
    });

    it('should return null when lastUnitTest is not active', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue(mockCompletedPreTest);

      const { activeTest } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeTest.value).toBe(null);
    });

    it('should return lastUnitTest when status is active', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue(mockActivePreTest);

      const { activeTest } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeTest.value).toEqual(mockActivePreTest);
    });
  });

  describe('activeUnit computed', () => {
    it('should return first unit when no lastUnitTest', async () => {
      const { activeUnit } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value.id).toBe('unit-1');
    });

    it('should return unit of active test when test is running', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue({
        ...mockActivePreTest,
        unit_contentnode_id: 'unit-2',
        active_unit_id: 'unit-2',
      });

      const { activeUnit } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value.id).toBe('unit-2');
    });

    it('should stay on same unit after pre-test is completed', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue(mockCompletedPreTest);

      const { activeUnit } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value.id).toBe('unit-1');
    });

    it('should advance to next unit after post-test is completed', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue(mockCompletedPostTest);

      const { activeUnit } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value.id).toBe('unit-2');
    });

    it('should return null when course is complete', async () => {
      // Last unit's post-test is completed
      CourseSessionResource.lastUnitTest.mockResolvedValue({
        id: 'test-6',
        unit_contentnode_id: 'unit-3',
        test_type: TestType.POST,
        closed: true,
        unit_phase: UnitPhase.COMPLETE,
        active_unit_id: null,
      });

      const { activeUnit } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value).toBe(null);
    });

    it('should return null when no units exist', async () => {
      ContentNodeResource.fetchTree.mockResolvedValue({
        id: 'course-456',
        children: { results: [] },
      });
      CourseSessionResource.lastUnitTest.mockResolvedValue({
        ...mockNoTests,
        active_unit_id: null,
      });

      const { activeUnit } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value).toBe(null);
    });
  });

  describe('activeUnitIndex computed', () => {
    it('should return 0 for first unit', async () => {
      const { activeUnitIndex } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnitIndex.value).toBe(0);
    });

    it('should return correct index after advancing', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue(mockCompletedPostTest);

      const { activeUnitIndex } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnitIndex.value).toBe(1);
    });

    it('should return -1 when no units exist', async () => {
      ContentNodeResource.fetchTree.mockResolvedValue({
        id: 'course-456',
        children: { results: [] },
      });
      CourseSessionResource.lastUnitTest.mockResolvedValue({
        ...mockNoTests,
        active_unit_id: null,
      });

      const { activeUnitIndex } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnitIndex.value).toBe(-1);
    });
  });

  describe('completedUnits computed', () => {
    it('should return empty array when on first unit', async () => {
      const { completedUnits } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(completedUnits.value).toEqual([]);
    });

    it('should return completed units when advanced', async () => {
      // On unit 3 (units 1 and 2 completed)
      CourseSessionResource.lastUnitTest.mockResolvedValue({
        id: 'test-4',
        unit_contentnode_id: 'unit-2',
        test_type: TestType.POST,
        closed: true,
        unit_phase: UnitPhase.PRE_TEST_PENDING,
        active_unit_id: 'unit-3',
      });

      const { completedUnits } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(completedUnits.value).toHaveLength(2);
      expect(completedUnits.value[0].id).toBe('unit-1');
      expect(completedUnits.value[1].id).toBe('unit-2');
    });

    it('should return all units when course is complete', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue({
        id: 'test-6',
        unit_contentnode_id: 'unit-3',
        test_type: TestType.POST,
        closed: true,
        unit_phase: UnitPhase.COMPLETE,
        active_unit_id: null,
      });

      const { completedUnits, activeUnit } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value).toBe(null);
      expect(completedUnits.value).toHaveLength(3);
      expect(completedUnits.value[0].id).toBe('unit-1');
      expect(completedUnits.value[1].id).toBe('unit-2');
      expect(completedUnits.value[2].id).toBe('unit-3');
    });
  });

  describe('upcomingUnits computed', () => {
    it('should return all units except first when starting', async () => {
      const { upcomingUnits } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(upcomingUnits.value).toHaveLength(2);
      expect(upcomingUnits.value[0].id).toBe('unit-2');
      expect(upcomingUnits.value[1].id).toBe('unit-3');
    });

    it('should return fewer units as course progresses', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue(mockCompletedPostTest);

      const { upcomingUnits } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(upcomingUnits.value).toHaveLength(1);
      expect(upcomingUnits.value[0].id).toBe('unit-3');
    });

    it('should return empty array on last unit', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue({
        id: 'test-4',
        unit_contentnode_id: 'unit-2',
        test_type: TestType.POST,
        closed: true,
        unit_phase: UnitPhase.PRE_TEST_PENDING,
        active_unit_id: 'unit-3',
      });

      const { upcomingUnits } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(upcomingUnits.value).toEqual([]);
    });
  });

  describe('isCourseComplete computed', () => {
    it('should return false when on first unit', async () => {
      const { isCourseComplete } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(isCourseComplete.value).toBe(false);
    });

    it('should return false when some units remain', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue(mockCompletedPostTest);

      const { isCourseComplete } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(isCourseComplete.value).toBe(false);
    });

    it('should return true when all units are complete', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue({
        id: 'test-6',
        unit_contentnode_id: 'unit-3',
        test_type: TestType.POST,
        closed: true,
        unit_phase: UnitPhase.COMPLETE,
        active_unit_id: null,
      });

      const { isCourseComplete } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(isCourseComplete.value).toBe(true);
    });

    it('should return false when no units exist', async () => {
      ContentNodeResource.fetchTree.mockResolvedValue({
        id: 'course-456',
        children: { results: [] },
      });
      CourseSessionResource.lastUnitTest.mockResolvedValue({
        ...mockNoTests,
        active_unit_id: null,
      });

      const { isCourseComplete } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(isCourseComplete.value).toBe(false);
    });
  });

  describe('lastUnitTest state', () => {
    it('should have null test fields when no tests taken', async () => {
      const { lastUnitTest } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(lastUnitTest.value.id).toBe(null);
      expect(lastUnitTest.value.unit_phase).toBe(UnitPhase.PRE_TEST_PENDING);
      expect(lastUnitTest.value.active_unit_id).toBe('unit-1');
    });

    it('should contain the last test data', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue(mockCompletedPreTest);

      const { lastUnitTest } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(lastUnitTest.value).toEqual(mockCompletedPreTest);
    });
  });

  describe('unitPhase computed', () => {
    it('should return PRE_TEST_PENDING when no tests taken', async () => {
      const { unitPhase } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.PRE_TEST_PENDING);
    });

    it('should return PRE_TEST_ACTIVE when pre-test is running', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue(mockActivePreTest);

      const { unitPhase } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.PRE_TEST_ACTIVE);
    });

    it('should return POST_TEST_PENDING after pre-test is completed', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue(mockCompletedPreTest);

      const { unitPhase } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.POST_TEST_PENDING);
    });

    it('should return POST_TEST_ACTIVE when post-test is running', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue(mockActivePostTest);

      const { unitPhase } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.POST_TEST_ACTIVE);
    });

    it('should return PRE_TEST_PENDING after post-test is completed (next unit)', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue(mockCompletedPostTest);

      const { unitPhase } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      // After completing post-test, we advance to next unit which needs pre-test
      expect(unitPhase.value).toBe(UnitPhase.PRE_TEST_PENDING);
    });

    it('should return COMPLETE when course is complete', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValue({
        id: 'test-6',
        unit_contentnode_id: 'unit-3',
        test_type: TestType.POST,
        closed: true,
        unit_phase: UnitPhase.COMPLETE,
        active_unit_id: null,
      });

      const { unitPhase } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.COMPLETE);
    });
  });

  describe('activateTest action', () => {
    it('should call CourseSessionResource.activateTest with correct params', async () => {
      CourseSessionResource.activateTest.mockResolvedValue(mockActivePreTest);

      const { activateTest } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      await activateTest(TestType.PRE);

      expect(CourseSessionResource.activateTest).toHaveBeenCalledWith({
        id: mockCourseSessionId.value,
        data: {
          unit_contentnode_id: 'unit-1',
          test_type: TestType.PRE,
        },
      });
    });

    it('should update activeTest after activation', async () => {
      const { activateTest, activeTest } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeTest.value).toBe(null);

      CourseSessionResource.activateTest.mockResolvedValue(mockActivePreTest);

      await activateTest(TestType.PRE);

      expect(activeTest.value).toEqual(mockActivePreTest);
    });

    it('should update unitPhase after activation', async () => {
      CourseSessionResource.activateTest.mockResolvedValue(mockActivePreTest);

      const { activateTest, unitPhase } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.PRE_TEST_PENDING);

      await activateTest(TestType.PRE);

      expect(unitPhase.value).toBe(UnitPhase.PRE_TEST_ACTIVE);
    });
  });

  describe('closeTest action', () => {
    it('should call CourseSessionResource.closeTest with correct params', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValueOnce(mockActivePreTest);
      CourseSessionResource.closeTest.mockResolvedValue(mockCompletedPreTest);

      const { closeTest } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      await closeTest();

      expect(CourseSessionResource.closeTest).toHaveBeenCalledWith({
        id: mockCourseSessionId.value,
        data: {
          unit_contentnode_id: 'unit-1',
          test_type: TestType.PRE,
        },
      });
    });

    it('should clear activeTest after closing', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValueOnce(mockActivePreTest);
      CourseSessionResource.closeTest.mockResolvedValue(mockCompletedPreTest);

      const { closeTest, activeTest } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeTest.value).toEqual(mockActivePreTest);

      await closeTest();

      expect(activeTest.value).toBe(null);
    });

    it('should update unitPhase after closing pre-test', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValueOnce(mockActivePreTest);
      CourseSessionResource.closeTest.mockResolvedValue(mockCompletedPreTest);

      const { closeTest, unitPhase } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.PRE_TEST_ACTIVE);

      await closeTest();

      expect(unitPhase.value).toBe(UnitPhase.POST_TEST_PENDING);
    });

    it('should advance activeUnit after closing post-test', async () => {
      CourseSessionResource.lastUnitTest.mockResolvedValueOnce(mockActivePostTest);
      CourseSessionResource.closeTest.mockResolvedValue(mockCompletedPostTest);

      const { closeTest, activeUnit } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value.id).toBe('unit-1');

      await closeTest();

      expect(activeUnit.value.id).toBe('unit-2');
    });
  });

  describe('toggleCourseActive action', () => {
    it('should call CourseSessionResource.saveModel with toggled active state', async () => {
      CourseSessionResource.saveModel.mockResolvedValue({ active: false });

      const { toggleCourseActive, courseSession } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      courseSession.value = { ...courseSession.value, active: true };

      await toggleCourseActive();

      expect(CourseSessionResource.saveModel).toHaveBeenCalledWith({
        id: mockCourseSessionId.value,
        data: { active: false },
      });
    });

    it('should update courseSession.active after toggle', async () => {
      CourseSessionResource.saveModel.mockResolvedValue({ active: false });

      const { toggleCourseActive, courseSession } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      courseSession.value = { ...courseSession.value, active: true };

      await toggleCourseActive();

      expect(courseSession.value.active).toBe(false);
    });

    it('should toggle from false to true', async () => {
      CourseSessionResource.saveModel.mockResolvedValue({ active: true });

      const { toggleCourseActive, courseSession } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      courseSession.value = { ...courseSession.value, active: false };

      await toggleCourseActive();

      expect(CourseSessionResource.saveModel).toHaveBeenCalledWith({
        id: mockCourseSessionId.value,
        data: { active: true },
      });
      expect(courseSession.value.active).toBe(true);
    });

    it('should return the result from saveModel', async () => {
      const mockResult = { id: mockCourseSessionId.value, active: true, title: 'Test' };
      CourseSessionResource.saveModel.mockResolvedValue(mockResult);

      const { toggleCourseActive, courseSession } = useCourseSession(ref(mockCourseSessionId));

      await new Promise(resolve => setTimeout(resolve, 0));

      courseSession.value = { ...courseSession.value, active: false };

      const result = await toggleCourseActive();

      expect(result).toEqual(mockResult);
    });
  });

  describe('UnitPhase constants', () => {
    it('should export all phase constants', () => {
      expect(UnitPhase.PRE_TEST_PENDING).toBe('pre_test_pending');
      expect(UnitPhase.PRE_TEST_ACTIVE).toBe('pre_test_active');
      expect(UnitPhase.POST_TEST_PENDING).toBe('post_test_pending');
      expect(UnitPhase.POST_TEST_ACTIVE).toBe('post_test_active');
      expect(UnitPhase.COMPLETE).toBe('complete');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(UnitPhase)).toBe(true);
    });
  });

  describe('TestType constants', () => {
    it('should export test type constants', () => {
      expect(TestType.PRE).toBe('pre');
      expect(TestType.POST).toBe('post');
    });
  });
});
