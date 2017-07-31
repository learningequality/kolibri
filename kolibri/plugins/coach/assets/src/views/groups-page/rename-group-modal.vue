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
          :invalid="duplicateName"
          :error="$tr('duplicateName')"
          v-model.trim="groupNameInput" />
        <k-button :text="$tr('cancel')"
          :raised="false"
          type="button"
          @click="close" />
        <k-button :text="$tr('save')"
          :primary="true"
          type="submit" />
      </form>
    </div>
  </core-modal>

</template>


<script>

  import * as groupActions from '../../state/actions/group';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import textbox from 'kolibri.coreVue.components.textbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    name: 'renameGroupModal',
    $trs: {
      renameLearnerGroup: 'Rename Learner Group',
      learnerGroupName: 'Learner Group Name',
      cancel: 'Cancel',
      save: 'Save',
      duplicateName: 'A group with that name already exists',
    },
    data() {
      return {
        groupNameInput: this.groupName,
        invalid: false,
      };
    },
    components: {
      coreModal,
      textbox,
      kButton,
    },
    props: {
      groupName: {
        type: String,
        required: true,
      },
      groupId: {
        type: String,
        required: true,
      },
      groups: {
        type: Array,
        required: true,
      },
    },
    computed: {
      duplicateName() {
        if (this.groupNameInput === this.groupName) {
          return false;
        }
        const index = this.groups.findIndex(
          group => group.name.toUpperCase() === this.groupNameInput.toUpperCase()
        );
        if (index === -1) {
          return false;
        }
        return true;
      },
    },
    methods: {
      callRenameGroup() {
        if (!this.duplicateName) {
          this.renameGroup(this.groupId, this.groupNameInput);
        }
      },
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
