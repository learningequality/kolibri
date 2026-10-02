import { render, screen, fireEvent } from '@testing-library/vue';
import { selectKSelectOption } from 'testUtils'; // eslint-disable-line
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { PageNames } from '../../../../constants';
import { nStrings } from '../notificationStrings';
import makeStore from '../../../../__tests__/utils/makeStore';
import ActivityList from '../ActivityList';

const NO_ACTIVITY = 'No activity in this classroom';
const SHOW_MORE = coreStrings.$tr('showMoreAction');
const LEARNER_1_STARTED = nStrings.$tr('individualStarted', {
  learnerName: 'Learner 1',
  itemName: 'Lesson 1',
});
const LEARNER_2 = /Learner 2/;
const routes = Object.values(PageNames).map(name => ({ name, path: `/${name}` }));

const makeNotification = (id, overrides = {}) => ({
  id,
  lesson_id: 'lesson_1',
  object: 'Lesson',
  event: 'Started',
  resource: { type: 'video' },
  assignment: { name: `Lesson ${id}`, type: 'Lesson' },
  collection: { name: 'Class', type: 'classroom', id: 'classroom_id_test' },
  learnerSummary: { firstUserId: `learner_${id}`, firstUserName: `Learner ${id}`, total: 1 },
  assignment_collections: [],
  ...overrides,
});

function renderComponent({ notifications = [], moreResults = false, props = {} } = {}) {
  const fetchMore = jest.fn(() => Promise.resolve(moreResults));
  const store = makeStore({
    coachNotifications: {
      namespaced: true,
      state: { currentClassroomId: 'classroom_id_test', notifications: [] },
      actions: { moreNotificationsForClass: fetchMore },
      getters: { allNotifications: () => notifications },
    },
  });
  store.state.classSummary.lessonMap = { lesson_1: { groups: [] } };

  const utils = render(ActivityList, { store, routes, props });
  return { ...utils, fetchMore };
}

describe('ActivityList', () => {
  it('loads notifications when first shown', async () => {
    const { fetchMore } = renderComponent();
    await global.flushPromises();
    expect(fetchMore).toHaveBeenCalledTimes(1);
  });

  it('shows the empty message when there are no notifications', async () => {
    renderComponent({ props: { noActivityString: NO_ACTIVITY } });
    expect(await screen.findByText(NO_ACTIVITY)).toBeInTheDocument();
  });

  it('lists notifications but hides "Answered" ones', async () => {
    renderComponent({
      notifications: [makeNotification('1'), makeNotification('2', { event: 'Answered' })],
      props: { noActivityString: NO_ACTIVITY },
    });
    await global.flushPromises();
    expect(screen.getByRole('link', { name: LEARNER_1_STARTED })).toBeInTheDocument();
    expect(screen.queryByText(LEARNER_2)).not.toBeInTheDocument();
  });

  it('shows a "Show more" button that loads the next page when there are more results', async () => {
    const { fetchMore } = renderComponent({ moreResults: true });
    const button = await screen.findByRole('button', { name: SHOW_MORE });
    await fireEvent.click(button);
    expect(fetchMore).toHaveBeenCalledTimes(2);
  });

  it('does not show a "Show more" button when there are no more results', async () => {
    renderComponent({ moreResults: false });
    await global.flushPromises();
    expect(screen.queryByRole('button', { name: SHOW_MORE })).not.toBeInTheDocument();
  });

  it('hides the "Show more" button once a filter is applied', async () => {
    renderComponent({
      notifications: [makeNotification('1')],
      moreResults: true,
    });
    await screen.findByRole('button', { name: SHOW_MORE });

    await selectKSelectOption('Progress type', 'Started');

    expect(screen.queryByRole('button', { name: SHOW_MORE })).not.toBeInTheDocument();
  });
});
