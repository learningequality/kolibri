import { shallowMount, mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';

import { PageNames } from '../../../../constants';
import ExploreChannels from '../index';

const localVue = createLocalVue();
localVue.use(VueRouter);

const TEST_CHANNELS = [
  {
    id: 'channel-1',
    name: 'Channel 1',
    root: 'root-1',
  },
  {
    id: 'channel-2',
    name: 'Channel 2',
    root: 'root-2',
  },
  {
    id: 'channel-3',
    name: 'Channel 3',
    root: 'root-3',
  },
  {
    id: 'channel-4',
    name: 'Channel 4',
    root: 'root-4',
  },
];

function getViewAllLink(wrapper) {
  return wrapper.find('[data-test="viewAllLink"]');
}

function getChannelsLinks(wrapper) {
  return wrapper.findAll('[data-test="channelLink"]');
}

function makeWrapper(propsData) {
  const router = new VueRouter({
    routes: [
      {
        name: PageNames.LIBRARY,
        path: '/library',
      },
      {
        name: PageNames.TOPICS_TOPIC,
        path: '/topics/t',
      },
    ],
  });
  router.push('/');

  return mount(ExploreChannels, {
    propsData,
    localVue,
    router,
  });
}

describe(`ExploreChannels`, () => {
  it(`smoke test`, () => {
    const wrapper = shallowMount(ExploreChannels);
    expect(wrapper.exists()).toBe(true);
  });

  describe(`when 'short' is falsy`, () => {
    it(`all channels are displayed`, () => {
      const wrapper = makeWrapper({ channels: TEST_CHANNELS });
      const links = getChannelsLinks(wrapper);
      expect(links.length).toBe(4);
      TEST_CHANNELS.forEach((testChannel, idx) => {
        expect(links.at(idx).text()).toBe(testChannel.name);
      });
    });

    it(`'View all' link is not displayed`, () => {
      const wrapper = makeWrapper({ channels: TEST_CHANNELS });
      expect(getViewAllLink(wrapper).exists()).toBe(false);
    });
  });

  describe(`when 'short' is truthy`, () => {
    it(`only first three channels are displayed`, () => {
      const wrapper = makeWrapper({ channels: TEST_CHANNELS, short: true });
      const links = getChannelsLinks(wrapper);
      expect(links.length).toBe(3);
      TEST_CHANNELS.slice(0, 3).forEach((testChannel, idx) => {
        expect(links.at(idx).find('.title').text()).toBe(testChannel.name);
      });
    });

    it(`'View all' link is not displayed when there are no more than three channels`, () => {
      const wrapper = makeWrapper({ channels: TEST_CHANNELS.slice(0, 3), short: true });
      expect(getViewAllLink(wrapper).exists()).toBe(false);
    });

    it(`'View all' link is displayed when there are more than three channels`, () => {
      const wrapper = makeWrapper({ channels: TEST_CHANNELS, short: true });
      expect(getViewAllLink(wrapper).exists()).toBe(true);
    });

    it(`clicking 'View all' link navigates to the library page`, () => {
      const wrapper = makeWrapper({ channels: TEST_CHANNELS, short: true });
      getViewAllLink(wrapper).trigger('click');
      expect(wrapper.vm.$route.name).toBe(PageNames.LIBRARY);
    });
  });

  it(`clicking a channel navigates to the channel page`, () => {
    const wrapper = makeWrapper({ channels: TEST_CHANNELS });
    expect(wrapper.vm.$route.path).toBe('/');
    getChannelsLinks(wrapper).at(0).trigger('click');
    expect(wrapper.vm.$route.name).toBe(PageNames.TOPICS_TOPIC);
    expect(wrapper.vm.$route.params).toEqual({ id: 'root-1' });
  });
});
