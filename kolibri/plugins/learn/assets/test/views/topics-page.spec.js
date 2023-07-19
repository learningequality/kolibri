import VueRouter from 'vue-router';

import { createLocalVue, shallowMount, mount } from '@vue/test-utils';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { useDevicesWithFacility } from 'kolibri.coreVue.componentSets.sync';
import plugin_data from 'plugin_data';
import makeStore from '../makeStore';
import CustomContentRenderer from '../../src/views/ChannelRenderer/CustomContentRenderer';
import { PageNames } from '../../src/constants';
import TopicsPage from '../../src/views/TopicsPage';
// eslint-disable-next-line import/named
import useSearch, { useSearchMock } from '../../src/composables/useSearch';

jest.mock('kolibri.coreVue.componentSets.sync');
jest.mock('plugin_data', () => {
  return {
    __esModule: true,
    default: {
      accessibilityLabels: [],
      gradeLevels: [],
      enableCustomChannelNav: jest.fn(() => false),
      learnerNeeds: [],
      languages: [],
    },
  };
});

jest.mock('../../src/composables/useContentLink');
jest.mock('../../src/composables/useSearch');
// Needed to test anything using mount() where children use this composable
jest.mock('../../src/composables/useLearningActivities');

useSearch.mockImplementation(() => ({
  displayingSearchResults: false,
  results: [],
  search: jest.fn(),
  searchResults: [],
  searchQuery: '',
  searchLoading: false,
  searchError: null,
}));

const localVue = createLocalVue();
localVue.use(VueRouter);

const router = new VueRouter({
  routes: [
    // Use actual routes to avoid flooding of warning logs
    { path: '/topics_topic', name: PageNames.TOPICS_TOPIC },
    { path: '/topics_topic_search', name: PageNames.TOPICS_TOPIC_SEARCH },
  ],
});

