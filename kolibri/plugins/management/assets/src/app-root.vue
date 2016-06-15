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

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'drop-down': require('./drop-down.vue'),
      'learner-roster': require('./learner-roster.vue'),
    },

    computed: {
      /*
      Populates the classroom selector. Note that we add the special value "All classrooms"
      to the list of classrooms fetched from the server.
       */
      classrooms() {
        const _classrooms = [{
          id: constants.ALL_CLASSROOMS_ID,
          name: 'All classrooms',
        }];
        _classrooms.push(...this.getClassrooms);
        return _classrooms;
      },

      /*
      Populates the group selector. Note that we add two special values to the list of groups
      fetched from the server:
      * "All groups" will display all grouped + ungrouped learners in the classroom.
      * "Ungrouped" will display only ungrouped learners in the classroom. Learners are
        considered ungrouped if they are members of the classroom but not members of any groups
        in the classroom. Membership is determined by the existence of a Membership object on
        the server -- see the `fetch` action for details.
       */
      learnerGroups() {
        let _groups = [];
        if (this.getSelectedClassroomId !== constants.ALL_CLASSROOMS_ID) {
          _groups = [
            {
              id: constants.ALL_GROUPS_ID,
              name: 'All groups',
            },
            {
              id: constants.UNGROUPED_ID,
              name: 'Ungrouped',
            },
          ];
          _groups.push(...(this.getLearnerGroups.filter(g => this.selectedClassroom.learnerGroups.indexOf(g.id) !== -1)));  // eslint-disable-line max-len
        }
        return _groups;
      },

      /*
      The currently selected classroom object -- take care to check if "All Classrooms" is
      selected before using, otherwise you might encounter undefined values.
       */
      selectedClassroom: {
        get() {
          return this.classrooms.find(c => c.id === this.getSelectedClassroomId);  // eslint-disable-line max-len
        },

        /*
        Note that we set a default value for the state variable selectedGroupId, so that it isn't
        undefined.
         */
        set({ id }) {
          this.setSelectedClassroomId(id);
          if (id === constants.ALL_CLASSROOMS_ID) {
            this.setSelectedGroupId(constants.NO_GROUPS_ID);
          } else {
            this.setSelectedGroupId(constants.ALL_GROUPS_ID);
          }
        },
      },

      /*
      The currently selected group object -- take care to check if "All groups" or "Ungrouped" is
      selected before using, otherwise you might encounter undefined values.
       */
      selectedGroup: {
        get() {
          return this.learnerGroups.find(g => g.id === this.getSelectedGroupId);
        },

        set({ id }) {
          this.setSelectedGroupId(id);
        },
      },

      /*
      The list of learners sent to the learner roster. Determined by the currently selected
      classroom and group.
       */
      filteredLearners() {
        let learners = [];
        if (this.getSelectedClassroomId === constants.ALL_CLASSROOMS_ID) {
          learners = this.getLearners;
        } else {
          let learnerIds;

          if (this.getSelectedGroupId === constants.UNGROUPED_ID) {
            learnerIds = new Set(this.selectedClassroom.ungroupedLearners);
          } else if (this.getSelectedGroupId === constants.ALL_GROUPS_ID) {
            const groupIds = this.selectedClassroom.learnerGroups;
            const groups = this.getLearnerGroups.filter(g => groupIds.indexOf(g.id) !== -1);
            learnerIds = new Set();
            groups.forEach(g => g.learners.forEach(id => learnerIds.add(id)));
            this.selectedClassroom.ungroupedLearners.forEach(id => learnerIds.add(id));
          } else {
            const group = this.getLearnerGroups.find(g => g.id === this.getSelectedGroupId);
            learnerIds = new Set(group.learners);
          }

          learners = this.getLearners.filter(learner => learnerIds.has(learner.id));
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
