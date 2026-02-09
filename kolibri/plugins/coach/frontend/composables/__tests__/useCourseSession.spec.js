import { nextTick } from 'vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import { UnitPhase } from '../../constants/courseConstants';
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

describe('useCourseSession', () => {
  const mockCourseSessionId = 'session-123';

  const mockCourseSession = {
    id: mockCourseSessionId,
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

  const mockActiveTestPre = {
    id: 'test-1',
    unit_contentnode_id: 'unit-1',
    test_type: 'pre',
    status: 'active',
  };

  const mockActiveTestPost = {
    id: 'test-2',
    unit_contentnode_id: 'unit-1',
    test_type: 'post',
    status: 'active',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    CourseSessionResource.fetchModel.mockResolvedValue(mockCourseSession);
    ContentNodeResource.fetchTree.mockResolvedValue(mockCourse);
    CourseSessionResource.activeTest.mockResolvedValue({ active_test: null });
    CourseSessionResource.testHistory.mockResolvedValue({ data: [] });
  });

  describe('initialization', () => {
    it('should start with loading=true', () => {
      const { loading } = useCourseSession(mockCourseSessionId);
      expect(loading.value).toBe(true);
    });

    it('should fetch course session on initialization', () => {
      useCourseSession(mockCourseSessionId);
      expect(CourseSessionResource.fetchModel).toHaveBeenCalledWith({ id: mockCourseSessionId });
    });

    it('should fetch course, active test, and history after session is loaded', async () => {
      useCourseSession(mockCourseSessionId);
      await nextTick();

      expect(ContentNodeResource.fetchTree).toHaveBeenCalledWith({ id: mockCourseSession.course });
      expect(CourseSessionResource.activeTest).toHaveBeenCalledWith({ id: mockCourseSessionId });
      expect(CourseSessionResource.testHistory).toHaveBeenCalledWith({ id: mockCourseSessionId });
    });

    it('should set loading=false after all data is loaded', async () => {
      const { loading } = useCourseSession(mockCourseSessionId);

      // Wait for all promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(loading.value).toBe(false);
    });

    it('should populate courseSession after fetch', async () => {
      const { courseSession } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(courseSession.value).toEqual(mockCourseSession);
    });

    it('should populate course after fetch', async () => {
      const { course } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(course.value).toEqual(mockCourse);
    });
  });

  describe('units computed', () => {
    it('should return empty array when course is null', () => {
      const { units } = useCourseSession(mockCourseSessionId);
      expect(units.value).toEqual([]);
    });

    it('should return units with numberedTitle', async () => {
      const { units } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(units.value).toHaveLength(3);
      expect(units.value[0].numberedTitle).toBe('Unit 1: Introduction');
      expect(units.value[1].numberedTitle).toBe('Unit 2: Fundamentals');
      expect(units.value[2].numberedTitle).toBe('Unit 3: Advanced Topics');
    });

    it('should preserve original title and other properties', async () => {
      const { units } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(units.value[0].id).toBe('unit-1');
      expect(units.value[0].title).toBe('Introduction');
      expect(units.value[1].id).toBe('unit-2');
      expect(units.value[1].title).toBe('Fundamentals');
    });
  });

  describe('activeUnit computed', () => {
    it('should return first unit when no history and no active test', async () => {
      const { activeUnit } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value.id).toBe('unit-1');
    });

    it('should return unit of active test when test is running', async () => {
      CourseSessionResource.activeTest.mockResolvedValue({
        active_test: { ...mockActiveTestPre, unit_contentnode_id: 'unit-2' },
      });

      const { activeUnit } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value.id).toBe('unit-2');
    });

    it('should stay on same unit after pre-test is completed', async () => {
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [{ id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'pre', status: 'ended' }],
      });

      const { activeUnit } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value.id).toBe('unit-1');
    });

    it('should advance to next unit after post-test is completed', async () => {
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [
          { id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'pre', status: 'ended' },
          { id: 'test-2', unit_contentnode_id: 'unit-1', test_type: 'post', status: 'ended' },
        ],
      });

      const { activeUnit } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value.id).toBe('unit-2');
    });

    it('should return null when course is complete', async () => {
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [
          { id: 'test-1', unit_contentnode_id: 'unit-3', test_type: 'pre', status: 'ended' },
          { id: 'test-2', unit_contentnode_id: 'unit-3', test_type: 'post', status: 'ended' },
        ],
      });

      const { activeUnit } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Should be null since all units are complete
      expect(activeUnit.value).toBe(null);
    });

    it('should return null when no units exist', async () => {
      ContentNodeResource.fetchTree.mockResolvedValue({
        id: 'course-456',
        children: { results: [] },
      });

      const { activeUnit } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value).toBe(null);
    });
  });

  describe('activeUnitIndex computed', () => {
    it('should return 0 for first unit', async () => {
      const { activeUnitIndex } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnitIndex.value).toBe(0);
    });

    it('should return correct index after advancing', async () => {
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [
          { id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'pre', status: 'ended' },
          { id: 'test-2', unit_contentnode_id: 'unit-1', test_type: 'post', status: 'ended' },
        ],
      });

      const { activeUnitIndex } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnitIndex.value).toBe(1);
    });

    it('should return -1 when activeUnit is null', async () => {
      ContentNodeResource.fetchTree.mockResolvedValue({
        id: 'course-456',
        children: { results: [] },
      });

      const { activeUnitIndex } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnitIndex.value).toBe(-1);
    });
  });

  describe('completedUnits computed', () => {
    it('should return empty array when on first unit', async () => {
      const { completedUnits } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(completedUnits.value).toEqual([]);
    });

    it('should return completed units when advanced', async () => {
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [
          { id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'pre', status: 'ended' },
          { id: 'test-2', unit_contentnode_id: 'unit-1', test_type: 'post', status: 'ended' },
          { id: 'test-3', unit_contentnode_id: 'unit-2', test_type: 'pre', status: 'ended' },
          { id: 'test-4', unit_contentnode_id: 'unit-2', test_type: 'post', status: 'ended' },
        ],
      });

      const { completedUnits } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(completedUnits.value).toHaveLength(2);
      expect(completedUnits.value[0].id).toBe('unit-1');
      expect(completedUnits.value[1].id).toBe('unit-2');
    });

    it('should return all units when course is complete', async () => {
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [
          { id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'pre', status: 'ended' },
          { id: 'test-2', unit_contentnode_id: 'unit-1', test_type: 'post', status: 'ended' },
          { id: 'test-3', unit_contentnode_id: 'unit-2', test_type: 'pre', status: 'ended' },
          { id: 'test-4', unit_contentnode_id: 'unit-2', test_type: 'post', status: 'ended' },
          { id: 'test-5', unit_contentnode_id: 'unit-3', test_type: 'pre', status: 'ended' },
          { id: 'test-6', unit_contentnode_id: 'unit-3', test_type: 'post', status: 'ended' },
        ],
      });

      const { completedUnits, activeUnit } = useCourseSession(mockCourseSessionId);

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
      const { upcomingUnits } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(upcomingUnits.value).toHaveLength(2);
      expect(upcomingUnits.value[0].id).toBe('unit-2');
      expect(upcomingUnits.value[1].id).toBe('unit-3');
    });

    it('should return fewer units as course progresses', async () => {
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [
          { id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'pre', status: 'ended' },
          { id: 'test-2', unit_contentnode_id: 'unit-1', test_type: 'post', status: 'ended' },
        ],
      });

      const { upcomingUnits } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(upcomingUnits.value).toHaveLength(1);
      expect(upcomingUnits.value[0].id).toBe('unit-3');
    });

    it('should return empty array on last unit', async () => {
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [
          { id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'post', status: 'ended' },
          { id: 'test-2', unit_contentnode_id: 'unit-2', test_type: 'post', status: 'ended' },
        ],
      });

      const { upcomingUnits } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(upcomingUnits.value).toEqual([]);
    });
  });

  describe('isCourseComplete computed', () => {
    it('should return false when on first unit', async () => {
      const { isCourseComplete } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(isCourseComplete.value).toBe(false);
    });

    it('should return false when some units remain', async () => {
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [
          { id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'pre', status: 'ended' },
          { id: 'test-2', unit_contentnode_id: 'unit-1', test_type: 'post', status: 'ended' },
        ],
      });

      const { isCourseComplete } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(isCourseComplete.value).toBe(false);
    });

    it('should return true when all units are complete', async () => {
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [
          { id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'pre', status: 'ended' },
          { id: 'test-2', unit_contentnode_id: 'unit-1', test_type: 'post', status: 'ended' },
          { id: 'test-3', unit_contentnode_id: 'unit-2', test_type: 'pre', status: 'ended' },
          { id: 'test-4', unit_contentnode_id: 'unit-2', test_type: 'post', status: 'ended' },
          { id: 'test-5', unit_contentnode_id: 'unit-3', test_type: 'pre', status: 'ended' },
          { id: 'test-6', unit_contentnode_id: 'unit-3', test_type: 'post', status: 'ended' },
        ],
      });

      const { isCourseComplete } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(isCourseComplete.value).toBe(true);
    });

    it('should return false when no units exist', async () => {
      ContentNodeResource.fetchTree.mockResolvedValue({
        id: 'course-456',
        children: { results: [] },
      });

      const { isCourseComplete } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(isCourseComplete.value).toBe(false);
    });
  });

  describe('lastCompletedTest computed', () => {
    it('should return null when no history', async () => {
      const { lastCompletedTest } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(lastCompletedTest.value).toBe(null);
    });

    it('should return last test from history', async () => {
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [
          { id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'pre', status: 'ended' },
          { id: 'test-2', unit_contentnode_id: 'unit-1', test_type: 'post', status: 'ended' },
        ],
      });

      const { lastCompletedTest } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(lastCompletedTest.value.id).toBe('test-2');
      expect(lastCompletedTest.value.test_type).toBe('post');
    });
  });

  describe('unitPhase computed', () => {
    it('should return PRE_TEST_PENDING when no history and no active test', async () => {
      const { unitPhase } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.PRE_TEST_PENDING);
    });

    it('should return PRE_TEST_ACTIVE when pre-test is running', async () => {
      CourseSessionResource.activeTest.mockResolvedValue({
        active_test: mockActiveTestPre,
      });

      const { unitPhase } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.PRE_TEST_ACTIVE);
    });

    it('should return POST_TEST_PENDING after pre-test is completed', async () => {
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [{ id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'pre', status: 'ended' }],
      });

      const { unitPhase } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.POST_TEST_PENDING);
    });

    it('should return POST_TEST_ACTIVE when post-test is running', async () => {
      CourseSessionResource.activeTest.mockResolvedValue({
        active_test: mockActiveTestPost,
      });
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [{ id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'pre', status: 'ended' }],
      });

      const { unitPhase } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.POST_TEST_ACTIVE);
    });

    it('should return COMPLETE when post-test is completed for active unit', async () => {
      // Set history so we're on unit-3 (last unit) with post-test completed
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [
          { id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'post', status: 'ended' },
          { id: 'test-2', unit_contentnode_id: 'unit-2', test_type: 'post', status: 'ended' },
          { id: 'test-3', unit_contentnode_id: 'unit-3', test_type: 'pre', status: 'ended' },
          { id: 'test-4', unit_contentnode_id: 'unit-3', test_type: 'post', status: 'ended' },
        ],
      });

      const { unitPhase } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.COMPLETE);
    });

    it('should return null when no units exist', async () => {
      ContentNodeResource.fetchTree.mockResolvedValue({
        id: 'course-456',
        children: { results: [] },
      });

      const { unitPhase } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(null);
    });
  });

  describe('activateTest action', () => {
    it('should call CourseSessionResource.activateTest with correct params', async () => {
      CourseSessionResource.activateTest.mockResolvedValue(mockActiveTestPre);

      const { activateTest } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      await activateTest('pre');

      expect(CourseSessionResource.activateTest).toHaveBeenCalledWith({
        id: mockCourseSessionId,
        data: {
          unit_contentnode_id: 'unit-1',
          test_type: 'pre',
        },
      });
    });

    it('should update activeTest ref after activation', async () => {
      CourseSessionResource.activateTest.mockResolvedValue(mockActiveTestPre);

      const { activateTest, activeTest } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeTest.value).toBe(null);

      await activateTest('pre');

      expect(activeTest.value).toEqual(mockActiveTestPre);
    });

    it('should update unitPhase after activation', async () => {
      CourseSessionResource.activateTest.mockResolvedValue(mockActiveTestPre);

      const { activateTest, unitPhase } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.PRE_TEST_PENDING);

      await activateTest('pre');

      expect(unitPhase.value).toBe(UnitPhase.PRE_TEST_ACTIVE);
    });
  });

  describe('closeTest action', () => {
    it('should call CourseSessionResource.closeTest with correct params', async () => {
      CourseSessionResource.activeTest.mockResolvedValue({
        active_test: mockActiveTestPre,
      });
      CourseSessionResource.closeTest.mockResolvedValue({ status: 'ended' });

      const { closeTest } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      await closeTest();

      expect(CourseSessionResource.closeTest).toHaveBeenCalledWith({
        id: mockCourseSessionId,
        data: {
          unit_contentnode_id: 'unit-1',
          test_type: 'pre',
        },
      });
    });

    it('should clear activeTest after closing', async () => {
      CourseSessionResource.activeTest.mockResolvedValue({
        active_test: mockActiveTestPre,
      });
      CourseSessionResource.closeTest.mockResolvedValue({ status: 'ended' });

      const { closeTest, activeTest } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeTest.value).toEqual(mockActiveTestPre);

      await closeTest();

      expect(activeTest.value).toBe(null);
    });

    it('should add closed test to history', async () => {
      CourseSessionResource.activeTest.mockResolvedValue({
        active_test: mockActiveTestPre,
      });
      CourseSessionResource.closeTest.mockResolvedValue({ status: 'ended' });

      const { closeTest, testHistory } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(testHistory.value).toHaveLength(0);

      await closeTest();

      expect(testHistory.value).toHaveLength(1);
      expect(testHistory.value[0].id).toBe('test-1');
      expect(testHistory.value[0].status).toBe('ended');
    });

    it('should update unitPhase after closing pre-test', async () => {
      CourseSessionResource.activeTest.mockResolvedValue({
        active_test: mockActiveTestPre,
      });
      CourseSessionResource.closeTest.mockResolvedValue({ status: 'ended' });

      const { closeTest, unitPhase } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unitPhase.value).toBe(UnitPhase.PRE_TEST_ACTIVE);

      await closeTest();

      expect(unitPhase.value).toBe(UnitPhase.POST_TEST_PENDING);
    });

    it('should advance activeUnit after closing post-test', async () => {
      CourseSessionResource.activeTest.mockResolvedValue({
        active_test: mockActiveTestPost,
      });
      CourseSessionResource.testHistory.mockResolvedValue({
        data: [{ id: 'test-1', unit_contentnode_id: 'unit-1', test_type: 'pre', status: 'ended' }],
      });
      CourseSessionResource.closeTest.mockResolvedValue({ status: 'ended' });

      const { closeTest, activeUnit } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(activeUnit.value.id).toBe('unit-1');

      await closeTest();

      expect(activeUnit.value.id).toBe('unit-2');
    });
  });

  describe('toggleCourseActive action', () => {
    it('should call CourseSessionResource.saveModel with toggled active state', async () => {
      CourseSessionResource.saveModel.mockResolvedValue({ active: false });

      const { toggleCourseActive, courseSession } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      // mockCourseSession doesn't have active, so it starts as undefined (falsy)
      // toggling should set it to true
      courseSession.value = { ...courseSession.value, active: true };

      await toggleCourseActive();

      expect(CourseSessionResource.saveModel).toHaveBeenCalledWith({
        id: mockCourseSessionId,
        data: { active: false },
      });
    });

    it('should update courseSession.active after toggle', async () => {
      CourseSessionResource.saveModel.mockResolvedValue({ active: false });

      const { toggleCourseActive, courseSession } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      courseSession.value = { ...courseSession.value, active: true };

      await toggleCourseActive();

      expect(courseSession.value.active).toBe(false);
    });

    it('should toggle from false to true', async () => {
      CourseSessionResource.saveModel.mockResolvedValue({ active: true });

      const { toggleCourseActive, courseSession } = useCourseSession(mockCourseSessionId);

      await new Promise(resolve => setTimeout(resolve, 0));

      courseSession.value = { ...courseSession.value, active: false };

      await toggleCourseActive();

      expect(CourseSessionResource.saveModel).toHaveBeenCalledWith({
        id: mockCourseSessionId,
        data: { active: true },
      });
      expect(courseSession.value.active).toBe(true);
    });

    it('should return the result from saveModel', async () => {
      const mockResult = { id: mockCourseSessionId, active: true, title: 'Test' };
      CourseSessionResource.saveModel.mockResolvedValue(mockResult);

      const { toggleCourseActive, courseSession } = useCourseSession(mockCourseSessionId);

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
});
