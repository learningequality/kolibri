import { render, screen, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
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

function renderComponent(props = {}) {
  return render(LearningObjectivesReport, {
    props: { ...props },
  });
}

describe('LearningObjectivesReport', () => {
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

  it('emits select-objective with objective and reportData when LO row is clicked', async () => {
    const mockReportData = {
      unit_title: 'Unit 1: Numbers',
      learners: [],
      pre_test: { status: 'closed', scores: {} },
      post_test: { status: 'not_activated', scores: {} },
    };
    const { emitted } = renderComponent({
      prefetchedData: {
        activeTestStatus: 'closed',
        bucketedObjectives: MOCK_OBJECTIVES,
        reportData: mockReportData,
      },
    });

    await fireEvent.click(screen.getByText(MOCK_OBJECTIVES[0].text));

    expect(emitted()['select-objective']).toBeTruthy();
    expect(emitted()['select-objective'][0][0]).toEqual({
      objective: MOCK_OBJECTIVES[0],
      reportData: mockReportData,
    });
  });
});
