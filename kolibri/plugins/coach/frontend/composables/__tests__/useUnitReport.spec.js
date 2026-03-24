import { ref } from 'vue';
import UnitReportResource from '../../apiResources/unitReport';
import useUnitReport from '../useUnitReport';

jest.mock('../../apiResources/unitReport');

const mockReportData = {
  unit_title: 'Unit 1: Letters',
  learning_objectives: [
    { id: 'lo-1', text: 'Capital letters', num_questions: 4 },
    { id: 'lo-2', text: 'Punctuation', num_questions: 2 },
  ],
  learners: [
    { id: 'user-1', username: 'alice', name: 'Alice' },
    { id: 'user-2', username: 'bob', name: 'Bob' },
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

describe('useUnitReport', () => {
  const courseSessionId = ref('session-123');
  const unitContentnodeId = ref('unit-456');

  beforeEach(() => {
    jest.clearAllMocks();
    UnitReportResource.fetchReport.mockResolvedValue(mockReportData);
  });

  it('starts with loading=false, becomes true during fetch, false after', async () => {
    const { loading, fetchReport } = useUnitReport(courseSessionId, unitContentnodeId);

    expect(loading.value).toBe(false);

    const fetchPromise = fetchReport();
    expect(loading.value).toBe(true);

    await fetchPromise;
    expect(loading.value).toBe(false);
  });

  it('calls UnitReportResource.fetchReport with correct params', async () => {
    const { fetchReport } = useUnitReport(courseSessionId, unitContentnodeId);

    await fetchReport();

    expect(UnitReportResource.fetchReport).toHaveBeenCalledWith({
      courseSessionId: 'session-123',
      unitContentnodeId: 'unit-456',
    });
  });

  it('exposes raw reportData after fetch', async () => {
    const { reportData, fetchReport } = useUnitReport(courseSessionId, unitContentnodeId);

    expect(reportData.value).toBe(null);

    await fetchReport();

    expect(reportData.value).toEqual(mockReportData);
  });

  it('computes bucketedObjectives from pre_test scores when post_test is not_activated', async () => {
    const { bucketedObjectives, fetchReport } = useUnitReport(courseSessionId, unitContentnodeId);

    await fetchReport();

    // pre_test is 'closed', post_test is 'not_activated', so activeTest = pre_test
    // lo-1 (4 questions): user-1 got 4/4=100% (high), user-2 got 1/4=25% (low)
    // lo-2 (2 questions): user-1 got 1/2=50% (low), user-2 got 2/2=100% (high)
    expect(bucketedObjectives.value).toEqual([
      {
        id: 'lo-1',
        text: 'Capital letters',
        numQuestions: 4,
        lowCount: 1,
        midCount: 0,
        highCount: 1,
      },
      { id: 'lo-2', text: 'Punctuation', numQuestions: 2, lowCount: 1, midCount: 0, highCount: 1 },
    ]);
  });

  it('prefers post_test scores when post_test is closed', async () => {
    const postTestData = {
      ...mockReportData,
      post_test: {
        status: 'closed',
        scores: {
          'user-1': { 'lo-1': 3, 'lo-2': 2 },
          'user-2': { 'lo-1': 4, 'lo-2': 1 },
        },
      },
    };
    UnitReportResource.fetchReport.mockResolvedValue(postTestData);

    const { bucketedObjectives, fetchReport } = useUnitReport(courseSessionId, unitContentnodeId);

    await fetchReport();

    // post_test is 'closed' (not 'not_activated'), so activeTest = post_test
    // lo-1 (4 questions): user-1 got 3/4=75% (mid), user-2 got 4/4=100% (high)
    // lo-2 (2 questions): user-1 got 2/2=100% (high), user-2 got 1/2=50% (low)
    expect(bucketedObjectives.value).toEqual([
      {
        id: 'lo-1',
        text: 'Capital letters',
        numQuestions: 4,
        lowCount: 0,
        midCount: 1,
        highCount: 1,
      },
      { id: 'lo-2', text: 'Punctuation', numQuestions: 2, lowCount: 1, midCount: 0, highCount: 1 },
    ]);
  });

  it('exposes activeTestStatus reflecting which test is being shown', async () => {
    const { activeTestStatus, fetchReport } = useUnitReport(courseSessionId, unitContentnodeId);

    // Before fetch, no activeTest
    expect(activeTestStatus.value).toBe('not_activated');

    await fetchReport();

    // post_test is not_activated, pre_test is closed => activeTest = pre_test
    expect(activeTestStatus.value).toBe('closed');
  });

  it('returns empty bucketedObjectives when both tests are not_activated', async () => {
    const noTestsData = {
      ...mockReportData,
      pre_test: {
        status: 'not_activated',
        scores: {},
      },
      post_test: {
        status: 'not_activated',
        scores: {},
      },
    };
    UnitReportResource.fetchReport.mockResolvedValue(noTestsData);

    const { bucketedObjectives, activeTest, fetchReport } = useUnitReport(
      courseSessionId,
      unitContentnodeId,
    );

    await fetchReport();

    expect(activeTest.value).toBe(null);
    expect(bucketedObjectives.value).toEqual([]);
  });
});
