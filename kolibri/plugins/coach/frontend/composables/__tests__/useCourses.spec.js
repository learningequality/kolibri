import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import * as vueRouterComposables from 'vue-router/composables';
import { useCourses } from '../useCourses';

jest.mock('kolibri-common/apiResources/CourseSessionResource');

describe('useCourses', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useRoute AFTER clearAllMocks to prevent it from being cleared
    jest.spyOn(vueRouterComposables, 'useRoute').mockReturnValue({
      params: { classId: 'class-123' },
    });

    // Reset the composable state
    const { setCourses } = useCourses();
    setCourses([]);
  });

  describe('returned properties', () => {
    it('should return courses computed property', () => {
      const { courses } = useCourses();

      expect(courses).toBeDefined();
      expect(courses.value).toEqual([]);
    });

    it('should return coursesAreLoading computed property', () => {
      const { coursesAreLoading } = useCourses();

      expect(coursesAreLoading).toBeDefined();
      expect(coursesAreLoading.value).toBe(false);
    });

    it('should return refreshClassCourses function', () => {
      const { refreshClassCourses } = useCourses();

      expect(typeof refreshClassCourses).toBe('function');
    });
  });

  describe('courses computed', () => {
    it('should return courses from the internal ref', () => {
      const mockCourses = [
        { id: 'course-1', title: 'Course 1' },
        { id: 'course-2', title: 'Course 2' },
      ];

      const { courses, setCourses } = useCourses();
      setCourses(mockCourses);

      expect(courses.value).toEqual(mockCourses);
    });
  });

  describe('coursesAreLoading flag', () => {
    it('should default to false', () => {
      const { coursesAreLoading } = useCourses();

      expect(coursesAreLoading.value).toBe(false);
    });

    it('should toggle during refreshClassCourses', async () => {
      let resolveCollection;
      CourseSessionResource.fetchCollection.mockReturnValue(
        new Promise(resolve => {
          resolveCollection = resolve;
        }),
      );

      const { refreshClassCourses, coursesAreLoading } = useCourses();
      const refreshPromise = refreshClassCourses();

      expect(coursesAreLoading.value).toBe(true);

      resolveCollection([{ id: 'session-1', course: 'content-1', missing_resource: false }]);
      await refreshPromise;

      expect(coursesAreLoading.value).toBe(false);
    });
  });

  describe('refreshClassCourses', () => {
    const mockCourseSessions = [
      { id: 'session-1', course: 'content-1', missing_resource: false },
      { id: 'session-2', course: 'content-2', missing_resource: false },
    ];

    it('should fetch course sessions with correct parameters', async () => {
      CourseSessionResource.fetchCollection.mockResolvedValue([]);
      const { refreshClassCourses, classId } = useCourses();

      await refreshClassCourses();

      expect(CourseSessionResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { collection: classId.value },
        force: true,
      });
    });

    it('should map backend fields for compatibility', async () => {
      CourseSessionResource.fetchCollection.mockResolvedValue([
        { id: 'session-1', course: 'content-1', missing_resource: true },
      ]);

      const { refreshClassCourses, courses } = useCourses();
      await refreshClassCourses();

      expect(courses.value[0].contentMissing).toBe(true);
    });

    it('should return empty array when no course sessions exist', async () => {
      CourseSessionResource.fetchCollection.mockResolvedValue([]);

      const { refreshClassCourses } = useCourses();
      const result = await refreshClassCourses();

      expect(result).toEqual([]);
    });

    it('should update courses state', async () => {
      CourseSessionResource.fetchCollection.mockResolvedValue(mockCourseSessions);

      const { refreshClassCourses, courses } = useCourses();
      await refreshClassCourses();

      expect(courses.value).toHaveLength(2);
      expect(courses.value[0].id).toBe('session-1');
      expect(courses.value[1].id).toBe('session-2');
    });

    it('should return course sessions on success', async () => {
      CourseSessionResource.fetchCollection.mockResolvedValue([mockCourseSessions[0]]);

      const { refreshClassCourses } = useCourses();
      const result = await refreshClassCourses();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('session-1');
      expect(result[0].contentMissing).toBe(false);
    });
  });
});
