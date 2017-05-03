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

describe.only('learn index', () => {
  const isExamTab = ({ title }) => title === 'Exams';

  it('the exam tab is available if user is logged in and has memberships', () => {
    const store = makeStore();
    store.state.core.session.kind = ['learner'];
    store.state.learnAppState.memberships = [{ id: 'membership_1' }];
    const vm = makeVm({ store });
    const examTabObj = _.find(vm.learnTabs, isExamTab);
    assert(!_.isUndefined(examTabObj));
  });

  it('the exam tab is not available if user is not logged in', () => {
    const store = makeStore();
    store.state.core.session.kind = ['anonymous'];
    store.state.learnAppState.memberships = [];
    const vm = makeVm({ store });
    const examTabObj = _.find(vm.learnTabs, isExamTab);
    assert(_.isUndefined(examTabObj));
  });

  it('the exam tab is not available if user has no memberships/classes', () => {
    const store = makeStore();
    store.state.core.session.kind = ['learner'];
    store.state.learnAppState.memberships = [];
    const vm = makeVm({ store });
    const examTabObj = _.find(vm.learnTabs, isExamTab);
    assert(_.isUndefined(examTabObj));
  });
});
