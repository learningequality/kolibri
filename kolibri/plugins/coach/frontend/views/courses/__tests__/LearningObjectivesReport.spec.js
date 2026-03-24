import { ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import LearningObjectivesReport from '../LearningObjectivesReport.vue';
import useUnitReport from '../../../composables/useUnitReport';

jest.mock('../../../composables/useUnitReport', () => {
  return { __esModule: true, default: jest.fn() };
});

const MOCK_OBJECTIVES = [
  {
    id: 'obj-1',
    text: 'Understand fractions',
    numQuestions: 5,
    lowCount: 8,
    midCount: 4,
    highCount: 3,
  },
  {
    id: 'obj-2',
    text: 'Apply division',
    numQuestions: 3,
    lowCount: 1,
    midCount: 2,
    highCount: 10,
  },
];

const STUBS = {
  KCircularLoader: {
    name: 'KCircularLoader',
    template: '<div data-testid="loader">Loading...</div>',
  },
  KTable: {
    name: 'KTable',
    props: ['headers', 'rows', 'caption', 'emptyMessage', 'dataLoading'],
    template: `
      <div data-testid="k-table">
        <caption>{{ caption }}</caption>
        <template v-if="rows.length === 0 && emptyMessage">
          <div data-testid="empty-message">{{ emptyMessage }}</div>
        </template>
        <template v-for="(row, rowIndex) in rows">
          <div :key="rowIndex" :data-testid="'row-' + rowIndex">
            <slot
              v-for="(content, colIndex) in row"
              name="cell"
              v-bind="{ content, rowIndex, colIndex, row }"
            />
          </div>
        </template>
      </div>
    `,
  },
  KRouterLink: {
    name: 'KRouterLink',
    props: ['text', 'to'],
    template: '<a data-testid="router-link">{{ text }}</a>',
  },
  KIcon: {
    name: 'KIcon',
    props: ['icon', 'color'],
    template: '<span :data-testid="\'icon-\' + icon" />',
  },
  SparklineBar: {
    name: 'SparklineBar',
    props: ['lowCount', 'midCount', 'highCount'],
    template:
      '<div data-testid="sparkline-bar" :data-low="lowCount" :data-mid="midCount" :data-high="highCount" />',
  },
};

function mockUseUnitReport(overrides = {}) {
  const defaults = {
    loading: ref(false),
    fetchReport: jest.fn(),
    activeTestStatus: ref('closed'),
    bucketedObjectives: ref([]),
  };
  const mockReturn = { ...defaults, ...overrides };
  useUnitReport.mockReturnValue(mockReturn);
  return mockReturn;
}

function renderComponent(props = {}, overrides = {}) {
  const defaultProps = {
    courseSessionId: 'session-123',
    unitContentnodeId: 'unit-abc',
    ...props,
  };

  return render(LearningObjectivesReport, {
    props: defaultProps,
    stubs: STUBS,
    ...overrides,
  });
}

describe('LearningObjectivesReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls fetchReport on mount', () => {
    const { fetchReport } = mockUseUnitReport();
    renderComponent();
    expect(fetchReport).toHaveBeenCalledTimes(1);
  });

  it('shows KCircularLoader when loading', () => {
    mockUseUnitReport({ loading: ref(true) });
    renderComponent();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.queryByTestId('k-table')).not.toBeInTheDocument();
  });

  it('shows empty state when activeTestStatus is not_activated', () => {
    mockUseUnitReport({ activeTestStatus: ref('not_activated') });
    renderComponent();
    expect(screen.queryByTestId('k-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    // Should show some kind of empty state message
    expect(screen.getByText(/no test has been activated/i)).toBeInTheDocument();
  });

  it('renders LO rows when data is available', () => {
    mockUseUnitReport({
      activeTestStatus: ref('closed'),
      bucketedObjectives: ref(MOCK_OBJECTIVES),
    });
    renderComponent();

    expect(screen.getByTestId('k-table')).toBeInTheDocument();
    expect(screen.getByText('Understand fractions')).toBeInTheDocument();
    expect(screen.getByText('Apply division')).toBeInTheDocument();

    // Each row should have a sparkline bar
    const sparklines = screen.getAllByTestId('sparkline-bar');
    expect(sparklines).toHaveLength(2);

    // First objective sparkline should have correct data
    expect(sparklines[0]).toHaveAttribute('data-low', '8');
    expect(sparklines[0]).toHaveAttribute('data-mid', '4');
    expect(sparklines[0]).toHaveAttribute('data-high', '3');
  });

  it('shows mastery badges with correct styling (low vs strong)', () => {
    mockUseUnitReport({
      activeTestStatus: ref('closed'),
      bucketedObjectives: ref(MOCK_OBJECTIVES),
    });
    const { container } = renderComponent();

    const pills = container.querySelectorAll('.mastery-pill');
    expect(pills).toHaveLength(2);

    // First objective: lowCount=8 > highCount=3 → low mastery
    expect(pills[0]).toHaveTextContent(/Low mastery/i);
    expect(screen.getByTestId('row-0').querySelector('[data-testid="icon-error"]')).toBeTruthy();

    // Second objective: lowCount=1 < highCount=10 → strong mastery
    expect(pills[1]).toHaveTextContent(/Strong mastery/i);
    expect(screen.getByTestId('row-1').querySelector('[data-testid="icon-correct"]')).toBeTruthy();
  });

  it('shows info note when activeTestStatus is open', () => {
    mockUseUnitReport({
      activeTestStatus: ref('open'),
      bucketedObjectives: ref(MOCK_OBJECTIVES),
    });
    renderComponent();

    // Should show info about test in progress
    expect(screen.getByText(/test is in progress/i)).toBeInTheDocument();
    // Should still show the table
    expect(screen.getByTestId('k-table')).toBeInTheDocument();
  });
});