describe('TopicsPage', () => {
  let store;

  beforeEach(() => {
    store = makeStore({
      getters: { isUserLoggedIn: jest.fn() },
    });
    store.state.topicsTree.topic = {
      ...store.state.topicsTree.topic,
      options: { modality: null },
    };
    store.state.core = {
      ...store.state.core,
      loading: false,
    };
    useDevicesWithFacility.mockReturnValue({
      devices: [
        {
          id: '1',
          available: true,
        },
      ],
    });
  });

  describe('When current topic modality is CUSTOM_NAVIGATION and custom channel nav is enabled', () => {
    it('renders a CustomContentRenderer', async () => {
      plugin_data.enableCustomChannelNav.mockImplementation(() => true);

      useSearch.mockImplementation(() => useSearchMock());

      store.state.topicsTree.topic = {
        ...store.state.topicsTree.topic,
        options: { modality: 'CUSTOM_NAVIGATION' },
      };

      const wrapper = shallowMount(TopicsPage, {
        store: store,
        localVue,
        router,
      });
      expect(wrapper.findComponent(CustomContentRenderer).exists()).toBe(true);
    });
  });

  describe('Displaying the header', () => {
    it('displays breadcrumbs when not on a small screen', () => {
      const wrapper = shallowMount(TopicsPage, {
        store: store,
        localVue,
        router,
        computed: { windowIsSmall: () => false },
      });

      expect(wrapper.find("[data-test='header-breadcrumbs']").exists()).toBe(true);
    });
  });

  it('displays the header with tabs when on a large screen', () => {
    const wrapper = shallowMount(TopicsPage, {
      store: store,
      localVue,
      router,
      computed: { windowIsLarge: () => true },
    });

    expect(wrapper.findComponent({ name: 'TopicsHeader' }).exists()).toBe(true);
  });

  it('displays the topic title when page is medium - large', () => {
    store.state.topicsTree.topic.title = 'Test Title';
    const wrapper = mount(TopicsPage, {
      store: store,
      localVue,

      router,
    });
    expect(wrapper.find("[data-test='header-title']").element).toHaveTextContent('Test Title');
  });

  it('displays the topic title when page is small', () => {
    store.state.topicsTree.topic.title = 'Test Title';
    const smallScreenWrapper = mount(TopicsPage, {
      store: store,
      localVue,
      router,
      computed: { windowIsSmall: () => true },
    });

    expect(smallScreenWrapper.find("[data-test='mobile-title']").element).toHaveTextContent(
      'Test Title'
    );
  });

  describe('showing cards', () => {
    let wrapper;
    beforeEach(() => {
      store.state.topicsTree.contents = [
        {
          kind: ContentNodeKinds.TOPIC,
          is_leaf: false,
          children: {
            results: [
              { kind: ContentNodeKinds.VIDEO, is_leaf: true },
              { kind: ContentNodeKinds.VIDEO, is_leaf: true },
            ],
          },
        },
        {
          kind: ContentNodeKinds.TOPIC,
          is_leaf: false,
          children: {
            results: [
              { kind: ContentNodeKinds.VIDEO, is_leaf: true },
              { kind: ContentNodeKinds.VIDEO, is_leaf: true },
            ],
          },
        },
      ];
      wrapper = shallowMount(TopicsPage, {
        store: store,
        localVue,
        router,
        computed: {
          windowIsLarge: () => false,
          windowIsSmall: () => true,
          breadcrumbs: () => [{}],
        },
      });
    });

    it('shows breadcrumbs when screen is small', () => {
      expect(wrapper.find("[data-test='mobile-breadcrumbs']").exists()).toBe(true);
    });
    it('displays filter buttons when screen is not large', () => {
      expect(wrapper.find("[data-test='filter-button']").exists()).toBe(true);
    });
    it('displays folders button when there are topics and the screen is not large', () => {
      expect(wrapper.find("[data-test='folders-button']").exists()).toBe(true);
    });

    describe('when showing search results', () => {
      let results;
      let wrapper;
      let searchResults;

      beforeAll(() => {
        results = [
          {
            id: '1',
            title: 'Test Title 1',
            description: 'Test Description',
            kind: ContentNodeKinds.VIDEO,
          },
          {
            id: '2',
            title: 'Test Title 2',
            description: 'Test Description',
            kind: ContentNodeKinds.VIDEO,
          },
          {
            id: '3',
            title: 'Test Title 3',
            description: 'Test Description',
            kind: ContentNodeKinds.VIDEO,
          },
        ];

        jest.clearAllMocks();

        useSearch.mockImplementation(() => ({
          displayingSearchResults: true, // true here
          results, // those we just made above
          search: jest.fn(),
          searchQuery: '',
          searchLoading: false,
          searchError: null,
        }));

        wrapper = mount(TopicsPage, {
          store: store,
          localVue,
          router,

          computed: {
            windowIsLarge: () => false,
            windowIsSmall: () => true,
          },
        });
      });

      it('shows the search results', () => {
        searchResults = wrapper.find("[data-test='search-results']");
        expect(searchResults.exists()).toBe(true);
      });
    });

    describe('when not displaying search results', () => {
      it('displays a grid of cards with the topics and their chidlren', () => {
        jest.clearAllMocks();

        useSearch.mockImplementation(() => ({
          displayingSearchResults: false,
          results: [],
          search: jest.fn(),
          searchQuery: '',
          searchLoading: false,
          searchError: null,
        }));
        wrapper = mount(TopicsPage, {
          store: store,
          localVue,
          router,
          computed: {
            windowIsLarge: () => false,
            windowIsSmall: () => true,
            topicsForDisplay: () => {
              return [
                {
                  id: '1',
                  title: 'test-title-1',
                  kind: ContentNodeKinds.TOPIC,
                  children: [
                    {
                      id: '1-1',
                      title: 'test-child-1',
                      kind: ContentNodeKinds.VIDEO,
                    },
                  ],
                },
                {
                  id: '2',
                  title: 'test-title-2',
                  kind: ContentNodeKinds.TOPIC,
                  children: [
                    {
                      id: '2-1',
                      title: 'test-child-2',
                      kind: ContentNodeKinds.VIDEO,
                    },
                  ],
                },
              ];
            },
          },
        });
        expect(wrapper.find('[data-test="topics"]').element).toHaveTextContent('test-title-1');
        expect(wrapper.find('[data-test="topics"]').element).toHaveTextContent('test-title-2');
        expect(wrapper.find('[data-test="children-cards-grid"]').exists()).toBe(true);
      });
    });
  });
});
