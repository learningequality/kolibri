import { render, screen, fireEvent, within } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import LearningObjectiveSidePanel from '../LearningObjectiveSidePanel.vue';

const { closeAction$ } = coreStrings;

const OBJECTIVE = {
  id: 'lo-1',
  text: 'Capital letters',
  numQuestions: 4,
  lowCount: 1,
  midCount: 0,
  highCount: 1,
};

const REPORT_DATA = {
  unit_title: 'Unit 1: Letters',
  learning_objectives: [
    { id: 'lo-1', text: 'Capital letters', num_questions: 4 },
    { id: 'lo-2', text: 'Punctuation', num_questions: 2 },
  ],
  learners: [
    { id: 'user-1', username: 'alice', name: 'Alice' },
    { id: 'user-2', username: 'bob', name: 'Bob' },
    { id: 'user-3', username: 'carol', name: 'Carol' },
  ],
  pre_test: {
    status: 'closed',
    scores: {
      'user-1': { 'lo-1': 4, 'lo-2': 1 },
      'user-2': { 'lo-1': 1, 'lo-2': 2 },
    },
  },
  post_test: {
    status: 'not_activated',
    scores: {},
  },
};

function renderPanel(propsOverrides = {}) {
  return render(LearningObjectiveSidePanel, {
    props: {
      objective: OBJECTIVE,
      reportData: REPORT_DATA,
      ...propsOverrides,
    },
  });
}

describe('LearningObjectiveSidePanel', () => {
  it('renders LO title and unit name in header', () => {
    renderPanel();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Capital letters');
    expect(screen.getByText(REPORT_DATA.unit_title)).toBeInTheDocument();
  });

  it('shows pre-test average in the summary section', () => {
    renderPanel();
    // pre_test scores for lo-1: user-1=4, user-2=1, average=2.5 rounds to 3
    const preAvg = screen.getByTestId('pre-test-average');
    expect(preAvg).toHaveTextContent('3');
    expect(preAvg).toHaveTextContent('4');
  });

  it('does not show post-test average when post-test is not activated', () => {
    renderPanel();
    expect(screen.queryByTestId('post-test-average')).not.toBeInTheDocument();
  });

  it('shows post-test average when post-test has data', () => {
    const reportWithPost = {
      ...REPORT_DATA,
      post_test: {
        status: 'closed',
        scores: {
          'user-1': { 'lo-1': 3, 'lo-2': 2 },
          'user-2': { 'lo-1': 4, 'lo-2': 1 },
        },
      },
    };
    renderPanel({ reportData: reportWithPost });
    // post_test scores for lo-1: user-1=3, user-2=4, average=3.5 rounds to 4
    const postAvg = screen.getByTestId('post-test-average');
    expect(postAvg).toHaveTextContent('4');
  });

  it('shows warning banner when learners are struggling', () => {
    renderPanel();
    // user-2 scored 1/4=25% (low); user-3 has no scores and is excluded
    const banner = screen.getByTestId('warning-banner');
    expect(banner).toBeInTheDocument();
  });

  it('hides warning banner when no learners are struggling', () => {
    const allHighObjective = {
      ...OBJECTIVE,
      lowCount: 0,
    };
    const reportAllHigh = {
      ...REPORT_DATA,
      pre_test: {
        status: 'closed',
        scores: {
          'user-1': { 'lo-1': 4 },
          'user-2': { 'lo-1': 4 },
          'user-3': { 'lo-1': 4 },
        },
      },
    };
    renderPanel({ objective: allHighObjective, reportData: reportAllHigh });
    expect(screen.queryByTestId('warning-banner')).not.toBeInTheDocument();
  });

  it('renders only test-takers as learner rows sorted by score ascending', () => {
    renderPanel();
    // Only user-1 (score 4) and user-2 (score 1) have scores; user-3 is excluded
    const rows = screen.getAllByTestId('learner-row');
    expect(rows).toHaveLength(2);

    // Sorted ascending: Bob(1), Alice(4)
    const firstRow = within(rows[0]);
    expect(firstRow.getByTestId('learner-name')).toHaveTextContent('Bob');
    expect(firstRow.getByTestId('learner-score')).toHaveTextContent('1');

    const secondRow = within(rows[1]);
    expect(secondRow.getByTestId('learner-name')).toHaveTextContent('Alice');
    expect(secondRow.getByTestId('learner-score')).toHaveTextContent('4');
  });

  it('emits closePanel when close button is clicked', async () => {
    const { emitted } = renderPanel();
    await fireEvent.click(screen.getByRole('button', { name: closeAction$() }));
    expect(emitted().closePanel).toBeTruthy();
  });

  it('shows zero scores for learners who took the test but scored nothing on this LO', () => {
    const noScoresReport = {
      ...REPORT_DATA,
      pre_test: {
        status: 'closed',
        scores: {
          'user-1': {},
          'user-2': {},
        },
      },
    };
    renderPanel({ reportData: noScoresReport });
    const rows = screen.getAllByTestId('learner-row');
    expect(rows).toHaveLength(2);
    rows.forEach(row => {
      expect(within(row).getByTestId('learner-score')).toHaveTextContent('0');
    });
  });

  it('uses post-test scores when post-test is activated', () => {
    const reportWithPost = {
      ...REPORT_DATA,
      post_test: {
        status: 'closed',
        scores: {
          'user-1': { 'lo-1': 2 },
          'user-2': { 'lo-1': 3 },
          'user-3': { 'lo-1': 4 },
        },
      },
    };
    renderPanel({ reportData: reportWithPost });
    const rows = screen.getAllByTestId('learner-row');
    expect(rows).toHaveLength(3);

    // Sorted ascending by score
    expect(within(rows[0]).getByTestId('learner-score')).toHaveTextContent('2');
    expect(within(rows[1]).getByTestId('learner-score')).toHaveTextContent('3');
    expect(within(rows[2]).getByTestId('learner-score')).toHaveTextContent('4');
  });
});
