import { ref } from 'vue';
import LearnerGroupResource from 'kolibri-common/apiResources/LearnerGroupResource';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import useUser from 'kolibri/composables/useUser';
import useFacilities from 'kolibri-common/composables/useFacilities';
import store from 'kolibri/store';
import { PageNames } from '../../constants';
import { useCourses } from '../useCourses';

jest.mock('kolibri-common/apiResources/LearnerGroupResource');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('kolibri-common/apiResources/CourseSessionResource');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/composables/useFacilities');
jest.mock('kolibri/store', () => ({
  state: {
    coursesRoot: {
      courses: [],
      learnerGroups: [],
    },
    loading: false,
  },
  commit: jest.fn(),
  dispatch: jest.fn(),
}));

describe('useCourses', () => {
  let mockStore;
  let getFacilitiesMock;
  let isSuperuserRef;
  let facilitiesRef;

  beforeEach(() => {
    mockStore = {
      state: {
        coursesRoot: {
          courses: [],
          learnerGroups: [],
        },
        loading: false,
      },
      commit: jest.fn(),
      dispatch: jest.fn(),
    };

    isSuperuserRef = ref(false);
    facilitiesRef = ref([]);
    getFacilitiesMock = jest.fn().mockResolvedValue([]);

    useUser.mockReturnValue({
      isSuperuser: isSuperuserRef,
    });

    useFacilities.mockReturnValue({
      getFacilities: getFacilitiesMock,
      facilities: facilitiesRef,
    });

    store.state = mockStore.state;
    store.commit = mockStore.commit;
    store.dispatch = mockStore.dispatch;

    jest.clearAllMocks();
    useCourses().coursesAreLoading.value = false;
  });

  describe('returned properties', () => {
    it('should return courses computed property', () => {
      const { courses } = useCourses();

      expect(courses).toBeDefined();
      expect(courses.value).toEqual([]);
    });

    it('should return learnerGroups computed property', () => {
      const { learnerGroups } = useCourses();

      expect(learnerGroups).toBeDefined();
      expect(learnerGroups.value).toEqual([]);
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

    it('should return showCoursesRootPage function', () => {
      const { showCoursesRootPage } = useCourses();

      expect(typeof showCoursesRootPage).toBe('function');
    });
  });

  describe('courses computed', () => {
    it('should return courses from store state', () => {
      const mockCourses = [
        { id: 'course-1', title: 'Course 1' },
        { id: 'course-2', title: 'Course 2' },
      ];
      store.state.coursesRoot.courses = mockCourses;

      const { courses } = useCourses();

      expect(courses.value).toEqual(mockCourses);
    });

    it('should return empty array when coursesRoot is undefined', () => {
      store.state.coursesRoot = undefined;

      const { courses } = useCourses();

      expect(courses.value).toEqual([]);
    });
  });

  describe('learnerGroups computed', () => {
    it('should return learnerGroups from store state', () => {
      const mockGroups = [
        { id: 'group-1', name: 'Group 1' },
        { id: 'group-2', name: 'Group 2' },
      ];
      store.state.coursesRoot.learnerGroups = mockGroups;

      const { learnerGroups } = useCourses();

      expect(learnerGroups.value).toEqual(mockGroups);
    });

    it('should return empty array when coursesRoot is undefined', () => {
      store.state.coursesRoot = undefined;

      const { learnerGroups } = useCourses();

      expect(learnerGroups.value).toEqual([]);
    });
  });

  describe('coursesAreLoading flag', () => {
    const classId = 'class-123';

    it('should default to false', () => {
      const { coursesAreLoading } = useCourses();

      expect(coursesAreLoading.value).toBe(false);
    });

    it('should toggle during refreshClassCourses', async () => {
      let resolveCollection;
      CourseSessionResource.fetchCollection.mockReturnValue(
        new Promise(resolve => {
          resolveCollection = resolve;
        })
      );
      ContentNodeResource.fetchModel.mockResolvedValue({ id: 'content-1' });

      const { refreshClassCourses, coursesAreLoading } = useCourses();
      const refreshPromise = refreshClassCourses(mockStore, classId);

      expect(coursesAreLoading.value).toBe(true);

      resolveCollection([{ id: 'session-1', course: 'content-1' }]);
      await refreshPromise;

      expect(coursesAreLoading.value).toBe(false);
    });
  });

  describe('refreshClassCourses', () => {
    const classId = 'class-123';
    const mockCourseSessions = [
      { id: 'session-1', course: 'content-1' },
      { id: 'session-2', course: 'content-2' },
    ];
    const mockContentNodes = [
      { id: 'content-1', title: 'Content 1' },
      { id: 'content-2', title: 'Content 2' },
    ];

    it('should fetch course sessions with correct parameters', async () => {
      CourseSessionResource.fetchCollection.mockResolvedValue([]);
      const { refreshClassCourses } = useCourses();

      await refreshClassCourses(mockStore, classId);

      expect(CourseSessionResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { collection: classId },
        force: true,
      });
    });

    it('should fetch content nodes for each course session', async () => {
      CourseSessionResource.fetchCollection.mockResolvedValue(mockCourseSessions);
      ContentNodeResource.fetchModel
        .mockResolvedValueOnce(mockContentNodes[0])
        .mockResolvedValueOnce(mockContentNodes[1]);

      const { refreshClassCourses } = useCourses();
      await refreshClassCourses(mockStore, classId);

      expect(ContentNodeResource.fetchModel).toHaveBeenCalledWith({ id: 'content-1' });
      expect(ContentNodeResource.fetchModel).toHaveBeenCalledWith({ id: 'content-2' });
    });

    it('should combine course sessions with content nodes', async () => {
      CourseSessionResource.fetchCollection.mockResolvedValue([
        { ...mockCourseSessions[0], active: true },
        mockCourseSessions[1],
      ]);
      ContentNodeResource.fetchModel
        .mockResolvedValueOnce(mockContentNodes[0])
        .mockResolvedValueOnce(mockContentNodes[1]);

      const { refreshClassCourses } = useCourses();
      await refreshClassCourses(mockStore, classId);

      expect(mockStore.commit).toHaveBeenCalledWith('coursesRoot/SET_CLASS_COURSES', [
        {
          id: 'session-1',
          course: 'content-1',
          contentNode: mockContentNodes[0],
          is_active: true,
          active: true,
        },
        {
          id: 'session-2',
          course: 'content-2',
          contentNode: mockContentNodes[1],
          is_active: false,
          active: false,
        },
      ]);
    });

    it('should handle missing content nodes gracefully', async () => {
      CourseSessionResource.fetchCollection.mockResolvedValue([mockCourseSessions[0]]);
      ContentNodeResource.fetchModel.mockRejectedValue(new Error('Content not found'));

      const { refreshClassCourses } = useCourses();
      await refreshClassCourses(mockStore, classId);

      expect(mockStore.commit).toHaveBeenCalledWith('coursesRoot/SET_CLASS_COURSES', [
        {
          id: 'session-1',
          course: 'content-1',
          contentNode: null,
          contentMissing: true,
        },
      ]);
    });

    it('should return empty array when no course sessions exist', async () => {
      CourseSessionResource.fetchCollection.mockResolvedValue([]);

      const { refreshClassCourses } = useCourses();
      const result = await refreshClassCourses(mockStore, classId);

      expect(result).toEqual([]);
      expect(ContentNodeResource.fetchModel).not.toHaveBeenCalled();
    });

    it('should commit courses to store', async () => {
      CourseSessionResource.fetchCollection.mockResolvedValue(mockCourseSessions);
      ContentNodeResource.fetchModel
        .mockResolvedValueOnce(mockContentNodes[0])
        .mockResolvedValueOnce(mockContentNodes[1]);

      const { refreshClassCourses } = useCourses();
      await refreshClassCourses(mockStore, classId);

      expect(mockStore.commit).toHaveBeenCalledWith(
        'coursesRoot/SET_CLASS_COURSES',
        expect.any(Array)
      );
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      CourseSessionResource.fetchCollection.mockRejectedValue(mockError);
      mockStore.dispatch.mockResolvedValue();

      const { refreshClassCourses } = useCourses();
      await refreshClassCourses(mockStore, classId);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'handleApiError',
        { error: mockError },
        { root: true }
      );
    });

    it('should return course sessions on success', async () => {
      const expectedSessions = [
        {
          id: 'session-1',
          course: 'content-1',
          contentNode: mockContentNodes[0],
          is_active: false,
          active: false,
        },
      ];
      CourseSessionResource.fetchCollection.mockResolvedValue([mockCourseSessions[0]]);
      ContentNodeResource.fetchModel.mockResolvedValue(mockContentNodes[0]);

      const { refreshClassCourses } = useCourses();
      const result = await refreshClassCourses(mockStore, classId);

      expect(result).toEqual(expectedSessions);
    });
  });

  describe('showCoursesRootPage', () => {
    const classId = 'class-456';
    const mockLearnerGroups = [{ id: 'group-1', name: 'Group 1' }];
    const mockCourseSessions = [{ id: 'session-1', course: 'content-1' }];

    beforeEach(() => {
      mockStore.dispatch.mockResolvedValue();
      LearnerGroupResource.fetchCollection.mockResolvedValue(mockLearnerGroups);
      CourseSessionResource.fetchCollection.mockResolvedValue(mockCourseSessions);
      ContentNodeResource.fetchModel.mockResolvedValue({ id: 'content-1', title: 'Content 1' });
    });

    it('should initialize class info', async () => {
      const { showCoursesRootPage } = useCourses();
      await showCoursesRootPage(mockStore, classId);

      expect(mockStore.dispatch).toHaveBeenCalledWith('initClassInfo', classId);
    });

    it('should fetch facilities for superuser when facilities are empty', async () => {
      isSuperuserRef.value = true;
      facilitiesRef.value = [];

      const { showCoursesRootPage } = useCourses();
      await showCoursesRootPage(mockStore, classId);

      expect(getFacilitiesMock).toHaveBeenCalled();
    });

    it('should not fetch facilities for non-superuser', async () => {
      isSuperuserRef.value = false;

      const { showCoursesRootPage } = useCourses();
      await showCoursesRootPage(mockStore, classId);

      expect(getFacilitiesMock).not.toHaveBeenCalled();
    });

    it('should not fetch facilities when facilities already exist', async () => {
      isSuperuserRef.value = true;
      facilitiesRef.value = [{ id: 'facility-1' }];

      const { showCoursesRootPage } = useCourses();
      await showCoursesRootPage(mockStore, classId);

      expect(getFacilitiesMock).not.toHaveBeenCalled();
    });

    it('should dispatch notLoading after initialization', async () => {
      const { showCoursesRootPage } = useCourses();
      await showCoursesRootPage(mockStore, classId);

      expect(mockStore.dispatch).toHaveBeenCalledWith('notLoading');
    });

    it('should fetch learner groups', async () => {
      const { showCoursesRootPage } = useCourses();
      await showCoursesRootPage(mockStore, classId);

      expect(LearnerGroupResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { parent: classId },
      });
    });

    it('should refresh class courses', async () => {
      const { showCoursesRootPage } = useCourses();
      await showCoursesRootPage(mockStore, classId);

      expect(CourseSessionResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { collection: classId },
        force: true,
      });
    });

    it('should commit learner groups to store', async () => {
      const { showCoursesRootPage } = useCourses();
      await showCoursesRootPage(mockStore, classId);

      expect(mockStore.commit).toHaveBeenCalledWith(
        'coursesRoot/SET_LEARNER_GROUPS',
        mockLearnerGroups
      );
    });

    it('should set page name to COURSES_ROOT', async () => {
      const { showCoursesRootPage } = useCourses();
      await showCoursesRootPage(mockStore, classId);

      expect(mockStore.commit).toHaveBeenCalledWith('SET_PAGE_NAME', PageNames.COURSES_ROOT);
    });

    it('should handle errors during loading', async () => {
      const mockError = new Error('Load error');
      LearnerGroupResource.fetchCollection.mockRejectedValue(mockError);

      const { showCoursesRootPage } = useCourses();
      await showCoursesRootPage(mockStore, classId);

      expect(mockStore.dispatch).toHaveBeenCalledWith('handleApiError', {
        error: mockError,
        reloadOnReconnect: true,
      });
    });

    it('should handle getFacilities errors gracefully', async () => {
      isSuperuserRef.value = true;
      facilitiesRef.value = [];
      getFacilitiesMock.mockRejectedValue(new Error('Facilities error'));

      const { showCoursesRootPage } = useCourses();

      // Should not throw even if getFacilities fails
      await expect(showCoursesRootPage(mockStore, classId)).resolves.not.toThrow();
    });

    it('should load all requirements in parallel', async () => {
      const { showCoursesRootPage } = useCourses();
      await showCoursesRootPage(mockStore, classId);

      // Both should be called (parallel loading)
      expect(LearnerGroupResource.fetchCollection).toHaveBeenCalled();
      expect(CourseSessionResource.fetchCollection).toHaveBeenCalled();
    });
  });
});
