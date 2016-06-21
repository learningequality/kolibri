/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */
const Vue = require('vue');
const Vuex = require('vuex');
const assert = require('assert');
const sinon = require('sinon');

const { fetch } = require('../src/vuex/actions.js');
const { store, mutations, constants } = require('../src/vuex/store.js');
const Management = require('../src/app-root.vue');
const fixture1 = require('./fixtures/fixture1.js');


/*
Neat little snippet for testing actions, modified from the vuex docs.
Asserts that the expectedMutations (an array of objects with name & payload attributes)
occurs in the given order. At least one expected mutation must be given.
Does not fail if *more* mutations than expected occur -- it will simply terminate
successfully as soon as the *expected* mutations finish up.
 */
function testAction(action, args, state, expectedMutations, done) {
  let count = 0;

  return new Promise((resolve) => {
    // mock dispatch
    const dispatch = (name, ...payload) => {
      const mutation = expectedMutations[count];
      assert.equal(name, mutation.name);
      if (payload) {
        assert.deepEqual(payload, mutation.payload, `Mutation ${name} not given right payload.`);
      }
      count++;
      if (count >= expectedMutations.length) {
        resolve();
      }
    };
    // call the action with mocked store and arguments
    action({ dispatch, state }, ...args);
  }).then(done);
}


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

    describe('a "fetch" action', function () {
      before(function () {
        this.xhr = sinon.useFakeXMLHttpRequest();
        this.requests = [];
        this.urls = ['classrooms', 'learnergroups', 'learners', 'memberships'];
        this.xhr.onCreate = req => {
          this.requests.push(req);
        };
      });

      after(function () {
        this.xhr.restore();
      });

      it('that mutates the state in a particular way', function (done) {
        const expectedMutations = [ // The order is significant in this case
          /* eslint-disable */
          {
            name: 'ADD_LEARNER_GROUPS',
            payload: [[
              {"id":4,"name":"Foo's group","parent":2,"learners":[1]},
              {"id":5,"name":"Bar's group","parent":3,"learners":[3]},
            ]],
          },
          {
            name: 'ADD_CLASSROOMS',
            payload: [[
              {"id":2,"name":"Foo","parent":1,"learnerGroups":[4],"ungroupedLearners":[2]},
              {"id":3,"name":"Bar","parent":1,"learnerGroups":[5],"ungroupedLearners":[]},
            ]],
          },
          {
            name: 'ADD_LEARNERS',
            payload: [[
              {"id":1,"username":"mike","first_name":"mike","last_name":"gallaspy","facility":1},
              {"id":2,"username":"jessica","first_name":"Jessica","last_name":"Aceret","facility":1},
              {"id":3,"username":"jduck","first_name":"John","last_name":"Duck","facility":1}]],
          },
          /* eslint-enable */
        ];
        testAction(fetch, this.urls, {}, expectedMutations, done);
        const responses = require('./fixtures/responseFixtures.js');
        let count = 0;
        this.requests.forEach(req => {
          req.respond(200, {}, JSON.stringify(responses[count]));
          count++;
        });
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
      }).$mount();
      this.vm = container.$refs.main;
      this.store = testStore;
    });

    afterEach(function () {
      this.vm.$destroy();
    });

    it('The roster shows only John Duck when you select "Classroom C".', function (done) {
      // Look at the fixture file for the magic numbers here.
      this.store.dispatch('SET_SELECTED_CLASSROOM_ID', 3);
      Vue.nextTick(() => {
        assert.deepStrictEqual(this.vm.$refs.learnerRoster.learners, [{
          id: 2,
          first_name: 'John',
          last_name: 'Duck',
          username: 'jduck',
        }]);
        done();
      });
    });

    it('The roster shows all learners when you select "All classrooms".', function (done) {
      this.store.dispatch('SET_SELECTED_CLASSROOM_ID', constants.ALL_CLASSROOMS_ID);
      Vue.nextTick(() => {
        assert.deepStrictEqual(this.vm.$refs.learnerRoster.learners, fixture1.learners);
        done();
      });
    });

    it('The roster shows two students when you select "Classroom A" and "Group 1".', function (done) {  // eslint-disable-line max-len
      this.store.dispatch('SET_SELECTED_CLASSROOM_ID', 1);
      Vue.nextTick(() => {
        this.store.dispatch('SET_SELECTED_GROUP_ID', 1);
        Vue.nextTick(() => {
          const expectedIds = [1, 2];
          assert.deepStrictEqual(this.vm.$refs.learnerRoster.learners.map(learner =>
            learner.id
          ), expectedIds);
          done();
        });
      });
    });

    it('The roster shows no students when you select "Classroom B".', function (done) {
      this.store.dispatch('SET_SELECTED_CLASSROOM_ID', 2);
      Vue.nextTick(() => {
        assert.deepStrictEqual(this.vm.$refs.learnerRoster.learners, []);
        done();
      });
    });

    it('The roster shows one student when you select "Classroom with ungrouped learners" and "Ungrouped".', function (done) {  // eslint-disable-line max-len
      this.store.dispatch('SET_SELECTED_CLASSROOM_ID', 4);
      Vue.nextTick(() => {
        this.store.dispatch('SET_SELECTED_GROUP_ID', constants.UNGROUPED_ID);
        Vue.nextTick(() => {
          const expectedIds = [4];
          assert.deepStrictEqual(this.vm.$refs.learnerRoster.learners.map(learner => learner.id), expectedIds);  // eslint-disable-line max-len
          done();
        });
      });
    });
  });
});
