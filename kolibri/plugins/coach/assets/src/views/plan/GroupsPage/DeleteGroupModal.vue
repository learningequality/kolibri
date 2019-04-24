<template>

  <KModal
    :title="$tr('deleteLearnerGroup')"
    :submitText="$tr('deleteGroup')"
    :cancelText="$tr('cancel')"
    @submit="handleSubmit"
  >
    <p>{{ $tr('areYouSure', { groupName: groupName }) }}</p>
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import KModal from 'kolibri.coreVue.components.KModal';

  export default {
    name: 'DeleteGroupModal',
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
      ...mapActions('groups', ['deleteGroup']),
      handleSubmit() {
        this.deleteGroup(this.groupId).then(() => {
          this.$emit('submit');
        });
      },
    },
    $trs: {
      deleteLearnerGroup: 'Delete group',
      areYouSure: "Are you sure you want to delete '{ groupName }'?",
      cancel: 'Cancel',
      deleteGroup: 'Delete',
    },
  };

</script>


<style lang="scss" scoped></style>
