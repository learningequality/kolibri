<template>

  <core-modal :title="$tr('deleteLearnerGroup')"
    @cancel="close">
    <p>{{ $tr('areYouSure') }} <strong>{{ groupName}}</strong>?</p>
    <p>{{ $tr('learnersWillBecome') }} <strong>{{ $tr('ungrouped') }}</strong>.</p>
    <icon-button :text="$tr('cancel')" @click="close" />
    <icon-button :text="$tr('deleteGroup')" :primary="true" @click="callDeleteGroup"/>
  </core-modal>

</template>


<script>

  const groupActions = require('../../group-actions');

  module.exports = {
    $trNameSpace: 'confirm-enrollment-modal',
    $trs: {
      deleteLearnerGroup: 'Delete Learner Group',
      areYouSure: 'Are you sure you want to delete',
      learnersWillBecome: 'Learners within this group will become',
      ungrouped: 'Ungrouped',
      cancel: 'Cancel',
      deleteGroup: 'Delete Group',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'textbox': require('kolibri.coreVue.components.textbox'),
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
        required: true,
      },
      groupId: {
        type: String,
        required: true,
      },
    },
    methods: {
      callDeleteGroup() {
        this.deleteGroup(this.classId, this.groupId);
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal: groupActions.displayModal,
        deleteGroup: groupActions.deleteGroup,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
