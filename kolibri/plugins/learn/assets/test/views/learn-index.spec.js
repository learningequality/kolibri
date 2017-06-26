/* eslint-env mocha */
import Vue from 'vue-test';
import VueRouter from 'vue-router';
import assert from 'assert';
import LearnIndex from '../../src/views/index.vue';
import makeStore from '../util/makeStore';
import coreBase from '../util/core-base.vue';

const router = new VueRouter({
  routes: [
    { path: '/learn', name: 'LEARN_CHANNEL' },
    { path: '/explore', name: 'EXPLORE_CHANNEL' },
    { path: '/exams', name: 'EXAM_LIST' }
  ]
});

function makeVm(options) {
  const Ctor = Vue.extend(LearnIndex);
  Object.assign(options, {
    components: {
      coreBase,
      'explore-page': '<div>Explore Page</div>',
      'content-unavailable-page': '<div>Content Unavailable</div>',
    },
    router,
  });
  return new Ctor(options).$mount();
}

function getElements(vm) {
  return {
    examLink: () => vm.$el.querySelector('li[name="exam-link"]'),
    tabLinks: () => vm.$el.querySelector('.tab-links'),
  };
}

describe('learn index', () => {
  let store;

  const setSessionUserKind = (kind) => {
    store.state.core.session.kind = [kind];
  };
  const setMemberships = (memberships) => {
    store.state.learnAppState.memberships = memberships;
  };
  const setPageName = (pageName) => {
    store.state.pageName = pageName;
  };

  beforeEach(() => {
    store = makeStore();
  });

  it('there are no tabs if showing content unavailable page', () => {
    setPageName('CONTENT_UNAVAILABLE');
    const vm = makeVm({ store });
    const { tabLinks } = getElements(vm);
    assert(tabLinks() === null);
  });

  it('the exam tab is available if user is logged in and has memberships', () => {
    // should work for any user 'kind' except for 'anonymous'
    setSessionUserKind('learner');
    setMemberships([{ id: 'membership_1' }]);
    const vm = makeVm({ store });
    const { examLink } = getElements(vm);
    assert(examLink() !== null);
  });

  it('the exam tab is not available if user is not logged in', () => {
    // in current implementation, anonymous user implies empty memberships
    setSessionUserKind('anonymous');
    setMemberships([]);
    const vm = makeVm({ store });
    const { examLink } = getElements(vm);
    assert(examLink() === null);
  });

  it('the exam tab is not available if user has no memberships/classes', () => {
    setSessionUserKind('learner');
    setMemberships([]);
    const vm = makeVm({ store });
    const { examLink } = getElements(vm);
    assert(examLink() === null);
  });
});
