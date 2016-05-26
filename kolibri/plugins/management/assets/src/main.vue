<template>

  <core-base>
    <div>
      <drop-down v-ref:classroom-selector :list="classrooms" :selected.sync="selectedClassroom"></drop-down>
      <button>Create</button>
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
        if (this.getSelectedClassroomId !== constants.ALL_CLASSROOMS_ID) {
          _groups = [
            {
              id: constants.ALL_GROUPS_ID,
              name: 'All groups',
              learners: [],
            },
            {
              id: constants.UNGROUPED_ID,
              name: 'Ungrouped',
              learners: this.selectedClassroom.ungroupedLearners,
            },
          ];
          _groups.push(...(this.getLearnerGroups.filter(g => this.selectedClassroom.learnerGroups.indexOf(g.id) !== -1)));  // eslint-disable-line max-len
        }
        return _groups;
      },

      selectedClassroom: {
        get() {
          return this.classrooms.find(c => c.id === this.getSelectedClassroomId);  // eslint-disable-line max-len
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
          return this.learnerGroups.find(g => g.id === this.getSelectedGroupId);
        },

        set({ id }) {
          this.setSelectedGroupId(id);
        },
      },

      filteredLearners() {
        let learners = [];
        if (this.getSelectedClassroomId === constants.ALL_CLASSROOMS_ID) {
          learners = this.getLearners;
        } else {
          if (this.getSelectedGroupId === constants.UNGROUPED_ID) {
            const learnerIds = new Set(this.selectedClassroom.ungroupedLearners);
            learners = this.getLearners.filter(learner => learnerIds.has(learner.id));
          } else if (this.getSelectedGroupId === constants.ALL_GROUPS_ID) {
            const groupIds = this.selectedClassroom.learnerGroups;
            const groups = this.getLearnerGroups.filter(g => groupIds.indexOf(g.id) !== -1);
            const learnerIds = new Set();
            groups.forEach(g => g.learners.forEach(id => learnerIds.add(id)));
            this.selectedClassroom.ungroupedLearners.forEach(id => learnerIds.add(id));
            learners = this.getLearners.filter(learner => learnerIds.has(learner.id));
          } else {
            const group = this.getLearnerGroups.find(g => g.id === this.getSelectedGroupId);
            const learnerIds = new Set(group.learners);
            learners = this.getLearners.filter(learner => learnerIds.has(learner.id));
          }
        }
        return learners;
      },
    },

    vuex: {
      getters: require('./vuex/getters.js'),
      actions: require('./vuex/actions.js'),
    },
  };

</script>


<style lang="stylus" scoped></style>
