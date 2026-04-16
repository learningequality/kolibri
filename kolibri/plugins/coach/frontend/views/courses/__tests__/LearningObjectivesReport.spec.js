import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { i18nSetup } from 'kolibri/utils/i18n';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import LearningObjectivesReport from '../LearningObjectivesReport.vue';

beforeAll(() => i18nSetup(true));

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
  KButton: {
    name: 'KButton',
    props: ['text', 'appearance'],
    template: '<button data-testid="k-button" @click="$emit(\'click\')">{{ text }}</button>',
  },
  SparklineBar: {
    name: 'SparklineBar',
    props: ['lowCount', 'midCount', 'highCount'],
    template:
      '<div data-testid="sparkline-bar" :data-low="lowCount" :data-mid="midCount" :data-high="highCount" />',
  },
};

const mockObjectiveRoute = jest.fn(id => ({
  name: 'COURSE_SUMMARY_OBJECTIVE',
  params: { objectiveId: id },
}));

// Minimal routes so KRouterLink can resolve named routes without warnings
const routes = [
  {
    name: 'COURSE_SUMMARY_OBJECTIVE',
    path: '/objective/:objectiveId',
    component: { template: '<div />' },
  },
];

beforeEach(() => {
  mockObjectiveRoute.mockClear();
});

function renderComponent(props = {}) {
  const router = new VueRouter({ routes });
  return render(LearningObjectivesReport, {
    props: {
      objectiveRoute: mockObjectiveRoute,
      ...props,
    },
    router,
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

  it('renders objective rows as router links with correct routes', () => {
    renderComponent({
      prefetchedData: {
        activeTestStatus: 'closed',
        bucketedObjectives: MOCK_OBJECTIVES,
        reportData: {},
      },
    });

    expect(mockObjectiveRoute).toHaveBeenCalledWith('obj-1');
    expect(mockObjectiveRoute).toHaveBeenCalledWith('obj-2');

    expect(screen.getByRole('link', { name: 'Understand fractions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apply division' })).toBeInTheDocument();
  });
});
