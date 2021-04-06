import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import LessonResourceSelectionPage from '../index.vue';
import makeStore from '../../../../../test/makeStore';

const router = new VueRouter({
  routes: [
    { name: 'SUMMARY', path: '/summary' },
    { name: 'SELECT_RESOURCES', path: '/' },
    { name: 'SELECTION_ROOT', path: '/select' },
    { name: 'SELECTION', path: '/select/:topicId' },
    { name: 'SELECTION_SEARCH', path: '/search/:searchTerm' },
    { name: 'ReportsLessonReportPage', path: '/reportslessonreportpage' },
    { name: 'ReportsLessonLearnerListPage', path: '/reportslessonlearnerlistpage' },
  ],
});

router.getRoute = (name, params, query) => ({ name, params, query });

const slotDiv = {
  template: '<div><slot></slot></div>',
};

const store = makeStore();
store.state.toolbarRoute = { name: 'SUMMARY' };

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
        name: 'SELECTION',
        params: {
          topicId: 'last_topic_id',
        },
        // query.last_id should be deleted
        query: {
          ...filterValues,
        },
      });

      // If there is no last_id in query params, link to SELECTION_ROOT
      const noLastIdQuery = { ...filterValues };
      await router.replace({ query: noLastIdQuery });
      expect(button.props().to).toEqual({
        name: 'SELECTION_ROOT',
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
      store.state.pageName = 'SELECTION';
      router.replace({
        name: 'SELECTION',
        params: { topicId: 'topic_id' },
      });
      wrapper = makeWrapper().wrapper;
    });

    it('the breadcrumbs are visible and have the correct links', () => {
      const breadcrumbs = wrapper.findComponent({ name: 'ResourceSelectionBreadcrumbs' });
      expect(breadcrumbs.exists()).toBe(true);
      expect(breadcrumbs.props().channelsLink.name).toEqual('SELECTION_ROOT');
    });

    it('the bottom bar has the correct label and link if coming from reports page', async () => {
      const button = wrapper
        .findComponent({ name: 'BottomAppBar' })
        .findComponent({ name: 'KRouterLink' });

      expect(button.props().text).toEqual('Close');

      const exitRoute = () => button.props().to.name;
      // Exit link goes to Lesson Summary page by default
      expect(exitRoute()).toEqual('SUMMARY');

      // Exit link goes to report page if that's in the URL
      await router.replace({ query: { last: 'ReportsLessonReportPage' } });
      expect(exitRoute()).toEqual('ReportsLessonReportPage');

      await router.replace({ query: { last: 'ReportsLessonLearnerListPage' } });
      expect(exitRoute()).toEqual('ReportsLessonLearnerListPage');
    });
  });
});
