import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { i18nSetup } from 'kolibri/utils/i18n';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import LearningObjectivesReport from '../LearningObjectivesReport.vue';

const { noTestDataLabel$, sparklineDistributionLabel$ } = coursesStrings;

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

function renderComponent(props = {}) {
  const router = new VueRouter({ routes });
  return render(LearningObjectivesReport, {
    props: {
      objectiveRoute: mockObjectiveRoute,
      ...props,
    },
    router,
  });
}

describe('LearningObjectivesReport', () => {
  beforeAll(() => i18nSetup(true));
  beforeEach(() => {
    mockObjectiveRoute.mockClear();
  });

  it('shows KCircularLoader when prefetchedData is null', () => {
    renderComponent({ prefetchedData: null });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('shows empty state when activeTestStatus is not_activated', () => {
    renderComponent({
      prefetchedData: {
        activeTestStatus: 'not_activated',
        bucketedObjectives: [],
      },
    });
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText(noTestDataLabel$())).toBeInTheDocument();
  });

  it('renders LO rows when data is available', () => {
    renderComponent({
      prefetchedData: {
        activeTestStatus: 'closed',
        bucketedObjectives: MOCK_OBJECTIVES,
      },
    });

    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getByText(MOCK_OBJECTIVES[0].text)).toBeInTheDocument();
    expect(screen.getByText(MOCK_OBJECTIVES[1].text)).toBeInTheDocument();

    expect(
      screen.getByText(
        sparklineDistributionLabel$({
          lowCount: MOCK_OBJECTIVES[0].lowCount,
          midCount: MOCK_OBJECTIVES[0].midCount,
          highCount: MOCK_OBJECTIVES[0].highCount,
        }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        sparklineDistributionLabel$({
          lowCount: MOCK_OBJECTIVES[1].lowCount,
          midCount: MOCK_OBJECTIVES[1].midCount,
          highCount: MOCK_OBJECTIVES[1].highCount,
        }),
      ),
    ).toBeInTheDocument();
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

    // eslint-disable-next-line kolibri/tests-no-hardcoded-strings
    expect(screen.getByRole('link', { name: MOCK_OBJECTIVES[0].text })).toBeInTheDocument();
    // eslint-disable-next-line kolibri/tests-no-hardcoded-strings
    expect(screen.getByRole('link', { name: MOCK_OBJECTIVES[1].text })).toBeInTheDocument();
  });
});
