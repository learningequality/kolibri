<template>

  <core-modal :title="`${$tr('move')} ${$tr('learners', {count: usersToMove.length })}`"
    @cancel="close">

    <label v-for="group in groupsExcludingCurrent">
    <input
      type="radio"
      :value="group.id"
      v-model="groupSelected">
      {{ group.name }}
    </label>

    <label v-if="!isUngrouped">
    <input type="radio"
      value="ungrouped"
      v-model="groupSelected">
      Ungrouped
    </label>

    <icon-button :text="$tr('cancel')"
      @click="close" />
    <icon-button :text="$tr('save')"
      :primary="true"
      @click="callMoveUsers" />
  </core-modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    $trNameSpace: 'confirm-enrollment-modal',
    $trs: {
      move: 'move',
      learners: '{count, number, integer} {count, plural, one {Learner} other {Learners}}',
      ungrouped: 'Ungrouped',
      cancel: 'Cancel',
      save: 'Save',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    props: {
      className: {
        type: String,
        required: true,
      },
      classId: {
        type: String,
        required: true,
      },
      groupName: {
        type: String,
        required: false,
      },
      groupId: {
        type: String,
        required: false,
      },
      groups: {
        type: Array,
        required: true,
      },
      usersToMove: {
        type: Array,
        required: true,
      },
      isUngrouped: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        groupSelected: '',
      };
    },
    computed: {
      groupsExcludingCurrent() {
        return this.groups.filter(group => group.id !== this.groupId);
      },
    },
    methods: {
      callMoveUsers() {
        if (this.groupId) {
          if (this.groupSelected === 'ungrouped') {
            // remove users from group
            this.removeMultipleUsersFromGroup(this.groupId, this.usersToMove).then(
              group => {
                this.displayModal(false);
              },
              error => error(error)
            );
          } else {
            // remove users from group
            // add users to new group
            this.removeMultipleUsersFromGroup(this.groupSelected, this.usersToMove);
            this.addMultipleUsersToGroup(this.groupSelected, this.usersToMove);
          }
        } else {
          // add users to group
          this.addMultipleUsersToGroup(this.groupSelected, this.usersToMove).then(
              group => {
                this.displayModal(false);
              },
              error => error(error)
            );
        }
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal: actions.displayModal,
        addMultipleUsersToGroup: actions.addMultipleUsersToGroup,
        removeMultipleUsersFromGroup: actions.removeMultipleUsersFromGroup,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  label
    display: block

</style>
