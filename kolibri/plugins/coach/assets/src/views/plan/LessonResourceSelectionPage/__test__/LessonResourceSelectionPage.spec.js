import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import LessonResourceSelectionPage from '../index.vue';
import makeStore from '../../../../../test/makeStore';

const router = new VueRouter({
  routes: [
    { name: 'SELECT_RESOURCES', path: '/' },
    { name: 'SELECTION_ROOT', path: '/select' },
    { name: 'SELECTION', path: '/select/:topicId' },
    { name: 'SELECTION_SEARCH', path: '/search/:searchTerm' },
  ],
});

router.getRoute = (name, params, query) => ({ name, params, query });

const slotDiv = {
  template: '<div><slot></slot></div>',
};

const store = makeStore();

function makeWrapper() {
  const wrapper = mount(LessonResourceSelectionPage, {
    store,
    router,
    stubs: {
      CoreBase: slotDiv,
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
      store.state.pageName = 'SELECTION_SEARCH';
      router.replace({
        name: 'SELECTION_SEARCH',
        params: { searchTerm: 'painting' },
        query: { last_id: 'last_topic_id', ...filterValues },
      });
      wrapper = makeWrapper().wrapper;
    });

    it('the filters are visible and have correct model values', () => {
      const filters = wrapper.findComponent({ name: 'LessonsSearchFilters' });
      expect(filters.exists()).toBe(true);
      expect(filters.props().value).toEqual(filterValues);
    });

    it('button on BottomAppBar has the correct label and link', () => {
      const button = wrapper
        .findComponent({ name: 'BottomAppBar' })
        .findComponent({ name: 'KRouterLink' });

      expect(button.props().text).toEqual('Exit search');
      expect(button.props().to).toEqual({
        name: 'SELECTION',
        params: {
          topicId: 'last_topic_id',
        },
        // query.last_id should be deleted
        query: {
          ...filterValues,
        },
      });
    });
  });
});
