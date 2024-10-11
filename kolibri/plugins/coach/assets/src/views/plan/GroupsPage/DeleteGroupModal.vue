<template>

  <KModal
    :title="$tr('deleteLearnerGroup')"
    :submitText="coreString('deleteAction')"
    :cancelText="coreString('cancelAction')"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('areYouSure', { groupName: groupName }) }}</p>
    <p>{{ coreString('cannotUndoActionWarning') }}</p>
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'DeleteGroupModal',
    mixins: [commonCoreStrings],
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
      deleteLearnerGroup: {
        message: 'Delete group',
        context:
          "Title of the confirmation window which appears when user uses the 'Delete' option in the group section.",
      },
      areYouSure: {
        message: "Are you sure you want to delete '{ groupName }'?",
        context: 'Confirmation message when the coach attempts to delete a group of learners.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
