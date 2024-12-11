import VueRouter from 'vue-router';

import { createLocalVue, shallowMount, mount } from '@vue/test-utils';
import flushPromises from 'flush-promises';
import KBreadcrumbs from 'kolibri-design-system/lib/KBreadcrumbs';
import { ContentNodeKinds } from 'kolibri/constants';
import { useDevicesWithFilter } from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import plugin_data from 'kolibri-plugin-data';
// eslint-disable-next-line import/named
import useBaseSearch, { useBaseSearchMock } from 'kolibri-common/composables/useBaseSearch';
// eslint-disable-next-line import/named
import useChannels, { useChannelsMock } from 'kolibri-common/composables/useChannels';
import makeStore from '../makeStore';
import CustomContentRenderer from '../../src/views/ChannelRenderer/CustomContentRenderer';
import { PageNames } from '../../src/constants';
import TopicsPage from '../../src/views/TopicsPage';
// eslint-disable-next-line import/named

jest.mock('kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices');
jest.mock('kolibri-plugin-data', () => {
  return {
    __esModule: true,
    default: {
      enableCustomChannelNav: jest.fn(() => false),
    },
  };
});

const CHANNEL_ID = 'channel-id';
const CHANNEL = {
  id: CHANNEL_ID,
  root: 'topic-id',
  name: 'channel',
  description: '',
};

const DEFAULT_TOPIC = {
  id: 'topic-id',
  title: 'topic',
  description: '',
  kind: ContentNodeKinds.TOPIC,
  is_leaf: false,
  channel_id: CHANNEL_ID,
  options: { modality: null },
  ancestors: [],
  parent: null,
  children: {
    results: [
      {
        title: 'child topic 1',
        kind: ContentNodeKinds.TOPIC,
        is_leaf: false,
        parent: 'topic-id',
        channel_id: CHANNEL_ID,
        options: { modality: null },
        ancestors: [{ id: 'topic-id', title: 'topic' }],
        children: {
          results: [
            { kind: ContentNodeKinds.VIDEO, is_leaf: true },
            { kind: ContentNodeKinds.VIDEO, is_leaf: true },
          ],
          more: null,
        },
      },
      {
        title: 'child topic 2',
        kind: ContentNodeKinds.TOPIC,
        is_leaf: false,
        parent: 'topic-id',
        channel_id: CHANNEL_ID,
        options: { modality: null },
        ancestors: [{ id: 'topic-id', title: 'topic' }],
        children: {
          results: [
            { kind: ContentNodeKinds.VIDEO, is_leaf: true },
            { kind: ContentNodeKinds.VIDEO, is_leaf: true },
          ],
          more: null,
        },
      },
    ],
    more: null,
  },
};

