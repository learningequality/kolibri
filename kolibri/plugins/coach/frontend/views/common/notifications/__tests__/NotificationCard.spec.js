import { render, screen } from '@testing-library/vue';
import NotificationCard from '../NotificationCard';
import { nStrings } from '../notificationStrings';
import { PageNames } from '../../../../constants';
import { CollectionTypes } from '../../../../constants/lessonsConstants';
import {
  NotificationEvents,
  NotificationObjects,
} from '../../../../constants/notificationsConstants';

const notification = {
  event: NotificationEvents.COMPLETED,
  object: NotificationObjects.LESSON,
  resource: {
    type: 'lesson',
  },
  assignment: {
    name: 'Lesson 1',
    type: 'Lesson',
  },
  collection: {
    name: 'Group 1',
    type: CollectionTypes.LEARNERGROUP,
    id: 'Test_id',
  },
  learnerSummary: {
    firstUserId: 'learner_test',
    firstUserName: 'JB',
    total: 1,
  },
  timestamp: '2019-01-17 01:29:04.016364',
};

const GROUP = { name: 'Group 1', type: CollectionTypes.LEARNERGROUP };
const ASSIGNMENT = { name: 'Lesson 1', type: 'Lesson' };
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const ELAPSED_TIME = '3 days ago';
const routes = Object.values(PageNames).map(name => ({ name, path: `/${name}` }));

function renderComponent({ notification: notificationOverrides = {}, props = {} } = {}) {
  return render(NotificationCard, {
    routes,
    props: {
      notification: {
        assignment: {},
        resource: {},
        learnerSummary: {},
        collection: {},
        ...notificationOverrides,
      },
      ...props,
    },
  });
}

describe('NotificationCard', () => {
  it('shows a link describing what happened', () => {
    renderComponent({ notification });
    const name = nStrings.$tr('individualCompleted', { learnerName: 'JB', itemName: 'Lesson 1' });
    const link = screen.getByRole('link', { name });
    expect(link).toHaveAttribute('href', expect.stringContaining(PageNames.LEARNER_LESSON_REPORT));
  });

  describe('elapsed time', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(notification.timestamp).getTime() + THREE_DAYS_MS);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows the elapsed time when showTime is true', () => {
      renderComponent({ notification, props: { showTime: true } });
      expect(screen.getByText(ELAPSED_TIME)).toBeInTheDocument();
    });

    it('hides the elapsed time when showTime is false', () => {
      renderComponent({ notification, props: { showTime: false } });
      expect(screen.queryByText(ELAPSED_TIME)).not.toBeInTheDocument();
    });
  });

  it.each([
    ['only a group', GROUP, {}, GROUP.name],
    ['a group and an assignment', GROUP, ASSIGNMENT, `${GROUP.name} • ${ASSIGNMENT.name}`],
    ['only an assignment', {}, ASSIGNMENT, ASSIGNMENT.name],
  ])('shows the correct context line with %s', (_, collection, assignment, expected) => {
    renderComponent({ notification: { ...notification, collection, assignment } });
    expect(screen.getByText(expected, { selector: 'p' })).toBeInTheDocument();
  });

  it('shows no context line with neither group nor assignment', () => {
    renderComponent({ notification: { ...notification, collection: {}, assignment: {} } });
    expect(screen.queryByText(GROUP.name)).not.toBeInTheDocument();
    expect(screen.queryByText(ASSIGNMENT.name)).not.toBeInTheDocument();
  });
});
