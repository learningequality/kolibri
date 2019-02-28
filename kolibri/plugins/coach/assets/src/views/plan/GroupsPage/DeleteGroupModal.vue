<template>

  <KModal
    :title="$tr('deleteLearnerGroup')"
    :submitText="$tr('deleteGroup')"
    :cancelText="$tr('cancel')"
    @submit="handleSubmit"
    @cancel="close"
  >
    <p>{{ $tr('areYouSure', { groupName: groupName }) }}</p>
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import KModal from 'kolibri.coreVue.components.KModal';

  export default {
    name: 'DeleteGroupModal',
    $trs: {
      deleteLearnerGroup: 'Delete group',
      areYouSure: "Are you sure you want to delete '{ groupName }'?",
      cancel: 'Cancel',
      deleteGroup: 'Delete',
    },
    components: {
      KModal,
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
      ...mapActions('groups', ['displayModal', 'deleteGroup']),
      handleSubmit() {
        this.deleteGroup(this.groupId).then(() => {
          this.$emit('success');
        });
      },
      close() {
        this.displayModal(false);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
