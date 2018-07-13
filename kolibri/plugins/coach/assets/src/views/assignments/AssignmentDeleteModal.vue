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

  import kModal from 'kolibri.coreVue.components.kModal';

  export default {
    name: 'AssignmentDeleteModal',
    components: {
      kModal,
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
