<template>
  <div>
    <drop-down v-ref:classroom-selector :list="classrooms" :initial-selection="selectedClassroom"></drop-down>
    <button v-on:click="addClassroom({name: 'foo'})">Create</button>
    <button>Delete</button>
  </div>
  <div>
    <drop-down :list="[]" :initial-selection=""></drop-down>
    <button>Create</button>
    <button>Delete</button>
  </div>
  <learner-roster v-ref:learner-roster :learners="[]"></learner-roster>
</template>


<script>
import learnerRoster from './learner-roster.vue';
import dropDown from './drop-down.vue';
import { addClassroom } from './vuex/actions.js';
import { getClassrooms, getSelectedClassroomId } from './vuex/getters.js';

export default {
  components: {
    'learner-roster': learnerRoster,
    'drop-down': dropDown,
  },
  computed: {
    filters() {
      return {};
    },
    classrooms() {
      const _classrooms = [{
        id: null,
        name: 'All classrooms',
        learnerGroups: [],
      }];
      _classrooms.push(...this.getClassrooms);
      return _classrooms;
    },
    selectedClassroom() {
      for (const classroom of this.classrooms) {
        if (classroom.id === this.getSelectedClassroom) {
          return classroom;
        }
      }
      // Default value in case getSelectedClassroom is inconsistent
      return this.classrooms[0];
    },
  },
  vuex: {
    getters: {
      getClassrooms,
      getSelectedClassroomId,
    },
    actions: {
      addClassroom,
    },
  },
};
</script>


<style lang="stylus" scoped>
</style>
