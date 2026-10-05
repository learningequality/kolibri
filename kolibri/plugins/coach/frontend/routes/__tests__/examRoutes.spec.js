import VueRouter from 'vue-router';
import examRoutes from '../examRoutes';
import { PageNames } from '../constants';
import { RouteSegments } from '../utils';

const { CLASS, QUIZ } = RouteSegments;

jest.mock('../../store', () => ({
  state: {},
  dispatch: jest.fn(),
  commit: jest.fn(),
}));
jest.mock('kolibri-common/composables/usePageLoading', () => ({
  pageLoading: { value: false },
}));
jest.mock('../../modules/examReportDetail/handlers', () => ({
  generateExamReportDetailHandler: jest.fn(),
}));

const classId = 'a'.repeat(32);
const router = new VueRouter({ routes: examRoutes });

describe('examRoutes direct-load resolution', () => {
  it('resolves /preview directly to QUIZ_PREVIEW, not the summary', () => {
    const { route } = router.resolve(`/${classId}/quizzes/quiz-1/preview`);
    expect(route.name).toBe(PageNames.QUIZ_PREVIEW);
  });

  it('resolves a tab URL to EXAM_SUMMARY with the tabId param', () => {
    const { route } = router.resolve(`/${classId}/quizzes/quiz-1/tabLearners`);
    expect(route.name).toBe(PageNames.EXAM_SUMMARY);
    expect(route.params.tabId).toBe('tabLearners');
  });

  it('resolves the quiz root to EXAM_SUMMARY without a tabId', () => {
    const { route } = router.resolve(`/${classId}/quizzes/quiz-1`);
    expect(route.name).toBe(PageNames.EXAM_SUMMARY);
    expect(route.params.tabId).toBeUndefined();
  });
});
