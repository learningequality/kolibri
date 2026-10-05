import VueRouter from 'vue-router';
import routes from '../lessonsRoutes';
import { PageNames } from '../constants';
import { RouteSegments } from '../utils';

const { CLASS, LESSON } = RouteSegments;

jest.mock('../../store', () => ({
  state: {},
  dispatch: jest.fn(),
  commit: jest.fn(),
}));
jest.mock('kolibri-common/composables/usePageLoading', () => ({
  pageLoading: { value: false },
}));
jest.mock('../../composables/useLessons', () => ({
  useLessons: jest.fn(() => ({ showLessonsRootPage: jest.fn() })),
}));
jest.mock('../../modules/lessonResources/handlers', () => ({
  showLessonResourceContentPreview: jest.fn(),
}));
jest.mock('../../modules/resourceDetail/handlers', () => ({
  generateResourceHandler: jest.fn(),
}));
jest.mock('../../modules/exerciseDetail/handlers', () => ({
  exerciseRootRedirectHandler: jest.fn(),
  generateExerciseDetailHandler: jest.fn(),
}));
jest.mock('../../modules/questionList/handlers', () => ({
  generateQuestionListHandler: jest.fn(),
}));
jest.mock('../../modules/questionDetail/handlers', () => ({
  generateQuestionDetailHandler: jest.fn(),
  questionRootRedirectHandler: jest.fn(),
}));

const classId = 'a'.repeat(32);
const router = new VueRouter({ routes });

describe('lessonsRoutes direct-load resolution', () => {
  it('resolves /edit directly to LESSON_EDIT_DETAILS, not the summary', () => {
    const { route } = router.resolve(`/${classId}/lessons/lesson-1/edit`);
    expect(route.name).toBe(PageNames.LESSON_EDIT_DETAILS);
  });

  it('resolves a tab URL to LESSON_SUMMARY with the tabId param', () => {
    const { route } = router.resolve(`/${classId}/lessons/lesson-1/tabLearners`);
    expect(route.name).toBe(PageNames.LESSON_SUMMARY);
    expect(route.params.tabId).toBe('tabLearners');
  });

  it('resolves the lesson root to LESSON_SUMMARY without a tabId', () => {
    const { route } = router.resolve(`/${classId}/lessons/lesson-1`);
    expect(route.name).toBe(PageNames.LESSON_SUMMARY);
    expect(route.params.tabId).toBeUndefined();
  });
});
