<template>

  <core-modal :title="$tr('renameLearnerGroup')"
    @cancel="close">
    <div>
      <form @submit.prevent="callRenameGroup">
        <textbox type="text"
          :label="$tr('learnerGroupName')"
          :aria-label="$tr('learnerGroupName')"
          :autofocus="true"
          :required="true"
          :invalid="invalid"
          v-model.trim="groupNameInput" />
        <icon-button :text="$tr('cancel')"
          class="cancel-btn"
          @click="close" />
        <icon-button :text="$tr('save')"
          class="save-btn"
          :primary="true"
          type="submit" />
      </form>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');

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
        groupNameInput: this.className,
        invalid: false,
      };
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
    },
    computed: {},
    methods: {
      callRenameGroup() {
        this.renameGroup(this.classId, this.groupNameInput);
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        renameGroup: actions.renameGroup,
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus"
  scoped></style>
