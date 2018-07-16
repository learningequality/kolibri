<template>

  <k-modal
    :title="modalTitle"
    :submitText="$tr('delete')"
    :cancelText="$tr('cancel')"
    @submit="$emit('delete')"
    @cancel="closeModal"
  >
    <p>{{ modalDescription }}</p>
  </k-modal>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';

  export default {
    name: 'AssignmentDeleteModal',
    components: {
      KModal,
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


<style lang="scss" scoped></style>
