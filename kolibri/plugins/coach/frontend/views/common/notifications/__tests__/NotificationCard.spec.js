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
const CONTEXT_SEPARATOR = /•/;
const RELATIVE_TIME = /ago$/;
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
    expect(screen.getByRole('link', { name })).toBeInTheDocument();
  });

  it('shows the elapsed time only when showTime is true', () => {
    const { unmount } = renderComponent({ notification, props: { showTime: false } });
    expect(screen.queryByText(RELATIVE_TIME)).not.toBeInTheDocument();
    unmount();

    renderComponent({ notification, props: { showTime: true } });
    expect(screen.getByText(RELATIVE_TIME)).toBeInTheDocument();
  });

  it.each([
    ['neither group nor assignment', {}, {}, null],
    ['only a group', GROUP, {}, GROUP.name],
    ['a group and an assignment', GROUP, ASSIGNMENT, `${GROUP.name} • ${ASSIGNMENT.name}`],
    ['only an assignment', {}, ASSIGNMENT, ASSIGNMENT.name],
  ])('shows the correct context line with %s', (_, collection, assignment, expected) => {
    renderComponent({ notification: { ...notification, collection, assignment } });
    if (expected) {
      expect(screen.getByText(expected, { selector: 'p' })).toBeInTheDocument();
    } else {
      expect(screen.queryByText(CONTEXT_SEPARATOR)).not.toBeInTheDocument();
    }
  });
});
