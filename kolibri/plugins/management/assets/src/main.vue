<template>
  <div>
    <drop-down :list="classrooms"></drop-down>
    <button>Create</button>
    <button>Delete</button>
  </div>
  <div>
    <drop-down :list="learnerGroups"></drop-down>
    <button>Create</button>
    <button>Delete</button>
  </div>
  <learner-roster :learners="learners" ></learner-roster>
</template>


<script>
import learnerRoster from './learner-roster.vue';
import dropDown from './drop-down.vue';

function getData() {
  const learners = [
    {
      first_name: 'Abe',
      last_name: 'Lincoln',
    },
    {
      first_name: 'Jessica',
      last_name: 'Aceret',
    },
  ];
  return {
    classrooms: [
      'All classrooms',
      'Classroom 1',
    ],
    learnerGroups: [
      'All groups',
      'Group A',
    ],
    learners,
  };
}

export default {
  components: {
    'learner-roster': learnerRoster,
    'drop-down': dropDown,
  },
  data: getData,
};
</script>


<style lang="stylus" scoped>
</style>
