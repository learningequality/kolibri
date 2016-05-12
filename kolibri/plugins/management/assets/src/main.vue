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
  <learner-list></learner-list>
</template>


<script>
import learnerList from './learner-list.vue';
import dropDown from './drop-down.vue';

export default {
  components: {
    'learner-list': learnerList,
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
