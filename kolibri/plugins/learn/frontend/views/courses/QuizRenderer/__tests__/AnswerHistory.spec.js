import { fireEvent, render, screen } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
import AnswerHistory from '../AnswerHistory.vue';
import PrePostTestAnswerHistory from '../../PrePostTestRenderer/AnswerHistory.vue';
import StandaloneAnswerHistory from '../../../QuizRenderer/AnswerHistory.vue';

describe.each([
  ['course quiz', AnswerHistory, { overflowableParentId: 'list' }],
  ['pre/post test', PrePostTestAnswerHistory, { overflowableParentId: 'list' }],
  ['standalone quiz', StandaloneAnswerHistory, { wrapperComponentRefs: {} }],
])('%s AnswerHistory', (_label, component, scrollProps) => {
  const { question$ } = createTranslator(component.name, component.$trs);

  function renderAnswerHistory() {
    return render(component, {
      props: {
        questions: ['item-1', 'item-2', 'item-3'],
        questionNumber: 1,
        currentQuestionAnswered: true,
        ...scrollProps,
      },
    });
  }

  it('does not navigate when the current question is activated', async () => {
    const { emitted } = renderAnswerHistory();
    await fireEvent.click(screen.getByRole('button', { current: 'step' }));
    expect(emitted().goToQuestion).toBeUndefined();
  });

  it('navigates when another question is activated', async () => {
    const { emitted } = renderAnswerHistory();
    await fireEvent.click(screen.getByRole('button', { name: question$({ num: 3 }) }));
    expect(emitted().goToQuestion).toEqual([[2]]);
  });
});
