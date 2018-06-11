<template>

  <core-modal
    :title="modalTitle"
    :submitText="$tr('delete')"
    :cancelText="$tr('cancel')"
    @submit="$emit('delete')"
    @cancel="closeModal"
  >
    <p>{{ modalDescription }}</p>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';

  export default {
    name: 'assignmentDeleteModal',
    components: {
      coreModal,
    },
    props: {
      modalTitle: {
        type: String,
        required: true,
      },
      modalDescription: {
        type: String,
        required: true,
      },
    },
    methods: {
      closeModal() {
        return this.$emit('cancel');
      },
    },
    $trs: {
      cancel: 'Cancel',
      delete: 'Delete',
    },
  };

</script>


<style lang="stylus" scoped></style>
