/* eslint-env mocha */
import Vue from 'vue';
import Management from 'vue!../src/main.vue';
import assert from 'assert';

describe('The management module', () => {
  it('defines a Management vue', () => {
    // A sanity check
    assert(Management !== undefined);
  });

  describe('has the following components:', () => {
    const container = new Vue({
      template: '<div><management v-ref:main></management></div>',
      components: { Management },
    }).$mount();
    const vm = container.$refs.main;

    it('a classroom selector', () => {
      Vue.nextTick(() => {
        const child = vm.$refs.classroomSelector;
        assert.notStrictEqual(child, undefined);
      });
    });

    it('a learner group selector', () => {
      Vue.nextTick(() => {
        const child = vm.$refs.learnerGroupSelector;
        assert.notStrictEqual(child, undefined);
      });
    });

    it('a learner roster', () => {
      Vue.nextTick(() => {
        const child = vm.$refs.learnerRoster;
        assert.notStrictEqual(child, undefined);
      });
    });
  });

  describe('changes the list of students in the roster when you select a classroom.', () => {
    /*
    const johnDuck = {
      id: 2,
      first_name: 'John',
      last_name: 'Duck',
      username: 'jduck',
    };
    const learners = [
      {
        id: 1,
        first_name: 'Mike',
        last_name: 'G',
        username: 'mike',
      },
      johnDuck,
      {
        id: 3,
        first_name: 'Abe',
        last_name: 'Lincoln',
        username: 'abe',
      },
    ];
    const container = new Vue({
      template: '<div><management v-ref:main></management></div>',
      components: { Management },
      data: {
        classrooms: [
          {
            id: 1,
            name: 'Classroom A',
            learners: [1, 3],
          },
          {
            id: 2,
            name: 'Classroom B',
            learners: [3],
          },
          {
            id: 3,
            name: 'Classroom C',
            learners: [2],
          },
        ],
        learners,
      },
    }).$mount();
    const vm = container.$refs.main;
    */
    it('The roster shows all learners when you select "All classrooms".');
    it('The roster shows only John Duck when you select "Classroom 2".');
  });
});
