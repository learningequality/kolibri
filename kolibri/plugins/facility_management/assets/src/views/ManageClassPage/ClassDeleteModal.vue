<template>

  <KModal
    :title="$tr('modalTitle')"
    :submitText="$tr('deleteClassButtonLabel')"
    :cancelText="$tr('cancel')"
    :hasError="false"
    @submit="classDelete"
    @cancel="$emit('cancel')"
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
      ...mapActions('classManagement', ['deleteClass']),
      classDelete() {
        this.deleteClass(this.classid);
      },
    },
    $trs: {
      modalTitle: 'Delete class',
      deleteClassButtonLabel: 'Delete',
      cancel: 'Cancel',
      confirmation: "Are you sure you want to delete '{ classname }'?",
      description:
        "Enrolled users will be removed from the class but remain accessible from the 'Users' tab.",
    },
  };

</script>


<style lang="scss" scoped></style>
