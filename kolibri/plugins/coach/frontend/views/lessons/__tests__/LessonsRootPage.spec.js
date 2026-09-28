import { render, screen, within } from '@testing-library/vue';
import '@testing-library/jest-dom';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { emulatePrintMedia, selectKSelectOption } from 'testUtils'; // eslint-disable-line
import { coachStrings } from '../../common/commonCoachStrings';
import makeStore from '../../../__tests__/utils/makeStore';
import LessonsRootPage from '../LessonsRootPage.vue';

const {
  filterLessonVisible$,
  filterLessonNotVisible$,
  filterLessonStatus$,
  recipientsLabel$,
  titleLabel$,
} = coachStrings;

const GROUP = { id: 'group-a', name: 'Group A', member_ids: [] };

jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('kolibri/composables/useUser');
jest.mock('../../../composables/fetchClassSyncStatus');
jest.mock('kolibri/urls');
jest.mock('kolibri/router', () => ({
  getRoute: jest.fn((name, params) => ({ name, params })),
  getReactiveRoute: jest.fn(() => ({ params: {} })),
}));

const routes = [
  { path: '/test', name: 'test' },
  { path: '/lessons/new', name: 'LESSON_CREATION_ROOT' },
  { path: '/lessons/:lessonId', name: 'LESSON_SUMMARY' },
];

function makeLesson(overrides) {
  return {
    resources: [],
    size: 0,
    assignments: [],
    learner_ids: [],
    groups: [],
    ...overrides,
  };
}

function renderComponent(lessons, groups = []) {
  const store = makeStore();
  store.state.lessonsRoot.lessons = lessons;
  store.state.classSummary.groupMap = Object.fromEntries(groups.map(group => [group.id, group]));
  return render(LessonsRootPage, { store, routes });
}

describe('LessonsRootPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockImplementation(() => useUserMock({ isCoach: true }));
  });

  describe('when printing', () => {
    emulatePrintMedia(beforeEach, afterEach);

    it('shows each lesson visibility as text instead of a switch', () => {
      renderComponent([
        makeLesson({
          id: 'visible',
          title: 'Visible lesson',
          active: true,
          date_created: '2026-02-01T00:00:00Z',
        }),
        makeLesson({
          id: 'hidden',
          title: 'Hidden lesson',
          active: false,
          date_created: '2026-01-01T00:00:00Z',
        }),
      ]);
      const lessonsTable = screen
        .getByRole('columnheader', { name: titleLabel$() })
        .closest('table');
      const rows = within(lessonsTable).getAllByRole('row').slice(1);
      expect(within(rows[0]).getByText(filterLessonVisible$())).toBeInTheDocument();
      expect(within(rows[1]).getByText(filterLessonNotVisible$())).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('prints the selected status and recipients', async () => {
      renderComponent([], [GROUP]);
      await selectKSelectOption(filterLessonStatus$(), filterLessonNotVisible$());
      await selectKSelectOption(recipientsLabel$(), GROUP.name);

      const [statusRow, recipientsRow] = within(screen.getByTestId('printed-filters')).getAllByRole(
        'row',
      );
      expect(within(statusRow).getByText(filterLessonStatus$())).toBeInTheDocument();
      expect(within(statusRow).getByText(filterLessonNotVisible$())).toBeInTheDocument();
      expect(within(recipientsRow).getByText(recipientsLabel$())).toBeInTheDocument();
      expect(within(recipientsRow).getByText(GROUP.name)).toBeInTheDocument();
      expect(
        screen.getByText(filterLessonStatus$(), { selector: '.ui-select-label-text' }),
      ).not.toBeVisible();
    });
  });
});
