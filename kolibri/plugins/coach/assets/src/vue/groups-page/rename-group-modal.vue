<template>

  <core-modal :title="$tr('renameLearnerGroup')"
    @cancel="close">
    <div>
      <form @submit.prevent="renameGroup(this.classId, groupId, groupNameInput)">
        <textbox type="text"
          :label="$tr('learnerGroupName')"
          :aria-label="$tr('learnerGroupName')"
          :autofocus="true"
          :required="true"
          :invalid="invalid"
          v-model.trim="groupNameInput" />
        <icon-button :text="$tr('cancel')"
          type="button"
          @click="close" />
        <icon-button :text="$tr('save')"
          :primary="true"
          type="submit" />
      </form>
    </div>
  </core-modal>

</template>


<script>

  const groupActions = require('../../group-actions');

  module.exports = {
    $trNameSpace: 'confirm-enrollment-modal',
    $trs: {
      renameLearnerGroup: 'Rename Learner Group',
      learnerGroupName: 'Learner Group Name',
      cancel: 'Cancel',
      save: 'Save',
    },
    data() {
      return {
        groupNameInput: this.groupName,
        invalid: false,
      };
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'textbox': require('kolibri.coreVue.components.textbox'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    props: {
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
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        renameGroup: groupActions.renameGroup,
        displayModal: groupActions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
