import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { dragSortStrings } from 'kolibri-common/components/draggable/dragSortStrings';
import items from '../../__fixtures__/items';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { answerGuideStrings } from '../../AnswerGuide.vue';

// MathML fixtures take SafeHTML's MathJax path in jsdom, which has no layout;
// its font URL needs plugin URL data that tests lack.
jest.mock('kolibri/urls');

const smokeFixtures = [
  ['q15-order-example-2', 3],
  ['q15-order-example-3', 3],
  ['q15-order-example-4', 9],
];

const { moveItemDownLabel$, moveItemLeftLabel$, moveItemUpLabel$ } = dragSortStrings;

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

  it('shows the horizontal order prompt for a horizontal layout', () => {
    renderAssessmentItem(items['q15-order-example-2'].xml);
    expect(
      screen.getByText(answerGuideStrings.orderHorizontal$(), {
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
        responses: { RESPONSE: ['DriverC', 'DriverA', 'DriverB'] },
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

describe('MathML choices', () => {
  const ROOT_ALTTEXT = 'square root of 16';
  const xml = `<qti-assessment-item
      xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
      identifier="order-math" title="Order math" adaptive="false" time-dependent="false">
      <qti-response-declaration identifier="RESPONSE" cardinality="ordered" base-type="identifier"/>
      <qti-item-body>
        <qti-order-interaction response-identifier="RESPONSE">
          <qti-simple-choice identifier="A">Four</qti-simple-choice>
          <qti-simple-choice identifier="B"><math xmlns="http://www.w3.org/1998/Math/MathML" alttext="${ROOT_ALTTEXT}"><msqrt><mn>16</mn></msqrt></math></qti-simple-choice>
        </qti-order-interaction>
      </qti-item-body>
    </qti-assessment-item>`;

  it("names a choice's move button by its math alttext", () => {
    renderAssessmentItem(xml);
    expect(
      screen.getByRole('button', { name: moveItemUpLabel$({ item: ROOT_ALTTEXT }) }),
    ).toBeInTheDocument();
  });

  it('names a choice by its aria-hidden text when that is all it has', () => {
    renderAssessmentItem(
      xml.replace(
        '<qti-simple-choice identifier="A">Four</qti-simple-choice>',
        '<qti-simple-choice identifier="A"><span aria-hidden="true">Only</span></qti-simple-choice>',
      ),
    );
    expect(
      screen.getByRole('button', { name: moveItemDownLabel$({ item: 'Only' }) }),
    ).toBeInTheDocument();
  });
});
