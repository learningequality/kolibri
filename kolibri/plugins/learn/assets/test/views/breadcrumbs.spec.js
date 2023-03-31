import VueRouter from 'vue-router';
import KBreadcrumbs from 'kolibri-design-system/lib/KBreadcrumbs';
import { mount, createLocalVue } from '@vue/test-utils';
import TopicsPage from '../../src/views/TopicsPage';
import makeStore from '../makeStore';
import { PageNames } from '../../src/constants';

jest.mock('kolibri.resources');
jest.mock('plugin_data', () => {
  return {
    __esModule: true,
    default: {
      accessibilityLabels: [],
      gradeLevels: [],
      learnerNeeds: [],
      languages: [],
      channels: [],
    },
  };
});

jest.mock('../../src/composables/useChannels');
jest.mock('../../src/composables/useContentLink');
jest.mock('../../src/composables/useSearch');

const localVue = createLocalVue();
localVue.use(VueRouter);

const router = new VueRouter({
  routes: [
    { path: '/recommended', name: PageNames.RECOMMENDED },
    { path: '/library', name: PageNames.LIBRARY },
    {
      path: '/topics/c/:id',
      name: PageNames.TOPICS_CONTENT,
    },
    {
      path: '/topics/t/:id',
      name: PageNames.TOPICS_TOPIC,
    },
    {
      path: '/topics/t/:id/search',
      name: PageNames.TOPICS_TOPIC_SEARCH,
    },
  ],
});

function makeWrapper(options = {}) {
  return mount(TopicsPage, { ...options, localVue, router });
}

function getElements(wrapper) {
  return {
    breadcrumbs: () => wrapper.findComponent(KBreadcrumbs),
    breadcrumbItems: () => wrapper.findComponent(KBreadcrumbs).props().items,
  };
}

describe('learn page breadcrumbs', () => {
  describe('when in Topic Browsing mode', () => {
    it('shows no breadcrumbs on topics root (i.e. Channels)', () => {
      const store = makeStore({ pageName: PageNames.LIBRARY });
      store.state.core.loading = false;
      const wrapper = makeWrapper({ store });
      const { breadcrumbs } = getElements(wrapper);
      expect(breadcrumbs().exists()).toEqual(false);
    });

    it('shows correct breadcrumbs at a Channel', () => {
      const store = makeStore({ pageName: PageNames.TOPICS_TOPIC });
      store.state.core.loading = false;
      store.state.topicsTree.channel = {
        id: 'channel-1',
        root: 'root-1',
        name: 'Recommended Channel',
      };
      store.state.topicsTree.topic = {
        title: 'Recommended Channel Root Node',
        ancestors: [],
        channel_id: 'channel-1',
        id: 'topic-1',
      };
      const wrapper = makeWrapper({ store });
      const { breadcrumbItems } = getElements(wrapper);
      const bcs = breadcrumbItems();
      expect(bcs.length).toEqual(1);
      expect(bcs[0].link).toEqual(undefined);
      expect(bcs[0].text).toEqual('Recommended Channel');
    });

    it('shows correct breadcrumbs at a non-Channel Topic', () => {
      const store = makeStore({ pageName: PageNames.TOPICS_TOPIC });
      store.state.core.loading = false;
      store.state.topicsTree.channel = {
        id: 'channel-1',
        root: 'root-1',
        name: 'Another Recommended Channel',
      };
      store.state.topicsTree.topic = {
        title: 'Recommended Topic',
        channel_id: 'channel-1',
        ancestors: [
          { id: 'root-1', title: 'a root node!' },
          { id: 'previous_topic', title: 'Previous Topic' },
        ],
      };
      const wrapper = makeWrapper({ store });
      const { breadcrumbItems } = getElements(wrapper);
      const bcs = breadcrumbItems();
      expect(bcs.length).toEqual(3);
      // Parent Channel Link
      expect(bcs[0].text).toEqual('Another Recommended Channel');
      // Previous Topic Link
      expect(bcs[1].text).toEqual('Previous Topic');
      // Topic
      expect(bcs[2].link).toEqual(undefined);
      expect(bcs[2].text).toEqual('Recommended Topic');
    });
  });

  // Not tested
  // breadcrumbs in Lessons Mode
});
