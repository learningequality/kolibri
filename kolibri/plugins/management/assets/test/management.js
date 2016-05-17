/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */
import Vue from 'vue';
import Vuex from 'vuex';
import assert from 'assert';

import { store, mutations, constants } from '../src/vuex/store.js';
import Management from '../src/main.vue';
import fixture1 from './fixtures/fixture1.js';


describe('The management module', () => {
  it('defines a Management vue', () => {
    // A sanity check
    assert(Management !== undefined);
  });

  describe('has the following components:', function () {
    before(function () {
      const container = new Vue({
        template: '<div class="foo"><management v-ref:main></management></div>',
        components: { Management },
        store,
      }).$mount();
      this.vm = container.$refs.main;
    });

    after(function () {
      this.vm.$destroy();
    });

    it('a classroom selector', function (done) {
      Vue.nextTick(() => {
        const child = this.vm.$refs.classroomSelector;
        assert.notStrictEqual(child, undefined);
        done();
      });
    });

    it('a learner group selector', function (done) {
      Vue.nextTick(() => {
        const child = this.vm.$refs.learnerGroupSelector;
        assert.notStrictEqual(child, undefined);
        done();
      });
    });

    it('a learner roster', function (done) {
      Vue.nextTick(() => {
        const child = this.vm.$refs.learnerRoster;
        assert.notStrictEqual(child, undefined);
        done();
      });
    });
  });

  describe('changes the list of students in the roster when you select a classroom.', function () {
    beforeEach(function () {
      const testStore = new Vuex.Store({
        state: fixture1,
        mutations,
      });
      const container = new Vue({
        template: '<div><management v-ref:main></management></div>',
        components: { Management },
        store: testStore,
      });
      container.$mount();
      this.vm = container.$refs.main;
    });

    afterEach(function () {
      this.vm.$destroy();
    });

    it('The roster shows all learners when you select "All classrooms".', function (done) {
      Vue.nextTick(() => {
        this.vm.selectedClassroom = {
          id: constants.ALL_CLASSROOMS_ID,
        };
        assert.strictEqual(this.vm.$refs.learnerRoster.learners, fixture1.learners);
        done();
      });
    });

    it('The roster shows only John Duck when you select "Classroom C".', function (done) {
      // Look at the fixture file for the magic numbers here.
      Vue.nextTick(() => {
        this.vm.selectedClassroom = {
          id: 2,
        };
        assert.strictEqual(this.vm.$refs.learnerRoster.learners, [{
          id: 2,
          first_name: 'John',
          last_name: 'Duck',
          username: 'jduck',
        }]);
        done();
      });
    });
  });
});
