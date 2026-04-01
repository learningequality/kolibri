import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import LearningObjectivesReport from '../LearningObjectivesReport.vue';

const { noTestDataLabel$ } = coursesStrings;

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
  SparklineBar: {
    name: 'SparklineBar',
    props: ['lowCount', 'midCount', 'highCount'],
    template:
      '<div data-testid="sparkline-bar" :data-low="lowCount" :data-mid="midCount" :data-high="highCount" />',
  },
};

function renderComponent(props = {}) {
  return render(LearningObjectivesReport, {
    props: {
      ...props,
    },
    stubs: STUBS,
  });
}

describe('LearningObjectivesReport', () => {
  it('shows KCircularLoader when prefetchedData is null', () => {
    renderComponent({ prefetchedData: null });
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.queryByTestId('k-table')).not.toBeInTheDocument();
  });

  it('shows empty state when activeTestStatus is not_activated', () => {
    renderComponent({
      prefetchedData: {
        activeTestStatus: 'not_activated',
        bucketedObjectives: [],
      },
    });
    expect(screen.queryByTestId('k-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    expect(screen.getByText(noTestDataLabel$())).toBeInTheDocument();
  });

  it('renders LO rows when data is available', () => {
    renderComponent({
      prefetchedData: {
        activeTestStatus: 'closed',
        bucketedObjectives: MOCK_OBJECTIVES,
      },
    });

    expect(screen.getByTestId('k-table')).toBeInTheDocument();
    expect(screen.getByText('Understand fractions')).toBeInTheDocument();
    expect(screen.getByText('Apply division')).toBeInTheDocument();

    const sparklines = screen.getAllByTestId('sparkline-bar');
    expect(sparklines).toHaveLength(2);

    expect(sparklines[0]).toHaveAttribute('data-low', '8');
    expect(sparklines[0]).toHaveAttribute('data-mid', '4');
    expect(sparklines[0]).toHaveAttribute('data-high', '3');
  });
});
