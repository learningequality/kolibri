<template>

  <KModal
    :title="$tr('modalTitle')"
    :submitText="coreString('deleteAction')"
    :cancelText="coreString('cancelAction')"
    @submit="classDelete"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('confirmation', { classname: classname }) }}</p>
    <p>{{ $tr('description') }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ClassDeleteModal',
    mixins: [commonCoreStrings],
    props: {
      classname: {
        type: String,
        required: true,
      },
      classid: {
        type: String,
        required: true,
      },
    },
    methods: {
      classDelete() {
        this.$store.dispatch('classManagement/deleteClass', this.classid).then(() => {
          this.$emit('success');
          this.showSnackbarNotification('classDeleted');
        });
      },
    },
    $trs: {
      modalTitle: 'Delete class',
      confirmation: "Are you sure you want to delete '{ classname }'? This action cannot be undone",
      description:
        "Enrolled users will be removed from the class but remain accessible from the 'Users' tab.",
    },
  };

</script>


<style lang="scss" scoped></style>
