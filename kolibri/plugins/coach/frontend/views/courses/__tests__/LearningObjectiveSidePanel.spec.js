import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import LearningObjectiveSidePanel from '../LearningObjectiveSidePanel.vue';

const STUBS = {
  SidePanelModal: {
    name: 'SidePanelModal',
    template: '<div data-testid="side-panel-modal"><slot /></div>',
  },
  SidePanelLayout: {
    name: 'SidePanelLayout',
    props: ['title', 'subtitle', 'closePanel', 'contentContainerStyleOverrides'],
    template: `
      <div data-testid="side-panel-layout">
        <div data-testid="panel-title">{{ title }}</div>
        <div data-testid="panel-subtitle">{{ subtitle }}</div>
        <button data-testid="close-button" @click="closePanel">Close</button>
        <slot />
      </div>
    `,
  },
  KIcon: {
    name: 'KIcon',
    props: ['icon', 'color'],
    template: '<span :data-testid="\'icon-\' + icon" />',
  },
};

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
    stubs: STUBS,
  });
}

describe('LearningObjectiveSidePanel', () => {
  it('renders LO title and unit name in header', () => {
    renderPanel();
    expect(screen.getByTestId('panel-title')).toHaveTextContent('Capital letters');
    expect(screen.getByTestId('panel-subtitle')).toHaveTextContent('Unit 1: Letters');
  });

  it('shows completion count based on active test takers', () => {
    renderPanel();
    // pre_test has 2 takers out of 3 learners
    expect(screen.getByText(/2 of 3 learners/)).toBeInTheDocument();
  });

  it('shows pre-test average when pre-test has data', () => {
    renderPanel();
    // pre_test scores for lo-1: user-1=4, user-2=1, average=2.5 rounds to 3
    expect(screen.getByText(/Pre: 3 of 4 questions/)).toBeInTheDocument();
  });

  it('does not show post-test average when post-test is not activated', () => {
    renderPanel();
    expect(screen.queryByText(/Post:/)).not.toBeInTheDocument();
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
    expect(screen.getByText(/Post: 4 of 4 questions/)).toBeInTheDocument();
  });

  it('shows warning banner when learners are struggling', () => {
    renderPanel();
    // user-2 scored 1/4=25% (low), user-3 has no score so 0/4=0% (low)
    // user-1 scored 4/4=100% (high)
    // The count is rendered separately as <strong>2</strong>
    expect(screen.getByText(/struggling with this objective/)).toBeInTheDocument();
    expect(screen.getByTestId('icon-error')).toBeInTheDocument();
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
    expect(screen.queryByTestId('icon-error')).not.toBeInTheDocument();
  });

  it('sorts learner scores ascending (lowest first)', () => {
    renderPanel();
    // Score numbers are in their own .score-correct spans
    const correctSpans = screen
      .getAllByText(/^[0-4]$/)
      .filter(el => el.classList.contains('score-correct'));
    expect(correctSpans[0]).toHaveTextContent('0');
    expect(correctSpans[1]).toHaveTextContent('1');
    expect(correctSpans[2]).toHaveTextContent('4');
  });

  it('shows learner names in score-sorted order', () => {
    renderPanel();
    const names = screen.getAllByText(/^(Alice|Bob|Carol)$/);
    expect(names[0]).toHaveTextContent('Carol');
    expect(names[1]).toHaveTextContent('Bob');
    expect(names[2]).toHaveTextContent('Alice');
  });

  it('emits closePanel when close button is clicked', async () => {
    const { emitted } = renderPanel();
    const closeButton = screen.getByTestId('close-button');
    await closeButton.click();
    expect(emitted().closePanel).toBeTruthy();
  });

  it('handles case where no learners have scored', () => {
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
    // All 3 learners should show score 0
    const correctSpans = screen
      .getAllByText('0')
      .filter(el => el.classList.contains('score-correct'));
    expect(correctSpans).toHaveLength(3);
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
    const correctSpans = screen
      .getAllByText(/^[2-4]$/)
      .filter(el => el.classList.contains('score-correct'));
    expect(correctSpans[0]).toHaveTextContent('2');
    expect(correctSpans[1]).toHaveTextContent('3');
    expect(correctSpans[2]).toHaveTextContent('4');
  });
});
