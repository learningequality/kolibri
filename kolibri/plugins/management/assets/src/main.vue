<template>
  <div>
    <drop-down v-ref:classroom-selector :list="cClassrooms" :initial-selection="cClassrooms[0]"></drop-down>
    <button>Create</button>
    <button>Delete</button>
  </div>
  <div>
    <drop-down :list="learnerGroups" :initial-selection="learnerGroups[0]"></drop-down>
    <button>Create</button>
    <button>Delete</button>
  </div>
  <learner-roster v-ref:learner-roster :learners="learners"></learner-roster>
</template>


<script>
import learnerRoster from './learner-roster.vue';
import dropDown from './drop-down.vue';

function getData() {
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
    {
      id: 4,
      first_name: 'Jessica',
      last_name: 'Aceret',
      username: 'jbot',
    },
  ];
  const classrooms = [
    {
      id: 1,
      name: 'Classroom A',
      learnerGroups: [1, 2],
      // learners: [1, 3],
    },
    {
      id: 2,
      name: 'Classroom B',
      learnerGroups: [],
      // learners: [],
    },
    {
      id: 3,
      name: 'Classroom C',
      learnerGroups: [3],
      // learners: [2],
    },
  ];
  const learnerGroups = [
    {
      id: 1,
      name: 'Group 1',
      learners: [1, 3],
    },
    {
      id: 2,
      name: 'Group 2',
      learners: [3],
    },
    {
      id: 3,
      name: 'Group 3',
      learners: [2],
    },
  ];
  return {
    classrooms,
    learners,
    learnerGroups,
  };
}

export default {
  components: {
    'learner-roster': learnerRoster,
    'drop-down': dropDown,
  },
  data: getData,
  computed: {
    filters() {
      return {};
    },
    cClassrooms() {
      const _classrooms = [{
        id: null,
        name: 'All classrooms',
        learnerGroups: [],
      }];
      _classrooms.push(...this.classrooms);
      return _classrooms;
    },
  },
};
</script>


<style lang="stylus" scoped>
</style>
