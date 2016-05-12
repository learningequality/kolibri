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
  <learner-roster></learner-roster>
</template>


<script>
import learnerRoster from './learner-roster.vue';
import dropDown from './drop-down.vue';

export default {
  components: {
    'learner-roster': learnerRoster,
    'drop-down': dropDown,
  },
  data: () => ({
    classrooms: [
      'All classrooms',
      'Classroom 1',
    ],
    learnerGroups: [
      'All groups',
      'Group A',
    ],
  }),
};
</script>


<style lang="stylus" scoped>
</style>
