/* eslint-env mocha */
import Vue from 'vue-test';
import VueRouter from 'vue-router';
import assert from 'assert';
import LearnIndex from '../../src/views/index.vue';
import makeStore from '../util/makeStore';
import SlottedDiv from '../util/SlottedDiv.vue';
import { mount } from 'avoriaz';

const router = new VueRouter({
  routes: [
    { path: '/recommended', name: 'RECOMMENDED' },
    { path: '/topics', name: 'TOPICS_ROOT' },
    { path: '/exams', name: 'EXAM_LIST' },
  ],
});

function makeWrapper(options) {
  Object.assign(options, {
    components: {
      coreBase: SlottedDiv,
      topicsPage: '<div>Topics Page</div>',
      contentUnavailablePage: '<div>Content Unavailable</div>',
    },
    router,
  });
  return mount(LearnIndex, options);
}

function getElements(wrapper) {
  return {
    // hrefs need to match the routes in the mock router above
    examLink: () => wrapper.find('[href="#/exams"]')[0],
    recommendedLink: () => wrapper.find('[href="#/recommended"]')[0],
    topicsLink: () => wrapper.find('[href="#/topics"]')[0],
    tabLinks: () => wrapper.find('.k-navbar-links')[0],
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
    assert(tabLinks() === undefined);
  });

  it('the recommended and channel links are always available to everybody', () => {
    setSessionUserKind('anonymous');
    setMemberships([]);
    const wrapper = makeWrapper({ store });
    const { tabLinks, recommendedLink, topicsLink } = getElements(wrapper);
    assert(tabLinks() !== undefined);
    assert(recommendedLink() !== undefined);
    assert(topicsLink() !== undefined);
  });

  it('the exam tab is available if user is logged in and has memberships', () => {
    // should work for any user 'kind' except for 'anonymous'
    setSessionUserKind('learner');
    setMemberships([{ id: 'membership_1' }]);
    const wrapper = makeWrapper({ store });
    const { examLink, tabLinks } = getElements(wrapper);
    assert(tabLinks() !== undefined);
    assert(examLink() !== undefined);
  });

  it('the exam tab is not available if user is not logged in', () => {
    // in current implementation, anonymous user implies empty memberships
    setSessionUserKind('anonymous');
    setMemberships([]);
    const wrapper = makeWrapper({ store });
    const { examLink, tabLinks } = getElements(wrapper);
    assert(tabLinks() !== undefined);
    assert(examLink() === undefined);
  });

  it('the exam tab is not available if user has no memberships/classes', () => {
    setSessionUserKind('learner');
    setMemberships([]);
    const wrapper = makeWrapper({ store });
    const { examLink, tabLinks } = getElements(wrapper);
    assert(tabLinks() !== undefined);
    assert(examLink() === undefined);
  });
});
