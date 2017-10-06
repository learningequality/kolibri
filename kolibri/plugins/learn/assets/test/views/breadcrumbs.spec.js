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

describe.only('learn page breadcrumbs', () => {
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
      assert.equal(breadcrumbItems()[0].link.name, PageNames.RECOMMENDED);
      // Content Item has no link, just text
      assert.equal(breadcrumbItems()[1].link, undefined);
      assert.equal(breadcrumbItems()[1].text, 'Recommended Content Item');
    });
  });

  describe('when in Topic Browsing mode', () => {
    it('shows no breadcrumbs on topic root', () => {
      const store = makeStore({ pageName: PageNames.TOPICS_ROOT });
      const wrapper = makeWrapper({ store });
      const { breadcrumbs } = getElements(wrapper);
      assert.equal(breadcrumbs(), undefined);
    });
  })
});
