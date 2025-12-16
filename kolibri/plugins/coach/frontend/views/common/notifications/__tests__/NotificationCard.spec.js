import { mount, RouterLinkStub } from '@vue/test-utils';
import VueRouter from 'vue-router';
import NotificationCard from '../NotificationCard';
import { CollectionTypes } from '../../../../constants/lessonsConstants';
import {
  NotificationEvents,
  NotificationObjects,
} from '../../../../constants/notificationsConstants';
import { PageNames } from '../../../../constants';

const router = new VueRouter({
  routes: [
    {
      path: '/fakereport/:groupId/:learnerId',
      name: 'FakeReportPage',
    },
  ],
});

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

function makeWrapper(options) {
  const wrapper = mount(NotificationCard, {
    router,
    stubs: {
      CoachStatusIcon: {
        name: 'CoachStatusIcon',
        props: ['icon'],
        template: '<div></div>',
      },
      RouterLink: RouterLinkStub,
    },
    propsData: {
      notification: {
        assignment: {},
        resource: {},
        learnerSummary: {},
        collection: {},
        ...(options.notification || {}),
      },
      ...options.propsData,
    },
  });
  return { wrapper };
}

describe('NotificationCard component', () => {
  it('shows a link if a full targetPage prop is provided', () => {
    const { wrapper } = makeWrapper({ notification });
    const link = wrapper.findComponent({ name: 'KRouterLink' });
    expect(link.props().to.name).toEqual(PageNames.LEARNER_LESSON_REPORT);
    expect(link.props('text')).toEqual("JB completed 'Lesson 1'");
  });

  it('has a single KFixedGridItem if no time is provided', () => {
    const { wrapper } = makeWrapper({
      notification,
      propsData: {
        showTime: false,
      },
    });
    const gridItems = wrapper.findAllComponents({ name: 'KFixedGridItem' });
    expect(gridItems.length).toEqual(1);
    expect(gridItems.at(0).props().span).toEqual(4);
  });

  it('has a second KFixedGridItem with the time if it is provided', () => {
    const { wrapper } = makeWrapper({
      notification,
      propsData: {
        showTime: true,
      },
    });
    const gridItems = wrapper.findAllComponents({ name: 'KFixedGridItem' });
    expect(gridItems.length).toEqual(2);
    expect(gridItems.at(0).props().span).toEqual(3);
    expect(gridItems.at(1).props().span).toEqual(1);

    const elapsedTime = wrapper.findComponent({ name: 'ElapsedTime' });
    const timeObject = new Date(notification.timestamp).getTime();
    expect(elapsedTime.props().date.getTime()).toEqual(timeObject);
  });

  const statusIconTestCases = [
    ['Started', 'clock'],
    ['HelpNeeded', 'help'],
    ['Completed', 'star'],
  ];

  it.each(statusIconTestCases)(
    'shows the correct status icon for %s events',
    (eventType, iconType) => {
      const { wrapper } = makeWrapper({
        notification: {
          ...notification,
          event: eventType,
        },
      });
      const icon = wrapper.findComponent({ name: 'CoachStatusIcon' });
      expect(icon.props().icon).toEqual(iconType);
    },
  );

  const contentIconTestCases = [
    ['Lesson', 'lesson'],
    ['Quiz', 'exam'],
    ['Resource', 'video'],
  ];

  it.each(contentIconTestCases)(
    'shows the correct content icon if the assignment is a %s',
    (objectType, iconKind) => {
      const { wrapper } = makeWrapper({
        notification: {
          ...notification,
          object: objectType,
          resource: {
            ...notification.resource,
            type: iconKind,
          },
        },
      });
      const contentIcon = wrapper.findComponent({ name: 'ContentIcon' });
      expect(contentIcon.props().kind).toEqual(iconKind);
    },
  );

  const headerTestCases = [
    // learnerContext | contentContext | expected header
    [{}, {}, ''],
    [{ name: 'Group 1', id: 'test_id', type: CollectionTypes.LEARNERGROUP }, {}, 'Group 1'],
    [
      { name: 'Group 1', id: 'test_id', type: CollectionTypes.LEARNERGROUP },
      { name: 'Lesson 1', type: 'Lesson', id: 'test_id' },
      'Group 1 • Lesson 1',
    ],
    [{}, { name: 'Lesson 1', type: 'Lesson', id: 'test_id' }, 'Lesson 1'],
  ];

  it.each(headerTestCases)(
    'formats the header message correctly when learnerContext: %s and contentContext: %s',
    (learnerContext, contentContext, expected) => {
      const { wrapper } = makeWrapper({
        notification: {
          ...notification,
          assignment: contentContext,
          collection: learnerContext,
        },
      });
      const header = wrapper.find('.context');
      expect(header.text()).toEqual(expected);
    },
  );
});
