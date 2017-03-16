<template>

  <core-modal :title="$tr('newLearnerGroup')"
    @cancel="close">
    <div>
      <form @submit.prevent="callCreateGroup">
        <textbox type="text"
          :label="$tr('learnerGroupName')"
          :aria-label="$tr('learnerGroupName')"
          :autofocus="true"
          :required="true"
          :invalid="invalid"
          v-model.trim="groupNameInput" />
        <icon-button :text="$tr('cancel')"
          class="cancel-btn"
          @click="close"
          type="button" />
        <icon-button :text="$tr('save')"
          class="save-btn"
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
      newLearnerGroup: 'New Learner Group',
      learnerGroupName: 'Learner Group Name',
      cancel: 'Cancel',
      save: 'Save',
    },
    data() {
      return {
        groupNameInput: '',
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
      callCreateGroup() {
        this.createGroup(this.classId, this.groupNameInput);
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal: groupActions.displayModal,
        createGroup: groupActions.createGroup,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
