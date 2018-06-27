<template>

  <k-modal
    :title="$tr('moveLearners')"
    :cancelText="$tr('cancel')"
    :submitText="$tr('move')"
    :submitDisabled="!groupSelected"
    @cancel="close"
    @submit="moveUsers"
  >
    <p>{{ $tr('moveLearnerCount', {count: usersToMove.length }) }}</p>
    <k-radio-button
      v-for="group in groupsExcludingCurrent"
      :key="group.id"
      :value="group.id"
      :label="group.name"
      v-model="groupSelected"
    />

    <div v-if="!isUngrouped">
      <hr>
      <k-radio-button
        value="ungrouped"
        :label="$tr('ungrouped')"
        v-model="groupSelected"
      />
    </div>
  </k-modal>

</template>


<script>

  import kModal from 'kolibri.coreVue.components.kModal';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import {
    displayModal,
    addUsersToGroup,
    removeUsersFromGroup,
    moveUsersBetweenGroups,
  } from '../../state/actions/group';

  export default {
    name: 'moveLearnersModal',
    $trs: {
      moveLearners: 'Move learners',
      moveLearnerCount:
        'Move {count, number, integer} {count, plural, one {learner} other {learners}} to',
      ungrouped: 'Ungrouped',
      cancel: 'Cancel',
      move: 'Move',
    },
    components: {
      kModal,
      kRadioButton,
    },
    props: {
      groupId: {
        type: String,
        required: false,
      },
      groups: {
        type: Array,
        required: true,
        validator(groups) {
          return groups.every(group => group.id && group.name);
        },
      },
      usersToMove: {
        type: Array,
        required: true,
        validator(userIds) {
          return userIds.every(userId => userId);
        },
      },
      isUngrouped: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return { groupSelected: '' };
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
            this.removeUsersFromGroup({ groupId: this.groupId, userIds: this.usersToMove });
          } else {
            this.moveUsersBetweenGroups({
              currentGroupId: this.groupId,
              newGroupId: this.groupSelected,
              userIds: this.usersToMove,
            });
          }
        } else {
          this.addUsersToGroup({ groupId: this.groupSelected, userIds: this.usersToMove });
        }
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal,
        addUsersToGroup,
        removeUsersFromGroup,
        moveUsersBetweenGroups,
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
