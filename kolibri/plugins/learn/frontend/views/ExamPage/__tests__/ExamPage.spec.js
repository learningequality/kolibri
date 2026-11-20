import { render, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import client from 'kolibri/client';
import store from '../../../store';
import { ClassesPageNames, PageNames } from '../../../constants';
import ExamPage from '../index.vue';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/utils/appError');

const CLASS_ID = 'class-id';
const EXAM_ID = 'exam-id';
const QUESTION = { item: 'exercise-id:question-id', exercise_id: 'exercise-id', question_id: 'q' };

function makeRouter() {
  return new VueRouter({
    routes: [
      { name: PageNames.HOME, path: '/' },
      {
        name: ClassesPageNames.EXAM_VIEWER,
        path: '/classes/:classId/exam/:examId/:questionNumber',
      },
      {
        name: ClassesPageNames.EXAM_REPORT_VIEWER,
        path: '/classes/:classId/examReport/:examId/:tryIndex/:questionNumber/:questionInteraction',
      },
    ],
  });
}

describe('ExamPage', () => {
  beforeEach(() => {
    store.commit('examViewer/SET_STATE', {
      exam: {
        id: EXAM_ID,
        title: 'Quiz',
        question_count: 1,
        question_sources: [{ section_id: 's', section_title: '', questions: [QUESTION] }],
      },
      questions: [QUESTION],
      contentNodeMap: { 'exercise-id': { id: 'exercise-id', kind: 'exercise' } },
      questionNumber: 0,
    });
  });

  afterEach(() => {
    client.__reset();
    store.commit('examViewer/RESET_STATE');
  });

  it('opens the quiz report when the coach has ended the quiz', async () => {
    client.mockRejectedValue({ response: { status: 403 } });
    const router = makeRouter();
    await router.push({
      name: ClassesPageNames.EXAM_VIEWER,
      params: { classId: CLASS_ID, examId: EXAM_ID, questionNumber: 0 },
    });

    render(ExamPage, { store, routes: router });

    await waitFor(() =>
      expect(router.currentRoute.path).toBe(`/classes/${CLASS_ID}/examReport/${EXAM_ID}/0/0/0`),
    );
  });
});
