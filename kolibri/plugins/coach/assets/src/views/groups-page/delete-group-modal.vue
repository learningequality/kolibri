<template>

  <k-modal
    :title="$tr('deleteLearnerGroup')"
    :submitText="$tr('deleteGroup')"
    :cancelText="$tr('cancel')"
    @submit="deleteGroup(groupId)"
    @cancel="close"
  >
    <p>{{ $tr('areYouSure', { groupName: groupName }) }}</p>
    <p>{{ $tr('learnersWillBecomeUngrouped') }}</p>
  </k-modal>

</template>


<script>

  import { mapActions } from 'vuex';
  import kModal from 'kolibri.coreVue.components.kModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';

  export default {
    name: 'DeleteGroupModal',
    $trs: {
      deleteLearnerGroup: 'Delete group',
      areYouSure: "Are you sure you want to delete '{ groupName }'?",
      learnersWillBecomeUngrouped: "Learners within this group will become 'Ungrouped'.",
      cancel: 'Cancel',
      deleteGroup: 'Delete group',
    },
    components: {
      kModal,
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
      ...mapActions(['displayModal', 'deleteGroup']),
      close() {
        this.displayModal(false);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
