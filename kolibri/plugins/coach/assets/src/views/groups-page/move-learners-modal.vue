<template>

  <core-modal :title="$tr('moveLearners')" @cancel="close">
    <p>{{ $tr('moveThe') }} <strong>{{ $tr('learners', {count: usersToMove.length }) }}</strong> {{ $tr('to') }}:</p>
    <k-radio-button
      v-for="group in groupsExcludingCurrent"
      :key="group.id"
      :radiovalue="group.id"
      :label="group.name"
      v-model="groupSelected"
    />

    <div v-if="!isUngrouped">
      <hr>
      <k-radio-button
        radiovalue="ungrouped"
        :label="$tr('ungrouped')"
        v-model="groupSelected"
      />
    </div>

    <div class="button-section">
      <k-button
        :text="$tr('cancel')"
        appearance="flat-button"
        @click="close"
      />
      <k-button
        :text="$tr('move')"
        :primary="true"
        :disabled="!groupSelected"
        @click="moveUsers"
      />
    </div>
  </core-modal>

</template>


<script>

  import * as groupActions from '../../state/actions/group';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  export default {
    name: 'moveLearnersModal',
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
      coreModal,
      kButton,
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
    text-align: right

</style>
