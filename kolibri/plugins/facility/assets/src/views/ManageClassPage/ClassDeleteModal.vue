<template>

  <KModal
    :title="$tr('modalTitle')"
    :submitText="coreString('deleteAction')"
    :cancelText="coreString('cancelAction')"
    @submit="classDelete"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('confirmation', { classname: className }) }}</p>
    <p>{{ $tr('description') }}</p>
    <p>{{ coreString('cannotUndoActionWarning') }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useDeleteClass from './useDeleteClass';

  export default {
    name: 'ClassDeleteModal',
    mixins: [commonCoreStrings],
    setup(props) {
      const { deleteSelectedClassModel } = useDeleteClass(props.classToDelete);
      const { name } = props.classToDelete;
      return {
        className: name,
        deleteSelectedClassModel,
      };
    },
    props: {
      // eslint-disable-next-line vue/no-unused-properties
      classToDelete: {
        type: Object,
        required: true,
      },
    },
    methods: {
      classDelete() {
        this.deleteSelectedClassModel().then(() => {
          this.$emit('success');
          this.showSnackbarNotification('classDeleted');
        });
      },
    },
    $trs: {
      modalTitle: {
        message: 'Delete class',
        context: "Title of 'Delete class' window.",
      },
      confirmation: {
        message: "Are you sure you want to delete '{ classname }'?",
        context:
          "Confirmation message on 'Delete class' window accessed via the 'Delete class' button.",
      },
      description: {
        message:
          "Enrolled users will be removed from the class but remain accessible from the 'Users' tab.",
        context: "Description on 'Delete class' window accessed via the 'Delete class' button.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
