import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import makeStore from '../../../../../test/makeStore';
import ActivityList from '../ActivityList';
import notificationsResource from '../../../../apiResources/notifications';
import { LastPages } from '../../../../constants/lastPagesConstants';

const localVue = createLocalVue();
localVue.use(VueRouter);

// Need a fake route to test backLinkQuery method
const router = new VueRouter({
  routes: [
    {
      path: '/fakereport/:groupId/:learnerId',
      name: 'FakeReportPage',
    },
  ],
});

jest.mock('../../../../apiResources/notifications', () => {
  return {
    fetchCollection: jest.fn(),
  };
});

function makeWrapper(options) {
  const store = makeStore();
  store.state.classSummary.lessonMap = {
    lesson_1: {
      groups: [],
    },
  };

  const wrapper = mount(ActivityList, {
    store,
    localVue,
    router,
    propsData: {
      ...(options.propsData || {}),
    },
    stubs: {
      NotificationsFilter: {
        props: ['enabledFilters'],
        template: '<div></div>',
      },
      NotificationCard: {
        props: ['targetPage'],
        template: '<div></div>',
      },
    },
  });
  return { wrapper };
}

describe('ActivityList component', () => {
  beforeEach(() => {
    notificationsResource.fetchCollection.mockClear();
    notificationsResource.fetchCollection.mockResolvedValue({
      results: [],
      next: null,
    });
  });

  it('on first render, calls the notification resource with the parameters provided', async () => {
    const { wrapper } = makeWrapper({
      propsData: {
        notificationParams: {
          collection_id: 'class_001',
        },
      },
    });
    expect(notificationsResource.fetchCollection).toHaveBeenCalledWith({
      getParams: {
        collection_id: 'class_001',
        page_size: 10,
        page: 1,
      },
      force: true,
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.nextPage).toEqual(2);
  });

  it('shows an empty state when there are no notifications', async () => {
    const { wrapper } = makeWrapper({
      propsData: {
        noActivityString: 'No activity in this classroom',
      },
    });
    await wrapper.vm.$nextTick();
    const noActivity = wrapper.find('.notifications p');
    expect(noActivity.text()).toEqual('No activity in this classroom');
  });

  it('has a "show more" button if there are more pages of notifications', async () => {
    notificationsResource.fetchCollection.mockResolvedValue({
      results: [],
      next: 'http://more.stuff.com&page=2',
    });
    const { wrapper } = makeWrapper({});
    await wrapper.vm.$nextTick();
    const showMoreButton = wrapper.find({ name: 'KButton' });
    expect(showMoreButton.exists()).toEqual(true);
  });

  it('does not have a "show more" button if there are no more pages of notifications', async () => {
    notificationsResource.fetchCollection.mockResolvedValue({
      results: [],
      next: null,
    });
    const { wrapper } = makeWrapper({});
    await wrapper.vm.$nextTick();
    const showMoreButton = wrapper.find({ name: 'KButton' });
    expect(showMoreButton.exists()).toEqual(false);
  });

  it('disables the "show more" button if any filters are activated', async () => {
    const { wrapper } = makeWrapper({});
    const showMoreButton = () => wrapper.find({ name: 'KButton' });
    await wrapper.vm.$nextTick();
    wrapper.setData({
      loading: false,
      moreResults: true,
    });
    expect(showMoreButton().exists()).toBe(true);
    wrapper.setData({
      progressFilter: 'Completed',
    });
    expect(showMoreButton().exists()).toBe(false);
  });

  it('enables filters based on what is in the current notifications array', async () => {
    notificationsResource.fetchCollection.mockResolvedValue({
      results: [
        {
          lesson_id: 'lesson_1',
          object: 'Lesson',
          event: 'Started',
          contentnode_kind: 'video',
        },
        {
          lesson_id: 'lesson_1',
          object: 'Resource',
          event: 'Started',
          contentnode_kind: 'exercise',
        },
        {
          lesson_id: 'lesson_1',
          object: 'Resource',
          event: 'Completed',
          contentnode_kind: 'exercise',
        },
      ],
      next: null,
    });
    const { wrapper } = makeWrapper({});

    await wrapper.vm.$nextTick();

    const filters = wrapper.find({ name: 'NotificationsFilter' });
    // Logic is very simple: just find the unique values in the notifications
    // and disable anything that isn't there.
    expect(filters.props().enabledFilters.progress.sort()).toMatchObject(['Completed', 'Started']);
    expect(filters.props().enabledFilters.resource.sort()).toMatchObject([
      'Lesson',
      'Resource',
      'exercise',
      'video',
    ]);
  });

  it('appends the correct back link query to links, depending on the embedded page', async () => {
    notificationsResource.fetchCollection.mockResolvedValue({
      results: [
        {
          lesson_id: 'lesson_1',
          object: 'Lesson',
          event: 'Started',
          contentnode_kind: 'video',
        },
      ],
      next: null,
    });
    const { wrapper } = makeWrapper({});

    wrapper.setMethods({
      notificationLink: () => ({}),
      cardTextForNotification: () => '',
      cardPropsForNotification: n => ({ targetPage: n.targetPage }),
    });

    // Need to set up a route, since backLinkQuery depends on $route.params
    wrapper.vm.$router.push({
      name: 'FakeReportPage',
      params: {
        groupId: 'group_001',
        learnerId: 'learner_001',
      },
    });

    const notificationCard = () => wrapper.find({ name: 'NotificationCard' });

    // Need to simulate a refresh since the notifications are not reactively
    // updated when backLinkQuery changes
    function reloadNotifications() {
      wrapper.setData({
        notifications: [],
      });
      return wrapper.vm.fetchNotifications();
    }

    // Embed in Home Activity Page
    wrapper.setProps({
      embeddedPageName: 'HomeActivityPage',
    });
    await reloadNotifications();
    expect(notificationCard().props().targetPage.query).toEqual({
      last: LastPages.HOME_ACTIVITY,
    });

    // Embed in Learner Activity Page
    wrapper.setProps({
      embeddedPageName: 'ReportsLearnerActivityPage',
    });
    await reloadNotifications();
    expect(notificationCard().props().targetPage.query).toEqual({
      last: LastPages.LEARNER_ACTIVITY,
      last_id: 'learner_001',
    });

    // Embed in Group Activity Page
    wrapper.setProps({
      embeddedPageName: 'ReportsGroupActivityPage',
    });
    await reloadNotifications();
    expect(notificationCard().props().targetPage.query).toEqual({
      last: LastPages.GROUP_ACTIVITY,
      last_id: 'group_001',
    });
  });

  // Not tested:
  // Filtering NotificationCards
  // All props passed to NotificationCards
  // Live-updating notifications from coachNotifications module
});
