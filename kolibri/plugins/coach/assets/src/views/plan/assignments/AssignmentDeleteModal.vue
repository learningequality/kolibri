<template>

  <KModal
    :title="modalTitle"
    :submitText="$tr('delete')"
    :cancelText="$tr('cancel')"
    @submit="$emit('delete')"
    @cancel="closeModal"
  >
    <p>{{ modalDescription }}</p>
    <p v-if="modalConfirmation">{{ modalConfirmation }}</p>
  </KModal>

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
      modalConfirmation: {
        type: String,
        required: false,
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
