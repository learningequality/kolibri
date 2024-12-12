import { shallowMount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import BookmarksResource from 'kolibri-common/apiResources/BookmarksResource';
import LessonResourceSelectionPage from '../index.vue';
import makeStore from '../../../../../test/makeStore';
import { PageNames } from '../../../../constants';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri-common/apiResources/BookmarksResource');
jest.mock('kolibri/composables/useUser');

const router = new VueRouter({
  routes: [
    { name: PageNames.LESSON_SUMMARY, path: '/summary' },
    { name: 'SELECT_RESOURCES', path: '/' },
    { name: 'LESSON_RESOURCE_SELECTION_ROOT', path: '/select' },
    { name: 'LESSON_RESOURCE_SELECTION', path: '/select/:topicId' },
    { name: 'LESSON_RESOURCE_SELECTION_SEARCH', path: '/search/:searchTerm' },
  ],
});

router.getRoute = (name, params, query) => ({ name, params, query });

const slotDiv = {
  template: '<div><slot></slot></div>',
};

const store = makeStore();
store.state.toolbarRoute = { name: PageNames.LESSON_SUMMARY };

function makeWrapper() {
  const wrapper = shallowMount(LessonResourceSelectionPage, {
    store,
    router,
    stubs: {
      CoachImmersivePage: slotDiv,
    },
  });
  return { wrapper };
}

describe('LessonResourceSelectionPage', () => {
  describe('in search mode', () => {
    let wrapper;

    const filterValues = {
      channel: 'channel',
      kind: 'kind',
      role: 'role',
    };

    beforeAll(() => {
      store.state.pageName = 'LESSON_RESOURCE_SELECTION_SEARCH';
      router.replace({
        name: 'LESSON_RESOURCE_SELECTION_SEARCH',
        params: { searchTerm: 'painting' },
        query: { last_id: 'last_topic_id', ...filterValues },
      });
      BookmarksResource.fetchCollection.mockResolvedValue([]);
      wrapper = makeWrapper().wrapper;
    });

    it('the filters are visible and have correct model values', () => {
      const filters = wrapper.findComponent({ name: 'LessonsSearchFilters' });
      expect(filters.props().value).toEqual(filterValues);
      expect(filters.props().searchTerm).toEqual('painting');
    });

    it('button on BottomAppBar has the correct label and link', async () => {
      const button = wrapper
        .findComponent({ name: 'BottomAppBar' })
        .findComponent({ name: 'KRouterLink' });

      expect(button.props().text).toEqual('Exit search');

      // If last_id is in URL, link back to the topic page
      expect(button.props().to).toEqual({
        name: 'LESSON_RESOURCE_SELECTION',
        params: {
          topicId: 'last_topic_id',
        },
        // query.last_id should be deleted
        query: {
          ...filterValues,
        },
      });

      // If there is no last_id in query params, link to LESSON_RESOURCE_SELECTION_ROOT
      const noLastIdQuery = { ...filterValues };
      await router.replace({ query: noLastIdQuery });
      expect(button.props().to).toEqual({
        name: 'LESSON_RESOURCE_SELECTION_ROOT',
        params: {},
        query: {
          ...filterValues,
        },
      });
    });
  });

  describe('in browse mode', () => {
    let wrapper;

    beforeAll(() => {
      store.state.pageName = 'LESSON_RESOURCE_SELECTION';
      router.replace({
        name: 'LESSON_RESOURCE_SELECTION',
        params: { topicId: 'topic_id' },
      });
      wrapper = makeWrapper().wrapper;
    });

    it('the breadcrumbs are visible and have the correct links', () => {
      const breadcrumbs = wrapper.findComponent({ name: 'ResourceSelectionBreadcrumbs' });
      expect(breadcrumbs.exists()).toBe(true);
      expect(breadcrumbs.props().channelsLink.name).toEqual('LESSON_RESOURCE_SELECTION_ROOT');
    });

    it('the bottom bar has the correct label and link if coming from reports page', async () => {
      const button = wrapper
        .findComponent({ name: 'BottomAppBar' })
        .findComponent({ name: 'KRouterLink' });

      expect(button.props().text).toEqual('Close');

      const exitRoute = () => button.props().to.name;
      // Exit link goes to Lesson Summary page by default
      expect(exitRoute()).toEqual(PageNames.LESSON_SUMMARY);

      // Exit link goes to report page if that's in the URL
      await router.replace({ query: { last: 'LESSON_SUMMARY' } });
      expect(exitRoute()).toEqual('LESSON_SUMMARY');
    });
  });
});
