/* global flushPromises */
import { nextTick, ref, reactive } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { useRoute, useRouter } from 'vue-router/composables';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { pageHeading } from 'kolibri/composables/usePageTitle';
import { PageNames } from '../../../constants';
// eslint-disable-next-line import-x/named
import useUnitDetail, { useUnitDetailMock } from '../../../composables/useUnitDetail';
// eslint-disable-next-line import-x/named
import useClassSummary, { useClassSummaryMock } from '../../../composables/useClassSummary';
import useCourseNotificationPolling from '../../../composables/useCourseNotificationPolling';
import UnitDetailPage from '../UnitDetailPage.vue';

const { learningObjectivesLabel$ } = coursesStrings;

const CLASS_NAME = 'Class A';
const COURSE_TITLE = 'Human Biology';
const UNIT_TITLE = 'Unit 1: Cells';

jest.mock('vue-router/composables', () => ({ useRoute: jest.fn(), useRouter: jest.fn() }));
jest.mock('../../../store', () => ({ __esModule: true, default: { dispatch: jest.fn() } }));
jest.mock('../../../composables/useUnitDetail');
jest.mock('../../../composables/useCourseNotificationPolling');
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
    useClassSummary.mockImplementation(() => useClassSummaryMock({ className: ref(CLASS_NAME) }));
  });

  describe('page title', () => {
    // The back link to the course renders once courseTitle is set.
    function renderWithBackLink() {
      return render(UnitDetailPage, {
        routes: new VueRouter({ routes: [{ name: PageNames.COURSE_SUMMARY, path: '/course' }] }),
      });
    }

    beforeEach(() => {
      useUnitDetail.mockImplementation(() =>
        useUnitDetailMock({
          courseTitle: ref(COURSE_TITLE),
          numberedUnitTitle: ref(UNIT_TITLE),
        }),
      );
    });

    it('sets the tab title to the course title and class name', async () => {
      renderWithBackLink();
      await nextTick();
      expect(document.title).toBe(`${COURSE_TITLE} - ${CLASS_NAME} - Kolibri`);
    });

    it('tells the page shell it renders its own h1', async () => {
      renderWithBackLink();
      await nextTick();
      expect(pageHeading.value).toBe('');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(UNIT_TITLE);
    });
  });

  it('calls useUnitDetail with courseSessionId and unitContentnodeId from route params', () => {
    render(UnitDetailPage);
    expect(useUnitDetail).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'sess-1' }),
      expect.objectContaining({ value: 'unit-1' }),
    );
  });

  it('re-fetches unit detail data on course-session notifications', () => {
    const fetchData = jest.fn();
    useUnitDetail.mockImplementation(() => useUnitDetailMock({ fetchData }));
    render(UnitDetailPage);
    expect(useCourseNotificationPolling).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ value: 'sess-1' }),
      fetchData,
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
