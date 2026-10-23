import { fireEvent, render, screen } from '@testing-library/vue';
import QuizRenderer from '../index.vue';

const content = {
  id: 'quiz-id',
  content_id: 'quiz-content-id',
  title: 'Quiz',
  kind: 'exercise',
  options: {},
  assessmentmetadata: { assessment_item_ids: ['item-1', 'item-2'] },
};

const ANSWER = 'Answer';
const NEXT = QuizRenderer.$trs.nextQuestion.message;

// ContentViewer is globally registered, so a stub is the only seam for its answer.
const ContentViewerStub = {
  name: 'ContentViewer',
  methods: {
    checkAnswer() {
      return { correct: 0.5, answerState: { response: 'Ana' } };
    },
  },
  template: `<button @click="$emit('interaction')">${ANSWER}</button>`,
};

describe('QuizRenderer', () => {
  it.each([
    [true, 1],
    [false, 0.5],
  ])('saves an answer with isSurvey %s as correct %s', async (isSurvey, correct) => {
    const updateContentSession = jest.fn().mockResolvedValue();
    render(QuizRenderer, {
      props: { content, userId: 'learner-id', isSurvey, updateContentSession },
      // eslint-disable-next-line kolibri/tests-no-stubs
      stubs: { ContentViewer: ContentViewerStub },
    });
    await fireEvent.click(screen.getByRole('button', { name: ANSWER }));
    await fireEvent.click(screen.getByRole('button', { name: NEXT }));
    expect(updateContentSession).toHaveBeenCalledWith(
      expect.objectContaining({ interaction: expect.objectContaining({ correct }) }),
    );
  });
});
