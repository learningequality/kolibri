<template>

  <core-modal :title="$tr('moveLearners')"
    @cancel="close">
    <p>{{ $tr('moveThe') }} <strong>{{ $tr('learners', {count: usersToMove.length }) }}</strong> {{ $tr('to') }}:</p>
    <label v-for="group in groupsExcludingCurrent">
    <input
      type="radio"
      :value="group.id"
      v-model="groupSelected">
      {{ group.name }}
    </label>

    <div v-if="!isUngrouped">
      <hr>
      <label>
      <input type="radio"
        value="ungrouped"
        v-model="groupSelected">
        Ungrouped
      </label>
    </div>

    <div class="button-section">
      <icon-button :text="$tr('cancel')"
        @click="close" />
      <icon-button :text="$tr('move')"
        :primary="true"
        @click="moveUsers" />
    </div>
  </core-modal>

</template>


<script>

  const groupActions = require('../../group-actions');

  module.exports = {
    $trNameSpace: 'confirm-enrollment-modal',
    $trs: {
      moveLearners: 'Move Learners',
      moveThe: 'Move the',
      to: 'to',
      learners: '{count, number, integer} {count, plural, one {Learner} other {Learners}}',
      ungrouped: 'Ungrouped',
      cancel: 'Cancel',
      move: 'Move',
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
      moveUsers() {
        if (this.groupId) {
          if (this.groupSelected === 'ungrouped') {
            this.removeUsersFromGroup(this.groupId, this.usersToMove);
          } else {
            this.moveUsersBetweenGroups(this.groupId, this.groupSelected, this.usersToMove);
          }
        } else {
          this.addUsersToGroup(this.groupSelected, this.usersToMove);
        }
      },

      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal: groupActions.displayModal,
        addUsersToGroup: groupActions.addUsersToGroup,
        removeUsersFromGroup: groupActions.removeUsersFromGroup,
        moveUsersBetweenGroups: groupActions.moveUsersBetweenGroups,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  label
    display: block
    padding-bottom: 0.5em
    padding-top: 0.5em

  .button-section
    margin-top: 1em

</style>
