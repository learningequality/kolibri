<template>

  <core-modal
    :title="$tr('deleteLearnerGroup')"
    :submitText="$tr('deleteGroup')"
    :cancelText="$tr('cancel')"
    @submit="deleteGroup(groupId)"
    @cancel="close"
  >
    <p>{{ $tr('areYouSure', { groupName: groupName }) }}</p>
    <p>{{ $tr('learnersWillBecomeUngrouped') }}</p>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
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
