/* global flushPromises */
import router from 'kolibri/router';
import AttemptLogResource from 'kolibri-common/apiResources/AttemptLogResource';
import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import LearnerGroupResource from 'kolibri-common/apiResources/LearnerGroupResource';
import LessonResource from 'kolibri-common/apiResources/LessonResource';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import ClassSummaryResource from '../apiResources/classSummary';
import { PageNames } from '../constants';
import groupsRoutes from '../routes/groupsRoutes';
import lessonsRoutes from '../routes/lessonsRoutes';
import store from '../store';
import app from '../app';

jest.mock('kolibri/heartbeat', () => ({
  startPolling: jest.fn(() => Promise.resolve()),
}));
jest.mock('kolibri-common/apiResources/ContentNodeResource', () => ({
  retrieve: jest.fn(),
}));
jest.mock('kolibri-common/apiResources/AttemptLogResource', () => ({
  list: jest.fn(),
}));
jest.mock('kolibri-common/apiResources/ClassroomResource', () => ({
  list: jest.fn(),
}));
jest.mock('kolibri-common/apiResources/LearnerGroupResource', () => ({
  list: jest.fn(),
}));
jest.mock('kolibri-common/apiResources/LessonResource', () => ({
  retrieve: jest.fn(),
  fetchLessonsSizes: jest.fn(),
}));
jest.mock('../apiResources/classSummary', () => ({
  retrieve: jest.fn(),
}));

const classId = 'a'.repeat(32);
const lessonId = 'b'.repeat(32);
const exerciseId = 'c'.repeat(32);
const learnerId = 'd'.repeat(32);
const otherLearnerId = 'e'.repeat(32);
const groupId = 'f'.repeat(32);
const otherLessonId = '1'.repeat(32);

const classSummary = {
  id: classId,
  facility_id: 'facility-1',
  exams: [],
  exam_learner_status: [],
  content_learner_status: [],
  content: [{ content_id: exerciseId, node_id: 'node-1', kind: 'exercise' }],
  coaches: [],
  learners: [],
  groups: [],
  adhoclearners: [],
  lessons: [],
};

const reportParams = {
  classId,
  lessonId,
  exerciseId,
  learnerId,
  tryIndex: 0,
  questionId: 0,
  interactionIndex: 0,
};

