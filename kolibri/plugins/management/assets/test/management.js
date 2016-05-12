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
    const vm = new Vue({
      components: { Management },
    }).$mount();

    it('a classroom selector', () => {
      Vue.nextTick(() => {
        const el = vm.$el.querySelector('.classroom-selector');
        assert.notStrictEqual(el, null);
      });
    });

    it('a learner group selector', () => {
      Vue.nextTick(() => {
        const el = vm.$el.querySelector('.learner-group-selector');
        assert.notStrictEqual(el, null);
      });
    });

    it('a learner roster', () => {
      Vue.nextTick(() => {
        const el = vm.$el.querySelector('.learner-roster');
        assert.notStrictEqual(el, null);
      });
    });
  });

  describe('changes the list of students in the roster when you select a classroom.', () => {
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
    const vm = new Vue({
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
    });

    it('The roster shows all learners when you select "All classrooms".', () => {
      const roster = vm.$refs.roster;
      const classroomSelector = vm.$refs.classroomSelector;
      classroomSelector.selection = 'All classrooms';
      Vue.nextTick(() => {
        assert.equal(roster.displayedLearners, learners);
      });
    });
    it('The roster shows only John Duck when you select "Classroom 2".', () => {
      const roster = vm.$refs.roster;
      const classroomSelector = vm.$refs.classroomSelector;
      classroomSelector.selection = 'Classroom 2';
      Vue.nextTick(() => {
        assert.equal(roster.displayedLearners, [johnDuck]);
      });
    });
  });
});
