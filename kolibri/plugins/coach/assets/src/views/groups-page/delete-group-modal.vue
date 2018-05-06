<template>

  <core-modal
    :title="$tr('deleteLearnerGroup')"
    @cancel="close"
  >
    <p>{{ $tr('areYouSure', { groupName: groupName }) }}</p>
    <p>{{ $tr('learnersWillBecomeUngrouped') }}</p>
    <div class="core-modal-buttons">
      <k-button
        :text="$tr('cancel')"
        appearance="flat-button"
        @click="close"
      />
      <k-button
        :text="$tr('deleteGroup')"
        :primary="true"
        @click="deleteGroup(groupId)"
      />
    </div>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { displayModal, deleteGroup } from '../../state/actions/group';

  export default {
    name: 'deleteGroupModal',
    $trs: {
      deleteLearnerGroup: 'Delete group',
      areYouSure: "Are you sure you want to delete '{ groupName }'?",
      learnersWillBecomeUngrouped: "Learners within this group will become 'Ungrouped'.",
      cancel: 'Cancel',
      deleteGroup: 'Delete group',
    },
    components: {
      coreModal,
      kTextbox,
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
    },
    methods: {
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal,
        deleteGroup,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