describe('coach app navigation', () => {
  beforeAll(async () => {
    ClassSummaryResource.retrieve.mockResolvedValue(classSummary);
    jest.spyOn(app, 'startRootVue').mockResolvedValue();
    await app.ready();
    router.initRoutes([...lessonsRoutes, ...groupsRoutes]);
  });

  describe('coach lesson exercise report navigation', () => {
    describe.each([
      [PageNames.LESSON_EXERCISE_LEARNER_REPORT, PageNames.LESSON_EXERCISE_LEARNER_PAGE_ROOT],
      [PageNames.LESSON_LEARNER_EXERCISE_REPORT, PageNames.LESSON_LEARNER_EXERCISE_PAGE_ROOT],
    ])('%s', (name, rootName) => {
      beforeEach(async () => {
        store.commit('classSummary/SET_STATE', classSummary);
        ClassSummaryResource.retrieve.mockResolvedValue(classSummary);
        ContentNodeResource.retrieve.mockResolvedValue({ id: 'node-1' });
        await router.push({ name, params: reportParams });
        await flushPromises();
        ClassSummaryResource.retrieve.mockReturnValue(new Promise(() => {}));
        ContentNodeResource.retrieve.mockReturnValue(new Promise(() => {}));
        jest.clearAllMocks();
      });

      afterEach(async () => {
        await router.push('/');
      });

      it('shows the chosen try without loading the page', async () => {
        router.push({
          name,
          params: { ...reportParams, tryIndex: 1, questionId: 2, interactionIndex: 3 },
        });
        await flushPromises();
        expect(store.state.exerciseDetail).toMatchObject({
          tryIndex: 1,
          questionId: 2,
          interactionIndex: 3,
        });
        expect(pageLoading.value).toBe(false);
        expect(ClassSummaryResource.retrieve).not.toHaveBeenCalled();
        expect(ContentNodeResource.retrieve).not.toHaveBeenCalled();
      });

      it('loads the page when switching learners', async () => {
        router.push({ name, params: { ...reportParams, learnerId: otherLearnerId } });
        await flushPromises();
        expect(pageLoading.value).toBe(true);
      });

      it('loads the report when entering from the question report', async () => {
        ClassSummaryResource.retrieve.mockResolvedValue(classSummary);
        await router.push({
          name: PageNames.LESSON_EXERCISE_QUESTION_REPORT,
          params: { classId, lessonId, exerciseId, learnerId, questionId: 0, interactionIndex: 0 },
        });
        await flushPromises();
        ContentNodeResource.retrieve.mockResolvedValue({ id: 'node-2' });
        router.push({ name, params: reportParams });
        await flushPromises();
        expect(store.state.exerciseDetail.exercise).toEqual({ id: 'node-2' });
      });

      it('shows the first try when opening the report root from another try', async () => {
        await router.push({ name, params: { ...reportParams, tryIndex: 1 } });
        ClassSummaryResource.retrieve.mockResolvedValue(classSummary);
        ContentNodeResource.retrieve.mockResolvedValue({ id: 'node-1' });
        router
          .push({ name: rootName, params: { classId, lessonId, exerciseId, learnerId } })
          .catch(() => {});
        await flushPromises();
        expect(store.state.exerciseDetail.tryIndex).toBe(0);
        expect(pageLoading.value).toBe(false);
      });
    });
  });

  describe('coach same-page navigation while class info refreshes', () => {
    beforeEach(() => {
      store.commit('classSummary/SET_STATE', classSummary);
      ClassSummaryResource.retrieve.mockResolvedValue(classSummary);
      ContentNodeResource.retrieve.mockResolvedValue({
        id: 'node-1',
        assessmentmetadata: { assessment_item_ids: [] },
      });
      AttemptLogResource.list.mockResolvedValue([]);
      ClassroomResource.list.mockResolvedValue([]);
      LearnerGroupResource.list.mockResolvedValue([]);
      LessonResource.retrieve.mockResolvedValue({ id: lessonId, resources: [] });
      LessonResource.fetchLessonsSizes.mockResolvedValue([{}]);
    });

    afterEach(async () => {
      await router.push('/');
    });

    async function loadThenNavigate(from, to) {
      await router.push(from);
      await flushPromises();
      ClassSummaryResource.retrieve.mockReturnValue(new Promise(() => {}));
      router.push(to);
      await flushPromises();
    }

    it('keeps the question report shown when switching learners', async () => {
      const params = { classId, lessonId, exerciseId, questionId: 0, interactionIndex: 0 };
      await loadThenNavigate(
        { name: PageNames.LESSON_EXERCISE_QUESTION_REPORT, params: { ...params, learnerId } },
        {
          name: PageNames.LESSON_EXERCISE_QUESTION_REPORT,
          params: { ...params, learnerId: otherLearnerId },
        },
      );
      expect(pageLoading.value).toBe(false);
    });

    it('keeps a group lesson shown when switching tabs', async () => {
      const params = { classId, groupId, lessonId };
      await loadThenNavigate(
        { name: PageNames.GROUP_LESSON_SUMMARY, params: { ...params, tabId: 'learners' } },
        { name: PageNames.GROUP_LESSON_SUMMARY, params: { ...params, tabId: 'resources' } },
      );
      expect(pageLoading.value).toBe(false);
    });

    it('loads the group lesson summary for another lesson', async () => {
      await loadThenNavigate(
        { name: PageNames.GROUP_LESSON_SUMMARY, params: { classId, groupId, lessonId } },
        {
          name: PageNames.GROUP_LESSON_SUMMARY,
          params: { classId, groupId, lessonId: otherLessonId },
        },
      );
      expect(pageLoading.value).toBe(true);
    });
  });
});
