import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { dragSortStrings } from 'kolibri-common/components/sortable/dragSortStrings';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { answerGuideStrings } from '../../AnswerGuide.vue';

const smokeFixtures = [
  ['q15-order-example-2', 3],
  ['q15-order-example-3', 3],
  ['q15-order-example-4', 9],
];

const { moveItemLeftLabel$ } = dragSortStrings;

describe('Smoke', () => {
  it.each(smokeFixtures)('%s renders %d ordered choices', (id, choiceCount) => {
    renderAssessmentItem(items[id].xml);
    expect(screen.getAllByRole('listitem')).toHaveLength(choiceCount);
  });
});

describe('Order guide', () => {
  it('shows the vertical order prompt for a vertical layout', () => {
    renderAssessmentItem(items['q15-order-example-3'].xml);
    expect(
      screen.getByText(answerGuideStrings.order$(), {
        selector: 'p.qti-selection-instructions',
      }),
    ).toBeVisible();
  });

  it('shows the keyboard-specific order prompt for a horizontal layout', () => {
    renderAssessmentItem(items['q15-order-example-2'].xml);
    expect(
      screen.getByText(answerGuideStrings.orderKeyboard$(), {
        selector: 'p.qti-selection-instructions',
      }),
    ).toBeVisible();
  });
});

describe('Controls', () => {
  it('renders move buttons in interactive horizontal mode', () => {
    renderAssessmentItem(items['q15-order-example-2'].xml);
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('hides move buttons in review mode', () => {
    const { setInteractive } = renderAssessmentItem(items['q15-order-example-2'].xml);
    setInteractive(false);
    return waitFor(() => {
      expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
  });
});

describe('Reordering', () => {
  it('moves an item up when its up button is clicked', async () => {
    renderAssessmentItem(items['q15-order-example-2'].xml);

    const rowsBefore = screen.getAllByRole('listitem');
    expect(rowsBefore.map(row => row.textContent.trim())).toEqual([
      'Rubens Barrichello',
      'Jenson Button',
      'Michael Schumacher',
    ]);

    await fireEvent.click(
      within(rowsBefore[1]).getByRole('button', {
        name: moveItemLeftLabel$({ item: 'Jenson Button' }),
      }),
    );

    await waitFor(() => {
      expect(screen.getAllByRole('listitem').map(row => row.textContent.trim())).toEqual([
        'Jenson Button',
        'Rubens Barrichello',
        'Michael Schumacher',
      ]);
    });
  });

  it('restores order from injected answerState on mount', () => {
    renderAssessmentItem(items['q15-order-example-2'].xml, {
      answerState: {
        RESPONSE: ['DriverC', 'DriverA', 'DriverB'],
      },
    });

    expect(screen.getAllByRole('listitem').map(row => row.textContent.trim())).toEqual([
      'Michael Schumacher',
      'Rubens Barrichello',
      'Jenson Button',
    ]);
  });

  it('renders a shuffled initial order when shuffle is enabled', () => {
    renderAssessmentItem(items['q15-order-example-4'].xml, {
      candidateIdentifier: 'shuffle-seed-001',
    });

    expect(screen.getAllByRole('listitem').map(row => row.textContent)).not.toEqual([
      'the',
      'quick',
      'brown',
      'fox',
      'jumps',
      'over',
      'the',
      'lazy',
      'dog',
    ]);
  });
});

describe('Labels', () => {
  const getList = index => screen.getAllByRole('list')[index];
  // RESPONSE1: labels-none, RESPONSE2: decimal, RESPONSE3: lower-alpha, RESPONSE4: upper-alpha
  beforeEach(() => {
    renderAssessmentItem(items['q15-order-interaction-sv-1'].xml);
  });

  it('renders no label for qti-labels-none', () => {
    within(getList(0))
      .getAllByRole('listitem')
      .forEach(row => {
        expect(row.querySelector('.qti-order-label')).toBeNull();
      });
  });

  it('renders decimal labels', () => {
    const labels = within(getList(1))
      .getAllByRole('listitem')
      .map(row => row.querySelector('.qti-order-label').textContent);
    expect(labels).toEqual(['1', '2', '3']);
  });

  it('renders lower-alpha labels', () => {
    const labels = within(getList(2))
      .getAllByRole('listitem')
      .map(row => row.querySelector('.qti-order-label').textContent);
    expect(labels).toEqual(['a', 'b', 'c']);
  });

  it('renders upper-alpha labels', () => {
    const labels = within(getList(3))
      .getAllByRole('listitem')
      .map(row => row.querySelector('.qti-order-label').textContent);
    expect(labels).toEqual(['A', 'B', 'C']);
  });

  it('renders suffix characters when a qti-labels-suffix-* class is present', () => {
    const decimalPeriod = within(getList(5))
      .getAllByRole('listitem')
      .map(row => row.querySelector('.qti-order-label').textContent);

    expect(decimalPeriod).toEqual(['1.', '2.', '3.']);
  });
});
