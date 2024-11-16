import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import makeStore from '../../../../../test/makeStore';
import ActivityList from '../ActivityList';
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

function makeWrapper(options) {
  const fetchMock = jest.fn(() => Promise.resolve(Boolean(options.moreResults)));
  const store = makeStore({
    coachNotifications: {
      namespaced: true,
      state: {
        currentClassroomId: 'classroom_id_test',
        notifications: [],
      },
      actions: {
        moreNotificationsForClass: fetchMock,
      },
      getters: {
        allNotifications() {
          return options.results || [];
        },
      },
    },
  });
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
        name: 'NotificationsFilter',
        props: ['enabledFilters'],
        template: '<div></div>',
      },
      NotificationCard: {
        name: 'NotificationCard',
        props: ['targetPage'],
        template: '<div></div>',
      },
      transition: {
        name: 'transition',
        template: '<div><slot></slot></div>',
      },
    },
  });
  return { fetchMock, wrapper };
}

describe('ActivityList component', () => {
  it('on first render, calls the notification resource', async () => {
    const { fetchMock, wrapper } = makeWrapper({});
    await global.flushPromises();
    expect(fetchMock).toHaveBeenCalled();
    expect(wrapper.vm.moreResults).toBe(false);
  });

  it('shows an empty state when there are no notifications', async () => {
    const { wrapper } = makeWrapper({
      propsData: {
        noActivityString: 'No activity in this classroom',
      },
    });
    await global.flushPromises();
    const noActivity = wrapper.find('.notifications p');
    expect(noActivity.text()).toEqual('No activity in this classroom');
  });

  it('has a "show more" button if there are more pages of notifications', async () => {
    const { wrapper } = makeWrapper({ moreResults: true });
    await global.flushPromises();
    const showMoreButton = wrapper.findComponent({ name: 'KButton' });
    expect(showMoreButton.exists()).toEqual(true);
  });

  it('does not have a "show more" button if there are no more pages of notifications', async () => {
    const { wrapper } = makeWrapper({});
    await global.flushPromises();
    const showMoreButton = wrapper.findComponent({ name: 'KButton' });
    expect(showMoreButton.exists()).toEqual(false);
  });

  it('disables the "show more" button if any filters are activated', async () => {
    const { wrapper } = makeWrapper({});
    const showMoreButton = () => wrapper.findComponent({ name: 'KButton' });
    await global.flushPromises();
    wrapper.setData({
      loading: false,
      moreResults: true,
    });
    await wrapper.vm.$nextTick();
    expect(showMoreButton().exists()).toBe(true);
    wrapper.setData({
      progressFilter: 'Completed',
    });
    await wrapper.vm.$nextTick();
    expect(showMoreButton().exists()).toBe(false);
  });

  it('enables filters based on what is in the current notifications array', async () => {
    const { wrapper } = makeWrapper({
      results: [
        {
          lesson_id: 'lesson_1',
          object: 'Lesson',
          event: 'Started',
          resource: {
            type: 'video',
          },
          assignment_collections: [],
        },
        {
          lesson_id: 'lesson_1',
          object: 'Resource',
          event: 'Started',
          resource: {
            type: 'exercise',
          },
          assignment_collections: [],
        },
        {
          lesson_id: 'lesson_1',
          object: 'Resource',
          event: 'Completed',
          resource: {
            type: 'exercise',
          },
          assignment_collections: [],
        },
      ],
    });

    await global.flushPromises();

    const filters = wrapper.findComponent({ name: 'NotificationsFilter' });
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
    const { wrapper } = makeWrapper({
      results: [
        {
          lesson_id: 'lesson_1',
          object: 'Lesson',
          event: 'Started',
          contentnode_kind: 'video',
          assignment_collections: [],
        },
      ],
    });

    // Need to set up a route, since backLinkQuery depends on $route.params
    await wrapper.vm.$router.push({
      name: 'FakeReportPage',
      params: {
        groupId: 'group_001',
        learnerId: 'learner_001',
      },
    });

    // Embed in Home Activity Page
    wrapper.setProps({
      embeddedPageName: 'HomeActivityPage',
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.backLinkQuery).toEqual({
      last: LastPages.HOME_ACTIVITY,
    });

    // Embed in Learner Activity Page
    wrapper.setProps({
      embeddedPageName: 'ReportsLearnerActivityPage',
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.backLinkQuery).toEqual({
      last: LastPages.LEARNER_ACTIVITY,
      last_id: 'learner_001',
    });
  });

  // Not tested:
  // Filtering NotificationCards
  // All props passed to NotificationCards
  // Live-updating notifications from coachNotifications module
});
