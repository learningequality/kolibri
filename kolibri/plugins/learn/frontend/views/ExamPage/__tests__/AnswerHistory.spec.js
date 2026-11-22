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
  {
    section_title: 'Section 2',
    startQuestionNumber: 2,
    endQuestionNumber: 2,
    questions: [{ item: 'item-1' }],
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

  it('moves current state between sections that repeat an item', async () => {
    const { emitted, updateProps } = renderAnswerHistory('item-1');
    const section = screen.getByRole('heading', { name: SECTIONS[1].section_title });
    await fireEvent.click(section.firstElementChild);
    const first = screen.getByRole('button', { name: questionName(1) });
    const third = screen.getByRole('button', { name: questionName(3) });
    expect(first).toHaveAttribute('aria-current', 'step');
    expect(third).not.toHaveAttribute('aria-current');
    await fireEvent.click(third);
    expect(emitted().goToQuestion).toEqual([[2]]);

    await updateProps({ questionNumber: 2, currentSectionIndex: 1 });
    expect(first).not.toHaveAttribute('aria-current');
    expect(third).toHaveAttribute('aria-current', 'step');
    await fireEvent.click(third);
    expect(emitted().goToQuestion).toEqual([[2]]);
  });
});
