<template>

  <KModal
    :title="$tr('modalTitle')"
    :submitText="$tr('deleteClassButtonLabel')"
    :cancelText="$tr('cancel')"
    :hasError="false"
    @submit="classDelete"
    @cancel="close"
  >
    <p>{{ $tr('confirmation', { classname: classname }) }}</p>
    <p>{{ $tr('description') }}</p>
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import KModal from 'kolibri.coreVue.components.KModal';

  export default {
    name: 'ClassDeleteModal',
    $trs: {
      modalTitle: 'Delete class',
      deleteClassButtonLabel: 'Delete',
      cancel: 'Cancel',
      confirmation: "Are you sure you want to delete '{ classname }'?",
      description:
        "Enrolled users will be removed from the class but remain accessible from the 'Users' tab.",
    },
    components: {
      KModal,
    },
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
      ...mapActions('classManagement', ['deleteClass', 'displayModal']),
      classDelete() {
        this.deleteClass(this.classid);
      },
      close() {
        this.displayModal(false);
      },
    },
  };

</script>


<style lang="scss" scoped>

  p {
    word-break: keep-all;
  }

</style>
