<template>
  <div>
    <drop-down v-ref:classroom-selector :list="classrooms" :selected.sync="selectedClassroom"></drop-down>
    <button v-on:click="addClassroom({name: 'foo'})">Create</button>
    <button>Delete</button>
  </div>
  <div>
    <drop-down v-ref:learner-group-selector :list="[]" :initial-selection=""></drop-down>
    <button>Create</button>
    <button>Delete</button>
  </div>
  <learner-roster v-ref:learner-roster :learners="filteredLearners"></learner-roster>
</template>


<script>
const learnerRoster = require('./learner-roster.vue');
const dropDown = require('./drop-down.vue');

const actions = require('./vuex/actions.js');
const addClassroom = actions.addClassroom;
const setSelectedClassroomId = actions.setSelectedClassroomId;

const getters = require('./vuex/getters.js');
const getClassrooms = getters.getClassrooms;
const getSelectedClassroomId = getters.getSelectedClassroomId;

const store = require('./vuex/store.js');
const constants = store.constants;

module.exports = {
  components: {
    'learner-roster': learnerRoster,
    'drop-down': dropDown,
  },
  computed: {
    classrooms() {
      const _classrooms = [{
        id: constants.ALL_CLASSROOMS_ID,
        name: 'All classrooms',
        learnerGroups: [],
      }];
      _classrooms.push(...this.getClassrooms);
      return _classrooms;
    },
    selectedClassroom: {
      get() {
        for (const classroom of this.classrooms) {
          if (classroom.id === this.getSelectedClassroomId) {
            return classroom;
          }
        }
        // Default value in case getSelectedClassroom is inconsistent
        return this.classrooms[0];
      },
      set({ id }) {
        this.setSelectedClassroomId(id);
      },
    },
    filteredLearners() {
      const learners = this.$store.state.learners;
      let _learners = learners;
      if (this.selectedClassroom.id !== constants.ALL_CLASSROOMS_ID) {
        const learnerGroupIds = this.selectedClassroom.learnerGroups;
        const learnerIds = new Set();
        for (const group of this.$store.state.learnerGroups) {
          if (learnerGroupIds.indexOf(group.id) !== -1) {
            for (const learnerId of group.learners) {
              if (!learnerIds.has(learnerId)) {
                learnerIds.add(learnerId);
              }
            }
          }
        }

        _learners = [];
        for (const learner of learners) {
          if (learnerIds.has(learner.id)) {
            _learners.push(learner);
          }
        }
      }
      return _learners;
    },
  },
  vuex: {
    getters: {
      getClassrooms,
      getSelectedClassroomId,
    },
    actions: {
      addClassroom,
      setSelectedClassroomId,
    },
  },
};
</script>


<style lang="stylus" scoped>
</style>
