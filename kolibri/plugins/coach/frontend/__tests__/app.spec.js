/* global flushPromises */
import router from 'kolibri/router';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { error } from 'kolibri/utils/appError';
import ClassSummaryResource from '../apiResources/classSummary';
import { PageNames } from '../constants';
import lessonsRoutes from '../routes/lessonsRoutes';
import store from '../store';
import app from '../app';

jest.mock('kolibri/heartbeat', () => ({
  startPolling: jest.fn(() => Promise.resolve()),
}));
jest.mock('kolibri-common/apiResources/ContentNodeResource', () => ({
  retrieve: jest.fn(),
}));
jest.mock('../apiResources/classSummary', () => ({
  retrieve: jest.fn(),
}));

const classId = 'a'.repeat(32);
const lessonId = 'b'.repeat(32);
const exerciseId = 'c'.repeat(32);
const learnerId = 'd'.repeat(32);
const otherLearnerId = 'e'.repeat(32);
const thirdLearnerId = 'f'.repeat(32);

const classSummary = {
  id: classId,
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

describe('coach lesson exercise report navigation', () => {
  beforeAll(async () => {
    ClassSummaryResource.retrieve.mockResolvedValue(classSummary);
    jest.spyOn(app, 'startRootVue').mockResolvedValue();
    await app.ready();
    router.initRoutes(lessonsRoutes);
  });

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
    });

    it('loads the page when switching learners', async () => {
      router.push({ name, params: { ...reportParams, learnerId: otherLearnerId } });
      await flushPromises();
      expect(pageLoading.value).toBe(true);
    });

    it('shows an error when the exercise is not in the class', async () => {
      ClassSummaryResource.retrieve.mockResolvedValue(classSummary);
      router.push({
        name,
        params: { ...reportParams, learnerId: otherLearnerId, exerciseId: 'missing' },
      });
      await flushPromises();
      expect(error.value).not.toBeNull();
      expect(pageLoading.value).toBe(false);
    });

    it('keeps the class summary error when the class fails to load', async () => {
      ClassSummaryResource.retrieve.mockRejectedValue({ response: { status: 404 } });
      router.push({
        name,
        params: { ...reportParams, classId: '1'.repeat(32), exerciseId: 'missing' },
      });
      await flushPromises();
      expect(error.value).toMatch('404');
      expect(pageLoading.value).toBe(false);
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

    async function switchLearnerTwice() {
      ContentNodeResource.retrieve.mockResolvedValue({ id: 'node-1' });
      const loads = [];
      for (const id of [otherLearnerId, thirdLearnerId]) {
        ClassSummaryResource.retrieve.mockReturnValueOnce(
          new Promise(resolve => {
            loads.push(async () => {
              resolve(classSummary);
              await flushPromises();
            });
          }),
        );
        router.push({ name, params: { ...reportParams, learnerId: id } });
        await flushPromises();
      }
      return loads;
    }

    it('keeps loading when a superseded learner loads first', async () => {
      const [superseded, latest] = await switchLearnerTwice();
      await superseded();
      expect(store.state.exerciseDetail.learnerId).not.toBe(otherLearnerId);
      expect(pageLoading.value).toBe(true);
      await latest();
      expect(store.state.exerciseDetail.learnerId).toBe(thirdLearnerId);
      expect(pageLoading.value).toBe(false);
    });

    it('keeps the latest learner when a superseded learner loads last', async () => {
      const [superseded, latest] = await switchLearnerTwice();
      await latest();
      await superseded();
      expect(store.state.exerciseDetail.learnerId).toBe(thirdLearnerId);
      expect(pageLoading.value).toBe(false);
    });

    it('shows the latest try when a try is chosen while a learner loads', async () => {
      let resolveExercise;
      ContentNodeResource.retrieve.mockReturnValue(
        new Promise(resolve => {
          resolveExercise = resolve;
        }),
      );
      ClassSummaryResource.retrieve.mockResolvedValue(classSummary);
      router.push({ name, params: { ...reportParams, learnerId: otherLearnerId } });
      await flushPromises();
      router.push({ name, params: { ...reportParams, learnerId: otherLearnerId, tryIndex: 1 } });
      await flushPromises();
      expect(pageLoading.value).toBe(true);
      resolveExercise({ id: 'node-1' });
      await flushPromises();
      expect(store.state.exerciseDetail).toMatchObject({
        learnerId: otherLearnerId,
        tryIndex: 1,
      });
      expect(pageLoading.value).toBe(false);
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
