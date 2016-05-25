<template>

  <core-base>
    <div>
      <drop-down v-ref:classroom-selector :list="classrooms" :selected.sync="selectedClassroom"></drop-down>
      <button v-on:click="addClassroom({name: 'foo'})">Create</button>
      <button>Delete</button>
    </div>
    <div>
      <drop-down v-ref:learner-group-selector :list="learnerGroups" :selected.sync="selectedGroup"></drop-down>
      <button>Create</button>
      <button>Delete</button>
    </div>
    <learner-roster v-ref:learner-roster :learners="filteredLearners"></learner-roster>
  </core-base>

</template>


<script>

  const store = require('./vuex/store.js');
  const constants = store.constants;

  export default {
    components: {
      'core-base': require('core-base'),
      'drop-down': require('./drop-down.vue'),
      'learner-roster': require('./learner-roster.vue'),
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

      learnerGroups() {
        let _groups = [];
        if (this.selectedClassroom.id !== constants.ALL_CLASSROOMS_ID) {
          _groups = [{
            id: constants.ALL_GROUPS_ID,
            name: 'All groups',
            learners: [],
          }];
          _groups.push(...this.selectedClassroom.learnerGroups);
        }
        return _groups;
      },

      selectedClassroom: {
        get() {
          return this.classrooms.find(c => c.id === this.getSelectedClassroomId) || this.classrooms[0];  // eslint-disable-line max-len
        },

        set({ id }) {
          this.setSelectedClassroomId(id);
          if (id === constants.ALL_CLASSROOMS_ID) {
            this.setSelectedGroupId(constants.NO_GROUPS_ID);
          } else {
            this.setSelectedGroupId(constants.ALL_GROUPS_ID);
          }
        },
      },

      selectedGroup: {
        get() {
          return this.learnerGroups.find(g => g.id === this.getSelectedGroupId) ||
            this.learnerGroups[0];
        },

        set({ id }) {
          this.setSelectedGroupId(id);
        },
      },

      filteredLearners() {
        const learners = this.getLearners;
        let _learners = learners;
        if (this.getSelectedClassroomId !== constants.ALL_CLASSROOMS_ID) {
          let learnerGroupIds;
          const groupId = this.getSelectedGroupId;
          if (groupId === constants.ALL_GROUPS_ID || groupId === constants.NO_GROUPS_ID) {  // eslint-disable-line
            learnerGroupIds = this.selectedClassroom.learnerGroups;
          } else {
            learnerGroupIds = [groupId];
          }
          const learnerIds = new Set();
          this.getLearnerGroups.filter(
            g => learnerGroupIds.indexOf(g.id) !== -1
          )
          .forEach(group => {
            group.learners.forEach(learnerId => {
              if (!learnerIds.has(learnerId)) {
                learnerIds.add(learnerId);
              }
            });
          });

          _learners = [];
          learners.forEach(learner => {
            if (learnerIds.has(learner.id)) {
              _learners.push(learner);
            }
          });
        }
        return _learners;
      },
    },

    vuex: {
      getters: require('./vuex/getters.js'),
      actions: require('./vuex/actions.js'),
    },
  };

</script>


<style lang="stylus" scoped></style>
