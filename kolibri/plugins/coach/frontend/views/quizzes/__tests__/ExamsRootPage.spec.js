import { render, screen, within } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
import ExamResource from 'kolibri-common/apiResources/ExamResource';
import { emulatePrintMedia } from 'testUtils'; // eslint-disable-line
import { coachStrings } from '../../common/commonCoachStrings';
import makeStore from '../../../__tests__/utils/makeStore';
import ExamsRootPage from '../ExamsRootPage.vue';

const { filterQuizStarted$, filterQuizNotStarted$, quizClosedLabel$ } = coachStrings;

jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('kolibri-common/apiResources/ChannelResource');
jest.mock('kolibri-common/apiResources/ExamResource');
jest.mock('../../../composables/fetchClassSyncStatus');
jest.mock('../../../composables/useCoreCoach', () => {
  const { ref } = require('vue');
  return () => ({
    classId: ref('class-id'),
    initClassInfo: () => Promise.resolve(),
    pageTitle: '',
    appBarTitle: '',
  });
});
jest.mock('kolibri/urls');
jest.mock('kolibri/router', () => ({
  getRoute: jest.fn((name, params) => ({ name, params })),
  getReactiveRoute: jest.fn(() => ({ params: {} })),
}));

function makeQuiz(overrides) {
  return {
    assignments: [],
    learner_ids: [],
    groups: [],
    ...overrides,
  };
}

function renderComponent(quizzes) {
  const store = makeStore();
  store.state.classSummary.examMap = Object.fromEntries(quizzes.map(quiz => [quiz.id, quiz]));
  const router = new VueRouter({
    routes: [
      { path: '/', name: 'test' },
      { path: '/quizzes/:quizId', name: 'EXAM_SUMMARY' },
    ],
  });
  // The plugin's router adds getRoute; the template calls it on $router.
  router.getRoute = (name, params) => ({ name, params });
  return render(ExamsRootPage, { store, routes: router });
}

describe('ExamsRootPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ChannelResource.list.mockResolvedValue([]);
    ExamResource.fetchQuizzesSizes.mockResolvedValue([]);
  });

  describe('when printing', () => {
    emulatePrintMedia(beforeEach, afterEach);

    it('shows each quiz status as text instead of a button', () => {
      renderComponent([
        makeQuiz({
          id: 'started',
          title: 'Started quiz',
          active: true,
          archive: false,
          date_created: '2026-03-01T00:00:00Z',
        }),
        makeQuiz({
          id: 'not-started',
          title: 'Not started quiz',
          active: false,
          archive: false,
          date_created: '2026-02-01T00:00:00Z',
        }),
        makeQuiz({
          id: 'ended',
          title: 'Ended quiz',
          active: true,
          archive: true,
          date_created: '2026-01-01T00:00:00Z',
        }),
      ]);
      const rows = screen.getAllByRole('row').slice(1);
      expect(within(rows[0]).getByText(filterQuizStarted$())).toBeInTheDocument();
      expect(within(rows[1]).getByText(filterQuizNotStarted$())).toBeInTheDocument();
      expect(within(rows[2]).getByText(quizClosedLabel$())).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
