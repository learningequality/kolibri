/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */
import Vue from 'vue';
import Vuex from 'vuex';
import assert from 'assert';

import { store, mutations } from '../src/vuex/store.js';
import Management from 'vue!../src/main.vue';


describe('The management module', () => {
  it('defines a Management vue', () => {
    // A sanity check
    assert(Management !== undefined);
  });

  describe('has the following components:', function () {
    before(function () {
      const container = new Vue({
        template: '<div><management v-ref:main></management></div>',
        components: { Management },
        store,
      }).$mount();
      this.vm = container.$refs.main;
    });

    it('a classroom selector', function () {
      Vue.nextTick(() => {
        const child = this.vm.$refs.classroomSelector;
        assert.notStrictEqual(child, undefined);
      });
    });

    it('a learner group selector', function () {
      Vue.nextTick(() => {
        const child = this.vm.$refs.learnerGroupSelector;
        assert.notStrictEqual(child, undefined);
      });
    });

    it('a learner roster', function () {
      Vue.nextTick(() => {
        const child = this.vm.$refs.learnerRoster;
        assert.notStrictEqual(child, undefined);
      });
    });
  });

  describe('changes the list of students in the roster when you select a classroom.', function () {
    beforeEach(function () {
      const testStore = new Vuex.Store({
        state: require('fixture1.js'),
        mutations,
      });
      const container = new Vue({
        template: '<div><management v-ref:main></management></div>',
        components: { Management },
        store: testStore,
      });
      container.$mount();
    });

    it('The roster shows all learners when you select "All classrooms".');
    it('The roster shows only John Duck when you select "Classroom 2".');
  });
});
