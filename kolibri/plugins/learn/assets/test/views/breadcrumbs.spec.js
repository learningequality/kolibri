/* eslint-env mocha */
import Vue from 'vue-test';
import VueRouter from 'vue-router';
import assert from 'assert';
import Breadcrumbs from '../../src/views/breadcrumbs';
import { mount } from 'avoriaz';
import makeStore from '../util/makeStore';
import { PageNames } from '../../src/constants';
import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';

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
  return mount(Breadcrumbs, Object.assign(options, { router }));
}

function getElements(wrapper) {
  return {
    breadcrumbs: () => wrapper.find(kBreadcrumbs)[0],
    breadcrumbItems: () => wrapper.first(kBreadcrumbs).getProp('items'),
  };
}

describe('learn page breadcrumbs', () => {
  describe('when in Learn Page mode', () => {
    it('shows no breadcrumbs on Recommended page', () => {
      const store = makeStore({ pageName: PageNames.RECOMMENDED });
      const wrapper = makeWrapper({ store });
      const { breadcrumbs } = getElements(wrapper);
      assert.equal(breadcrumbs(), undefined);
    });

    it('shows correct breadcrumbs when on a Recommended Content Item', () => {
      const store = makeStore({ pageName: PageNames.RECOMMENDED_CONTENT });
      store.state.pageState.content = {
        title: 'Recommended Content Item',
      };
      const wrapper = makeWrapper({ store });
      const { breadcrumbItems } = getElements(wrapper);
      const bcs = breadcrumbItems();
      assert.equal(bcs.length, 2);
      assert.equal(bcs[0].link.name, PageNames.RECOMMENDED);
      // Content Item has no link, just text
      assert.equal(bcs[1].link, undefined);
      assert.equal(bcs[1].text, 'Recommended Content Item');
    });
  });

  describe('when in Topic Browsing mode', () => {
    it('shows no breadcrumbs on topics root (i.e. Channels)', () => {
      const store = makeStore({ pageName: PageNames.TOPICS_ROOT });
      const wrapper = makeWrapper({ store });
      const { breadcrumbs } = getElements(wrapper);
      assert.equal(breadcrumbs(), undefined);
    });

    it('shows correct breadcrumbs at a Channel', () => {
      const store = makeStore({ pageName: PageNames.TOPICS_CHANNEL });
      store.state.pageState.channel = {
        title: 'Recommended Channel',
      };
      const wrapper = makeWrapper({ store });
      const { breadcrumbItems } = getElements(wrapper);
      const bcs = breadcrumbItems();
      assert.equal(bcs.length, 2);
      assert.equal(bcs[0].link.name, PageNames.TOPICS_ROOT);
      assert.equal(bcs[1].link, undefined);
      assert.equal(bcs[1].text, 'Recommended Channel');
    });

    it('shows correct breadcrumbs at a non-Channel Topic', () => {
      const store = makeStore({ pageName: PageNames.TOPICS_TOPIC });
      store.state.pageState.channel = {
        title: 'Another Recommended Channel',
        root_id: 'another_channel',
      };
      store.state.pageState.topic = {
        title: 'Recommended Topic',
        breadcrumbs: [{ id: 'previous_topic', title: 'Previous Topic' }],
      };
      const wrapper = makeWrapper({ store });
      const { breadcrumbItems } = getElements(wrapper);
      const bcs = breadcrumbItems();
      assert.equal(bcs.length, 4);
      // All Channels Link
      assert.equal(bcs[0].link.name, PageNames.TOPICS_ROOT);
      assert.equal(bcs[0].text, 'Channels');
      // Parent Channel Link
      assert.equal(bcs[1].link.name, PageNames.TOPICS_CHANNEL);
      assert.equal(bcs[1].link.params.channel_id, 'another_channel');
      assert.equal(bcs[1].text, 'Another Recommended Channel');
      // Previous Topic Link
      assert.equal(bcs[2].link.name, PageNames.TOPICS_TOPIC);
      assert.equal(bcs[2].link.params.id, 'previous_topic');
      assert.equal(bcs[2].text, 'Previous Topic');
      // Topic
      assert.equal(bcs[3].link, undefined);
      assert.equal(bcs[3].text, 'Recommended Topic');
    });

    it('shows correct breadcrumbs at a Content Item', () => {
      const store = makeStore({ pageName: PageNames.TOPICS_CONTENT });
      store.state.pageState.channel = {
        title: 'Another Recommended Channel',
        root_id: 'another_channel',
      };
      store.state.pageState.content = {
        title: 'Recommended Item',
        breadcrumbs: [{ id: 'previous_topic', title: 'Previous Topic' }],
      };
      const wrapper = makeWrapper({ store });
      const { breadcrumbItems } = getElements(wrapper);
      const bcs = breadcrumbItems();
      assert.equal(bcs.length, 4);
      // All Channels Link
      assert.equal(bcs[0].link.name, PageNames.TOPICS_ROOT);
      assert.equal(bcs[0].text, 'Channels');
      // Channel Link
      assert.equal(bcs[1].link.name, PageNames.TOPICS_CHANNEL);
      assert.equal(bcs[1].link.params.channel_id, 'another_channel');
      assert.equal(bcs[1].text, 'Another Recommended Channel');
      // Previous Topic link
      assert.equal(bcs[2].link.name, PageNames.TOPICS_TOPIC);
      assert.equal(bcs[2].link.params.id, 'previous_topic');
      assert.equal(bcs[2].text, 'Previous Topic');
      // Content Item
      assert.equal(bcs[3].link, undefined);
      assert.equal(bcs[3].text, 'Recommended Item');
    });
  });
});
