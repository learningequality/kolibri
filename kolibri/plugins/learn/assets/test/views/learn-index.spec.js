/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import VueRouter from 'vue-router';
import assert from 'assert';
import LearnIndex from '../../src/views/index.vue';
import makeStore from '../util/makeStore';
import { mount } from '@vue/test-utils';

const router = new VueRouter({
  routes: [
    { path: '/recommended', name: 'RECOMMENDED' },
    { path: '/topics', name: 'TOPICS_ROOT' },
    { path: '/classes', name: 'ALL_CLASSES' },
  ],
});

function makeWrapper(options) {
  return mount(LearnIndex, {
    ...options,
    stubs: {
      coreBase: '<div><slot></slot></div>',
      topicsPage: true,
      contentUnavailablePage: true,
    },
    router,
  });
}

function getElements(wrapper) {
  return {
    // hrefs need to match the routes in the mock router above
    classesLink: () => wrapper.find('[href="#/classes"]'),
    recommendedLink: () => wrapper.find('[href="#/recommended"]'),
    topicsLink: () => wrapper.find('[href="#/topics"]'),
    tabLinks: () => wrapper.findAll({ name: 'kNavbarLink' }),
  };
}

describe('learn plugin index page', () => {
  let store;

  const setSessionUserKind = kind => {
    store.state.core.session.kind = [kind];
  };
  const setMemberships = memberships => {
    store.state.learnAppState.memberships = memberships;
  };
  const setPageName = pageName => {
    store.state.pageName = pageName;
  };

  beforeEach(() => {
    store = makeStore();
  });

  it('there are no tabs if showing content unavailable page', () => {
    setPageName('CONTENT_UNAVAILABLE');
    const wrapper = makeWrapper({ store });
    const { tabLinks } = getElements(wrapper);
    assert.equal(tabLinks().length, 0);
  });

  it('the recommended and channel links are always available to everybody', () => {
    setSessionUserKind('anonymous');
    setMemberships([]);
    const wrapper = makeWrapper({ store });
    const { tabLinks, recommendedLink, topicsLink } = getElements(wrapper);
    assert.equal(tabLinks().length, 2);
    assert(recommendedLink().is('a'));
    assert(topicsLink().is('a'));
  });

  it('the classes tab is available if user is logged in and has memberships', () => {
    // should work for any user 'kind' except for 'anonymous'
    setSessionUserKind('learner');
    setMemberships([{ id: 'membership_1' }]);
    const wrapper = makeWrapper({ store });
    const { classesLink, tabLinks } = getElements(wrapper);
    assert.equal(tabLinks().length, 3);
    assert(classesLink().is('a'));
  });

  it('the classes tab is not available if user is not logged in', () => {
    // in current implementation, anonymous user implies empty memberships
    setSessionUserKind('anonymous');
    setMemberships([]);
    const wrapper = makeWrapper({ store });
    const { classesLink, tabLinks } = getElements(wrapper);
    assert.equal(tabLinks().length, 2);
    assert(!classesLink().exists());
  });

  it('the classes tab is not available if user has no memberships/classes', () => {
    setSessionUserKind('learner');
    setMemberships([]);
    const wrapper = makeWrapper({ store });
    const { classesLink, tabLinks } = getElements(wrapper);
    assert.equal(tabLinks().length, 2);
    assert(!classesLink().exists());
  });
});
