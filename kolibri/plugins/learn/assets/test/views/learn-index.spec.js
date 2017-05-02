/* eslint-env mocha */
const Vue = require('vue-test');
const _ = require('lodash');
const assert = require('assert');
const LearnIndex = require('../../src/views/index.vue');

function makeVm(options) {
  const Ctor = Vue.extend(LearnIndex);
  // TODO not mounting the component, since I can't figure out how
  // to setup tests to make all of the dependent components (namely core-base) work
  // seems to be good enough for current tests
  return new Ctor(options);
}

describe('learn index', () => {
  const isExamTab = ({ title }) => title === 'Exams';

  it('the exam tab is available if user is logged in and has memberships', () => {
    const vm = makeVm({
      vuex: {
        getters: {
          isUserLoggedIn: () => true,
          memberships: () => [{ id: 'membership_1' }],
        },
      },
    });
    const examTabObj = _.find(vm.learnTabs, isExamTab);
    assert(!_.isUndefined(examTabObj));
  });

  it('the exam tab is not available if user is not logged in', () => {
    const vm = makeVm({
      vuex: {
        getters: {
          isUserLoggedIn: () => false,
          // if guest user, memerships is initialized with empty array
          memberships: () => [],
        },
      },
    });
    const examTabObj = _.find(vm.learnTabs, isExamTab);
    assert(_.isUndefined(examTabObj));
  });

  it('the exam tab is not available if user has no memberships/classes', () => {
    const vm = makeVm({
      vuex: {
        getters: {
          isUserLoggedIn: () => true,
          memberships: () => [],
        },
      },
    });
    const examTabObj = _.find(vm.learnTabs, isExamTab);
    assert(_.isUndefined(examTabObj));
  });
});
