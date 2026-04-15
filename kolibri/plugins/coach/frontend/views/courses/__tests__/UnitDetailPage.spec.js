/* global flushPromises */
import { ref, reactive } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';
import { useRoute, useRouter } from 'vue-router/composables';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { PageNames } from '../../../constants';
// eslint-disable-next-line import-x/named
import useUnitDetail, { useUnitDetailMock } from '../../../composables/useUnitDetail';
import UnitDetailPage from '../UnitDetailPage.vue';

const { learningObjectivesLabel$ } = coursesStrings;

jest.mock('vue-router/composables', () => ({ useRoute: jest.fn(), useRouter: jest.fn() }));
jest.mock('kolibri/store', () => ({ __esModule: true, default: { dispatch: jest.fn() } }));
jest.mock('../../../composables/useUnitDetail');
jest.mock('../../../composables/useClassSummary');
jest.mock('../../CoachAppBarPage.vue', () => ({
  name: 'CoachAppBarPage',
  render(h) {
    return h('div', this.$slots.default);
  },
}));
jest.mock('../../common/status/StatusSummary.vue', () => ({
  name: 'StatusSummary',
  render(h) {
    return h('div');
  },
}));
jest.mock('../../common/SparklineBar.vue', () => ({
  name: 'SparklineBar',
  render(h) {
    return h('div');
  },
}));

const LESSONS_WITH_RESOURCES = [
  {
    id: 'l1',
    title: 'Skeletal Structure',
    kind: 'lesson',
    content_ids: ['c1', 'c2'],
    resources: [
      { id: 'r1', content_id: 'c1', title: 'Skeletal Structure - Reading', kind: 'document' },
      { id: 'r2', content_id: 'c2', title: 'Skeletal Structure - Practice', kind: 'exercise' },
    ],
  },
];

describe('UnitDetailPage', () => {
  let mockRoute;

  beforeEach(() => {
    mockRoute = reactive({
      params: { classId: 'cls-1', courseSessionId: 'sess-1', unitContentnodeId: 'unit-1' },
      name: PageNames.UNIT_DETAIL_LESSONS,
    });
    useRoute.mockReturnValue(mockRoute);
    useRouter.mockReturnValue({
      push: jest.fn(({ name }) => {
        mockRoute.name = name;
      }),
    });
    useUnitDetail.mockImplementation(() => useUnitDetailMock());
  });

  it('calls useUnitDetail with courseSessionId and unitContentnodeId from route params', () => {
    render(UnitDetailPage);
    expect(useUnitDetail).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'sess-1' }),
      expect.objectContaining({ value: 'unit-1' }),
    );
  });

  it('calls resourceTally with the content_id of each lesson resource', async () => {
    const resourceTally = jest.fn(() => ({
      completed: 0,
      started: 0,
      helpNeeded: 0,
      notStarted: 0,
    }));
    useUnitDetail.mockImplementation(() =>
      useUnitDetailMock({ lessons: ref(LESSONS_WITH_RESOURCES), resourceTally }),
    );
    render(UnitDetailPage);
    await flushPromises();

    expect(resourceTally).toHaveBeenCalledWith('c1');
    expect(resourceTally).toHaveBeenCalledWith('c2');
  });

  it('shows learning objective text after switching to the learning objectives tab', async () => {
    const learningObjective = {
      id: 'lo-1',
      text: 'Describe the structure of a cell',
      lowCount: 1,
      midCount: 2,
      highCount: 3,
    };
    useUnitDetail.mockImplementation(() =>
      useUnitDetailMock({
        lessons: ref([LESSONS_WITH_RESOURCES[0]]),
        objectivesForLesson: jest.fn(() => [learningObjective]),
      }),
    );
    render(UnitDetailPage);
    await flushPromises();

    // Objective text is not rendered while the lessons tab is active
    expect(screen.queryByText(learningObjective.text)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: learningObjectivesLabel$() }));
    await flushPromises();

    expect(screen.getByText(learningObjective.text)).toBeInTheDocument();
  });
});
