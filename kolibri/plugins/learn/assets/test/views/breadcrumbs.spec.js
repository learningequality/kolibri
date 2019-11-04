import VueRouter from 'vue-router';
import KBreadcrumbs from 'kolibri-components/src/KBreadcrumbs';
import { mount, createLocalVue } from '@vue/test-utils';
import Breadcrumbs from '../../src/views/Breadcrumbs';
import makeStore from '../makeStore';
import { PageNames } from '../../src/constants';

const localVue = createLocalVue();
localVue.use(VueRouter);

const router = new VueRouter({
  routes: [
    { path: '/recommended', name: PageNames.RECOMMENDED },
    { path: '/channels', name: PageNames.TOPICS_ROOT },
    {
      path: '/topics/c/:id',
      name: PageNames.TOPICS_CONTENT,
    },
    {
      path: '/topics/t/:id',
      name: PageNames.TOPICS_TOPIC,
    },
    {
      path: '/topics/:channel_id',
      name: PageNames.TOPICS_CHANNEL,
    },
  ],
});

function makeWrapper(options = {}) {
  return mount(Breadcrumbs, { ...options, localVue, router });
}

function getElements(wrapper) {
  return {
    breadcrumbs: () => wrapper.find(KBreadcrumbs),
    breadcrumbItems: () => wrapper.find(KBreadcrumbs).props().items,
  };
}

describe('learn page breadcrumbs', () => {
  describe('when in Topic Browsing mode', () => {
    it('shows no breadcrumbs on topics root (i.e. Channels)', () => {
      const store = makeStore({ pageName: PageNames.TOPICS_ROOT });
      const wrapper = makeWrapper({ store });
      const { breadcrumbs } = getElements(wrapper);
      expect(breadcrumbs().exists()).toEqual(false);
    });

    it('shows correct breadcrumbs at a Channel', () => {
      const store = makeStore({ pageName: PageNames.TOPICS_CHANNEL });
      store.state.topicsTree.channel = {
        title: 'Recommended Channel',
      };
      const wrapper = makeWrapper({ store });
      const { breadcrumbItems } = getElements(wrapper);
      const bcs = breadcrumbItems();
      expect(bcs.length).toEqual(2);
      expect(bcs[0].link.name).toEqual(PageNames.TOPICS_ROOT);
      expect(bcs[1].link).toEqual(undefined);
      expect(bcs[1].text).toEqual('Recommended Channel');
    });

    it('shows correct breadcrumbs at a non-Channel Topic', () => {
      const store = makeStore({ pageName: PageNames.TOPICS_TOPIC });
      store.state.topicsTree.channel = {
        title: 'Another Recommended Channel',
        root_id: 'another_channel',
      };
      store.state.topicsTree.topic = {
        title: 'Recommended Topic',
        breadcrumbs: [{ id: 'previous_topic', title: 'Previous Topic' }],
      };
      const wrapper = makeWrapper({ store });
      const { breadcrumbItems } = getElements(wrapper);
      const bcs = breadcrumbItems();
      expect(bcs.length).toEqual(4);
      // All Channels Link
      expect(bcs[0].link.name).toEqual(PageNames.TOPICS_ROOT);
      expect(bcs[0].text).toEqual('Channels');
      // Parent Channel Link
      expect(bcs[1].link.name).toEqual(PageNames.TOPICS_CHANNEL);
      expect(bcs[1].link.params.channel_id).toEqual('another_channel');
      expect(bcs[1].text).toEqual('Another Recommended Channel');
      // Previous Topic Link
      expect(bcs[2].link.name).toEqual(PageNames.TOPICS_TOPIC);
      expect(bcs[2].link.params.id).toEqual('previous_topic');
      expect(bcs[2].text).toEqual('Previous Topic');
      // Topic
      expect(bcs[3].link).toEqual(undefined);
      expect(bcs[3].text).toEqual('Recommended Topic');
    });

    it('shows correct breadcrumbs at a Content Item', () => {
      const store = makeStore({ pageName: PageNames.TOPICS_CONTENT });
      store.state.topicsTree.channel = {
        title: 'Another Recommended Channel',
        root_id: 'another_channel',
      };
      store.state.topicsTree.content = {
        title: 'Recommended Item',
        breadcrumbs: [{ id: 'previous_topic', title: 'Previous Topic' }],
      };
      const wrapper = makeWrapper({ store });
      const { breadcrumbItems } = getElements(wrapper);
      const bcs = breadcrumbItems();
      expect(bcs.length).toEqual(4);
      // All Channels Link
      expect(bcs[0].link.name).toEqual(PageNames.TOPICS_ROOT);
      expect(bcs[0].text).toEqual('Channels');
      // Channel Link
      expect(bcs[1].link.name).toEqual(PageNames.TOPICS_CHANNEL);
      expect(bcs[1].link.params.channel_id).toEqual('another_channel');
      expect(bcs[1].text).toEqual('Another Recommended Channel');
      // Previous Topic link
      expect(bcs[2].link.name).toEqual(PageNames.TOPICS_TOPIC);
      expect(bcs[2].link.params.id).toEqual('previous_topic');
      expect(bcs[2].text).toEqual('Previous Topic');
      // Content Item
      expect(bcs[3].link).toEqual(undefined);
      expect(bcs[3].text).toEqual('Recommended Item');
    });
  });

  // Not tested
  // breadcrumbs in Lessons Mode
});
