import { fireEvent, render, screen } from '@testing-library/vue';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import AnswerHistory from '../AnswerHistory.vue';

const { questionNumberLabel$ } = coreStrings;
const questionName = questionNumber => questionNumberLabel$({ questionNumber });

const SECTIONS = [
  {
    section_title: 'Section 1',
    startQuestionNumber: 0,
    endQuestionNumber: 1,
    questions: [{ item: 'item-1' }, { item: 'item-2' }],
  },
];

function renderAnswerHistory(questionItem) {
  return render(AnswerHistory, {
    props: {
      sections: SECTIONS,
      currentSectionIndex: 0,
      pastattempts: [],
      questionNumber: 0,
      questionItem,
      currentQuestionAnswered: false,
      wrapperComponentRefs: {},
    },
  });
}

describe('AnswerHistory', () => {
  it('keeps the current question button enabled and marks it current', async () => {
    renderAnswerHistory('item-1');
    const current = await screen.findByRole('button', { name: questionName(1) });
    expect(current).toBeEnabled();
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: questionName(2) })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('does not navigate when the current question is activated', async () => {
    const { emitted } = renderAnswerHistory('item-1');
    await fireEvent.click(await screen.findByRole('button', { name: questionName(1) }));
    expect(emitted().goToQuestion).toBeUndefined();
  });

  it('navigates when another question is activated', async () => {
    const { emitted } = renderAnswerHistory('item-1');
    await fireEvent.click(await screen.findByRole('button', { name: questionName(2) }));
    expect(emitted().goToQuestion).toEqual([[1]]);
  });
});
