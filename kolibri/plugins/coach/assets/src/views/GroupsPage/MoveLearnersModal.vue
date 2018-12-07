<template>

  <KModal
    :title="$tr('moveLearners')"
    :cancelText="$tr('cancel')"
    :submitText="$tr('move')"
    :submitDisabled="!groupSelected"
    @cancel="close"
    @submit="moveUsers"
  >
    <p>{{ $tr('moveLearnerCount', {count: usersToMove.length }) }}</p>
    <KRadioButton
      v-for="group in groupsExcludingCurrent"
      :key="group.id"
      v-model="groupSelected"
      :value="group.id"
      :label="group.name"
    />

    <div v-if="!isUngrouped">
      <hr>
      <KRadioButton
        v-model="groupSelected"
        value="ungrouped"
        :label="$tr('ungrouped')"
      />
    </div>
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';

  export default {
    name: 'MoveLearnersModal',
    $trs: {
      moveLearners: 'Move learners',
      moveLearnerCount:
        'Move {count, number, integer} {count, plural, one {learner} other {learners}} to',
      ungrouped: 'Ungrouped',
      cancel: 'Cancel',
      move: 'Move',
    },
    components: {
      KModal,
      KRadioButton,
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
      ...mapActions('groups', [
        'addUsersToGroup',
        'displayModal',
        'moveUsersBetweenGroups',
        'removeUsersFromGroup',
      ]),
      moveUsers() {
        if (this.groupId) {
          if (this.groupSelected === 'ungrouped') {
            this.removeUsersFromGroup({
              groupId: this.groupId,
              userIds: this.usersToMove,
            });
          } else {
            this.moveUsersBetweenGroups({
              currentGroupId: this.groupId,
              newGroupId: this.groupSelected,
              userIds: this.usersToMove,
            });
          }
        } else {
          this.addUsersToGroup({
            groupId: this.groupSelected,
            userIds: this.usersToMove,
          });
        }
      },
      close() {
        this.displayModal(false);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .button-section {
    margin-top: 1em;
  }

</style>
