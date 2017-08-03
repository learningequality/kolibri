<template>

  <core-modal :title="$tr('newLearnerGroup')"
    @cancel="close">
    <div>
      <form @submit.prevent="callCreateGroup">
        <k-textbox type="text"
          :label="$tr('learnerGroupName')"
          :aria-label="$tr('learnerGroupName')"
          :autofocus="true"
          :required="true"
          :invalid="duplicateName"
          :error="$tr('duplicateName')"
          v-model.trim="groupNameInput" />
        <k-button :text="$tr('cancel')"
          @click="close"
          :raised="false"
          type="button" />
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
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    name: 'createGroupModal',
    $trs: {
      newLearnerGroup: 'New Learner Group',
      learnerGroupName: 'Learner Group Name',
      cancel: 'Cancel',
      save: 'Save',
      duplicateName: 'A group with that name already exists',
    },
    data() {
      return {
        groupNameInput: '',
        invalid: false,
      };
    },
    components: {
      coreModal,
      kTextbox,
      kButton,
    },
    props: {
      groups: {
        type: Array,
        required: true,
      },
    },
    computed: {
      duplicateName() {
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
      callCreateGroup() {
        if (!this.duplicateName) {
          this.createGroup(this.groupNameInput);
        }
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
