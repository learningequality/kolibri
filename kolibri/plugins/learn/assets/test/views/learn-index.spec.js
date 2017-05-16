/* eslint-env mocha */
const Vue = require('vue-test');
const _ = require('lodash');
const assert = require('assert');
const LearnIndex = require('../../src/views/index.vue');
const makeStore = require('../util/makeStore');

function makeVm(options) {
  const Ctor = Vue.extend(LearnIndex);
  // TODO not mounting the component, since I can't figure out how
  // to setup tests to make all of the dependent components (namely core-base) work
  // seems to be good enough for current tests
  return new Ctor(options);
}

describe('learn index', () => {
  let store;

  const isExamTab = ({ title }) => title === 'Exams';
  const setSessionUserKind = (kind) => {
    store.state.core.session.kind = [kind];
  };
  const setMemberships = (memberships) => {
    store.state.learnAppState.memberships = memberships;
  };

  beforeEach(() => {
    store = makeStore();
  });

  it('the exam tab is available if user is logged in and has memberships', () => {
    // should work for any user 'kind' except for 'anonymous'
    setSessionUserKind('learner');
    setMemberships([{ id: 'membership_1' }]);
    const vm = makeVm({ store });
    assert(!_.isUndefined(_.find(vm.learnTabs, isExamTab)));
  });

  it('the exam tab is not available if user is not logged in', () => {
    // in current implementation, anonymous user implies empty memberships
    setSessionUserKind('anonymous');
    setMemberships([]);
    const vm = makeVm({ store });
    assert(_.isUndefined(_.find(vm.learnTabs, isExamTab)));
  });

  it('the exam tab is not available if user has no memberships/classes', () => {
    setSessionUserKind('learner');
    setMemberships([]);
    const vm = makeVm({ store });
    assert(_.isUndefined(_.find(vm.learnTabs, isExamTab)));
  });
});