jest.mock('kolibri/client');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('kolibri/urls');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/composables/useBaseSearch');
jest.mock('../../src/composables/useContentLink');
jest.mock('kolibri-common/composables/useChannels');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
// Needed to test anything using mount() where children use this composable
jest.mock('../../src/composables/useLearningActivities');

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
    useBaseSearch.mockImplementation(() =>
      useBaseSearchMock({
        displayingSearchResults: false,
        results: [],
        search: jest.fn(),
        searchResults: [],
        searchQuery: '',
        searchLoading: false,
        searchError: null,
        currentRoute: jest.fn(() => ({ name: PageNames.TOPICS_TOPIC })),
      }),
    );

    useChannels.mockImplementation(() =>
      useChannelsMock({
        channelsMap: {
          [CHANNEL_ID]: CHANNEL,
        },
        fetchChannels: jest.fn(() => Promise.resolve([CHANNEL])),
      }),
    );

    ContentNodeResource.fetchTree.mockResolvedValue(DEFAULT_TOPIC);

    store = makeStore({
      getters: { isUserLoggedIn: jest.fn() },
    });
    store.state.core = {
      ...store.state.core,
      loading: false,
    };
    useDevicesWithFilter.mockReturnValue({
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

      useBaseSearch.mockImplementation(() => useBaseSearchMock());

      useKResponsiveWindow.mockImplementation(() => ({
        windowIsSmall: false,
        windowIsLarge: true,
      }));

      ContentNodeResource.fetchTree.mockResolvedValue({
        ...DEFAULT_TOPIC,
        options: { modality: 'CUSTOM_NAVIGATION' },
      });

      const wrapper = shallowMount(TopicsPage, {
        store: store,
        localVue,
        router,
      });
      await flushPromises();
      expect(wrapper.findComponent(CustomContentRenderer).exists()).toBe(true);
    });
  });

  describe('Displaying the header', () => {
    it('displays breadcrumbs when not on a small screen', async () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsSmall: false,
        windowIsLarge: true,
      }));
      const wrapper = shallowMount(TopicsPage, {
        store: store,
        localVue,
        router,
      });
      await flushPromises();
      expect(wrapper.find("[data-test='header-breadcrumbs']").exists()).toBe(true);
    });
  });

  it('displays the header with tabs when not on a small screen', async () => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
      windowIsLarge: true,
    }));
    const wrapper = shallowMount(TopicsPage, {
      store: store,
      localVue,
      router,
    });
    await flushPromises();
    expect(wrapper.findComponent({ name: 'TopicsHeader' }).exists()).toBe(true);
  });

  it('displays the topic title when page is not small', async () => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
      windowIsLarge: true,
    }));
    const wrapper = mount(TopicsPage, {
      store: store,
      localVue,
      router,
    });
    await flushPromises();
    expect(wrapper.find("[data-test='header-title']").element).toHaveTextContent(
      DEFAULT_TOPIC.title,
    );
  });

  it('displays the topic title when page is small', async () => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: true,
      windowIsLarge: false,
    }));
    const smallScreenWrapper = mount(TopicsPage, {
      store: store,
      localVue,
      router,
    });
    await flushPromises();
    expect(smallScreenWrapper.find("[data-test='mobile-title']").element).toHaveTextContent(
      DEFAULT_TOPIC.title,
    );
  });

  describe('showing cards', () => {
    let wrapper;
    beforeEach(async () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsSmall: true,
        windowIsLarge: false,
      }));
      wrapper = shallowMount(TopicsPage, {
        store: store,
        localVue,
        router,
        computed: {
          breadcrumbs: () => [{}],
        },
      });
      await flushPromises();
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

      beforeEach(async () => {
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

        useBaseSearch.mockImplementation(() =>
          useBaseSearchMock({
            displayingSearchResults: true, // true here
            results, // those we just made above
            search: jest.fn(),
            searchQuery: '',
            searchLoading: false,
            searchError: null,
          }),
        );

        useKResponsiveWindow.mockImplementation(() => ({
          windowIsSmall: true,
          windowIsLarge: false,
        }));

        wrapper = mount(TopicsPage, {
          store: store,
          localVue,
          router,
        });
        await flushPromises();
      });

      it('shows the search results', () => {
        searchResults = wrapper.find("[data-test='search-results']");
        expect(searchResults.exists()).toBe(true);
      });
    });

    describe('when not displaying search results', () => {
      it('displays a grid of cards with the topics and their chidlren', async () => {
        jest.clearAllMocks();

        useBaseSearch.mockImplementation(() =>
          useBaseSearchMock({
            displayingSearchResults: false,
            results: [],
            search: jest.fn(),
            searchQuery: '',
            searchLoading: false,
            searchError: null,
          }),
        );
        useKResponsiveWindow.mockImplementation(() => ({
          windowIsSmall: true,
          windowIsLarge: false,
        }));
        wrapper = mount(TopicsPage, {
          store: store,
          localVue,
          router,
          computed: {
            contentsForDisplay: () => {
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
        await flushPromises();
        expect(wrapper.find('[data-test="topics"]').element).toHaveTextContent('test-title-1');
        expect(wrapper.find('[data-test="topics"]').element).toHaveTextContent('test-title-2');
        expect(wrapper.find('[data-test="children-cards-grid"]').exists()).toBe(true);
      });
    });
  });
  describe('learn page breadcrumbs', () => {
    function getElements(wrapper) {
      return {
        breadcrumbs: () => wrapper.findComponent(KBreadcrumbs),
        breadcrumbItems: () => wrapper.findComponent(KBreadcrumbs).props().items,
      };
    }
    describe('when in Topic Browsing mode', () => {
      it('shows correct breadcrumbs at a Channel', async () => {
        const wrapper = mount(TopicsPage, {
          store: store,
          localVue,
          router,
        });
        await flushPromises();
        const { breadcrumbItems } = getElements(wrapper);
        const bcs = breadcrumbItems();
        expect(bcs.length).toEqual(1);
        expect(bcs[0].link).toEqual(undefined);
        expect(bcs[0].text).toEqual(CHANNEL.name);
      });

      it('shows correct breadcrumbs at a non-Channel Topic', async () => {
        ContentNodeResource.fetchTree.mockResolvedValue(DEFAULT_TOPIC.children.results[0]);
        useBaseSearch.mockImplementation(() =>
          useBaseSearchMock({
            displayingSearchResults: false,
            results: [],
            search: jest.fn(),
            searchResults: [],
            searchQuery: '',
            searchLoading: false,
            searchError: null,
            currentRoute: jest.fn(() => ({ name: PageNames.TOPICS_TOPIC_SEARCH })),
          }),
        );
        const wrapper = mount(TopicsPage, {
          store: store,
          localVue,
          router,
        });
        await flushPromises();
        const { breadcrumbItems } = getElements(wrapper);
        const bcs = breadcrumbItems();
        expect(bcs.length).toEqual(2);
        // Parent Channel Link
        expect(bcs[0].text).toEqual(CHANNEL.name);
        // Topic
        expect(bcs[1].text).toEqual(DEFAULT_TOPIC.children.results[0].title);
      });
    });

    // Not tested
    // breadcrumbs in Lessons Mode
  });
});
